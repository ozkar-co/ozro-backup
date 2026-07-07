export const TABLES = {
    MOB: 'mob_db_re',
    MOB2: 'mob_db2_re',
    ITEM: 'item_db_re',
    ITEM2: 'item_db2_re'
};

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

export function effectiveMobsSql(alias = 'm') {
    return `(
        SELECT * FROM ${TABLES.MOB}
        WHERE id NOT IN (SELECT id FROM ${TABLES.MOB2})
        UNION ALL
        SELECT * FROM ${TABLES.MOB2}
    ) AS ${alias}`;
}

export function effectiveItemsSql(alias = 'i') {
    return `(
        SELECT * FROM ${TABLES.ITEM}
        WHERE id NOT IN (SELECT id FROM ${TABLES.ITEM2})
        UNION ALL
        SELECT * FROM ${TABLES.ITEM2}
    ) AS ${alias}`;
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

export function mobDropMatchSql(mobAlias, itemAegisParam) {
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
