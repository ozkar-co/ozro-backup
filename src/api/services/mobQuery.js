import { query } from '../../services/mariadb.js';
import {
    effectiveMobsSql,
    effectiveItemsSql,
    mobDropColumns,
    mobDropMatchSql,
    mobDropMatchParams,
    parsePagination,
    parseCsv,
    parseBool,
    parseIntParam,
    MOB_ELEMENTS,
    MOB_RACES,
    MOB_SIZES
} from './gameDb.js';

function mapMobSummary(row) {
    return {
        id: row.id,
        name: row.name_english,
        nameAegis: row.name_aegis,
        nameJapanese: row.name_japanese,
        level: row.level,
        hp: row.hp,
        sp: row.sp,
        baseExp: row.base_exp,
        jobExp: row.job_exp,
        mvpExp: row.mvp_exp,
        attack: row.attack,
        attack2: row.attack2,
        defense: row.defense,
        magicDefense: row.magic_defense,
        attackRange: row.attack_range,
        element: row.element,
        elementLevel: row.element_level,
        race: row.race,
        size: row.size,
        isMvp: Boolean(row.mode_mvp) || (row.mvp_exp > 0),
        class: row.class
    };
}

function mapMobModes(row) {
    const modeFields = [
        'mode_canmove', 'mode_looter', 'mode_aggressive', 'mode_assist',
        'mode_castsensoridle', 'mode_norandomwalk', 'mode_nocast', 'mode_canattack',
        'mode_castsensorchase', 'mode_changechase', 'mode_angry',
        'mode_changetargetmelee', 'mode_changetargetchase', 'mode_targetweak',
        'mode_randomtarget', 'mode_ignoremelee', 'mode_ignoremagic', 'mode_ignoreranged',
        'mode_mvp', 'mode_ignoremisc', 'mode_knockbackimmune', 'mode_teleportblock',
        'mode_fixeditemdrop', 'mode_detector', 'mode_statusimmune', 'mode_skillimmune'
    ];
    const modes = {};
    for (const field of modeFields) {
        modes[field.replace('mode_', '')] = Boolean(row[field]);
    }
    return modes;
}

function extractDrops(row) {
    const drops = [];
    for (const col of mobDropColumns()) {
        const item = row[col.item];
        const rate = row[col.rate];
        if (!item) continue;
        drops.push({
            itemAegis: item,
            rate: rate ?? 0,
            type: col.type
        });
    }
    return drops;
}

async function resolveDropItems(drops) {
    if (drops.length === 0) return [];

    const aegisNames = [...new Set(drops.map((d) => d.itemAegis))];
    const placeholders = aegisNames.map(() => '?').join(', ');
    const items = await query(
        `SELECT id, name_aegis, name_english, type FROM ${effectiveItemsSql('i')}
         WHERE name_aegis IN (${placeholders})`,
        aegisNames
    );
    const itemMap = new Map(items.map((item) => [item.name_aegis, item]));

    return drops.map((drop) => {
        const item = itemMap.get(drop.itemAegis);
        return {
            itemId: item?.id ?? null,
            itemName: item?.name_english ?? drop.itemAegis,
            itemAegis: drop.itemAegis,
            itemType: item?.type ?? null,
            rate: drop.rate,
            type: drop.type,
            chancePercent: drop.rate != null ? (Math.min(drop.rate, 10000) / 100) : null
        };
    });
}

function mapMobDetailFromRow(row, drops = []) {
    return {
        ...mapMobSummary(row),
        str: row.str,
        agi: row.agi,
        vit: row.vit,
        int: row.int,
        dex: row.dex,
        luk: row.luk,
        walkSpeed: row.walk_speed,
        attackDelay: row.attack_delay,
        skillRange: row.skill_range,
        chaseRange: row.chase_range,
        ai: row.ai,
        modes: mapMobModes(row),
        drops
    };
}

async function attachDropsToMobRows(rows) {
    if (rows.length === 0) return [];

    const dropsByMob = rows.map((row) => extractDrops(row));
    const flatDrops = dropsByMob.flat();
    const resolvedFlat = await resolveDropItems(flatDrops);

    let offset = 0;
    return rows.map((row, index) => {
        const count = dropsByMob[index].length;
        const drops = resolvedFlat.slice(offset, offset + count);
        offset += count;
        return mapMobDetailFromRow(row, drops);
    });
}

function buildMobFilters(params) {
    const conditions = [];
    const values = [];

    if (params.q) {
        const term = params.q.trim();
        if (/^\d+$/.test(term)) {
            conditions.push('m.id = ?');
            values.push(parseInt(term, 10));
        } else {
            conditions.push('(m.name_english LIKE ? OR m.name_aegis LIKE ?)');
            const like = `%${term}%`;
            values.push(like, like);
        }
    }

    const elements = parseCsv(params.element);
    if (elements.length > 0) {
        conditions.push(`m.element IN (${elements.map(() => '?').join(', ')})`);
        values.push(...elements);
    }

    const races = parseCsv(params.race);
    if (races.length > 0) {
        conditions.push(`m.race IN (${races.map(() => '?').join(', ')})`);
        values.push(...races);
    }

    const sizes = parseCsv(params.size);
    if (sizes.length > 0) {
        conditions.push(`m.size IN (${sizes.map(() => '?').join(', ')})`);
        values.push(...sizes);
    }

    const levelMin = parseIntParam(params.levelMin);
    if (levelMin !== null) {
        conditions.push('m.level >= ?');
        values.push(levelMin);
    }

    const levelMax = parseIntParam(params.levelMax);
    if (levelMax !== null) {
        conditions.push('m.level <= ?');
        values.push(levelMax);
    }

    const baseExpMin = parseIntParam(params.baseExpMin);
    if (baseExpMin !== null) {
        conditions.push('m.base_exp >= ?');
        values.push(baseExpMin);
    }

    const baseExpMax = parseIntParam(params.baseExpMax);
    if (baseExpMax !== null) {
        conditions.push('m.base_exp <= ?');
        values.push(baseExpMax);
    }

    const jobExpMin = parseIntParam(params.jobExpMin);
    if (jobExpMin !== null) {
        conditions.push('m.job_exp >= ?');
        values.push(jobExpMin);
    }

    const jobExpMax = parseIntParam(params.jobExpMax);
    if (jobExpMax !== null) {
        conditions.push('m.job_exp <= ?');
        values.push(jobExpMax);
    }

    const attackRange = parseIntParam(params.attackRange);
    if (attackRange !== null) {
        conditions.push('m.attack_range = ?');
        values.push(attackRange);
    }

    const mvp = parseBool(params.mvp);
    if (mvp === true) {
        conditions.push('(m.mode_mvp = 1 OR m.mvp_exp > 0)');
    } else if (mvp === false) {
        conditions.push('(COALESCE(m.mode_mvp, 0) = 0 AND COALESCE(m.mvp_exp, 0) = 0)');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, values };
}

export async function searchMobs(params) {
    const { page, limit, offset } = parsePagination(params);
    const { whereClause, values } = buildMobFilters(params);
    const fromSql = effectiveMobsSql('m');

    const countRows = await query(
        `SELECT COUNT(*) AS total FROM ${fromSql} ${whereClause}`,
        values
    );
    const total = Number(countRows[0].total);

    const rows = await query(
        `SELECT m.* FROM ${fromSql}
         ${whereClause}
         ORDER BY m.name_english ASC
         LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    );

    const results = await attachDropsToMobRows(rows);

    return {
        total,
        page,
        limit,
        results
    };
}

export async function getMobById(id) {
    const rows = await query(
        `SELECT m.* FROM ${effectiveMobsSql('m')} WHERE m.id = ?`,
        [id]
    );
    if (rows.length === 0) return null;

    const row = rows[0];
    const drops = await resolveDropItems(extractDrops(row));
    return mapMobDetailFromRow(row, drops);
}

export async function getMobMeta() {
    const [elements, races, sizes] = await Promise.all([
        query(`SELECT DISTINCT element AS value FROM ${effectiveMobsSql('m')} WHERE element IS NOT NULL ORDER BY element`),
        query(`SELECT DISTINCT race AS value FROM ${effectiveMobsSql('m')} WHERE race IS NOT NULL ORDER BY race`),
        query(`SELECT DISTINCT size AS value FROM ${effectiveMobsSql('m')} WHERE size IS NOT NULL ORDER BY size`)
    ]);

    return {
        elements: elements.map((r) => r.value),
        races: races.map((r) => r.value),
        sizes: sizes.map((r) => r.value),
        defaults: {
            elements: MOB_ELEMENTS,
            races: MOB_RACES,
            sizes: MOB_SIZES
        }
    };
}

export async function getMobsDroppingItem(itemAegis) {
    const dropColumns = mobDropColumns();
    const rateCase = dropColumns.map((col) => `WHEN m.${col.item} = ? THEN m.${col.rate}`).join(' ');
    const typeCase = dropColumns.map((col) => `WHEN m.${col.item} = ? THEN '${col.type}'`).join(' ');
    const caseParams = dropColumns.flatMap(() => [itemAegis]);

    const rows = await query(
        `SELECT m.id, m.name_english, m.name_aegis, m.level,
                CASE ${rateCase} END AS rate,
                CASE ${typeCase} END AS drop_type
         FROM ${effectiveMobsSql('m')}
         WHERE ${mobDropMatchSql('m')}
         ORDER BY rate DESC, m.level ASC, m.name_english ASC`,
        [...caseParams, ...mobDropMatchParams(itemAegis)]
    );
    return rows.map((row) => ({
        id: row.id,
        name: row.name_english,
        nameAegis: row.name_aegis,
        level: row.level,
        rate: row.rate ?? 0,
        dropType: row.drop_type || 'normal',
        chancePercent: row.rate != null ? (Math.min(row.rate, 10000) / 100) : null
    }));
}
