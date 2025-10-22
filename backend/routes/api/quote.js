import { Router } from 'express';

// Import Utilities
import { validateRequest } from '../../utils/validation.js';
import { sendEmails } from '../../utils/emailAPI.js';
import { submitToHubSpot } from '../../utils/hubspotAPI.js';
import { netsuiteRequest } from '../../utils/netsuite.js';

const router = Router();

// Quote Request for All except toppers
router.post('/', async (req, res) => {
    try {
        const { first_name, last_name, email, phone, product_title, sku, quantity, address, state, country, message } = req.body;

        // Validate request
        const validation = validateRequest({ first_name, last_name, email, phone, product_title, sku, quantity, address, state, country });
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Send emails
        await sendEmails({ first_name, last_name, email, phone, product_title, sku, quantity,  message, isTopper: false });

        // Submit to HubSpot
        const hubspotResult = await submitToHubSpot({ first_name, last_name, email, phone, product_title, sku, quantity, address, state, country, message, isTopper: false, req });
        if (!hubspotResult.success) {
            console.warn('HubSpot submission failed:', hubspotResult.error);
        }

        // Submit to NetSuite
        try {
            const netsuiteResponse = await netsuiteRequest({
                first_name,
                last_name,
                email,
                phone,
                sku,
                quantity,
                address, 
                state, 
                country,
                message,
                isTopperQuote: false,
            });

            console.log('NetSuite Response:', netsuiteResponse);

            if (!netsuiteResponse?.success) {
                console.warn('NetSuite reported failure:', netsuiteResponse);
            }
        } catch (netsuiteError) {
            console.error('NetSuite submission error:', netsuiteError.message);
        }

        res.json({ message: 'General quote request submitted successfully!' });
    } catch (error) {
        console.error('Server error:', error);
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Quote Request for Toppers
router.post('/topper', async (req, res) => {
    try {
        const { first_name, last_name, email, phone, product_title, sku, vehicle_make, vehicle_model, vehicle_year, vin_number, address, state, country, message } = req.body;

        // Validate request
        const validation = validateRequest({ first_name, last_name, email, phone, product_title, sku, vehicle_make, vehicle_model, vehicle_year, vin_number, address, state, country }, true);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Send emails
        // await sendEmails({ first_name, last_name, email, phone, product_title, sku, vehicle_make, vehicle_model, vehicle_year, vin_number, message, isTopper: true });

        // Submit to HubSpot
        // const hubspotResult = await submitToHubSpot({ first_name, last_name, email, phone, product_title, sku, vehicle_make, vehicle_model, vehicle_year, address, state, country, vin_number, message, isTopper: true, req });
        // if (!hubspotResult.success) {
        //     console.warn('HubSpot submission failed:', hubspotResult.error);
        // }

        // Submit to NetSuite
        try {
            const netsuiteResponse = await netsuiteRequest({
                first_name,
                last_name,
                email,
                phone,
                vehicle_make,
                vehicle_model,
                vehicle_year,
                vin_number,
                sku,
                address, 
                state, 
                country,
                message,
                isTopperQuote: true,
            });

            console.log('NetSuite Response:', netsuiteResponse);

            if (!netsuiteResponse?.success) {
                console.warn('NetSuite reported failure:', netsuiteResponse);
            }
        } catch (netsuiteError) {
            console.error('NetSuite submission error:', netsuiteError.message);
        }

        res.json({ message: 'Topper quote request submitted successfully!' });
    } catch (error) {
        console.error('Server error:', error);
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;