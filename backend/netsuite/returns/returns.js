/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

define(['N/record', 'N/search', 'N/log'], function (record, search, log) {

    function createReturnAuthorization(data) {
        try {
            // --- Lookup customer by email ---
            var customerId = null;
            if (data.customerEmail) {
                var customerSearch = search.create({
                    type: search.Type.CUSTOMER,
                    filters: [['email', 'is', data.customerEmail]],
                    columns: ['internalid']
                });
                var resultSet = customerSearch.run().getRange({ start: 0, end: 1 });
                if (resultSet && resultSet.length > 0) {
                    customerId = resultSet[0].getValue('internalid');
                } else {
                    throw new Error('Customer not found for email: ' + data.customerEmail);
                }
            }

            var returnAuth = record.create({
                type: record.Type.RETURN_AUTHORIZATION,
                isDynamic: true
            });

            returnAuth.setValue('entity', customerId);
            returnAuth.setValue('createdfrom', data.orderId);
            returnAuth.setValue('memo', data.message || '');

            data.items.forEach(function (item) {
                returnAuth.selectNewLine({ sublistId: 'item' });
                returnAuth.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: item.itemId
                });
                returnAuth.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    value: item.quantity
                });
                returnAuth.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'class',
                    value: item.class || 'RMA'
                });
                returnAuth.commitLine({ sublistId: 'item' });
            });

            const returnId = returnAuth.save();
            return { success: true, returnId: returnId };

        } catch (e) {
            log.error('Return Creation Error', e);
            return { success: false, message: e.message };
        }
    }

    return { post: createReturnAuthorization };
});
