/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log'], function (record, search, log) {

    function createReturnAuthorization(data) {
        try {
            // -------------------------------------------------
            // 1. Find Customer
            // -------------------------------------------------
            let customerId = null;
            if (data.customerEmail) {
                const custSearch = search.create({
                    type: search.Type.CUSTOMER,
                    filters: [['email', 'is', data.customerEmail]],
                    columns: ['internalid']
                });
                const res = custSearch.run().getRange({ start: 0, end: 1 });
                if (res.length > 0) {
                    customerId = res[0].getValue('internalid');
                } else {
                    throw new Error('Customer not found: ' + data.customerEmail);
                }
            }

            // -------------------------------------------------
            // 2. Validate shopifyOrderName
            // -------------------------------------------------
            if (!data.shopifyOrderName) {
                throw new Error('shopifyOrderName is required');
            }

            // -------------------------------------------------
            // 3. Find Invoice → fallback to Sales Order
            // -------------------------------------------------

            // Will hold Invoice or Sales Order internal ID
            let sourceId = null;
            const shopifyRef = data.shopifyOrderName.toUpperCase().trim();

            if (!shopifyRef) {
                throw new Error('shopifyOrderName is required');
            }

            // Helper function to search transaction
            function findTransaction(type) {
                const s = search.create({
                    type: type,
                    filters: [
                        ['otherrefnum', 'contains', shopifyRef]
                    ],
                    columns: ['internalid', 'tranid', 'otherrefnum']
                });
                return s.run().getRange({ start: 0, end: 1 });
            }

            // Try Invoice
            let results = findTransaction(search.Type.INVOICE);
            if (results.length > 0) {
                sourceId = results[0].getValue('internalid');
                log.audit('RA Source', `Found Invoice: ${results[0].getValue('tranid')} (ID: ${sourceId})`);
            } else {
                // Try Sales Order
                results = findTransaction(search.Type.SALES_ORDER);
                if (results.length > 0) {
                    sourceId = results[0].getValue('internalid');
                    log.audit('RA Source', `Fallback to Sales Order: ${results[0].getValue('tranid')} (ID: ${sourceId})`);
                } else {
                    log.error('Search Failed', `No records found with otherrefnum containing: ${shopifyRef}`);
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

            ra.setValue({ fieldId: 'entity', value: customerId });

            // Valid: Invoice or SO
            ra.setValue({ fieldId: 'createdfrom', value: sourceId });

            ra.setValue({
                fieldId: 'memo',
                value: `Shopify Return for ${data.shopifyOrderName} – ${data.message || ''}`
            });

            // Add Items to be returned
            data.items.forEach(item => {
                ra.selectNewLine({ sublistId: 'item' });
                ra.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: item.itemId });
                ra.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: item.quantity });
                ra.setCurrentSublistValue({ sublistId: 'item', fieldId: 'class', value: item.class || 'RMA' });
                ra.commitLine({ sublistId: 'item' });
            });

            const raId = ra.save();
            return { success: true, returnId: raId };

        } catch (e) {
            log.error('Return Creation Error', e.message + '\n' + e.stack);
            return { success: false, message: e.message };
        }
    }

    return { post: createReturnAuthorization };
});