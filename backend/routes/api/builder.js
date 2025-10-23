import { Router } from 'express';

// Import Utilities
// import { validateRequest } from '../../utils/validation.js';
// import { sendEmails } from '../../utils/emailAPI.js';
// import { submitToHubSpot } from '../../utils/hubspotAPI.js';
// import { netsuiteRequest } from '../../utils/netsuite.js';

const router = Router();

// Wordpress form information, submit new/update customer in NetSuite
router.post('/', async (req, res) => {
    try {
        // Information Fields to submit
        // const { first_name, last_name, email, phone, address, city, state, country, zip, message, file } = req.body;
        
        // Validate

        // Already exists in Wordpress backend -- Not needed -- Future Development Potential to process requests here
            // Send emails
            // Hubspot submission

        
        // Submit to NetSuite using netSuiteRequest
            // Add env variable to restlet URL conditional in utils
            // proceed with data submission for a customer 

        
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