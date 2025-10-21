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

    if (existing.length) {
      const id = existing[0].getValue('internalid');
      const cust = record.load({ type: record.Type.CUSTOMER, id, isDynamic: true });

      if (data.phone) cust.setValue({ fieldId: 'phone', value: data.phone });
      if (data.first_name) cust.setValue({ fieldId: 'firstname', value: data.first_name });
      if (data.last_name) cust.setValue({ fieldId: 'lastname', value: data.last_name });

      cust.save();
      return id;
    }

    const cust = record.create({ type: record.Type.CUSTOMER, isDynamic: true });
    cust.setValue({ fieldId: 'firstname', value: data.first_name });
    cust.setValue({ fieldId: 'lastname', value: data.last_name });
    cust.setValue({ fieldId: 'email', value: email });
    cust.setValue({ fieldId: 'phone', value: data.phone });
    cust.setValue({ fieldId: 'comments', value: 'Created via Shopify Quote form.' });

    return cust.save();
  };

  // --- Helper: find custom list ID by name (case-insensitive, reusable) ---
  const getListIdByName = (listId, name) => {
    if (!name) return null;
    try {
      const results = search.create({
        type: listId,
        filters: [['name', 'is', name.toUpperCase().trim()]],
        columns: ['internalid']
      }).run().getRange({ start: 0, end: 1 });

      if (results.length) {
        const id = results[0].getValue('internalid');
        log.debug('Custom List Lookup', `${listId} → ${name} = ${id}`);
        return id;
      } else {
        log.error('Custom List Value Not Found', `${listId} → ${name}`);
        return null;
      }
    } catch (e) {
      log.error('List Lookup Failed', `${listId} - ${name}: ${e.message}`);
      return null;
    }
  };

  // --- Vehicle model internal ID map ---
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
    data.vehicle_make = data.vehicle_make?.toUpperCase().trim();
    data.vehicle_model = data.vehicle_model?.toUpperCase().trim();

    const est = record.create({ type: record.Type.ESTIMATE, isDynamic: true });
    est.setValue({ fieldId: 'customform', value: 229 });
    est.setValue({ fieldId: 'entity', value: customerId });
    est.setValue({
      fieldId: 'memo',
      value: `Shopify Quote: ${data.message || ''} (${data.sku}: ${data.vehicle_make} ${data.vehicle_model})`.trim()
    });

    const makeId = getListIdByName('customlist_nscs_vehicle_make', data.vehicle_make);
    const modelId = vehicleModelMap?.[data.vehicle_make]?.[data.vehicle_model] || null;
    const yearId = getListIdByName('customlist_nscs_model_year', data.vehicle_year);

    if (makeId) est.setValue({ fieldId: 'custbody_nscs_vehicle_make', value: makeId });
    if (modelId) est.setValue({ fieldId: 'custbody_nscs_vehicle_model', value: modelId });
    if (yearId) est.setValue({ fieldId: 'custbody_nscs_vehicle_year', value: yearId });
    if (data.vin_number) est.setValue({ fieldId: 'custbody_nscs_vehicle_vin', value: data.vin_number });

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
