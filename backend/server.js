import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import sgMail from "@sendgrid/mail";
import axios from "axios";
import crypto from "crypto";
import OAuth from "oauth-1.0a";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

const netsuiteRequest = async (data) => {
    const url = process.env.SANDBOX_RESTLET_URL;

    const oauth = OAuth({
        consumer: {
            key: process.env.SANDBOX_CONSUMER_KEY,
            secret: process.env.SANDBOX_CONSUMER_SECRET,
        },
        signature_method: "HMAC-SHA256",
        hash_function(baseString, key) {
            return crypto.createHmac("sha256", key).update(baseString).digest("base64");
        },
    });

    const token = {
        key: process.env.SANDBOX_TOKEN_ID,
        secret: process.env.SANDBOX_TOKEN_SECRET,
    };

    const requestData = { url, method: "POST", data };
    const headers = oauth.toHeader(oauth.authorize(requestData, token));
    headers["Content-Type"] = "application/json";

    try {
        const response = await axios.post(url, data, { headers });
        return response.data;
    } catch (err) {
        console.error("NetSuite RESTlet Error:", err.response?.data || err.message);
        throw new Error(`NetSuite RESTlet Error: ${err.response?.data?.error || err.message}`);
    }
};

// Middleware
app.use(cors({ origin: process.env.SHOPIFY_SHOP }));
app.use(express.json());

// SendGrid setup
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// POST /api/quote endpoint
app.post("/api/quote", async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            email,
            phone,
            product_title,
            product_id,
            sku,
            vehicle_make,
            vehicle_model,
            vehicle_year,
            vin_number,
            message // Optional
        } = req.body;

        // Validation
        if (!first_name || !last_name || !email || !phone || !product_title || !product_id || !sku || !vehicle_make || !vehicle_model || !vehicle_year || !vin_number) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        if (!/^\+?[0-9\s\(\)-]{10,20}$/.test(phone) || !/^[0-9\s\(\)-]{10,20}$/.test(phone.replace(/^\+/, ''))) {
            return res.status(400).json({ error: "Invalid phone number (10-15 digits, optional + prefix, parentheses, spaces, or hyphens)" });
        }

        if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin_number)) {
            return res.status(400).json({ error: "Invalid VIN (must be 17 alphanumeric characters)" });
        }

        if (vehicle_year < 1900 || vehicle_year > 2026 || !Number.isInteger(Number(vehicle_year))) {
            return res.status(400).json({ error: "Invalid vehicle year (must be 1900-2026)" });
        }

        // Prepare emails
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
        <p><strong>Vehicle Make:</strong> ${vehicle_make}</p>
        <p><strong>Vehicle Model:</strong> ${vehicle_model}</p>
        <p><strong>Vehicle Year:</strong> ${vehicle_year}</p>
        <p><strong>VIN:</strong> ${vin_number}</p>
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
        <p>Thank you for requesting a quote for <strong>${product_title}</strong> (SKU: ${sku || "N/A"}).</p>
        <p>Our team at Waldoch Truck Accessories Store has received your request and will respond soon.</p>
        <p><strong>Your Details:</strong></p>
        <p>Email: ${email}</p>
        <p>Phone: ${phone}</p>
        <p>Vehicle Make: ${vehicle_make}</p>
        <p>Vehicle Model: ${vehicle_model}</p>
        <p>Vehicle Year: ${vehicle_year}</p>
        <p>VIN: ${vin_number}</p>
        ${message ? `<p>Message: ${message}</p>` : ''}
        <hr>
        <p>Best regards,</p>
        <p>The Waldoch Team</p>
        <p style="margin-top:20px; text-align:center;">
          <img src="https://www.waldoch.com/wp-content/uploads/2021/02/logo-wo-w-50th-314-86-1.png" alt="Waldoch Logo" class="logo">
        </p>
      `,
        };

        // Send emails via SendGrid
        // await Promise.all([
        //     sgMail.send(salesEmailData),
        //     sgMail.send(customerEmailData),
        // ]);

        // Submit to HubSpot Forms API
        const hubspotUrl = process.env.HUBSPOT_URL;
        const hubspotData = {
            fields: [
                { name: "firstname", value: first_name },
                { name: "lastname", value: last_name },
                { name: "email", value: email },
                { name: "phone", value: phone },
                { name: "vehicle_make", value: vehicle_make },
                { name: "vehicle_type", value: vehicle_model },
                { name: "vehicle_year", value: vehicle_year },
                { name: "vehicle_vin", value: vin_number },
                { name: "product_name", value: sku },
                ...(message ? [{ name: "message", value: message }] : [])
            ],
            context: {
                pageUri: req.headers.referer || process.env.REF_URL,
                pageName: product_title,
            },
        };

        // try {
        //     await axios.post(hubspotUrl, hubspotData);
        // } catch (hubspotError) {
        //     console.error("HubSpot submission error:", hubspotError.response?.data || hubspotError.message);
        //     // Continue despite HubSpot error to ensure user gets success response
        // }

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
            });

            console.log("NetSuite Response:", netsuiteResponse);
        } catch (netsuiteError) {
            console.error("NetSuite submission error:", netsuiteError.message);
            // Optionally continue to success response to not block user
        }

        res.json({ message: "Quote request submitted successfully!" });
    } catch (error) {
        console.error("Server error:", error);
        if (error.response) {
            console.error("Error details:", error.response.data);
        }
        res.status(500).json({ error: "Internal server error" });
    }
});

// Health check endpoint
app.get("/health", (req, res) => res.json({ status: "OK" }));

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});