/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NAmdConfig ./JSZip_amd_config.json
 */
define(['N/record', 'N/search', 'N/log', 'N/file', 'N/encode'],
    (record, search, log, file, encode) => {

        const BASE_FOLDER_NAME = 'Vehicle Builder Quotes';

        // === Minimal unzip (Base64 ZIP -> {name, content}) ===
        const unzipBase64 = async (base64Str) => {
            const bytes = encode.convert({
                string: base64Str,
                inputEncoding: encode.Encoding.BASE_64,
                outputEncoding: encode.Encoding.OBJECT
            });

            const zip = await JSZip.loadAsync(bytes);
            const files = [];

            for (const name of Object.keys(zip.files)) {
                const f = zip.files[name];
                if (!f.dir) {
                    const content = await f.async('base64');
                    files.push({ name, content });
                }
            }
            return files;
        };

        const findOrCreateCustomer = async (data) => {
            const email = data.email?.trim();
            if (!email) throw 'Email is required for customer creation';

            const existing = search.create({
                type: search.Type.CUSTOMER,
                filters: [['email', 'is', email]],
                columns: ['internalid'],
            }).run().getRange({ start: 0, end: 1 });

            let cust, id;
            if (existing.length) {
                id = existing[0].getValue('internalid');
                cust = record.load({ type: record.Type.CUSTOMER, id, isDynamic: true });
            } else {
                cust = record.create({ type: record.Type.CUSTOMER, isDynamic: true });
                cust.setValue({ fieldId: 'firstname', value: data.first_name });
                cust.setValue({ fieldId: 'lastname', value: data.last_name });
                cust.setValue({ fieldId: 'email', value: email });
                cust.setValue({ fieldId: 'phone', value: data.phone });
                id = cust.save();
            }

            // === File Upload ===
            if (data.file && data.file.isZipped && data.file.content) {
                const baseFolder = search.create({
                    type: search.Type.FOLDER,
                    filters: [['name', 'is', BASE_FOLDER_NAME]],
                    columns: ['internalid'],
                }).run().getRange({ start: 0, end: 1 });

                if (!baseFolder.length)
                    throw new Error(`Base folder "${BASE_FOLDER_NAME}" not found.`);
                const baseFolderId = baseFolder[0].getValue('internalid');

                const entityName = cust.getValue('entityid') || `${data.first_name} ${data.last_name}`;
                const customerFolderName = `(${id}) ${entityName}`;

                // Locate or create customer folder
                let folderId;
                const existingFolder = search.create({
                    type: search.Type.FOLDER,
                    filters: [['name', 'is', customerFolderName], 'AND', ['parent', 'anyof', baseFolderId]],
                    columns: ['internalid'],
                }).run().getRange({ start: 0, end: 1 });

                if (existingFolder.length) {
                    folderId = existingFolder[0].getValue('internalid');
                } else {
                    const folderRec = record.create({ type: record.Type.FOLDER });
                    folderRec.setValue({ fieldId: 'name', value: customerFolderName });
                    folderRec.setValue({ fieldId: 'parent', value: baseFolderId });
                    folderId = folderRec.save();
                }

                // Unzip and save files
                const unzippedFiles = await unzipBase64(data.file.content);

                for (const f of unzippedFiles) {
                    if (!f.name.toLowerCase().endsWith('.pdf')) continue;

                    const now = new Date();
                    const ts = `${now.getFullYear()}-${('0' + (now.getMonth() + 1)).slice(-2)}-${('0' + now.getDate()).slice(-2)}-${('0' + now.getHours()).slice(-2)}-${('0' + now.getMinutes()).slice(-2)}-${('0' + now.getSeconds()).slice(-2)}`;
                    const safeName = f.name.replace(/[^a-zA-Z0-9_\-.]/g, '_').replace(/\.pdf$/i, '');
                    const uniqueName = `${safeName}_${ts}.pdf`;

                    const fileObj = file.create({
                        name: uniqueName,
                        fileType: file.Type.PDF,
                        contents: f.content,
                        encoding: file.Encoding.BASE_64,
                        folder: folderId,
                        isOnline: false,
                    });

                    const fileId = fileObj.save();
                    record.attach({
                        record: { type: 'file', id: fileId },
                        to: { type: 'customer', id },
                    });

                    log.audit('Uploaded file', { fileId, name: uniqueName, folderId });
                }
            }

            return id;
        };

        const post = async (data) => {
            try {
                const customerId = await findOrCreateCustomer(data);
                return { success: true, message: 'Processed successfully', customerId };
            } catch (err) {
                log.error('Error', err);
                return { success: false, error: err.message || err.toString() };
            }
        };

        return { post };
    });
