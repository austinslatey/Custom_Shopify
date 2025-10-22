/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log'], (record, search, log) => {

  // --- Find or create customer ---
  const findOrCreateCustomer = (data) => {
    const email = data.email?.trim();
    if (!email) throw 'Email is required for customer creation';

    const existing = search.create({
      type: search.Type.CUSTOMER,
      filters: [['email', 'is', email]],
      columns: ['internalid'],
    }).run().getRange({ start: 0, end: 1 });

    let cust;
    let id;

    // ---------- CUSTOMER EXISTS ----------
    if (existing.length) {
      id = existing[0].getValue('internalid');
      cust = record.load({ type: record.Type.CUSTOMER, id, isDynamic: true });

      if (data.phone) cust.setValue({ fieldId: 'phone', value: data.phone });
      if (data.first_name) cust.setValue({ fieldId: 'firstname', value: data.first_name });
      if (data.last_name) cust.setValue({ fieldId: 'lastname', value: data.last_name });

      // --- Add a new address line if provided ---
      if (data.address && data.state && data.country) {
        cust.selectNewLine({ sublistId: 'addressbook' });
        cust.setCurrentSublistValue({
          sublistId: 'addressbook',
          fieldId: 'defaultbilling',
          value: false // don’t override existing billing address
        });

        const addrSubrecord = cust.getCurrentSublistSubrecord({
          sublistId: 'addressbook',
          fieldId: 'addressbookaddress'
        });

        addrSubrecord.setValue({ fieldId: 'country', value: data.country });
        addrSubrecord.setValue({ fieldId: 'addr1', value: data.address });
        if (data.city) addrSubrecord.setValue({ fieldId: 'city', value: data.city });
        if (data.zip) addrSubrecord.setValue({ fieldId: 'zip', value: data.zip });
        addrSubrecord.setValue({ fieldId: 'state', value: data.state });

        cust.commitLine({ sublistId: 'addressbook' });
      }

      cust.save();
      return id;
    }

    // ---------- NEW CUSTOMER ----------
    cust = record.create({ type: record.Type.CUSTOMER, isDynamic: true });
    cust.setValue({ fieldId: 'firstname', value: data.first_name });
    cust.setValue({ fieldId: 'lastname', value: data.last_name });
    cust.setValue({ fieldId: 'email', value: email });
    cust.setValue({ fieldId: 'phone', value: data.phone });
    cust.setValue({ fieldId: 'comments', value: `Created via Shopify General Quote form.` });

    // --- Create address subrecord for new customer ---
    if (data.address && data.state && data.country) {
      cust.selectNewLine({ sublistId: 'addressbook' });
      cust.setCurrentSublistValue({
        sublistId: 'addressbook',
        fieldId: 'defaultbilling',
        value: true
      });

      const addrSubrecord = cust.getCurrentSublistSubrecord({
        sublistId: 'addressbook',
        fieldId: 'addressbookaddress'
      });

      addrSubrecord.setValue({ fieldId: 'country', value: data.country });
      addrSubrecord.setValue({ fieldId: 'addr1', value: data.address });
      if (data.city) addrSubrecord.setValue({ fieldId: 'city', value: data.city });
      if (data.zip) addrSubrecord.setValue({ fieldId: 'zip', value: data.zip });
      addrSubrecord.setValue({ fieldId: 'state', value: data.state });

      cust.commitLine({ sublistId: 'addressbook' });
    }

    return cust.save();
  };

  // --- Create estimate ---
  const createEstimate = (data, customerId) => {
    const est = record.create({ type: record.Type.ESTIMATE, isDynamic: true });
    const customFormId = 229;

    const memoText = `Shopify General Quote: ${data.message || ''} (${data.sku}), Quantity: ${data.quantity}`;
    est.setValue({ fieldId: 'customform', value: customFormId });
    est.setValue({ fieldId: 'entity', value: customerId });
    est.setValue({ fieldId: 'memo', value: memoText.trim() });

    // --- Set billing address (optional) ---
    if (data.address && data.state && data.country) {
      est.setValue({ fieldId: 'billcountry', value: data.country });
      est.setValue({ fieldId: 'billaddr1', value: data.address });
      est.setValue({ fieldId: 'billstate', value: data.state });
      if (data.city) est.setValue({ fieldId: 'billcity', value: data.city });
      if (data.zip) est.setValue({ fieldId: 'billzip', value: data.zip });
    }

    // --- Add item line ---
    if (data.sku) {
      const itemSearch = search.create({
        type: search.Type.ITEM,
        filters: [['itemid', 'is', data.sku]],
        columns: ['internalid'],
      }).run().getRange({ start: 0, end: 1 });

      if (itemSearch.length) {
        est.selectNewLine({ sublistId: 'item' });
        est.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'item',
          value: itemSearch[0].getValue('internalid'),
        });
        est.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'quantity',
          value: data.quantity || 1,
        });
        est.commitLine({ sublistId: 'item' });
      }
    }

    return est.save();
  };

  // --- POST handler ---
  const post = (data) => {
    try {
      const customerId = findOrCreateCustomer(data);
      const estimateId = createEstimate(data, customerId);
      return { success: true, customerId, estimateId };
    } catch (e) {
      log.error({
        title: 'Shopify General Quote Error',
        details: JSON.stringify({ message: e.message, stack: e.stack, data }),
      });
      return { success: false, error: e.message || e.toString() };
    }
  };

  return { post };
});
