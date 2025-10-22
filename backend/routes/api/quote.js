import { Router } from 'express';
import sgMail from '@sendgrid/mail';
import axios from 'axios';
import { netsuiteRequest } from '../../utils/netsuite.js';

const router = Router();

// Shared validation function
const validateRequest = (data, isTopper = false) => {
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

// Shared email sending function
const sendEmails = async ({ first_name, last_name, email, phone, product_title, sku, message, vehicle_make, vehicle_model, vehicle_year, vin_number, isTopper }) => {
    const salesEmailData = {
        to: process.env.SALES_EMAIL,
        from: process.env.EMAIL_FROM,
        subject: `New Quote Request: ${product_title}`,
        html: `
      <h2>New Quote Request for: ${sku}</h2>
      <p><strong>Product:</strong> ${product_title}</p>
      <p><strong>SKU:</strong> ${sku}</p>
      <p><strong>Customer:</strong> ${first_name} ${last_name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      ${isTopper ? `
        <p><strong>Vehicle Make:</strong> ${vehicle_make}</p>
        <p><strong>Vehicle Model:</strong> ${vehicle_model}</p>
        <p><strong>Vehicle Year:</strong> ${vehicle_year}</p>
        <p><strong>VIN:</strong> ${vin_number}</p>
      ` : ''}
      ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
      <hr>
      <p>Thank you,</p>
      <p>The Waldoch Team</p>
      <p style="margin-top:20px; text-align:center;">
        <img src="https://www.waldoch.com/wp-content/uploads/2021/02/logo-wo-w-50th-314-86-1.png"
             alt="Waldoch Logo" style="max-width:200px; height:auto;">
      </p>
    `,
    };

    const customerEmailData = {
        to: email,
        from: process.env.EMAIL_FROM,
        subject: `Your Quote Request for ${product_title}`,
        html: `
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        h2 { color: #007bff; }
        p { margin: 5px 0; }
        .logo { max-width: 200px; height: auto; }
      </style>
      <h2>Quote Request Received</h2>
      <p>Dear ${first_name} ${last_name},</p>
      <p>Thank you for requesting a quote for <strong>${product_title}</strong> (SKU: ${sku || 'N/A'}).</p>
      <p>Our team at Waldoch Truck Accessories Store has received your request and will respond soon.</p>
      <p><strong>Your Details:</strong></p>
      <p>Email: ${email}</p>
      <p>Phone: ${phone}</p>
      ${isTopper ? `
        <p>Vehicle Make: ${vehicle_make}</p>
        <p>Vehicle Model: ${vehicle_model}</p>
        <p>Vehicle Year: ${vehicle_year}</p>
        <p>VIN: ${vin_number}</p>
      ` : ''}
      ${message ? `<p>Message: ${message}</p>` : ''}
      <hr>
      <p>Best regards,</p>
      <p>The Waldoch Team</p>
      <p style="margin-top:20px; text-align:center;">
        <img src="https://www.waldoch.com/wp-content/uploads/2021/02/logo-wo-w-50th-314-86-1.png" alt="Waldoch Logo" class="logo">
      </p>
    `,
    };

    await Promise.all([
        sgMail.send(salesEmailData),
        sgMail.send(customerEmailData),
    ]);
};

// Shared HubSpot submission function
const submitToHubSpot = async ({ first_name, last_name, email, phone, product_title, sku, message, vehicle_make, vehicle_model, vehicle_year, vin_number, isTopper }) => {
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

// Quote Request for All except toppers
router.post('/', async (req, res) => {
    try {
        const { first_name, last_name, email, phone, product_title, sku, message } = req.body;

        // Validate request
        const validation = validateRequest({ first_name, last_name, email, phone, product_title, sku });
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Send emails
        await sendEmails({ first_name, last_name, email, phone, product_title, sku, message, isTopper: false });

        // Submit to HubSpot
        await submitToHubSpot({ first_name, last_name, email, phone, product_title, sku, message, isTopper: false });

        // Submit to NetSuite
        try {
            const netsuiteResponse = await netsuiteRequest({
                first_name,
                last_name,
                email,
                phone,
                sku,
                message,
                isTopperQuote: false, // General quote
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
        const { first_name, last_name, email, phone, product_title, sku, vehicle_make, vehicle_model, vehicle_year, vin_number, message } = req.body;

        // Validate request
        const validation = validateRequest({ first_name, last_name, email, phone, product_title, sku, vehicle_make, vehicle_model, vehicle_year, vin_number }, true);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Send emails
        await sendEmails({ first_name, last_name, email, phone, product_title, sku, vehicle_make, vehicle_model, vehicle_year, vin_number, message, isTopper: true });

        // Submit to HubSpot
        await submitToHubSpot({ first_name, last_name, email, phone, product_title, sku, vehicle_make, vehicle_model, vehicle_year, vin_number, message, isTopper: true });

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
                message,
                isTopperQuote: true, // Topper quote
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