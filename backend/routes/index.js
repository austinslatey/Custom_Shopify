import { Router } from 'express';
import healthRoute from './health.js';
import apiRoutes from './api/index.js';

const router = Router();

router.use('/health', healthRoute);

router.use('/api', apiRoutes);

router.use((req, res) => {
    res.status(404).send('<h1>Check Your Routes!</h1>');
});

export default router;