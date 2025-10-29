/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log'], function (record, search, log) {

    function createReturnAuthorization(data) {
        try {
            // -------------------------------------------------
            // 1. Validate Inputs
            // -------------------------------------------------
            if (!data.shopifyOrderName)
                throw new Error('shopifyOrderName is required');

            const shopifyRef = data.shopifyOrderName.toUpperCase().trim();
            if (!shopifyRef)
                throw new Error('shopifyOrderName is required');

            // -------------------------------------------------
            // 2. Find Customer (optional)
            // -------------------------------------------------
            let customerId = null;
            if (data.customerEmail) {
                const custSearch = search.create({
                    type: search.Type.CUSTOMER,
                    filters: [['email', 'is', data.customerEmail]],
                    columns: ['internalid']
                });
                const res = custSearch.run().getRange({ start: 0, end: 1 });
                if (res.length) customerId = res[0].getValue('internalid');
                else throw new Error(`Customer not found: ${data.customerEmail}`);
            }

            // -------------------------------------------------
            // 3. Find Source Transaction (Invoice → Sales Order)
            // -------------------------------------------------
            let sourceId = null;
            let sourceType = null;

            // Helper: Run transaction search
            function findTransaction(type, fieldId, value) {
                const s = search.create({
                    type: type,
                    filters: [[fieldId, 'contains', value]],
                    columns: ['internalid', 'tranid', 'createdfrom', 'memo']
                });
                return s.run().getRange({ start: 0, end: 1 });
            }

            // 🔹 Step 1: Look for Invoice with Memo containing Shopify order
            let invoiceResults = findTransaction(search.Type.INVOICE, 'memo', shopifyRef);

            if (invoiceResults.length > 0) {
                const invoiceId = invoiceResults[0].getValue('internalid');
                const createdFrom = invoiceResults[0].getValue('createdfrom'); // Sales Order link

                if (createdFrom) {
                    sourceId = createdFrom;
                    sourceType = 'Sales Order (via Invoice)';
                    log.audit('RA Source', `Invoice Found: Linked to Sales Order ID ${createdFrom}`);
                } else {
                    // fallback to Invoice directly if Created From is blank
                    sourceId = invoiceId;
                    sourceType = 'Invoice';
                    log.audit('RA Source', `Invoice Found (no Created From): ${invoiceId}`);
                }
            } else {
                // 🔹 Step 2: Look for Sales Order with Memo containing Shopify order
                const soResults = findTransaction(search.Type.SALES_ORDER, 'memo', shopifyRef);
                if (soResults.length > 0) {
                    sourceId = soResults[0].getValue('internalid');
                    sourceType = 'Sales Order';
                    log.audit('RA Source', `Sales Order Found: ${soResults[0].getValue('tranid')} (ID: ${sourceId})`);
                } else {
                    log.error('Search Failed', `No Invoice or Sales Order found for ${shopifyRef}`);
                    throw new Error(`No Invoice or Sales Order found for Shopify order: ${data.shopifyOrderName}`);
                }
            }

            // -------------------------------------------------
            // 4. Create Return Authorization
            // -------------------------------------------------
            const ra = record.create({
                type: record.Type.RETURN_AUTHORIZATION,
                isDynamic: true
            });

            if (customerId)
                ra.setValue({ fieldId: 'entity', value: customerId });

            ra.setValue({ fieldId: 'createdfrom', value: sourceId });

            // Build detailed memo
            let memoText = `Shopify Return for ${data.shopifyOrderName}`;
            if (data.message) memoText += ` – ${data.message}`;
            if (data.refundMethod) memoText += `\nCustomer's requested refund method: ${data.refundMethod}`;

            ra.setValue({
                fieldId: 'memo',
                value: memoText
            });

            // -------------------------------------------------
            // 5. Add Return Items
            // -------------------------------------------------
            if (data.items && data.items.length) {
                data.items.forEach(item => {
                    ra.selectNewLine({ sublistId: 'item' });
                    ra.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: item.itemId });
                    ra.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: item.quantity });
                    if (item.class)
                        ra.setCurrentSublistValue({ sublistId: 'item', fieldId: 'class', value: item.class });
                    ra.commitLine({ sublistId: 'item' });
                });
            }

            const raId = ra.save();
            log.audit('Return Authorization Created', {
                id: raId,
                createdFrom: sourceId,
                sourceType: sourceType
            });

            return { success: true, returnId: raId, createdFrom: sourceId, sourceType };

        } catch (e) {
            log.error('Return Creation Error', e.message + '\n' + e.stack);
            return { success: false, message: e.message };
        }
    }

    return { post: createReturnAuthorization };
});
