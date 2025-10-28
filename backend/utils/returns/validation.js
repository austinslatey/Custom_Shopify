const validateLookupInput = ({ first_name, last_name, email }) => {
    const errors = [];
    if (!first_name?.trim()) errors.push('First name is required');
    if (!last_name?.trim()) errors.push('Last name is required');
    if (!email?.trim()) errors.push('Email is required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.push('Invalid email format');
    }
    return errors.length ? errors : null;
};

const validateSubmitInput = ({ order_id, refund_method, items = [] }) => {
    const errors = [];
    if (!order_id) errors.push('Order ID is required');
    if (!['store_credit', 'original_payment'].includes(refund_method)) {
        errors.push('Invalid refund method');
    }
    if (!Array.isArray(items) || items.length === 0) {
        errors.push('At least one item must be selected');
    } else {
        items.forEach((it, idx) => {
            if (!it.line_item_id) errors.push(`Item ${idx + 1}: line_item_id missing`);
            if (!it.reason) errors.push(`Item ${idx + 1}: reason missing`);
        });
    }
    return errors.length ? errors : null;
};

// Helper: send validation errors
const sendValidationError = (res, errors) =>
  res.status(400).json({ error: errors.join('; ') });

export {validateLookupInput , validateSubmitInput, sendValidationError};