import express from 'express';
import cors from 'cors';
import net from 'net';
import { query } from '../services/mariadb.js';

const os = require('os');
const app = express();
const port = process.env.API_PORT || 3001;

// Configurar CORS
const allowedOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',')
    : ['https://ozro-api.ozkar.co', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'https://oz-ragnarok.web.app'];

const corsOptions = {
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Custom JSON replacer to handle BigInt serialization
app.set('json replacer', (key, value) => {
    if (typeof value === 'bigint') {
        return Number(value);
    }
    return value;
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

// Get system uptime
app.get('/uptime', (req, res) => {

    const uptimeSeconds = os.uptime();
    const uptimeMillis = uptimeSeconds * 1000;
    
    const days = Math.floor(uptimeSeconds / (24 * 60 * 60));
    const hours = Math.floor((uptimeSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptimeSeconds % (60 * 60)) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);
    
    res.json({
        uptime: {
            seconds: uptimeSeconds,
            milliseconds: uptimeMillis,
            formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`
        }
    });
});

// Check service status
function checkService(host, port) {
    return new Promise((resolve) => {
        const socket = net.createConnection({ host, port, timeout: 3000 });
        
        socket.on('connect', () => {
            socket.destroy();
            resolve({ status: 'online' });
        });
        
        socket.on('error', () => {
            resolve({ status: 'offline' });
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            resolve({ status: 'offline' });
        });
    });
}

app.get('/status', async (req, res) => {
    try {
        const services = {
            'login': 6900,
            'char': 6121,
            'map': 5121
        };
        
        const statusResults = {};
        
        for (const [serviceName, port] of Object.entries(services)) {
            statusResults[serviceName] = await checkService('localhost', port);
        }
        
        res.json({
            timestamp: new Date().toISOString(),
            services: statusResults
        });
    } catch (error) {
        console.error('Error al verificar estado de servicios:', error);
        res.status(500).json({ error: 'Error al verificar estado de servicios' });
    }
});


// Get online players count
app.get('/players', async (req, res) => {
    try {
        const result = await query('SELECT COUNT(*) as count FROM `char` WHERE online = 1');
        res.json({
            online: result[0].count
        });
    } catch (error) {
        console.error('Error al obtener jugadores online:', error);
        res.status(500).json({ error: 'Error al obtener jugadores online' });
    }
});

// Get server statistics
app.get('/stats', async (req, res) => {
    try {
        // Total de cuentas (excluyendo admins)
        const totalResult = await query('SELECT COUNT(*) as count FROM login WHERE group_id = 0');
        const totalAccounts = totalResult[0].count;

        // Cuentas activas en la última semana
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const formattedDate = weekAgo.toISOString().slice(0, 19).replace('T', ' ');
        
        const activeResult = await query(
            'SELECT COUNT(*) as count FROM login WHERE lastlogin >= ? AND group_id = 0',
            [formattedDate]
        );
        const activeLastWeek = activeResult[0].count;

        // Total de personajes
        const totalCharsResult = await query(`
            SELECT COUNT(*) as count 
            FROM \`char\` c
            JOIN login l ON c.account_id = l.account_id
            WHERE c.delete_date = 0 AND l.group_id = 0
        `);
        const totalCharacters = totalCharsResult[0].count;

        // Personajes activos en las últimas 24 horas
        const dayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
        const activeCharsResult = await query(`
            SELECT COUNT(*) as count 
            FROM \`char\` c
            JOIN login l ON c.account_id = l.account_id
            WHERE c.delete_date = 0 
            AND c.last_login >= ?
            AND l.group_id = 0
        `, [dayAgo]);
        const activeLast24h = activeCharsResult[0].count;

        // Nivel más alto
        const maxLevelStats = await query(`
            SELECT 
                c.base_level as maxLevel,
                COUNT(*) as maxLevelCount
            FROM \`char\` c
            JOIN login l ON c.account_id = l.account_id
            WHERE c.delete_date = 0
            AND l.group_id = 0
            AND c.base_level = (
                SELECT MAX(ch.base_level)
                FROM \`char\` ch
                JOIN login lg ON ch.account_id = lg.account_id
                WHERE ch.delete_date = 0
                AND lg.group_id = 0
            )
            GROUP BY c.base_level
        `);

        // Nivel promedio
        const avgLevelResult = await query(`
            SELECT AVG(c.base_level) as avgLevel
            FROM \`char\` c
            JOIN login l ON c.account_id = l.account_id
            WHERE c.delete_date = 0
            AND l.group_id = 0
        `);

        const highestLevel = maxLevelStats[0]?.maxLevel || 0;
        const maxLevelCount = maxLevelStats[0]?.maxLevelCount || 0;
        const averageLevel = Math.round(avgLevelResult[0]?.avgLevel || 0);

        // Total de guilds
        const guildResult = await query('SELECT COUNT(*) as count FROM guild');
        const totalGuilds = guildResult[0].count;

        // Zeny total y promedios
        const charZenyResult = await query(`
            SELECT 
                CAST(SUM(c.zeny) AS CHAR) as totalCharZeny,
                c.account_id,
                CAST(SUM(c.zeny) AS CHAR) as accountCharZeny
            FROM \`char\` c
            JOIN login l ON c.account_id = l.account_id
            WHERE c.delete_date = 0
            AND l.group_id = 0
            GROUP BY c.account_id
        `);

        const bankZenyResult = await query(`
            SELECT 
                a.account_id,
                CAST(a.bank_vault AS CHAR) as bank_vault
            FROM account_data a
            JOIN login l ON a.account_id = l.account_id
            WHERE l.group_id = 0
        `);

        const bankZenyMap = new Map();
        let totalBankZeny = BigInt(0);
        
        bankZenyResult.forEach(row => {
            const bankVault = BigInt(row.bank_vault || '0');
            bankZenyMap.set(row.account_id, bankVault);
            totalBankZeny += bankVault;
        });

        let totalCharZeny = BigInt(0);
        let totalZenyByAccount = new Map();

        charZenyResult.forEach(row => {
            const charZeny = BigInt(row.totalCharZeny || '0');
            totalCharZeny += charZeny;
            
            const bankZeny = bankZenyMap.get(row.account_id) || BigInt(0);
            const accountTotalZeny = BigInt(row.accountCharZeny || '0') + bankZeny;
            totalZenyByAccount.set(row.account_id, accountTotalZeny);
        });

        const totalZeny = totalCharZeny + totalBankZeny;
        const averageZenyPerChar = totalCharacters > 0 
            ? Number(totalCharZeny / BigInt(totalCharacters))
            : 0;
        
        const accountsWithMoney = totalZenyByAccount.size;
        const totalZenyAllAccounts = Array.from(totalZenyByAccount.values())
            .reduce((a, b) => a + b, BigInt(0));
        
        const averageZenyPerAccount = accountsWithMoney > 0 
            ? Number(totalZenyAllAccounts / BigInt(accountsWithMoney))
            : 0;

        res.json({
            timestamp: new Date(),
            accounts: {
                total: totalAccounts,
                activeLastWeek: activeLastWeek
            },
            characters: {
                total: totalCharacters,
                activeLast24h: activeLast24h,
                highestLevel: highestLevel,
                averageLevel: averageLevel,
                maxLevelCount: maxLevelCount
            },
            guilds: {
                total: totalGuilds
            },
            economy: {
                totalZeny: totalZeny.toString(),
                bankZeny: totalBankZeny.toString(),
                averageZenyPerChar: averageZenyPerChar,
                averageZenyPerAccount: averageZenyPerAccount
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

// Get account rankings
app.get('/rankings/accounts', async (req, res) => {
    try {
        const mvpCardIds = [
            4601, 4592, 4578, 4576, 4574, 4525, 4507, 4456, 4441, 4430,
            4425, 4419, 4408, 4407, 4403, 4399, 4386, 4376, 4374, 4372,
            4367, 4365, 4363, 4361, 4359, 4357, 4352, 4342, 4330, 4324,
            4318, 4305, 4302, 4276, 4263, 4236, 4168, 4148, 4147, 4146,
            4145, 4144, 4143, 4142, 4137, 4135, 4134, 4132, 4131, 4128,
            4520, 4509, 4565, 4563, 4561, 4562, 4564, 4560, 4566, 4123,
            4121, 27164
        ];
        const mvpCardsStr = mvpCardIds.join(',');
        
        const bossCardIds = [
            4632, 4631, 4610, 4606, 4605, 4591, 4590, 4534, 4533, 4532,
            4529, 4528, 4527, 4526, 4524, 4463, 4462, 4457, 4451, 4440,
            4431, 4429, 4428, 4427, 4426, 4423, 4406, 4398, 4397, 4396,
            4395, 4394, 4393, 4392, 4391, 4384, 4354, 4306, 4300, 4290,
            4266, 4254, 4250, 4241, 4238, 4237, 4207, 4203, 4198, 4197,
            4183, 4179, 4174, 4171, 4169, 4163, 4147, 4130, 4111, 4105,
            4093, 4054, 4047
        ];
        const bossCardsStr = bossCardIds.join(',');

        const rankings = await query(`
            WITH AccountItems AS (
                -- Items en storage
                SELECT ac.account_id, 
                    COALESCE(s.nameid, 0) as item_id,
                    COALESCE(s.amount, 0) as amount,
                    'storage' as source
                FROM login ac
                LEFT JOIN storage s ON ac.account_id = s.account_id
                WHERE ac.group_id != 99
                
                UNION ALL
                
                -- Items en inventory de cada personaje
                SELECT ac.account_id,
                    COALESCE(i.nameid, 0) as item_id,
                    COALESCE(i.amount, 0) as amount,
                    'inventory' as source
                FROM login ac
                JOIN \`char\` c ON ac.account_id = c.account_id
                LEFT JOIN inventory i ON c.char_id = i.char_id
                WHERE ac.group_id != 99 AND c.delete_date = 0
                
                UNION ALL
                
                -- Items en cart_inventory de cada personaje
                SELECT ac.account_id,
                    COALESCE(ci.nameid, 0) as item_id,
                    COALESCE(ci.amount, 0) as amount,
                    'cart' as source
                FROM login ac
                JOIN \`char\` c ON ac.account_id = c.account_id
                LEFT JOIN cart_inventory ci ON c.char_id = ci.char_id
                WHERE ac.group_id != 99 AND c.delete_date = 0
            ),
            AccountTotals AS (
                SELECT 
                    l.account_id,
                    l.userid,
                    l.logincount,
                    -- Zeny total (personajes + banco)
                    CAST((
                        SELECT COALESCE(SUM(c.zeny), 0)
                        FROM \`char\` c
                        WHERE c.account_id = l.account_id
                        AND c.delete_date = 0
                    ) + COALESCE(ad.bank_vault, 0) AS CHAR) as total_zeny,
                    -- Total de cartas
                    CAST((
                        SELECT COALESCE(SUM(amount), 0)
                        FROM AccountItems ai
                        WHERE ai.account_id = l.account_id
                        AND EXISTS (SELECT 1 FROM item_db WHERE id = ai.item_id AND type = 6)
                    ) AS CHAR) as total_cards,
                    -- Total de cartas distintas
                    CAST((
                        SELECT COUNT(DISTINCT ai.item_id)
                        FROM AccountItems ai
                        WHERE ai.account_id = l.account_id
                        AND EXISTS (SELECT 1 FROM item_db WHERE id = ai.item_id AND type = 6)
                    ) AS CHAR) as total_cards_distinct,
                    -- Total de cartas MVP
                    CAST((
                        SELECT COALESCE(SUM(amount), 0)
                        FROM AccountItems ai
                        WHERE ai.account_id = l.account_id
                        AND ai.item_id IN (${mvpCardsStr})
                    ) AS CHAR) as total_mvp_cards,
                    -- Total de cartas Boss
                    CAST((
                        SELECT COALESCE(SUM(amount), 0)
                        FROM AccountItems ai
                        WHERE ai.account_id = l.account_id
                        AND ai.item_id IN (${bossCardsStr})
                    ) AS CHAR) as total_boss_cards,
                    -- Total de diamantes
                    CAST((
                        SELECT COALESCE(SUM(amount), 0)
                        FROM AccountItems ai
                        WHERE ai.account_id = l.account_id
                        AND ai.item_id = 6024
                    ) AS CHAR) as total_diamonds
                FROM login l
                LEFT JOIN account_data ad ON l.account_id = ad.account_id
                WHERE l.group_id != 99
            )
            SELECT 
                account_id,
                userid,
                logincount,
                total_zeny,
                total_cards,
                total_cards_distinct,
                total_mvp_cards,
                total_boss_cards,
                total_diamonds
            FROM AccountTotals
            ORDER BY CAST(total_zeny AS DECIMAL(20)) DESC
        `);

        res.json({
            timestamp: new Date(),
            rankings: rankings.map(row => ({
                account_id: row.account_id,
                userid: row.userid,
                logincount: row.logincount,
                total_zeny: row.total_zeny,
                total_cards: row.total_cards,
                total_cards_distinct: row.total_cards_distinct,
                total_mvp_cards: row.total_mvp_cards,
                total_boss_cards: row.total_boss_cards,
                total_diamonds: row.total_diamonds
            }))
        });
    } catch (error) {
        console.error('Error al obtener rankings de cuentas:', error);
        res.status(500).json({ error: 'Error al obtener rankings de cuentas' });
    }
});

// Get character rankings
app.get('/rankings/characters', async (req, res) => {
    try {
        const CLASS_GP1 = [ 
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
            11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
            21, 22, 4023, 4024, 4025, 4026, 4027, 4028, 4029, 4030,
            4031, 4032, 4033, 4034, 4035, 4036, 4037, 4038, 4039, 4040,
            4041, 4042, 4043, 4044, 4045
        ];

        const EXPxLVL_GP1 = [ 
            0, 350, 550, 900, 1500, 2200, 3200, 3800, 4200, 4550, 5000,
            5500, 6000, 6100, 6350, 6700, 7350, 8000, 8400, 8800, 9200,
            9700, 10300, 11000, 11800, 13000, 14000, 15000, 16000, 17000, 18000,
            19000, 20000, 21000, 22000, 23200, 24000, 26000, 27500, 29000, 30000,
            31500, 33000, 34000, 36000, 37500, 38000, 40000, 42000, 44500, 47000,
            49000, 51000, 53000, 55000, 57000, 59000, 61500, 63000, 65000, 67000,
            69000, 70000, 73000, 77000, 80000, 84000, 88000, 91000, 95000, 110000,
            128000, 140000, 155000, 163000, 170000, 180000, 188000, 195000, 200000, 230000,
            260000, 300000, 350000, 400000, 480000, 550000, 600000, 680000, 750000, 900000,
            1000000, 1200000, 1500000, 1800000, 2100000, 2400000, 2800000, 3300000
        ];

        const EXPxLVL_GP2 = [ 
            0, 420, 660, 1080, 1800, 2640, 3840, 4560, 5040, 5460, 6000,
            6600, 7200, 7320, 7620, 8040, 8820, 9600, 10080, 10560, 11040,
            12610, 13390, 14300, 15340, 16900, 18460, 19500, 20800, 22100, 23400,
            24700, 26000, 27300, 28600, 30160, 31200, 33800, 35750, 37700, 39000,
            44100, 46200, 47600, 50400, 52500, 53200, 56000, 58800, 62300, 65800,
            68600, 71400, 74200, 77000, 79800, 82600, 86100, 88200, 91000, 93800,
            103500, 105000, 109500, 115500, 120000, 126000, 132000, 136500, 142500, 165000,
            192000, 210000, 232500, 244500, 255000, 270000, 282000, 292500, 300000, 345000,
            416000, 480000, 560000, 640000, 768000, 880000, 960000, 1088000, 1200000, 1440000,
            1700000, 2040000, 2550000, 3060000, 3570000, 4080000, 4760000, 5610000, 6800000, 7070000,
            7400000, 7770000, 8150000, 8550000, 9100000, 9610000, 10150000, 10570000, 11180000, 12000000,
            12200000, 12930000, 13150000, 14030000, 14420000, 15420000, 15670000, 16870000, 17140000, 18720000,
            19020000, 20590000, 20930000, 22690000, 23310000, 25290000, 26020000, 27860000, 28535000, 30990000,
            31680000, 33560000, 34942000, 36372000, 38350000, 39890000, 41545000, 43330000, 45400000, 48100000,
            50410000, 53370000, 56250000, 59230000, 62590000, 66120000, 70200000, 75330000, 81100000, 95000000,
            98000000, 103000000, 107000000, 112000000, 116000000, 121000000, 125000000, 130000000, 134000000, 139000000,
            145000000, 152200000, 160840000, 171200000, 191930000, 202290000, 214720000, 229640000, 247550000, 283370000,
            301280000, 322770000, 348560000, 379500000
        ];

        const rankings = await query(`
            SELECT 
                c.char_id,
                c.account_id,
                l.userid,
                c.name,
                c.class,
                c.base_level,
                CAST(c.base_exp AS CHAR) as base_exp,
                CAST(c.job_exp AS CHAR) as job_exp,
                c.fame
            FROM \`char\` c
            JOIN login l ON c.account_id = l.account_id
            WHERE c.delete_date = 0
            AND l.group_id != 99
            ORDER BY c.base_level DESC, c.base_exp DESC
        `);

        res.json({
            timestamp: new Date(),
            rankings: rankings.map(row => {
                const expTable = CLASS_GP1.includes(row.class) ? EXPxLVL_GP1 : EXPxLVL_GP2;
                const previousLevel = row.base_level - 1;
                const previousExp = previousLevel >= 0 ? expTable[previousLevel] : 0;

                return {
                    char_id: row.char_id,
                    account_id: row.account_id,
                    userid: row.userid,
                    name: row.name,
                    class: row.class,
                    base_level: row.base_level,
                    base_exp: parseInt(row.base_exp) + previousExp,
                    job_exp: row.job_exp,
                    fame: row.fame
                };
            })
        });
    } catch (error) {
        console.error('Error al obtener rankings de personajes:', error);
        res.status(500).json({ error: 'Error al obtener rankings de personajes' });
    }
});

export function startAPI() {
    return new Promise((resolve) => {
        app.listen(port, () => {
            console.log(`API HTTP escuchando en el puerto ${port}`);
            resolve();
        });
    });
} 