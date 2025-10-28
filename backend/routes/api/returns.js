// routes/api/returns.js
import express from 'express';
import Shopify from 'shopify-api-node';

const router = express.Router();

const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN

if (!SHOPIFY_SHOP || !SHOPIFY_ACCESS_TOKEN) {
    throw new Error('Missing SHOPIFY_SHOP or SHOPIFY_ACCESS_TOKEN in .env');
}

const shopify = new Shopify({
    shopName: SHOPIFY_SHOP,
    accessToken: SHOPIFY_ACCESS_TOKEN,
});

/**
 * POST /api/returns/lookup
 * Body (form-urlencoded or JSON): { first_name, last_name, email }
 */
router.post('/lookup', async (req, res) => {
    const { first_name, last_name, email } = req.body;

    if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // 1. Find customer by email
        const customers = await shopify.customer.search({ query: `email:${email.trim()}` });

        const customer = customers.find(
            (c) =>
                c.first_name?.toLowerCase() === first_name.trim().toLowerCase() &&
                c.last_name?.toLowerCase() === last_name.trim().toLowerCase()
        );

        if (!customer) return res.json({ orders: [] });

        // 2. Orders from the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const orders = await shopify.order.list({
            customer_id: customer.id,
            created_at_min: thirtyDaysAgo.toISOString(),
            status: 'any',
            fields: 'id,name,created_at,line_items,customer',
            limit: 50,
        });

        // Clean payload for the front-end
        const cleanOrders = orders.map((order) => ({
            id: order.id,
            name: order.name,
            created_at: order.created_at,
            line_items: order.line_items.map((item) => ({
                id: item.id,
                title: item.title,
                variant_title: item.variant_title || null,
                quantity: item.quantity,
                sku: item.sku || null,
            })),
        }));

        res.json({ orders: cleanOrders });
    } catch (err) {
        console.error('Return lookup error:', err);
        res.status(500).json({ error: 'Failed to lookup orders' });
    }
});

/**
 * POST /api/returns/submit
 * Body: {
 *   order_id,
 *   refund_method,
 *   message (optional),
 *   items: [{ line_item_id, reason }]
 * }
 */
router.post('/submit', async (req, res) => {
    const { order_id, refund_method, message = '', items = [] } = req.body;

    if (
        !order_id ||
        !refund_method ||
        !Array.isArray(items) ||
        items.length === 0 ||
        items.some((i) => !i.line_item_id || !i.reason)
    ) {
        return res.status(400).json({ error: 'Invalid request data' });
    }

    try {
        // Optional: verify order + line items belong to it
        const order = await shopify.order.get(order_id, {
            fields: 'id,name,line_items,customer',
        });

        const validIds = order.line_items.map((li) => li.id);
        const invalid = items.filter((i) => !validIds.includes(Number(i.line_item_id)));
        if (invalid.length) {
            return res.status(400).json({ error: 'One or more items do not belong to this order' });
        }

        // ----------------------------------------------------------------
        // YOUR BUSINESS LOGIC HERE
        // ----------------------------------------------------------------
        // Example: log + send email (replace with your utils)
        console.log('New Return Request:', {
            order_id,
            order_name: order.name,
            customer: order.customer,
            refund_method,
            message,
            items: items.map((i) => ({
                line_item_id: i.line_item_id,
                reason: i.reason,
            })),
        });

        // await sendReturnEmail({ ... });   // <-- your utils/email.js
        // await saveToDatabase(...);        // <-- your DB layer
        // await triggerNetSuiteSync(...);   // <-- your netsuite/ module

        res.json({
            message: 'Return request submitted successfully. We’ll email you next steps.',
        });
    } catch (err) {
        console.error('Return submit error:', err);
        res.status(500).json({ error: 'Failed to submit return' });
    }
});

export default router;