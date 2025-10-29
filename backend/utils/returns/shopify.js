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
    // --- Step 1: Validate and enrich Shopify order data ---
    const order = await shopify.order.get(order_id, {
        fields: 'id,name,line_items,customer',
    });

    const validIds = order.line_items.map((li) => li.id);
    const invalid = items.filter((i) => !validIds.includes(Number(i.line_item_id)));
    if (invalid.length > 0) {
        throw new Error('One or more items do not belong to this order');
    }

    const enrichedItems = items.map((it) => {
        const lineItem = order.line_items.find((li) => li.id === Number(it.line_item_id));
        return {
            title: lineItem?.title || 'Unknown Item',
            sku: lineItem?.sku || null,
            reason: it.reason,
            product_id: lineItem?.product_id,
            quantity: it.quantity || 1,
            itemId: lineItem?.sku || lineItem?.id,
            class: 'RMA',
        };
    });

    // --- Step 2: Send confirmation/notification emails ---
    await sendReturnEmails({
        order_name: order.name,
        customer: order.customer,
        refund_method,
        message,
        items: enrichedItems,
    });

    // --- Step 3: Create Return Authorization in NetSuite ---
    const payload = {
        isReturnRequest: true,
        // Email lookup will be handled inside RESTlet
        customerEmail: order.customer?.email || null, 
        shopifyOrderName: order.name,
        //----- keep order id for if needed logging only  -------
        //orderId: order.id,  
        message,
        refundMethod: refund_method,
        items: enrichedItems.map((it) => ({
            itemId: it.itemId,
            quantity: it.quantity,
            class: it.class,
        })),
    };

    // Make the authenticated RESTlet request (auth handled in netsuiteRequest)
    const netsuiteResponse = await netsuiteRequest(payload);

    if (!netsuiteResponse.success) {
        throw new Error(netsuiteResponse.message || 'NetSuite return creation failed');
    }

    // --- Step 4: Return result ---
    return {
        success: true,
        order_name: order.name,
        return_id: netsuiteResponse.returnId,
        netsuite_response: netsuiteResponse,
    };
};