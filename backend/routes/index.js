import { Router } from 'express';
import apiRoutes from './api/index.js';

const router = Router();

// Add prefix `/api` to all api routes imported from `api` directory
router.use('/api', apiRoutes);

router.use((req, res) => {
    res.status(404).send('<h1>Check Your Routes!!!!</h1>');
});

export default router;