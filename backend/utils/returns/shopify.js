import dotenv from 'dotenv';
import Shopify from 'shopify-api-node';
import { sendReturnEmails } from './email.js';

// Load environment variables
dotenv.config();

const shopify = new Shopify({
    shopName: process.env.SHOPIFY_SHOP_ADMIN,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
});

export const lookupCustomerOrders = async (first_name, last_name, email) => {
    const customers = await shopify.customer.search({ query: `email:${email.trim()}` });

    const customer = customers.find(
        (c) =>
            c.first_name?.toLowerCase() === first_name.trim().toLowerCase() &&
            c.last_name?.toLowerCase() === last_name.trim().toLowerCase()
    );

    if (!customer) return [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await shopify.order.list({
        customer_id: customer.id,
        created_at_min: thirtyDaysAgo.toISOString(),
        status: 'any',
        fields: 'id,name,created_at,line_items',
        limit: 50,
    });

    // Enrich line_items with image_src
    const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
            const lineItemsWithImages = await Promise.all(
                order.line_items.map(async (item) => {
                    let imageSrc = null;
                    if (item.variant_id) {
                        try {
                            const variant = await shopify.productVariant.get(item.variant_id);
                            imageSrc = variant.image?.src || null;
                        } catch (error) {
                            console.error(`Error fetching variant image for ID ${item.variant_id}:`, error);
                        }
                    }
                    return {
                        id: item.id,
                        title: item.title,
                        variant_title: item.variant_title || null,
                        quantity: item.quantity,
                        sku: item.sku || null,
                        image_src: imageSrc,
                    };
                })
            );
            return {
                id: order.id,
                name: order.name,
                created_at: order.created_at,
                line_items: lineItemsWithImages,
            };
        })
    );

    return enrichedOrders;
};

export const processReturnSubmission = async ({
    order_id,
    refund_method,
    message = '',
    items = [],
}) => {
    const order = await shopify.order.get(order_id, {
        fields: 'id,name,line_items,customer',
    });

    const validIds = order.line_items.map((li) => li.id);
    const invalid = items.filter((i) => !validIds.includes(Number(i.line_item_id)));
    if (invalid.length > 0) {
        throw new Error('One or more items do not belong to this order');
    }

    // Build enriched items for email
    const enrichedItems = items.map((it) => {
        const lineItem = order.line_items.find((li) => li.id === Number(it.line_item_id));
        return {
            title: lineItem?.title || 'Unknown Item',
            sku: lineItem?.sku || null,
            reason: it.reason,
        };
    });

    // Send emails
    await sendReturnEmails({
        order_name: order.name,
        customer: order.customer,
        refund_method,
        message,
        items: enrichedItems,
    });

    // TODO: Add DB save, NetSuite sync, etc.
    // await saveReturnToDB(...);
    // await syncWithNetSuite(...);

    return { success: true, order_name: order.name };
};