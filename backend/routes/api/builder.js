import { Router } from 'express';
import fs from 'fs/promises';
import { validateVehicleConfigRequest, sanitizeVehicleConfigData } from '../../utils/builder/vehicleValidation.js';
import { submitToVehicleConfigHubspot } from '../../utils/builder/vehicleConfigHubSpot.js';
import { sendVehicleConfigEmail } from '../../utils/builder/sendVehicleEmail.js';
import { netsuiteRequest, nsCountry, nsState } from '../../utils/netsuite.js';
import { vehicleConfigUpload } from '../../middleware/multer.js';

const router = Router();

router.post('/', vehicleConfigUpload, async (req, res) => {
  let destination = '';
  try {
    console.log('/builder route hit');
    console.log('Params:', req.body);
    console.log('Files:', req.file);

    // Sanitize inputs
    const data = sanitizeVehicleConfigData(req.body);

    // Validate inputs and file
    const validation = validateVehicleConfigRequest(data, req.file);
    if (!validation.valid) {
      console.error('Validation error:', validation.error);
      if (req.file) {
        await fs.unlink(req.file.path).catch((err) => console.error('Cleanup error:', err.message));
      }
      return res.status(400).json({ error: validation.error });
    }

    destination = req.file?.path || '';

    // Prepare file data for NetSuite
    let fileData = null;
    if (req.file) {
      const fileContent = await fs.readFile(req.file.path);
      fileData = {
        name: req.file.originalname,
        content: fileContent.toString('base64'),
      };
    }

    // Submit to HubSpot
    const hubspotResult = await submitToVehicleConfigHubspot({
      ...data,
      file_path: destination,
      file_name: req.file?.originalname,
      req,
    });

    // Log HubSpot errors but continue
    if (!hubspotResult.success) {
      console.error('HubSpot errors:', hubspotResult.errors);
    }

    // Send email
    let emailResult = { success: false };
    try {
      emailResult = await sendVehicleConfigEmail({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        file_path: destination,
        file_name: req.file?.originalname,
      });
      console.log('[Vehicle Config Email] Email sent successfully');
    } catch (emailError) {
      console.error('Email error:', emailError.message);
    }

    // Submit to NetSuite
    let netsuiteResult = { success: false };
    try {
      netsuiteResult = await netsuiteRequest({
        ...data,
        state: nsState(data.state),
        country: nsCountry(data.country),
        message: data.comments,
        file: fileData,
        isBuilder: true,
      });
      console.log('NetSuite Response:', netsuiteResult);
    } catch (netsuiteError) {
      console.error('NetSuite submission error:', netsuiteError.message);
    }

    // Clean up file
    if (destination) {
      await fs.unlink(destination).catch((err) => console.error('Cleanup error:', err.message));
      console.log('Cleaned up file:', destination);
    }

    // Return response
    return res.status(200).json({
      success: hubspotResult.success || emailResult.success || netsuiteResult.success,
      message: `Vehicle Builder request processed. Email ${
        emailResult.success ? 'sent' : 'failed to send'
      }. HubSpot ${hubspotResult.success ? 'succeeded' : 'had errors'}. NetSuite ${
        netsuiteResult.success ? 'succeeded' : 'had errors or was not reached'
      }.`,
      hubspotErrors: hubspotResult.errors,
      emailSuccess: emailResult.success,
      netsuiteSuccess: netsuiteResult.success,
      contactId: hubspotResult.contactId,
      customerId: netsuiteResult.customerId,
    });
  } catch (error) {
    console.error('Fatal error:', error.message);
    if (destination) {
      await fs.unlink(destination).catch((err) => console.error('Cleanup error:', err.message));
      console.log('Cleaned up file due to error:', destination);
    }
    return res.status(500).json({ error: `An unexpected error occurred: ${error.message}` });
  }
});

router.post('/test-post', async (req, res) => {
  console.log('/test-post route hit');
  return res.json({ success: true, message: 'Test POST route reached' });
});

export default router;