/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log', 'N/file'], (record, search, log, file) => {

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

            id = cust.save();
        } else {
            // ---------- NEW CUSTOMER ----------
            cust = record.create({ type: record.Type.CUSTOMER, isDynamic: true });
            cust.setValue({ fieldId: 'firstname', value: data.first_name });
            cust.setValue({ fieldId: 'lastname', value: data.last_name });
            cust.setValue({ fieldId: 'email', value: email });
            cust.setValue({ fieldId: 'phone', value: data.phone });

            // Set message equal to Field ID: Comments
            cust.setValue({ fieldId: 'comments', value: data.message || 'Created via Vehicle Builder form.' });

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

            id = cust.save();
        }

        // File Submission (data.file = {name: string, content: base64 string}, always PDF)
        if (data.file && data.file.name && data.file.content) {
            // Perform a lookup for a designated folder for file storage
            // Assuming a folder named 'Vehicle Builder Attachments' exists; adjust as needed
            const folderSearch = search.create({
                type: search.Type.FOLDER,
                filters: [['name', 'is', 'Vehicle Builder Attachments']],
                columns: ['internalid']
            }).run().getRange({ start: 0, end: 1 });

            let folderId;
            if (folderSearch.length > 0) {
                folderId = folderSearch[0].getValue('internalid');
            } else {
                // Create the folder if it doesn't exist
                const folderRecord = record.create({ type: record.Type.FOLDER });
                folderRecord.setValue({ fieldId: 'name', value: 'Vehicle Builder Attachments' });
                // Set parent folder if needed, e.g., folderRecord.setValue({ fieldId: 'parent', value: parentFolderId });
                folderId = folderRecord.save();
            }

            // Create the file (always PDF)
            const fileObj = file.create({
                name: data.file.name.endsWith('.pdf') ? data.file.name : `${data.file.name}.pdf`,
                fileType: 'PDF',

                // Base64 encoded content
                contents: data.file.content,
                 
                // Use BASE64 for PDF binary content
                encoding: file.Encoding.BASE64, 
                folder: folderId,
                isOnline: false
            });

            const fileId = fileObj.save();

            // Attach file to customer
            record.attach({
                record: { type: 'file', id: fileId },
                to: { type: 'customer', id: id }
            });
        }

        return id;
    };

    // --- POST handler ---
    const post = (data) => {
        try {
            const customerId = findOrCreateCustomer(data);

            // TODO: If needed, use customerId to create a quote or sales order
            return { success: true, customerId };
        } catch (e) {
            log.error({
                title: 'Vehicle Builder Error',
                details: JSON.stringify({ message: e.message, stack: e.stack, data })
            });
            return { success: false, error: e.message || e.toString() };
        }
    };

    return { post };
});