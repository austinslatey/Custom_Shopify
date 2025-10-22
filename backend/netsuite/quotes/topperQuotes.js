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
      columns: ['internalid']
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
    cust.setValue({ fieldId: 'comments', value: `Created via Shopify Quote form.` });

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

  // --- Helper: find custom list ID by name ---
  const getListIdByName = (listId, name) => {
    if (!name) return null;
    try {
      const result = search.create({
        type: listId,
        filters: [['name', 'is', name]],
        columns: ['internalid']
      }).run().getRange({ start: 0, end: 1 });
      return result.length ? result[0].getValue('internalid') : null;
    } catch (e) {
      log.error('List Lookup Failed', `${listId} - ${name}: ${e.message}`);
      return null;
    }
  };

  const vehicleMakeMap = {
    'BUICK': 9,
    'CADILLAC': 7,
    'CHEVROLET': 1,
    'CHRYSLER': 13,
    'DODGE': 2,
    'FORD': 3,
    'GMC': 4,
    'HONDA': 14,
    'HYUNDAI': 19,
    'JEEP': 5,
    'LAND ROVER': 15,
    'LINCOLN': 8,
    'MERCEDES BENZ': 16,
    'NISSAN': 12,
    'PLYMOUTH': 22,
    'PORSCHE': 17,
    'RAM': 10,
    'SUBARU': 21,
    'TOYOTA': 11,
    'VOLKS WAGON': 20
  };

  const vehicleModelMap = {
    'CHEVROLET': {
      'SILVERADO 1500': 623,
      'SILVERADO 2500': 624,
      'SILVERADO 3500': 625,
      'COLORADO': 658
    },
    'FORD': {
      'F-150': 8,
      'F-250': 10,
      'F-350': 11,
      'RANGER': 9
    },
    'GMC': {
      'SIERRA 1500': 59,
      'SIERRA 2500': 60,
      'SIERRA 3500': 61,
      'CANYON': 72
    },
    'HONDA': { 'RIDGELINE': 903 },
    'NISSAN': { 'TITAN': 927, 'FRONTIER': 928 },
    'RAM': { '1500': 312, '2500': 313, '3500': 311 },
    'TOYOTA': { 'TACOMA': 326, 'TUNDRA': 328 }
  };

  // --- Create estimate ---
  const createEstimate = (data, customerId) => {
    const est = record.create({ type: record.Type.ESTIMATE, isDynamic: true });
    const customFormId = 229;

    const memoText = `Shopify Quote: ${data.message || ''} (${data.sku}: ${data.vehicle_make} ${data.vehicle_model})`;
    est.setValue({ fieldId: 'customform', value: customFormId });
    est.setValue({ fieldId: 'entity', value: customerId });
    est.setValue({ fieldId: 'memo', value: memoText.trim() });

    // Set billing address (optional)
    if (data.address && data.state && data.country) {
      est.setValue({ fieldId: 'billcountry', value: data.country });
      est.setValue({ fieldId: 'billaddr1', value: data.address });
      est.setValue({ fieldId: 'billstate', value: data.state });
      if (data.city) est.setValue({ fieldId: 'billcity', value: data.city });
      if (data.zip) est.setValue({ fieldId: 'billzip', value: data.zip });
    }

    // Add item line
    if (data.sku) {
      const itemSearch = search.create({
        type: search.Type.ITEM,
        filters: [['itemid', 'is', data.sku]],
        columns: ['internalid']
      }).run().getRange({ start: 0, end: 1 });

      if (itemSearch.length) {
        est.selectNewLine({ sublistId: 'item' });
        est.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'item',
          value: itemSearch[0].getValue('internalid')
        });
        est.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
        est.commitLine({ sublistId: 'item' });
      }
    }

    // Vehicle fields
    const makeId = vehicleMakeMap[data.vehicle_make?.toUpperCase().trim()] || null;
    const modelId = vehicleModelMap?.[data.vehicle_make]?.[data.vehicle_model] || null;
    const yearId = getListIdByName('customlist_nscs_model_year', data.vehicle_year);

    if (!makeId) log.error('Vehicle Make Not Found', data.vehicle_make);
    if (!modelId) log.error('Vehicle Model Not Found', `${data.vehicle_make} ${data.vehicle_model}`);
    if (!yearId) log.error('Vehicle Year Not Found', data.vehicle_year);

    est.setValue({ fieldId: 'custbody_nscs_vehicle_make', value: makeId });
    est.setValue({ fieldId: 'custbody_nscs_vehicle_model', value: modelId });
    est.setValue({ fieldId: 'custbody_nscs_vehicle_year', value: yearId });
    est.setValue({ fieldId: 'custbody_nscs_vehicle_vin', value: data.vin_number });

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
        title: 'Shopify Quote Error',
        details: JSON.stringify({ message: e.message, stack: e.stack, data })
      });
      return { success: false, error: e.message || e.toString() };
    }
  };

  return { post };
});
