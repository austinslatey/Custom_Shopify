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

            // Try Invoice first
            const invSearch = search.create({
                type: search.Type.INVOICE,
                filters: [['otherrefnum', 'is', data.shopifyOrderName]],
                columns: ['internalid']
            });
            const invRes = invSearch.run().getRange({ start: 0, end: 1 });

            if (invRes.length > 0) {
                sourceId = invRes[0].getValue('internalid');
                log.audit('RA Source', 'Found Invoice: ' + sourceId);
            } else {
                // Fallback: Try Sales Order
                const soSearch = search.create({
                    type: search.Type.SALES_ORDER,
                    filters: [['otherrefnum', 'is', data.shopifyOrderName]],
                    columns: ['internalid']
                });
                const soRes = soSearch.run().getRange({ start: 0, end: 1 });

                if (soRes.length > 0) {
                    sourceId = soRes[0].getValue('internalid');
                    log.audit('RA Created From', 'Fallback to Sales Order: ' + sourceId);
                } else {
                    throw new Error(
                        'No Invoice or Sales Order found for Shopify order: ' +
                        data.shopifyOrderName
                    );
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