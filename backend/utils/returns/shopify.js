import dotenv from 'dotenv';
import Shopify from 'shopify-api-node';
import { sendReturnEmails } from './email.js';
import { netsuiteRequest } from '../netsuite.js';

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

    return await Promise.all(orders.map(async (order) => ({
        id: order.id,
        name: order.name,
        created_at: order.created_at,
        line_items: await Promise.all(order.line_items.map(async (item) => {
            let imageSrc = item.image?.src || null;
            if (!imageSrc && item.variant_id) {
                try {
                    const variant = await shopify.productVariant.get(item.variant_id);
                    imageSrc = variant.image?.src || null;
                } catch (err) {
                    console.error(`Failed to fetch variant image for ${item.variant_id}:`, err);
                }
            }
            if (!imageSrc && item.product_id) {
                try {
                    const product = await shopify.product.get(item.product_id);
                    imageSrc = product.image?.src || null;
                } catch (err) {
                    console.error(`Failed to fetch product image for ${item.product_id}:`, err);
                }
            }
            return {
                id: item.id,
                title: item.title,
                variant_title: item.variant_title || null,
                quantity: item.quantity,
                sku: item.sku || null,
                image_src: imageSrc,
                variant_id: item.variant_id || null,
                product_id: item.product_id || null
            };
        }))
    })));
};

export const processReturnSubmission = async ({
    order_id,
    refund_method,
    message = '',
    items = [],
}) => {
    // --- Step 1: Fetch FULL order with line item prices ---
    const order = await shopify.order.get(order_id, {
        fields: 'id,name,line_items,customer,financial_status,total_price',
    });

    const validIds = order.line_items.map((li) => li.id);
    const invalid = items.filter((i) => !validIds.includes(Number(i.line_item_id)));
    if (invalid.length > 0) {
        throw new Error('One or more items do not belong to this order');
    }

    // === CONFIG ===
    const RMA_DIVISION_ID = process.env.NETSUITE_RMA_DIVISION_ID || 3;
    const RMA_LOCATION_ID = process.env.NETSUITE_RMA_LOCATION_ID || null;

    // --- Enrich items with price, SKU, etc. ---
    const enrichedItems = items.map((it) => {
        const lineItem = order.line_items.find((li) => li.id === Number(it.line_item_id));
        if (!lineItem) throw new Error(`Line item ${it.line_item_id} not found`);

        // Use line_item.price (Shopify always includes it)
        const price = parseFloat(lineItem.price) || 0;

        return {
            title: lineItem.title || 'Unknown Item',
            sku: lineItem.sku || null,
            reason: it.reason,
            product_id: lineItem.product_id,
            variant_id: lineItem.variant_id,
            quantity: it.quantity || 1,
            itemId: lineItem.sku || lineItem.id.toString(),
            division: 'RMA',
            price: price,
        };
    });

    // --- Step 2: Send emails ---
    await sendReturnEmails({
        order_name: order.name,
        customer: order.customer,
        refund_method,
        message,
        items: enrichedItems,
    });

    // --- Step 3: Build NetSuite payload with price ---
    const payload = {
        isReturnRequest: true,
        customerEmail: order.customer?.email || null,
        shopifyOrderName: order.name,
        message,
        refundMethod: refund_method,
        items: enrichedItems.map((it) => ({
            itemId: it.itemId,
            quantity: it.quantity,
            price: it.price,           // ← SEND PRICE
            division: RMA_DIVISION_ID, // custcol_division
            location: RMA_LOCATION_ID, // optional
        })),
    };

    // --- Step 4: Call NetSuite ---
    const netsuiteResponse = await netsuiteRequest(payload);

    if (!netsuiteResponse.success) {
        throw new Error(netsuiteResponse.message || 'NetSuite return creation failed');
    }

    // --- Step 5: Return result ---
    return {
        success: true,
        order_name: order.name,
        return_id: netsuiteResponse.returnId,
        netsuite_response: netsuiteResponse,
    };
};