import axios from 'axios';

// Submits quote request data to HubSpot
export const submitToHubSpot = async ({ first_name, last_name, email, phone, product_title, sku, message, vehicle_make, vehicle_model, vehicle_year, vin_number, isTopper, req }) => {
    const hubspotUrl = process.env.HUBSPOT_URL;
    const hubspotData = {
        fields: [
            { name: 'firstname', value: first_name },
            { name: 'lastname', value: last_name },
            { name: 'email', value: email },
            { name: 'phone', value: phone },
            { name: 'product_name', value: sku },
            ...(isTopper ? [
                { name: 'vehicle_make', value: vehicle_make },
                { name: 'vehicle_type', value: vehicle_model },
                { name: 'vehicle_year', value: vehicle_year },
                { name: 'vehicle_vin', value: vin_number },
            ] : []),
            ...(message ? [{ name: 'message', value: message }] : []),
        ],
        context: {
            pageUri: req.headers.referer || process.env.REF_URL,
            pageName: product_title,
        },
    };

    try {
        await axios.post(hubspotUrl, hubspotData);
    } catch (hubspotError) {
        console.error('HubSpot submission error:', hubspotError.response?.data || hubspotError.message);
    }
};