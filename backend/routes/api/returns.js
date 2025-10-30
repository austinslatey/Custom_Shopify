import express from 'express';
import {
  validateLookupInput,
  validateSubmitInput,
  lookupCustomerOrders,
  processReturnSubmission,
  sendValidationError
} from '../../utils/returns/index.js';

const router = express.Router();

// POST /api/returns/lookup
router.post('/lookup', async (req, res) => {
  const { first_name, last_name, email } = req.body;

  const validationErrors = validateLookupInput({ first_name, last_name, email });
  if (validationErrors) return sendValidationError(res, validationErrors);

  try {
    const orders = await lookupCustomerOrders(first_name, last_name, email);
    res.json({ orders });
  } catch (err) {
    console.error('Return lookup error:', err);
    res.status(500).json({ error: 'Failed to lookup orders' });
  }
});

// POST /api/returns/submit
router.post('/submit', async (req, res) => {
  const { order_id, refund_method, message, items } = req.body;

  const validationErrors = validateSubmitInput({ order_id, refund_method, items });
  if (validationErrors) return sendValidationError(res, validationErrors);

  try {
    const result = await processReturnSubmission({
      order_id,
      refund_method,
      message,
      items,
    });

    res.json({
      success: true,
      message: `Return request for ${result.order_name} submitted successfully.`,
    });
  } catch (err) {
    console.error('Return submit error:', err);
    res.status(500).json({ error: err.message || 'Failed to submit return' });
  }
});

export default router;