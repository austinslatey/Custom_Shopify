/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log', 'N/file'], (record, search, log, file) => {

    const BASE_FOLDER_NAME = 'Vehicle Builder Quotes';

    /**
     * Create or update a customer, and optionally upload a PDF.
     */
    const findOrCreateCustomer = (data) => {
        const email = data.email?.trim();
        if (!email) throw 'Email is required for customer creation';

        // Search for existing customer by email
        const existing = search.create({
            type: search.Type.CUSTOMER,
            filters: [['email', 'is', email]],
            columns: ['internalid'],
        }).run().getRange({ start: 0, end: 1 });

        let cust, id;

        // ---------- EXISTING CUSTOMER ----------
        if (existing.length) {
            id = existing[0].getValue('internalid');
            cust = record.load({ type: record.Type.CUSTOMER, id, isDynamic: true });

            // Update details
            if (data.phone) cust.setValue({ fieldId: 'phone', value: data.phone });
            if (data.first_name) cust.setValue({ fieldId: 'firstname', value: data.first_name });
            if (data.last_name) cust.setValue({ fieldId: 'lastname', value: data.last_name });

            // Add address if provided
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

            // ---------- NEW CUSTOMER ----------
        } else {
            cust = record.create({ type: record.Type.CUSTOMER, isDynamic: true });
            cust.setValue({ fieldId: 'firstname', value: data.first_name });
            cust.setValue({ fieldId: 'lastname', value: data.last_name });
            cust.setValue({ fieldId: 'email', value: email });
            cust.setValue({ fieldId: 'phone', value: data.phone });
            cust.setValue({ fieldId: 'comments', value: data.message || 'Created via Vehicle Builder form.' });

            // Add address if provided
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

            // 💡 Reload after save to get the true entityid (fixes "To Be Generated")
            cust = record.load({ type: record.Type.CUSTOMER, id, isDynamic: true });

            log.audit('Customer Reloaded', {
                id,
                entityid: cust.getValue('entityid'),
                email
            });

        }

        // ---------- FILE UPLOAD ----------
        if (data.file && data.file.name && data.file.content) {
            try {
                if (typeof data.file.content !== 'string' || data.file.content.trim() === '') {
                    throw new Error('Invalid or empty Base64 content');
                }

                if (!/^[A-Za-z0-9+/=]+$/.test(data.file.content)) {
                    throw new Error('Invalid Base64 content format');
                }

                // Locate base folder
                const baseFolderSearch = search.create({
                    type: search.Type.FOLDER,
                    filters: [['name', 'is', BASE_FOLDER_NAME]],
                    columns: ['internalid']
                }).run().getRange({ start: 0, end: 1 });

                log.audit('Folder Lookup', {
                    baseFolderFound: !!baseFolderSearch.length,
                    baseFolderId: baseFolderSearch.length ? baseFolderSearch[0].getValue('internalid') : null
                });


                if (!baseFolderSearch.length) {
                    throw new Error(`Base folder "${BASE_FOLDER_NAME}" not found in File Cabinet.`);
                }

                const baseFolderId = baseFolderSearch[0].getValue('internalid');

                // Get proper entity name now that it's reloaded
                const entityName =
                    cust.getValue('entityid') ||
                    `${data.first_name || ''} ${data.last_name || ''}`.trim();
                const customerFolderName = `(${id}) ${entityName}`;

                log.audit('Folder Naming', { id, entityName, customerFolderName });

                // Check for existing subfolder
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
                    log.audit('Existing Folder', { folderId });
                } else {
                    const folderRec = record.create({ type: record.Type.FOLDER });
                    folderRec.setValue({ fieldId: 'name', value: customerFolderName });
                    folderRec.setValue({ fieldId: 'parent', value: baseFolderId });
                    folderId = folderRec.save();
                    log.audit('New Folder Created', { folderId, name: customerFolderName });
                }

                // Timestamp for uniqueness
                const now = new Date();
                const ts = [
                    now.getFullYear(),
                    ('0' + (now.getMonth() + 1)).slice(-2),
                    ('0' + now.getDate()).slice(-2),
                    ('0' + now.getHours()).slice(-2),
                    ('0' + now.getMinutes()).slice(-2),
                    ('0' + now.getSeconds()).slice(-2)
                ].join('-');

                // Sanitize filename
                let baseName = data.file.name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
                if (baseName.toLowerCase().endsWith('.pdf')) baseName = baseName.slice(0, -4);
                const uniqueName = `${baseName}_${ts}.pdf`;

                // Create PDF in NetSuite
                const fileObj = file.create({
                    name: uniqueName,
                    fileType: file.Type.PDF,
                    contents: data.file.content,
                    encoding: file.Encoding.BASE64,
                    folder: folderId,
                    isOnline: false
                });

                const fileId = fileObj.save();
                log.audit('File Upload', {
                    fileName: uniqueName,
                    folderId,
                    base64Length: data.file.content.length
                });

                // Attach to customer
                record.attach({
                    record: { type: 'file', id: fileId },
                    to: { type: 'customer', id }
                });

                log.audit('File Attached', { fileId, customerId: id });
            } catch (fileErr) {
                log.error({
                    title: 'File Handling Error',
                    details: JSON.stringify({
                        message: fileErr.message,
                        stack: fileErr.stack,
                        fileData: data.file
                    })
                });
                throw new Error(`Failed to process file: ${fileErr.message}`);
            }
        }

        return id;
    };

    /**
     * Main POST entrypoint
     */
    const post = (data) => {
        try {
            const customerId = findOrCreateCustomer(data);
            const result = {
                success: true,
                message: 'Vehicle Builder data processed successfully',
                customerId: customerId || null
            };
            log.audit('Response Payload', JSON.stringify(result));
            return result; // explicit JSON-safe object
        } catch (e) {
            const errorDetails = {
                success: false,
                error: e.message || e.toString(),
            };
            log.error({
                title: 'Vehicle Builder Error',
                details: JSON.stringify(errorDetails)
            });
            return errorDetails;
        }
    };

    return { post };
});
