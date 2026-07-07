import { query } from '../../services/mariadb.js';
import { getMobsDroppingItem } from './mobQuery.js';
import {
    effectiveMobsSql,
    effectiveItemsSql,
    isMobDataAvailable,
    mobDropColumns,
    parsePagination,
    parseCsv,
    parseBool,
    parseIntParam,
    ITEM_TYPES,
    ITEM_CLASSES,
    ITEM_CLASS_COLUMNS,
    JOB_COLUMNS
} from './gameDb.js';

function mapItemLocations(row) {
    const locationFields = [
        ['headTop', 'location_head_top'],
        ['headMid', 'location_head_mid'],
        ['headLow', 'location_head_low'],
        ['armor', 'location_armor'],
        ['rightHand', 'location_right_hand'],
        ['leftHand', 'location_left_hand'],
        ['garment', 'location_garment'],
        ['shoes', 'location_shoes'],
        ['rightAccessory', 'location_right_accessory'],
        ['leftAccessory', 'location_left_accessory'],
        ['costumeHeadTop', 'location_costume_head_top'],
        ['costumeHeadMid', 'location_costume_head_mid'],
        ['costumeHeadLow', 'location_costume_head_low'],
        ['costumeGarment', 'location_costume_garment'],
        ['ammo', 'location_ammo'],
        ['shadowArmor', 'location_shadow_armor'],
        ['shadowWeapon', 'location_shadow_weapon'],
        ['shadowShield', 'location_shadow_shield'],
        ['shadowShoes', 'location_shadow_shoes'],
        ['shadowRightAccessory', 'location_shadow_right_accessory'],
        ['shadowLeftAccessory', 'location_shadow_left_accessory']
    ];
    const locations = {};
    for (const [key, column] of locationFields) {
        if (row[column]) locations[key] = true;
    }
    return locations;
}

function mapItemJobs(row) {
    const jobs = [];
    if (row.job_all) return { all: true, jobs: Object.keys(JOB_COLUMNS) };
    for (const [job, column] of Object.entries(JOB_COLUMNS)) {
        if (row[column]) jobs.push(job);
    }
    return { all: false, jobs };
}

function mapItemClasses(row) {
    const classes = [];
    if (row.class_all) return { all: true, classes: ITEM_CLASSES };
    for (const cls of ITEM_CLASSES) {
        const column = ITEM_CLASS_COLUMNS[cls];
        if (row[column]) classes.push(cls);
    }
    return { all: false, classes };
}

function mapItemSummary(row) {
    return {
        id: row.id,
        name: row.name_english,
        nameAegis: row.name_aegis,
        type: row.type,
        subtype: row.subtype,
        attack: row.attack,
        magicAttack: row.magic_attack,
        defense: row.defense,
        weight: row.weight,
        priceBuy: row.price_buy,
        priceSell: row.price_sell,
        slots: row.slots,
        equipLevelMin: row.equip_level_min,
        equipLevelMax: row.equip_level_max
    };
}

function mapItemDetail(row) {
    return {
        ...mapItemSummary(row),
        range: row.range,
        weaponLevel: row.weapon_level,
        armorLevel: row.armor_level,
        refineable: Boolean(row.refineable),
        gradable: Boolean(row.gradable),
        gender: row.gender,
        script: row.script,
        equipScript: row.equip_script,
        unequipScript: row.unequip_script,
        jobs: mapItemJobs(row),
        classes: mapItemClasses(row),
        locations: mapItemLocations(row)
    };
}

function buildHasDropExists() {
    const orConditions = mobDropColumns().map((col) => `m.${col.item} = i.name_aegis`);
    return `EXISTS (SELECT 1 FROM ${effectiveMobsSql('m')} WHERE ${orConditions.join(' OR ')})`;
}

function buildItemFilters(params) {
    const conditions = [];
    const values = [];

    if (params.q) {
        const term = params.q.trim();
        if (/^\d+$/.test(term)) {
            conditions.push('i.id = ?');
            values.push(parseInt(term, 10));
        } else {
            conditions.push('(i.name_english LIKE ? OR i.name_aegis LIKE ?)');
            const like = `%${term}%`;
            values.push(like, like);
        }
    }

    const types = parseCsv(params.type);
    if (types.length > 0) {
        conditions.push(`i.type IN (${types.map(() => '?').join(', ')})`);
        values.push(...types);
    }

    const classes = parseCsv(params.class);
    if (classes.length > 0) {
        const classConditions = classes
            .filter((cls) => ITEM_CLASS_COLUMNS[cls])
            .map((cls) => `i.${ITEM_CLASS_COLUMNS[cls]} = 1`);
        if (classConditions.length > 0) {
            conditions.push(`(i.class_all = 1 OR (${classConditions.join(' OR ')}))`);
        }
    }

    const jobs = parseCsv(params.jobs);
    const jobsStrict = parseBool(params.jobsStrict) === true;
    if (jobs.length > 0) {
        const jobConditions = jobs
            .filter((job) => JOB_COLUMNS[job])
            .map((job) => `i.${JOB_COLUMNS[job]} = 1`);
        if (jobConditions.length > 0) {
            if (jobsStrict) {
                conditions.push(`(${jobConditions.join(' OR ')})`);
            } else {
                conditions.push(`(i.job_all = 1 OR (${jobConditions.join(' OR ')}))`);
            }
        }
    }

    if (params.script) {
        conditions.push('i.script LIKE ?');
        values.push(`%${params.script.trim()}%`);
    }

    const slots = parseCsv(params.slots);
    if (slots.length > 0) {
        const slotValues = slots.map((s) => parseInt(s, 10)).filter((n) => !Number.isNaN(n));
        if (slotValues.length > 0) {
            conditions.push(`i.slots IN (${slotValues.map(() => '?').join(', ')})`);
            values.push(...slotValues);
        }
    }

    const hasDrop = parseBool(params.hasDrop);
    if (hasDrop === true) {
        conditions.push(buildHasDropExists());
    } else if (hasDrop === false) {
        conditions.push(`NOT ${buildHasDropExists()}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, values };
}

export async function searchItems(params) {
    const { page, limit, offset } = parsePagination(params);
    const { whereClause, values } = buildItemFilters(params);
    const fromSql = effectiveItemsSql('i');

    const countRows = await query(
        `SELECT COUNT(*) AS total FROM ${fromSql} ${whereClause}`,
        values
    );
    const total = Number(countRows[0].total);

    const rows = await query(
        `SELECT i.* FROM ${fromSql}
         ${whereClause}
         ORDER BY i.name_english ASC
         LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    );

    return {
        total,
        page,
        limit,
        results: rows.map(mapItemDetail)
    };
}

export async function getItemById(id) {
    const rows = await query(
        `SELECT i.* FROM ${effectiveItemsSql('i')} WHERE i.id = ?`,
        [id]
    );
    if (rows.length === 0) return null;

    const item = mapItemDetail(rows[0]);
    item.droppedBy = isMobDataAvailable()
        ? await getMobsDroppingItem(rows[0].name_aegis)
        : [];
    return item;
}

export async function getItemMeta() {
    const [types] = await Promise.all([
        query(`SELECT DISTINCT type AS value FROM ${effectiveItemsSql('i')} WHERE type IS NOT NULL ORDER BY type`)
    ]);

    return {
        types: types.map((r) => r.value),
        classes: ITEM_CLASSES,
        jobs: Object.keys(JOB_COLUMNS),
        defaults: {
            types: ITEM_TYPES
        }
    };
}
