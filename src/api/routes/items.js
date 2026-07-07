import { Router } from 'express';
import { getItemById, getItemMeta, searchItems } from '../services/itemQuery.js';

const router = Router();

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
