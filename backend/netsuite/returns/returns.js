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
            // 2. Validate Shopify Order Name
            // -------------------------------------------------
            if (!data.shopifyOrderName) {
                throw new Error('shopifyOrderName is required');
            }

            const shopifyRef = data.shopifyOrderName.toUpperCase().trim();
            if (!shopifyRef) throw new Error('shopifyOrderName is required');

            // -------------------------------------------------
            // 3. Find Invoice → fallback to Sales Order
            // -------------------------------------------------
            let sourceId = null;

            /**
             * Helper: Searches transaction type for Shopify reference across multiple fields
             */
            function findTransaction(type) {
                const s = search.create({
                    type: type,
                    filters: [
                        [
                            ['otherrefnum', 'contains', shopifyRef], 'OR',
                            ['custbody_work_order', 'contains', shopifyRef], 'OR',
                            ['memo', 'contains', shopifyRef], 'OR',
                            ['tranid', 'contains', shopifyRef]
                        ]
                    ],
                    columns: [
                        'internalid', 'tranid', 'otherrefnum', 'memo'
                    ]
                });

                const results = s.run().getRange({ start: 0, end: 5 });
                log.audit(`Search Results (${type})`, JSON.stringify(results.map(r => ({
                    id: r.getValue('internalid'),
                    tranid: r.getValue('tranid'),
                    memo: r.getValue('memo'),
                    po: r.getValue('otherrefnum')
                }))));
                return results;
            }

            // Try to find matching Invoice
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
                    log.error('Search Failed', `No Invoice or Sales Order found with reference: ${shopifyRef}`);
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

            if (customerId) {
                ra.setValue({ fieldId: 'entity', value: customerId });
            }

            // Set Created From (Invoice or Sales Order)
            ra.setValue({ fieldId: 'createdfrom', value: sourceId });

            // Add Memo
            ra.setValue({
                fieldId: 'memo',
                value: `Shopify Return for ${data.shopifyOrderName} – ${data.message || ''}`
            });

            // -------------------------------------------------
            // 5. Add Items
            // -------------------------------------------------
            if (data.items && data.items.length > 0) {
                data.items.forEach(item => {
                    ra.selectNewLine({ sublistId: 'item' });
                    ra.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: item.itemId });
                    ra.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: item.quantity });
                    if (item.class) {
                        ra.setCurrentSublistValue({ sublistId: 'item', fieldId: 'class', value: item.class });
                    }
                    ra.commitLine({ sublistId: 'item' });
                });
            }

            const raId = ra.save();
            log.audit('Return Authorization Created', `Return Auth ID: ${raId}`);
            return { success: true, returnId: raId };

        } catch (e) {
            log.error('Return Creation Error', e.message + '\n' + e.stack);
            return { success: false, message: e.message };
        }
    }

    return { post: createReturnAuthorization };
});
