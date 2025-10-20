/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log'], (record, search, log) => {

  const findCustomerByEmail = (email) => {
    const result = search.create({
      type: search.Type.CUSTOMER,
      filters: [['email', 'is', email]],
      columns: ['internalid']
    }).run().getRange({ start: 0, end: 1 });

    return result.length ? result[0].getValue('internalid') : null;
  };

  const findSalesOrderByNumber = (orderNumber) => {
    const result = search.create({
      type: search.Type.SALES_ORDER,
      filters: [['tranid', 'is', orderNumber]],
      columns: ['internalid']
    }).run().getRange({ start: 0, end: 1 });

    return result.length ? result[0].getValue('internalid') : null;
  };

  const findItemBySku = (sku) => {
    const result = search.create({
      type: search.Type.ITEM,
      filters: [['itemid', 'is', sku]],
      columns: ['internalid']
    }).run().getRange({ start: 0, end: 1 });

    return result.length ? result[0].getValue('internalid') : null;
  };

  const createReturnAuthorization = (data) => {
    const customerId = findCustomerByEmail(data.email);
    if (!customerId) throw new Error(`Customer not found: ${data.email}`);

    const salesOrderId = findSalesOrderByNumber(data.orderNumber);
    if (!salesOrderId) throw new Error(`Sales Order not found: ${data.orderNumber}`);

    const rma = record.create({ type: record.Type.RETURN_AUTHORIZATION, isDynamic: true });
    const customFormId = 231; // use your internal custom form ID if needed

    rma.setValue({ fieldId: 'customform', value: customFormId });
    rma.setValue({ fieldId: 'entity', value: customerId });
    rma.setValue({ fieldId: 'createdfrom', value: salesOrderId });
    rma.setValue({ fieldId: 'memo', value: data.message || 'Return request created via Shopify API' });

    for (const product of data.products) {
      const itemId = findItemBySku(product.sku);
      if (!itemId) {
        log.error('Item Not Found', product.sku);
        continue;
      }

      rma.selectNewLine({ sublistId: 'item' });
      rma.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: itemId });
      rma.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: product.quantity || 1 });
      rma.setCurrentSublistValue({ sublistId: 'item', fieldId: 'description', value: product.reason });
      rma.commitLine({ sublistId: 'item' });
    }

    const id = rma.save();
    return id;
  };

  const post = (data) => {
    try {
      const id = createReturnAuthorization(data);
      return { success: true, rmaId: id };
    } catch (e) {
      log.error('RMA Creation Error', e);
      return { success: false, error: e.message };
    }
  };

  return { post };
});
