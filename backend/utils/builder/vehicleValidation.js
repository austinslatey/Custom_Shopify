import path from 'path';
import sanitizeHtml from 'sanitize-html';

// Sanitize individual input
export const sanitizeVehicleConfigInput = (input) => {
  if (typeof input === 'string') {
    return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} }).trim();
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeVehicleConfigInput(item));
  }
  return input;
};

// Sanitize all vehicle config data
export const sanitizeVehicleConfigData = (body) => ({
  first_name: sanitizeVehicleConfigInput(body.first_name || ''),
  last_name: sanitizeVehicleConfigInput(body.last_name || ''),
  email: sanitizeVehicleConfigInput(body.email || ''),
  phone: sanitizeVehicleConfigInput(body.phone || ''),
  address: sanitizeVehicleConfigInput(body.address || ''),
  city: sanitizeVehicleConfigInput(body.city || ''),
  state: sanitizeVehicleConfigInput(body['form_fields[state]'] || body.state || ''),
  zip: sanitizeVehicleConfigInput(body.zip || ''),
  country: sanitizeVehicleConfigInput(body['form_fields[country]'] || body.country || ''),
  contact_preference: body.contact_preference
    ? Array.isArray(body.contact_preference)
      ? sanitizeVehicleConfigInput(body.contact_preference).join(', ')
      : sanitizeVehicleConfigInput(body.contact_preference)
    : '',
  purchase_timeline: sanitizeVehicleConfigInput(body.purchase_timeline || ''),
  dealer: sanitizeVehicleConfigInput(body.dealer || ''),
  comments: sanitizeVehicleConfigInput(body.comments || ''),
  special_offers: sanitizeVehicleConfigInput(body.special_offers || ''),
  vehicle_make: sanitizeVehicleConfigInput(body.vehicle_make || ''),
  vehicle_type: sanitizeVehicleConfigInput(body.vehicle_type || ''),
  vehicle_package: sanitizeVehicleConfigInput(body.vehicle_package || ''),
});

// Validates vehicle configuration request data
export const validateVehicleConfigRequest = (data, file) => {
  const {
    first_name,
    last_name,
    email,
    phone,
    address,
    city,
    state,
    zip,
    country,
    contact_preference,
    purchase_timeline,
    dealer,
    comments,
    special_offers,
    vehicle_make,
    vehicle_type,
    vehicle_package,
  } = data;

  // Required fields
  if (!first_name || !last_name || !email) {
    return { valid: false, error: 'First name, last name, and email are required' };
  }

  // Email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Optional phone validation
  if (phone && (!/^\+?[0-9\s\(\)-]{10,20}$/.test(phone) || !/^[0-9\s\(\)-]{10,20}$/.test(phone.replace(/^\+/, '')))) {
    return { valid: false, error: 'Invalid phone number (10-15 digits, optional + prefix, parentheses, spaces, or hyphens)' };
  }

  // Optional address validation
  if (address && address.length < 5) {
    return { valid: false, error: 'Address must be at least 5 characters long' };
  }

  // Optional state validation (full names to match HubSpot)
  const validStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
    'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah',
    'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
    'Nova Scotia', 'Northwest Territories', 'Nunavut', 'Ontario', 'Prince Edward Island',
    'Quebec', 'Saskatchewan', 'Yukon',
    'Other'
  ];
  if (state && !validStates.includes(state)) {
    return { valid: false, error: 'Invalid state/province name' };
  }

  // Optional country validation
  const validCountries = ['United States', 'Canada', 'Other'];
  if (country && !validCountries.includes(country)) {
    return { valid: false, error: 'Invalid country name' };
  }

  // File validation
  if (!file) {
    return { valid: false, error: 'PDF file is required' };
  }

  if (path.extname(file.originalname).toLowerCase() !== '.pdf') {
    return { valid: false, error: 'Only PDF files are allowed' };
  }

  const maxUploadSize = 15 * 1024 * 1024; // 15MB
  if (file.size > maxUploadSize) {
    return { valid: false, error: `PDF file size exceeds limit: ${file.size} bytes, max: ${maxUploadSize} bytes` };
  }

  return { valid: true };
};