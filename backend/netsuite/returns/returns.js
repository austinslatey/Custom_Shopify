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
            let invoiceId = null;

            function findTransaction(type, value) {
                const s = search.create({
                    type: type,
                    filters: [
                        [
                            ['formulatext: UPPER({memo})', 'contains', value.toUpperCase()],
                            'OR',
                            ['formulatext: UPPER({otherrefnum})', 'contains', value.toUpperCase()]
                        ]
                    ],
                    columns: ['internalid', 'tranid', 'createdfrom', 'memo', 'otherrefnum']
                });
                const results = s.run().getRange({ start: 0, end: 5 });
                log.audit(`Search Results (${type})`, JSON.stringify(results.map(r => ({
                    id: r.getValue('internalid'),
                    tranid: r.getValue('tranid'),
                    memo: r.getValue('memo'),
                    po: r.getValue('otherrefnum'),
                    createdfrom: r.getText('createdfrom')
                }))));

                return results;
            }

            // Invoice primary
            let invoiceResults = findTransaction(search.Type.INVOICE, shopifyRef);

            if (invoiceResults.length > 0) {
                sourceId = invoiceResults[0].getValue('internalid'); // RA createdfrom = Invoice
                sourceType = 'Invoice';
                invoiceId = sourceId;
                log.audit('RA Source', `Invoice Found: ID ${sourceId}`);
            } else {
                const soResults = findTransaction(search.Type.SALES_ORDER, shopifyRef);
                if (soResults.length > 0) {
                    sourceId = soResults[0].getValue('internalid');
                    sourceType = 'Sales Order';
                    log.audit('RA Source', `Sales Order Found: ${soResults[0].getValue('tranid')} (ID: ${sourceId})`);
                } else {
                    throw new Error(`No Invoice or Sales Order found for Shopify order: ${data.shopifyOrderName}`);
                }
            }

            // -------------------------------------------------
            // 4. Retrieve Tax Item & Tax Rate
            // -------------------------------------------------
            let taxItemId = null;
            let taxRate = null;

            function getTaxFields(recordType, recId) {
                try {
                    const rec = record.load({ type: recordType, id: recId, isDynamic: false });
                    return {
                        taxItemId: rec.getValue({ fieldId: 'taxitem' }),
                        taxRate: rec.getValue({ fieldId: 'taxrate' })
                    };
                } catch (e) {
                    log.error('Tax Lookup Failed', `${recordType} ID ${recId}: ${e.message}`);
                    return { taxItemId: null, taxRate: null };
                }
            }

            if (invoiceId) {
                ({ taxItemId, taxRate } = getTaxFields(search.Type.INVOICE, invoiceId));

                // fallback to SO if missing
                if (!taxItemId && sourceId) {
                    log.audit('Tax Fallback', 'No tax found on Invoice, checking Sales Order...');
                    ({ taxItemId, taxRate } = getTaxFields(search.Type.SALES_ORDER, sourceId));
                }
            } else if (sourceId) {
                ({ taxItemId, taxRate } = getTaxFields(search.Type.SALES_ORDER, sourceId));
            }

            log.audit('Final Tax Info', { taxItemId, taxRate });

            // -------------------------------------------------
            // 5. Custom Price Level (hardcoded)
            // -------------------------------------------------
            const customPriceLevelId = -1;

            // -------------------------------------------------
            // 6. Create Return Authorization
            // -------------------------------------------------
            const ra = record.create({ type: record.Type.RETURN_AUTHORIZATION, isDynamic: true });

            if (customerId) ra.setValue({ fieldId: 'entity', value: customerId });
            if (sourceId) ra.setValue({ fieldId: 'createdfrom', value: sourceId });

            let memoText = `Shopify Return for ${data.shopifyOrderName}`;
            if (data.message) memoText += ` – ${data.message}`;
            if (data.refundMethod) memoText += `\nCustomer's requested refund method: ${data.refundMethod}`;
            ra.setValue({ fieldId: 'memo', value: memoText });

            // -------------------------------------------------
            // 7. Add Return Items
            // -------------------------------------------------
            function resolveItemInternalId(partNumber) {
                const itemSearch = search.create({
                    type: search.Type.ITEM,
                    filters: [['itemid', 'is', partNumber]],
                    columns: ['internalid']
                });
                const res = itemSearch.run().getRange({ start: 0, end: 1 });
                return res.length ? res[0].getValue('internalid') : null;
            }

            if (data.items?.length) {
                data.items.forEach(item => {
                    const itemInternalId = resolveItemInternalId(item.itemId);
                    if (!itemInternalId) throw new Error(`Item not found: ${item.itemId}`);

                    ra.selectNewLine({ sublistId: 'item' });
                    ra.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: itemInternalId });
                    ra.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: item.quantity });
                    ra.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: customPriceLevelId });
                    ra.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: item.price });

                    if (item.division !== undefined) {
                        ra.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: item.division });
                    }

                    ra.commitLine({ sublistId: 'item' });
                });
            }

            // -------------------------------------------------
            // 8. Apply Tax Item & Rate
            // -------------------------------------------------
            if (taxItemId) ra.setValue({ fieldId: 'taxitem', value: taxItemId });
            if (taxRate) ra.setValue({ fieldId: 'taxrate', value: taxRate });

            // -------------------------------------------------
            // 9. Save Return Authorization
            // -------------------------------------------------
            const raId = ra.save();
            log.audit('Return Authorization Created', {
                id: raId,
                createdFrom: sourceId,
                sourceType,
                taxItemId,
                taxRate,
                customPriceLevelId
            });

            return { success: true, returnId: raId, createdFrom: sourceId, sourceType };

        } catch (e) {
            log.error('Return Creation Error', e.message + '\n' + e.stack);
            return { success: false, message: e.message };
        }
    }

    return { post: createReturnAuthorization };
});
