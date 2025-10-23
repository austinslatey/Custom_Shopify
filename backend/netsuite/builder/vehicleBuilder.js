// NetSuite Restlet needs to create/update customer 
// first_name, last_name, email, phone, address, city, state, country, zip, 
// Set message equal to Field ID: Comments
// File Submission
    // Attach from
    // File name
    // Folder
        // Perform a lookup for a designated folder for file storage
    // Select File
        // Insert File
    // Character Encoding
        // Default 
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

        // ----- Value needs to be changed to data.comments
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

    // --- POST handler ---
    const post = (data) => {
        try {
            const customerId = findOrCreateCustomer(data);

            return { success: true, customerId };
        } catch (e) {
            log.error({
                title: 'Wordpress Builder Error',
                details: JSON.stringify({ message: e.message, stack: e.stack, data })
            });
            return { success: false, error: e.message || e.toString() };
        }
    };

    return { post };
});