/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/log'], (record, log) => {

  const post = (data) => {
    try {
      const rec = record.create({
        type: 'customrecord_shopify_quote_request',
        isDynamic: true,
      });

      rec.setValue({ fieldId: 'custrecord_first_name', value: data.first_name });
      rec.setValue({ fieldId: 'custrecord_last_name', value: data.last_name });
      rec.setValue({ fieldId: 'custrecord_email', value: data.email });
      rec.setValue({ fieldId: 'custrecord_phone', value: data.phone });
      rec.setValue({ fieldId: 'custrecord_address', value: data.address });
      rec.setValue({ fieldId: 'custrecord_state', value: data.state });
      rec.setValue({ fieldId: 'custrecord_country', value: data.country });
      rec.setValue({ fieldId: 'custrecord_vehicle_make', value: data.vehicle_make });
      rec.setValue({ fieldId: 'custrecord_vehicle_model', value: data.vehicle_model });
      rec.setValue({ fieldId: 'custrecord_vehicle_year', value: data.vehicle_year });
      rec.setValue({ fieldId: 'custrecord_vin_number', value: data.vin_number });
      rec.setValue({ fieldId: 'custrecord_message', value: data.message });
      rec.setValue({ fieldId: 'custrecord_sku', value: data.sku });

      const id = rec.save();
      return { success: true, recordId: id };

    } catch (e) {
      log.error('Shopify Quote Error', e);
      return { success: false, message: e.message };
    }
  };

  return { post };
});
