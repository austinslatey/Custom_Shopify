import { Router } from 'express';

// Import Utilities
import { validateBuilderRequest } from '../../utils/validation.js';
// import { sendEmails } from '../../utils/emailAPI.js';
// import { submitToHubSpot } from '../../utils/hubspotAPI.js';
import { netsuiteRequest, nsCountry, nsState } from '../../utils/netsuite.js';

const router = Router();

// Wordpress form information, submit new/update customer in NetSuite
router.post('/', async (req, res) => {
    try {
        // Information Fields to submit
        const { first_name, last_name, email, phone, address, city, state, country, zip, message, file } = req.body;
        
        // Validate
        const validation = validateBuilderRequest({ first_name, last_name, email, phone, address, city, state, country, zip });
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Already exists in Wordpress backend -- Not needed -- Future Development Potential to process requests here
            // Send emails
            // Hubspot submission

        // Submit to NetSuite using netSuiteRequest
        try {
            const netsuiteResponse = await netsuiteRequest({
                first_name,
                last_name,
                email,
                phone,
                address,
                city,
                state: nsState(state),
                country: nsCountry(country),
                zip,
                message,
                file,
                isBuilder: true
            });
            console.log('NetSuite Response:', netsuiteResponse);
            if (!netsuiteResponse?.success) {
                console.warn('NetSuite reported failure:', netsuiteResponse);
            }
        } catch (netsuiteError) {
            console.error('NetSuite submission error:', netsuiteError.message);
        }

        res.json({ message: 'Vehicle Builder request submitted successfully!' });
    } catch (error) {
        console.error('Server error:', error);
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});


export default router;