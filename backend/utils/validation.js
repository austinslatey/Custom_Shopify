// Validates quote request data
export const validateRequest = (data, isTopper = false) => {
    const { first_name, last_name, email, phone, product_title, sku, vehicle_make, vehicle_model, vehicle_year, vin_number } = data;

    // Required fields for all requests
    if (!first_name || !last_name || !email || !phone || !product_title || !sku) {
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