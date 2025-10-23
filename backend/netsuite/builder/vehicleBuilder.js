/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log', 'N/file'], (record, search, log, file) => {

    const BASE_FOLDER_NAME = 'Vehicle Builder Quotes';

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

            // --- Add address if provided ---
            if (data.address && data.state && data.country) {
                cust.selectNewLine({ sublistId: 'addressbook' });
                cust.setCurrentSublistValue({ sublistId: 'addressbook', fieldId: 'defaultbilling', value: false });
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
            cust.setValue({ fieldId: 'comments', value: data.message || 'Created via Vehicle Builder form.' });

            // --- Add address if provided ---
            if (data.address && data.state && data.country) {
                cust.selectNewLine({ sublistId: 'addressbook' });
                cust.setCurrentSublistValue({ sublistId: 'addressbook', fieldId: 'defaultbilling', value: true });
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

        // --- Handle file upload ---
        if (data.file && data.file.name && data.file.content) {
            try {
                // Find base folder
                const baseFolderSearch = search.create({
                    type: search.Type.FOLDER,
                    filters: [['name', 'is', BASE_FOLDER_NAME]],
                    columns: ['internalid']
                }).run().getRange({ start: 0, end: 1 });

                if (!baseFolderSearch.length) {
                    throw `Base folder "${BASE_FOLDER_NAME}" not found in File Cabinet.`;
                }
                const baseFolderId = baseFolderSearch[0].getValue('internalid');

                // Format subfolder name: "(12345) John Smith"
                const entityName = cust.getValue('entityid') || `${data.first_name || ''} ${data.last_name || ''}`.trim();
                const customerFolderName = `(${id}) ${entityName}`;

                // Search for existing subfolder
                const customerFolderSearch = search.create({
                    type: search.Type.FOLDER,
                    filters: [
                        ['name', 'is', customerFolderName],
                        'AND', ['parent', 'anyof', baseFolderId]
                    ],
                    columns: ['internalid']
                }).run().getRange({ start: 0, end: 1 });

                let folderId;
                if (customerFolderSearch.length) {
                    folderId = customerFolderSearch[0].getValue('internalid');
                } else {
                    // Create new subfolder under base folder
                    const folderRec = record.create({ type: record.Type.FOLDER });
                    folderRec.setValue({ fieldId: 'name', value: customerFolderName });
                    folderRec.setValue({ fieldId: 'parent', value: baseFolderId });
                    folderId = folderRec.save();
                }

                // Generate unique timestamp (to seconds)
                const now = new Date();
                const ts = [
                    now.getFullYear(),
                    ('0' + (now.getMonth() + 1)).slice(-2),
                    ('0' + now.getDate()).slice(-2),
                    ('0' + now.getHours()).slice(-2),
                    ('0' + now.getMinutes()).slice(-2),
                    ('0' + now.getSeconds()).slice(-2)
                ].join('-');

                // Sanitize file name and append timestamp
                let baseName = data.file.name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
                if (baseName.toLowerCase().endsWith('.pdf')) baseName = baseName.slice(0, -4);
                const uniqueName = `${baseName}_${ts}.pdf`;

                // Create PDF file
                const fileObj = file.create({
                    name: uniqueName,
                    fileType: file.Type.PDF,
                    contents: data.file.content,
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

            } catch (fileErr) {
                log.error('File Handling Error', fileErr);
            }
        }

        return id;
    };

    // --- POST handler ---
    const post = (data) => {
        try {
            const customerId = findOrCreateCustomer(data);
            return { success: true, customerId };
        } catch (e) {
            log.error({
                title: 'Vehicle Builder Error',
                details: JSON.stringify({ message: e.message || e, stack: e.stack, data })
            });
            return { success: false, error: e.message || e.toString() };
        }
    };

    return { post };
});
