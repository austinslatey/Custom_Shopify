import axios from 'axios';

// Submits quote request data to HubSpot
export const submitToHubSpot = async ({ first_name, last_name, email, phone, product_title, sku, message, vehicle_make, vehicle_model, vehicle_year, vin_number, isTopper, req }) => {

    // If topper use topper url else use general quote form
    const hubspotUrl = isTopper ? process.env.HUBSPOT_TOPPER_QUOTE_URL : process.env.HUBSPOT_QUOTE_URL;

    // Validate environment variables
    if (!hubspotUrl) {
        const error = `HubSpot URL is missing for ${isTopper ? 'topper' : 'general'} quote`;
        console.error(error);
        return { success: false, error };
    }

    // Sanitize inputs to prevent injection or invalid characters
    const sanitizedData = {
        first_name: String(first_name || '').trim(),
        last_name: String(last_name || '').trim(),
        email: String(email || '').trim(),
        phone: String(phone || '').trim(),
        product_title: String(product_title || '').trim(),
        sku: String(sku || '').trim(),
        // Quantity is only for General Quotes
        quantity: isTopper ? '' : String(quantity || '').trim(),
        message: String(message || '').trim(),
        vehicle_make: String(vehicle_make || '').trim(),
        vehicle_model: String(vehicle_model || '').trim(),
        vehicle_year: String(vehicle_year || '').trim(),
        vin_number: String(vin_number || '').trim(),
    };

    const hubspotData = {
        fields: [
            { name: 'firstname', value: sanitizedData.first_name },
            { name: 'lastname', value: sanitizedData.last_name },
            { name: 'email', value: sanitizedData.email },
            { name: 'phone', value: sanitizedData.phone },
            { name: 'product_name', value: sanitizedData.sku },
            ...(!isTopper ? [{ name: 'quantity', value: sanitizedData.quantity }] : []),
            ...(isTopper ? [
                { name: 'vehicle_make', value: sanitizedData.vehicle_make },
                { name: 'vehicle_type', value: sanitizedData.vehicle_model },
                { name: 'vehicle_year', value: sanitizedData.vehicle_year },
                { name: 'vehicle_vin', value: sanitizedData.vin_number },
            ] : []),
            ...(sanitizedData.message ? [{ name: 'message', value: sanitizedData.message }] : []),
        ],
        context: {
            pageUri: req.headers.referer || process.env.REF_URL,
            pageName: product_title,
        },
    };

    try {
        await axios.post(hubspotUrl, hubspotData);
        return { success: true }
    } catch (hubspotError) {
        const errorMessage = `HubSpot submission error for ${isTopper ? 'topper' : 'general'} quote: ${hubspotError.response?.data || hubspotError.message}`;
        console.error(errorMessage);
        return { success: false }
    }
};