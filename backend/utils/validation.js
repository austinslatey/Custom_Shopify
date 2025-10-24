// Validates quote request data
export const validateRequest = (data, isTopper = false) => {
    const { first_name, last_name, email, phone, product_title, sku, quantity, vehicle_make, vehicle_model, vehicle_year, vin_number, address, state, country } = data;

    // Required fields for all requests
    if (!first_name || !last_name || !email || !phone || !product_title || !sku || !address || !state || !country) {
        return { valid: false, error: 'Missing required fields' };
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { valid: false, error: 'Invalid email format' };
    }

    // Phone validation
    if (!/^\+?[0-9\s\(\)-]{10,20}$/.test(phone) || !/^[0-9\s\(\)-]{10,20}$/.test(phone.replace(/^\+/, ''))) {
        return { valid: false, error: 'Invalid phone number (10-15 digits, optional + prefix, parentheses, spaces, or hyphens)' };
    }

    // Address validation
    if (address.length < 5) {
        return { valid: false, error: 'Address must be at least 5 characters long' };
    }

    // State validation (US states and Canadian provinces)
    const validStates = [
        // US States
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
        'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
        'VA', 'WA', 'WV', 'WI', 'WY',
        // Canadian Provinces
        'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'ON', 'PE', 'QC', 'SK'
    ];
    if (!validStates.includes(state)) {
        return { valid: false, error: 'Invalid state/province code' };
    }

    // Country validation
    if (!/^[A-Z]{2}$/.test(country)) {
        return { valid: false, error: 'Country must be a valid two-letter ISO code (e.g., US, CA)' };
    }

    // Quantity validation for general quotes
    if (!isTopper) {
        if (quantity == null || isNaN(quantity) || !Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
            return { valid: false, error: 'Quantity is required and must be a positive integer for general quotes' };
        }
    }

    // Topper-specific validations
    if (isTopper) {
        if (!vehicle_make || !vehicle_model || !vehicle_year || !vin_number) {
            return { valid: false, error: 'Missing required vehicle fields' };
        }
        if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin_number)) {
            return { valid: false, error: 'Invalid VIN (must be 17 alphanumeric characters)' };
        }
        if (vehicle_year < 1900 || vehicle_year > 2026 || !Number.isInteger(Number(vehicle_year))) {
            return { valid: false, error: 'Invalid vehicle year (must be 1900-2026)' };
        }
    }

    return { valid: true };
};

export const validateBuilderRequest = (data) => {
    const { first_name, last_name, email, phone, address, state, country } = data;

    // Required fields
    if (!first_name || !last_name || !email || !phone || !address || !state || !country) {
        return { valid: false, error: 'Missing required fields' };
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { valid: false, error: 'Invalid email format' };
    }

    // Phone validation
    if (!/^\+?[0-9\s\(\)-]{10,20}$/.test(phone) || !/^[0-9\s\(\)-]{10,20}$/.test(phone.replace(/^\+/, ''))) {
        return { valid: false, error: 'Invalid phone number (10-15 digits, optional + prefix, parentheses, spaces, or hyphens)' };
    }

    // Address validation
    if (address.length < 5) {
        return { valid: false, error: 'Address must be at least 5 characters long' };
    }

    // State validation (US states and Canadian provinces - full names)
    const validStates = [
        // US States
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
        'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
        'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
        'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
        'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
        'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah',
        'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
        // Canadian Provinces
        'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
        'Nova Scotia', 'Northwest Territories', 'Nunavut', 'Ontario', 'Prince Edward Island',
        'Quebec', 'Saskatchewan', 'Yukon',
        // Other Selection
        'Other'
    ];

    // Country validation
    const validCountries = [
        'United States', 'Canada', 'Other'
    ];

    if (!validStates.includes(state)) {
        return { valid: false, error: 'Invalid state/province name' };
    }
    else if (!validCountries.includes(country)) {
        return { valid: false, error: 'Invalid country name' };
    }


    return { valid: true };


};