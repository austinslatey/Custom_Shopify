import axios from 'axios';

// Submits quote request data to HubSpot
export const submitToHubSpot = async ({ first_name, last_name, email, phone, product_title, sku, quantity, vehicle_make, vehicle_model, vehicle_year, vin_number, address, state, country, message, isTopper, req }) => {
    // If topper use topper url else use general quote form
    const hubspotUrl = isTopper ? process.env.HUBSPOT_TOPPER_QUOTE_URL : process.env.HUBSPOT_QUOTE_URL;

    // Validate environment variables
    if (!hubspotUrl) {
        const error = `HubSpot URL is missing for ${isTopper ? 'topper' : 'general'} quote`;
        console.error(error);
        return { success: false, error };
    }

    // State code to full name mapping (US states and Canadian provinces)
    const stateFullNameMap = {
        // US States
        'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
        'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
        'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
        'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
        'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
        'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
        'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
        'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
        'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
        'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
        // Canadian Provinces
        'AB': 'Alberta', 'BC': 'British Columbia', 'MB': 'Manitoba', 'NB': 'New Brunswick',
        'NL': 'Newfoundland and Labrador', 'NS': 'Nova Scotia', 'ON': 'Ontario', 'PE': 'Prince Edward Island',
        'QC': 'Quebec', 'SK': 'Saskatchewan'
    };

    // Country code to full name mapping (if needed; test if codes work)
    const countryFullNameMap = {
        'US': 'United States',
        'CA': 'Canada'
    };

    // Sanitize inputs to prevent injection or invalid characters
    const sanitizedData = {
        first_name: String(first_name || '').trim(),
        last_name: String(last_name || '').trim(),
        email: String(email || '').trim(),
        phone: String(phone || '').trim(),
        product_title: String(product_title || '').trim(),
        sku: String(sku || '').trim(),
        quantity: isTopper ? '' : String(quantity || '').trim(),
        vehicle_make: String(vehicle_make || '').trim(),
        vehicle_model: String(vehicle_model || '').trim(),
        vehicle_year: String(vehicle_year || '').trim(),
        vin_number: String(vin_number || '').trim(),
        address: String(address || '').trim(),
        state: String(state || '').trim(),
        country: String(country || '').trim(),
        message: String(message || '').trim(),
    };

    // Map state and country to full names for HubSpot
    const hubspotState = stateFullNameMap[sanitizedData.state] || sanitizedData.state;
    const hubspotCountry = countryFullNameMap[sanitizedData.country] || sanitizedData.country; // Fallback to code if full name not needed

    const hubspotData = {
        fields: [
            { name: 'firstname', value: sanitizedData.first_name },
            { name: 'lastname', value: sanitizedData.last_name },
            { name: 'email', value: sanitizedData.email },
            { name: 'phone', value: sanitizedData.phone },
            { name: 'product_name', value: sanitizedData.sku },
            { name: 'address', value: sanitizedData.address },
            { name: 'state', value: hubspotState },  // Use full name
            { name: 'country', value: hubspotCountry },  // Use full name or code (test both)
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
        return { success: true };
    } catch (hubspotError) {
        const errorMessage = `HubSpot submission error for ${isTopper ? 'topper' : 'general'} quote: ${hubspotError.response?.data || hubspotError.message}`;
        console.error(errorMessage);
        return { success: false, error: errorMessage };
    }
};