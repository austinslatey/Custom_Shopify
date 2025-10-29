import { Router } from 'express';

const router = Router();

// Health check endpoint
router.get('/', (req, res) => res.json({ status: 'OK' }));

export default router;