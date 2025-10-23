import { Router } from 'express';
import quote from './quote.js';
import builder from './builder.js'

const router = Router();

router.use('/quote', quote);
router.use('/builder', builder);

export default router;