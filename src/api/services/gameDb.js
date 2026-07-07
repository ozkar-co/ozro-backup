import { query } from '../../services/mariadb.js';

export const TABLES = {
    MOB: null,
    MOB2: null,
    /** Base item tables: split (item_db_re_usable/equip/etc) or monolithic item_db_re */
    ITEM_BASES: [],
    ITEM2: null
};

let mobDataAvailable = false;
let itemDataAvailable = false;

export const MOB_ELEMENTS = [
    'Neutral', 'Water', 'Earth', 'Fire', 'Wind',
    'Poison', 'Holy', 'Shadow', 'Ghost', 'Undead'
];

export const MOB_RACES = [
    'Formless', 'Undead', 'Brute', 'Plant', 'Insect',
    'Fish', 'Demon', 'Demi-Human', 'Angel', 'Dragon'
];

export const MOB_SIZES = ['Small', 'Medium', 'Large'];

export const ITEM_TYPES = [
    'Healing', 'Usable', 'Etc', 'Armor', 'Weapon', 'Card',
    'Petegg', 'Petarmor', 'Ammo', 'Delayconsume', 'Cash',
    'Shadowgear', 'Armor2'
];

export const ITEM_CLASSES = [
    'normal', 'upper', 'baby', 'third', 'third_upper', 'third_baby', 'fourth'
];

export const ITEM_CLASS_COLUMNS = {
    normal: 'class_normal',
    upper: 'class_upper',
    baby: 'class_baby',
    third: 'class_third',
    third_upper: 'class_third_upper',
    third_baby: 'class_third_baby',
    fourth: 'class_fourth'
};

export const JOB_COLUMNS = {
    novice: 'job_novice',
    swordman: 'job_swordman',
    mage: 'job_mage',
    archer: 'job_archer',
    acolyte: 'job_acolyte',
    merchant: 'job_merchant',
    thief: 'job_thief',
    knight: 'job_knight',
    priest: 'job_priest',
    wizard: 'job_wizard',
    blacksmith: 'job_blacksmith',
    hunter: 'job_hunter',
    assassin: 'job_assassin',
    crusader: 'job_crusader',
    monk: 'job_monk',
    sage: 'job_sage',
    rogue: 'job_rogue',
    alchemist: 'job_alchemist',
    barddancer: 'job_barddancer',
    taekwon: 'job_taekwon',
    stargladiator: 'job_stargladiator',
    soullinker: 'job_soullinker',
    gunslinger: 'job_gunslinger',
    ninja: 'job_ninja',
    kagerouoboro: 'job_kagerouoboro',
    rebellion: 'job_rebellion',
    summoner: 'job_summoner',
    spirit_handler: 'job_spirit_handler',
    supernovice: 'job_supernovice'
};

const NORMAL_DROP_COUNT = 10;
const MVP_DROP_COUNT = 3;

const MOB_TABLE_CANDIDATES = ['mob_db_re', 'mob_db'];
const MOB2_TABLE_CANDIDATES = ['mob_db2_re', 'mob_db2'];
const ITEM2_TABLE_CANDIDATES = ['item_db2_re', 'item_db2'];
const ITEM_SPLIT_SUFFIXES = ['usable', 'equip', 'etc'];
const ITEM_SPLIT_PREFIXES = ['item_db_re', 'item_db'];
const ITEM_MONOLITH_CANDIDATES = ['item_db_re', 'item_db'];

function pickTable(tableSet, envValue, candidates, required) {
    if (envValue === 'none') return null;
    if (envValue && tableSet.has(envValue)) return envValue;
    if (envValue && required) {
        console.warn(`Tabla configurada "${envValue}" no existe en la base de datos`);
    }
    for (const name of candidates) {
        if (tableSet.has(name)) return name;
    }
    return null;
}

/** rAthena yaml2sql stores renewal items in item_db_re_{usable,equip,etc}, not item_db_re. */
function detectItemBaseTables(tableSet) {
    const envTable = process.env.ITEM_TABLE;
    if (envTable === 'none') return [];
    if (envTable) {
        if (tableSet.has(envTable)) return [envTable];
        console.warn(`Tabla ITEM_TABLE="${envTable}" no existe en la base de datos`);
        return [];
    }

    for (const prefix of ITEM_SPLIT_PREFIXES) {
        const splitTables = ITEM_SPLIT_SUFFIXES
            .map((suffix) => `${prefix}_${suffix}`)
            .filter((name) => tableSet.has(name));
        if (splitTables.length > 0) return splitTables;
    }

    for (const name of ITEM_MONOLITH_CANDIDATES) {
        if (tableSet.has(name)) return [name];
    }
    return [];
}

function unionSelectSql(tables) {
    if (tables.length === 0) {
        throw new Error('NO_ITEM_TABLES');
    }
    if (tables.length === 1) {
        return `SELECT * FROM ${tables[0]}`;
    }
    return tables.map((table) => `SELECT * FROM ${table}`).join(' UNION ALL ');
}

export async function initializeGameDb() {
    const rows = await query('SHOW TABLES');
    const tableSet = new Set(rows.map((row) => Object.values(row)[0]));

    TABLES.MOB = pickTable(tableSet, process.env.MOB_TABLE, MOB_TABLE_CANDIDATES, true);
    TABLES.MOB2 = pickTable(tableSet, process.env.MOB2_TABLE, MOB2_TABLE_CANDIDATES, false);
    TABLES.ITEM_BASES = detectItemBaseTables(tableSet);
    TABLES.ITEM2 = pickTable(tableSet, process.env.ITEM2_TABLE, ITEM2_TABLE_CANDIDATES, false);

    mobDataAvailable = TABLES.MOB !== null;
    itemDataAvailable = TABLES.ITEM_BASES.length > 0;

    console.log('Tablas de juego detectadas:', {
        mob: TABLES.MOB,
        mob2: TABLES.MOB2,
        itemBases: TABLES.ITEM_BASES,
        item2: TABLES.ITEM2
    });

    if (!mobDataAvailable) {
        console.warn(
            'Sin tabla de monstruos (mob_db_re / mob_db). /mobs no funcionará hasta importarla.'
        );
        console.warn('Importar: mysql -u USER -p rathena < rathena/sql-files/mob_db_re.sql');
    }

    if (!itemDataAvailable) {
        console.warn('Sin tablas de objetos (item_db_re_* / item_db). /items no funcionará.');
        console.warn('Ejecuta yaml2sql en rathena e importa: item_db_re_usable.sql, item_db_re_equip.sql, item_db_re_etc.sql');
    }
}

export function isMobDataAvailable() {
    return mobDataAvailable;
}

export function isItemDataAvailable() {
    return itemDataAvailable;
}

export function mobUnavailableError() {
    return {
        error: 'Datos de monstruos no disponibles',
        hint: 'Importa mob_db_re en MariaDB: mysql -u USER -p rathena < rathena/sql-files/mob_db_re.sql'
    };
}

export function itemUnavailableError() {
    return {
        error: 'Datos de objetos no disponibles',
        hint: 'En rathena: ./yaml2sql, luego importa item_db_re_usable.sql, item_db_re_equip.sql, item_db_re_etc.sql (y item_db2_re.sql si aplica)'
    };
}

function mergedTableSql(baseTable, overlayTable, alias) {
    if (!overlayTable) {
        return `(SELECT * FROM ${baseTable}) AS ${alias}`;
    }
    return `(
        SELECT * FROM ${baseTable}
        WHERE id NOT IN (SELECT id FROM ${overlayTable})
        UNION ALL
        SELECT * FROM ${overlayTable}
    ) AS ${alias}`;
}

export function effectiveMobsSql(alias = 'm') {
    if (!TABLES.MOB) {
        throw new Error('MOB_TABLE_NOT_CONFIGURED');
    }
    return mergedTableSql(TABLES.MOB, TABLES.MOB2, alias);
}

export function effectiveItemsSql(alias = 'i') {
    if (TABLES.ITEM_BASES.length === 0) {
        throw new Error('ITEM_TABLE_NOT_CONFIGURED');
    }
    const baseSql = `(${unionSelectSql(TABLES.ITEM_BASES)})`;
    if (!TABLES.ITEM2) {
        return `${baseSql} AS ${alias}`;
    }
    return `(
        SELECT * FROM ${baseSql} base
        WHERE base.id NOT IN (SELECT id FROM ${TABLES.ITEM2})
        UNION ALL
        SELECT * FROM ${TABLES.ITEM2}
    ) AS ${alias}`;
}

/** rAthena stores account bank zeny in acc_reg_num, not account_data (Hercules). */
export const BANK_VAULT_KEY = '#BANKVAULT';

/** Service accounts excluded from player-facing stats (e.g. internal monitoring). */
export const INTERNAL_ACCOUNT_USERIDS = ['S1'];

const internalAccountsSqlList = INTERNAL_ACCOUNT_USERIDS.map((id) => `'${id}'`).join(', ');

/** Player accounts for /stats: non-admin, excluding internal service accounts. */
export function statsPlayerAccountSql(loginAlias = 'l') {
    return `${loginAlias}.group_id = 0 AND ${loginAlias}.userid NOT IN (${internalAccountsSqlList})`;
}

export function statsPlayerAccountWhereClause() {
    return `group_id = 0 AND userid NOT IN (${internalAccountsSqlList})`;
}

export function excludeInternalAccountsSql(loginAlias = 'l') {
    return `${loginAlias}.userid NOT IN (${internalAccountsSqlList})`;
}

export function bankVaultValueSql(accountIdExpr) {
    return `COALESCE((
        SELECT ar.value FROM acc_reg_num ar
        WHERE ar.account_id = ${accountIdExpr}
        AND ar.\`key\` = '${BANK_VAULT_KEY}'
        AND ar.\`index\` = 0
        LIMIT 1
    ), 0)`;
}

/** Card Collector (card_collector.txt) stores progress in acc_reg_num account vars. */
export const CARD_COLLECTOR_CATEGORIES = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
    'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'Y', 'Z', 'BOSS', 'MVP'
];

const CARD_CT_KEYS_SQL = CARD_COLLECTOR_CATEGORIES
    .map((code) => `'#CARD_CT_${code}'`)
    .join(', ');

/** Sum of registered cards per category (#CARD_CT_*), matches NPC "Ver mi progreso". */
export function cardCollectorTotalSql(accountIdExpr) {
    return `COALESCE((
        SELECT SUM(ar.value) FROM acc_reg_num ar
        WHERE ar.account_id = ${accountIdExpr}
        AND ar.\`key\` IN (${CARD_CT_KEYS_SQL})
        AND ar.\`index\` = 0
    ), 0)`;
}

/** Distinct cards documented with the Archivista (#CARD_SEEN_<id> = 1). */
export function cardCollectorDistinctSql(accountIdExpr) {
    return `COALESCE((
        SELECT COUNT(*) FROM acc_reg_num ar
        WHERE ar.account_id = ${accountIdExpr}
        AND ar.\`key\` LIKE '#CARD_SEEN\\_%'
        AND ar.\`index\` = 0
        AND ar.value = 1
    ), 0)`;
}

/** Card items in renewal item_db use type = 'Card' (not numeric type = 6). */
export function cardExistsSql(itemIdExpr) {
    if (!itemDataAvailable) {
        return '0 = 1';
    }
    return `EXISTS (SELECT 1 FROM ${effectiveItemsSql('cit')} WHERE cit.id = ${itemIdExpr} AND cit.type = 'Card')`;
}

export function mobDropColumns() {
    const columns = [];
    for (let n = 1; n <= NORMAL_DROP_COUNT; n++) {
        columns.push({ item: `drop${n}_item`, rate: `drop${n}_rate`, type: 'normal' });
    }
    for (let n = 1; n <= MVP_DROP_COUNT; n++) {
        columns.push({ item: `mvpdrop${n}_item`, rate: `mvpdrop${n}_rate`, type: 'mvp' });
    }
    return columns;
}

export function mobDropMatchSql(mobAlias) {
    const dropColumns = mobDropColumns();
    const conditions = dropColumns.map((col) => `${mobAlias}.${col.item} = ?`);
    return `(${conditions.join(' OR ')})`;
}

export function mobDropMatchParams(itemAegis) {
    const dropColumns = mobDropColumns();
    return dropColumns.map(() => itemAegis);
}

export function parsePagination(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
}

export function parseCsv(value) {
    if (!value || typeof value !== 'string') return [];
    return value.split(',').map((v) => v.trim()).filter(Boolean);
}

export function parseBool(value) {
    if (value === undefined || value === null || value === '') return null;
    const normalized = String(value).toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
    return null;
}

export function parseIntParam(value) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
}
