import { Router } from 'express';
import quote from './quote.js';
import builder from './builder.js'
import returns from './returns.js'

const router = Router();

router.use('/quote', quote);
router.use('/builder', builder);
router.use('/returns', returns);

export default router;