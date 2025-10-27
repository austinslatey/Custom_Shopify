import { Router } from 'express';
import fs from 'fs/promises';
import { validateVehicleConfigRequest, sanitizeVehicleConfigInput } from '../../utils/validation.js';
import { submitToVehicleConfigHubspot } from '../../utils/hubspotAPI.js';
import { sendVehicleConfigEmail } from '../../utils/emailAPI.js';
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
    const data = sanitizeVehicleConfigInput(req.body);

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

    // Submit to HubSpot
    const hubspotResult = await submitToVehicleConfigHubspot({
      ...data,
      file_path: destination,
      file_name: req.file?.originalname,
      req,
    });

    if (!hubspotResult.success) {
      console.error('HubSpot errors:', hubspotResult.errors);
      if (destination) {
        await fs.unlink(destination).catch((err) => console.error('Cleanup error:', err.message));
      }
      return res.status(500).json({ error: 'HubSpot submission failed', details: hubspotResult.errors });
    }

    // Send email
    const emailResult = await sendVehicleConfigEmail({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      file_path: destination,
      file_name: req.file?.originalname,
    });

    // Clean up file
    if (destination) {
      await fs.unlink(destination).catch((err) => console.error('Cleanup error:', err.message));
      console.log('Cleaned up file:', destination);
    }

    // Submit to NetSuite
    try {
      const netsuiteResponse = await netsuiteRequest({
        ...data,
        state: nsState(data.state),
        country: nsCountry(data.country),
        message: data.comments,
        file: destination,
        isBuilder: true,
      });
      console.log('NetSuite Response:', netsuiteResponse);
      if (!netsuiteResponse?.success) {
        console.warn('NetSuite reported failure:', netsuiteResponse);
      }
    } catch (netsuiteError) {
      console.error('NetSuite submission error:', netsuiteError.message);
    }

    // Return response
    return res.json({
      success: true,
      message: `Vehicle Builder request submitted successfully! Email ${
        emailResult.success ? 'sent' : 'failed to send'
      }${hubspotResult.errors.length === 0 ? ' and PDF uploaded to HubSpot.' : ', but some HubSpot actions failed.'}`,
      hubspotErrors: hubspotResult.errors,
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