import { Router } from 'express';
import { getItemById, getItemMeta, searchItems } from '../services/itemQuery.js';
import {
    isItemDataAvailable,
    isMobDataAvailable,
    mobUnavailableError,
    parseBool
} from '../services/gameDb.js';

const router = Router();

function itemUnavailableError() {
    return {
        error: 'Datos de objetos no disponibles',
        hint: 'Importa item_db_re en MariaDB: mysql -u USER -p rathena < rathena/sql-files/item_db_re.sql'
    };
}

router.use((req, res, next) => {
    if (!isItemDataAvailable()) {
        return res.status(503).json(itemUnavailableError());
    }

    const hasDrop = parseBool(req.query.hasDrop);
    if (hasDrop !== null && !isMobDataAvailable()) {
        return res.status(503).json({
            ...mobUnavailableError(),
            detail: 'El filtro hasDrop requiere la tabla mob_db_re'
        });
    }

    next();
});

router.get('/meta', async (req, res) => {
    try {
        const meta = await getItemMeta();
        res.json(meta);
    } catch (error) {
        console.error('Error al obtener meta de objetos:', error);
        res.status(500).json({ error: 'Error al obtener meta de objetos' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'ID de objeto inválido' });
        }

        const item = await getItemById(id);
        if (!item) {
            return res.status(404).json({ error: 'Objeto no encontrado' });
        }

        res.json(item);
    } catch (error) {
        console.error('Error al obtener objeto:', error);
        res.status(500).json({ error: 'Error al obtener objeto' });
    }
});

router.get('/', async (req, res) => {
    try {
        const result = await searchItems(req.query);
        res.json(result);
    } catch (error) {
        console.error('Error al buscar objetos:', error);
        res.status(500).json({ error: 'Error al buscar objetos' });
    }
});

export default router;
