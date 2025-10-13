import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import sgMail from "@sendgrid/mail";
import axios from "axios";
import OAuth from "oauth-1.0a";
import crypto from "crypto"; // Uses Node.js built-in crypto module

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: process.env.SHOPIFY_SHOP }));
app.use(express.json());

// SendGrid setup
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// NetSuite OAuth 1.0 setup
const oauth = OAuth({
  consumer: {
    key: process.env.NETSUITE_CONSUMER_KEY,
    secret: process.env.NETSUITE_CONSUMER_SECRET,
  },
  signature_method: "HMAC-SHA256",
  hash_function(base_string, key) {
    return crypto.createHmac("sha256", key).update(base_string).digest("base64");
  },
});

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
      address,
      state,
      country,
      message,
    } = req.body;

    // Validation
    if (
      !first_name ||
      !last_name ||
      !email ||
      !phone ||
      !sku ||
      !vehicle_make ||
      !vehicle_model ||
      !vehicle_year ||
      !vin_number ||
      !address ||
      !state ||
      !country
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (
      !/^\+?[0-9\s\(\)-]{10,20}$/.test(phone) ||
      phone.replace(/[^0-9]/g, '').length < 10 ||
      phone.replace(/[^0-9]/g, '').length > 15
    ) {
      return res.status(400).json({ error: "Invalid phone number (10-15 digits, optional + prefix, parentheses, spaces, or hyphens)" });
    }

    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin_number)) {
      return res.status(400).json({ error: "Invalid VIN (must be 17 alphanumeric characters)" });
    }

    if (vehicle_year < 1900 || vehicle_year > 2026 || !Number.isInteger(Number(vehicle_year))) {
      return res.status(400).json({ error: "Invalid vehicle year (must be 1900-2026)" });
    }

    if (address.length < 5) {
      return res.status(400).json({ error: "Address must be at least 5 characters" });
    }

    if (state.length < 2) {
      return res.status(400).json({ error: "State must be at least 2 characters" });
    }

    if (!country) {
      return res.status(400).json({ error: "Country is required" });
    }

    // SendGrid emails
    const salesEmailData = {
      to: process.env.SALES_EMAIL,
      from: process.env.EMAIL_FROM,
      subject: `New Quote Request: ${product_title || sku}`,
      html: `
        <h2>New Quote Request for: ${sku}</h2>
        <p><strong>Product:</strong> ${product_title || sku}</p>
        <p><strong>SKU:</strong> ${sku}</p>
        <p><strong>Customer:</strong> ${first_name} ${last_name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Vehicle Make:</strong> ${vehicle_make}</p>
        <p><strong>Vehicle Model:</strong> ${vehicle_model}</p>
        <p><strong>Vehicle Year:</strong> ${vehicle_year}</p>
        <p><strong>VIN:</strong> ${vin_number}</p>
        <p><strong>Address:</strong> ${address}</p>
        <p><strong>State:</strong> ${state}</p>
        <p><strong>Country:</strong> ${country}</p>
        ${message ? `<p><strong>Message:</strong> ${message}</p>` : ""}
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
      subject: `Your Quote Request for ${product_title || sku}`,
      html: `
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          h2 { color: #007bff; }
          p { margin: 5px 0; }
          .logo { max-width: 200px; height: auto; }
        </style>
        <h2>Quote Request Received</h2>
        <p>Dear ${first_name} ${last_name},</p>
        <p>Thank you for requesting a quote for <strong>${product_title || sku}</strong> (SKU: ${sku || "N/A"}).</p>
        <p>Our team at Waldoch Truck Accessories Store has received your request and will respond soon.</p>
        <p><strong>Your Details:</strong></p>
        <p>Email: ${email}</p>
        <p>Phone: ${phone}</p>
        <p>Vehicle Make: ${vehicle_make}</p>
        <p>Vehicle Model: ${vehicle_model}</p>
        <p>Vehicle Year: ${vehicle_year}</p>
        <p>VIN: ${vin_number}</p>
        <p>Address: ${address}</p>
        <p>State: ${state}</p>
        <p>Country: ${country}</p>
        ${message ? `<p>Message: ${message}</p>` : ""}
        <hr>
        <p>Best regards,</p>
        <p>The Waldoch Team</p>
        <p style="margin-top:20px; text-align:center;">
          <img src="https://www.waldoch.com/wp-content/uploads/2021/02/logo-wo-w-50th-314-86-1.png" alt="Waldoch Logo" class="logo">
        </p>
      `,
    };

    // Send sales email first
    await sgMail.send(salesEmailData);

    // HubSpot submission
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
        { name: "address", value: address },
        { name: "state", value: state },
        { name: "country", value: country },
        { name: "product_name", value: sku },
        ...(message ? [{ name: "message", value: message }] : []),
      ],
      context: {
        pageUri: req.headers.referer || process.env.REF_URL,
        pageName: product_title || sku,
      },
    };

    try {
      await axios.post(hubspotUrl, hubspotData);
    } catch (hubspotError) {
      console.error("HubSpot submission error:", hubspotError.response?.data || hubspotError.message);
    }

    // NetSuite API call
    const netsuiteUrl = `https://${process.env.NETSUITE_ACCOUNT_ID}.suitetalk.api.netsuite.com/services/rest/record/v1/customer`;
    const token = {
      key: process.env.NETSUITE_TOKEN_ID,
      secret: process.env.NETSUITE_TOKEN_SECRET,
    };

    const requestData = {
      url: netsuiteUrl,
      method: "POST",
    };

    console.log("NetSuite request timestamp:", new Date().toISOString());
    console.log("NetSuite payload:", JSON.stringify(netsuitePayload, null, 2));
    console.log("OAuth headers:", oauth.toHeader(oauth.authorize(requestData, token)));

    const headers = oauth.toHeader(oauth.authorize(requestData, token));
    headers["Content-Type"] = "application/json";

    const netsuitePayload = {
      customForm: "317_3461249_sb1_795",
      companyName: `${first_name} ${last_name}`,
      email,
      phone,
      isperson: true,
      firstname: first_name,
      lastname: last_name,
      entitystatus: 13, // Lead (use 14 for Prospect)
      defaultaddress: `${address}, ${state}, ${country}`,
      addressbook: [
        {
          defaultbilling: true,
          defaultshipping: true,
          label: "Primary Address",
          addr1: address,
          state,
          country,
        },
      ],
      custentity_product_sku: sku,
      custentity_vehicle_make: vehicle_make,
      custentity_vehicle_model: vehicle_model,
      custentity_vehicle_year: vehicle_year,
      custentity_vin_number: vin_number,
      memo: message || "No message provided",
    };

    let quoteId;
    try {
      const netsuiteResponse = await axios.post(netsuiteUrl, netsuitePayload, { headers });
      console.log("NetSuite submission successful:", netsuiteResponse.data);
      quoteId = netsuiteResponse.data.id;
      // Add quote ID to customer email
      customerEmailData.html = customerEmailData.html.replace(
        "<hr>",
        `<p><strong>Quote ID:</strong> ${quoteId}</p><hr>`
      );
      await sgMail.send(customerEmailData); // Send customer email with quote ID
    } catch (netsuiteError) {
      console.error("NetSuite submission error:", netsuiteError.response?.data || netsuiteError.message);
      throw new Error("NetSuite submission failed: " + (netsuiteError.response?.data?.message || netsuiteError.message));
    }

    res.json({ message: "Quote request submitted successfully!", quoteId });
  } catch (error) {
    console.error("Server error:", error);
    if (error.response) {
      console.error("Error details:", error.response.data);
    }
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
});

// Health check endpoint
app.get("/health", (req, res) => res.json({ status: "OK" }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});