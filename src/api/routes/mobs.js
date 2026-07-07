import { Router } from 'express';
import { getMobById, getMobMeta, searchMobs } from '../services/mobQuery.js';

const router = Router();

router.get('/meta', async (req, res) => {
    try {
        const meta = await getMobMeta();
        res.json(meta);
    } catch (error) {
        console.error('Error al obtener meta de monstruos:', error);
        res.status(500).json({ error: 'Error al obtener meta de monstruos' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'ID de monstruo inválido' });
        }

        const mob = await getMobById(id);
        if (!mob) {
            return res.status(404).json({ error: 'Monstruo no encontrado' });
        }

        res.json(mob);
    } catch (error) {
        console.error('Error al obtener monstruo:', error);
        res.status(500).json({ error: 'Error al obtener monstruo' });
    }
});

router.get('/', async (req, res) => {
    try {
        const result = await searchMobs(req.query);
        res.json(result);
    } catch (error) {
        console.error('Error al buscar monstruos:', error);
        res.status(500).json({ error: 'Error al buscar monstruos' });
    }
});

export default router;
