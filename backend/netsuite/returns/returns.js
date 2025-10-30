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
            let sourceRecordType = null;
            let invoiceId = null;

            function findTransaction(type, value) {
                const s = search.create({
                    type: type,
                    filters: [
                        [
                            ['formula(text)', 'contains', `UPPER({memo})`],
                            'OR',
                            ['formula(text)', 'contains', `UPPER({otherrefnum})`]
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

            const invoiceResults = findTransaction(search.Type.INVOICE, shopifyRef);

            if (invoiceResults.length > 0) {
                invoiceId = invoiceResults[0].getValue('internalid');
                const createdFrom = invoiceResults[0].getValue('createdfrom');
                if (createdFrom) {
                    sourceId = createdFrom;
                    sourceType = 'Sales Order (via Invoice)';
                    sourceRecordType = search.Type.INVOICE;
                    log.audit('RA Source', `Invoice Found: Linked to Sales Order ID ${createdFrom}`);
                } else {
                    sourceId = invoiceId;
                    sourceType = 'Invoice';
                    sourceRecordType = search.Type.INVOICE;
                    log.audit('RA Source', `Invoice Found (no Created From): ${invoiceId}`);
                }
            } else {
                const soResults = findTransaction(search.Type.SALES_ORDER, shopifyRef);
                if (soResults.length > 0) {
                    sourceId = soResults[0].getValue('internalid');
                    sourceType = 'Sales Order';
                    sourceRecordType = search.Type.SALES_ORDER;
                    log.audit('RA Source', `Sales Order Found: ${soResults[0].getValue('tranid')} (ID: ${sourceId})`);
                } else {
                    log.error('Search Failed', `No Invoice or Sales Order found for ${shopifyRef}`);
                    throw new Error(`No Invoice or Sales Order found for Shopify order: ${data.shopifyOrderName}`);
                }
            }

            // -------------------------------------------------
            // 4. Retrieve Tax Item & Tax Rate (with fallback)
            // -------------------------------------------------
            let taxItemId = null;
            let taxRate = null;

            function getTaxFields(recordType, recId) {
                try {
                    const fields = search.lookupFields({
                        type: recordType,
                        id: recId,
                        columns: ['taxitem', 'taxrate']
                    });
                    return {
                        taxItemId: fields.taxitem?.[0]?.value || null,
                        taxRate: parseFloat(fields.taxrate) || null
                    };
                } catch (e) {
                    log.error('Tax Lookup Failed', `${recordType} ID ${recId}: ${e.message}`);
                    return { taxItemId: null, taxRate: null };
                }
            }

            // Try invoice first, fallback to SO if not found
            if (invoiceId) {
                const invTax = getTaxFields(search.Type.INVOICE, invoiceId);
                taxItemId = invTax.taxItemId;
                taxRate = invTax.taxRate;

                if (!taxItemId && sourceId) {
                    log.audit('Tax Fallback', 'No tax found on Invoice, checking Sales Order...');
                    const soTax = getTaxFields(search.Type.SALES_ORDER, sourceId);
                    taxItemId = soTax.taxItemId;
                    taxRate = soTax.taxRate;
                }
            } else if (sourceId) {
                const soTax = getTaxFields(search.Type.SALES_ORDER, sourceId);
                taxItemId = soTax.taxItemId;
                taxRate = soTax.taxRate;
            }

            log.audit('Final Tax Info', { taxItemId, taxRate });

            // -------------------------------------------------
            // 5. Find & Log "Custom" Price Level internal ID
            // -------------------------------------------------
            let customPriceLevelId = -1;
            try {
                const priceLevelSearch = search.create({
                    type: 'pricelevel',
                    filters: [['name', 'is', 'Custom']],
                    columns: ['internalid', 'name']
                });
                const plRes = priceLevelSearch.run().getRange({ start: 0, end: 1 });

                if (plRes.length) {
                    customPriceLevelId = parseInt(plRes[0].getValue('internalid'), 10);
                    log.audit('Custom Price Level Found', { id: customPriceLevelId });
                } else {
                    log.error('Custom Price Level Not Found', 'Listing all price levels for verification...');
                    const allLevels = search.create({
                        type: 'pricelevel',
                        columns: ['internalid', 'name']
                    }).run().getRange({ start: 0, end: 100 });
                    const levelList = allLevels.map(l => ({
                        id: l.getValue('internalid'),
                        name: l.getValue('name')
                    }));
                    log.audit('All Price Levels', JSON.stringify(levelList));
                }
            } catch (e) {
                log.error('Price Level Lookup Failed', e.message);
            }

            log.audit('Custom Price Level ID', customPriceLevelId);
            // Once verified, you can hardcode e.g. const customPriceLevelId = 5; for performance

            // -------------------------------------------------
            // 6. Create Return Authorization
            // -------------------------------------------------
            const ra = record.create({
                type: record.Type.RETURN_AUTHORIZATION,
                isDynamic: true
            });

            if (customerId)
                ra.setValue({ fieldId: 'entity', value: customerId });
            if (sourceId)
                ra.setValue({ fieldId: 'createdfrom', value: sourceId });

            // Build detailed memo
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

            if (data.items && data.items.length) {
                data.items.forEach(item => {
                    const itemInternalId = resolveItemInternalId(item.itemId);
                    if (!itemInternalId)
                        throw new Error(`Item not found in NetSuite: ${item.itemId}`);

                    ra.selectNewLine({ sublistId: 'item' });
                    ra.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: itemInternalId });
                    ra.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: item.quantity });

                    // Force Custom Price Level and Shopify Price
                    ra.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: customPriceLevelId });
                    ra.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: item.price });

                    // Update Division/Location if provided
                    if (item.division !== undefined) {
                        ra.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            value: item.division
                        });
                    }

                    ra.commitLine({ sublistId: 'item' });
                });
            }

            // -------------------------------------------------
            // 8. Apply Tax Item and Rate from Source
            // -------------------------------------------------
            if (taxItemId)
                ra.setValue({ fieldId: 'taxitem', value: taxItemId });
            if (taxRate)
                ra.setValue({ fieldId: 'taxrate', value: taxRate });

            // -------------------------------------------------
            // 9. Save Return Authorization
            // -------------------------------------------------
            const raId = ra.save();
            log.audit('Return Authorization Created', {
                id: raId,
                createdFrom: sourceId,
                sourceType: sourceType,
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
