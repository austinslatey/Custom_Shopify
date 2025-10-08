import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import sgMail from "@sendgrid/mail";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: process.env.SHOPIFY_SHOP }));
app.use(express.json()); // Parse JSON bodies

// SendGrid setup
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// POST /api/quote endpoint
app.post("/api/quote", async (req, res) => {
    try {
        const { first_name, last_name, email, phone, product_title, product_id, sku } = req.body;

        // Basic validation
        if (!first_name || !last_name || !email || !phone || !product_title || !product_id || !sku) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        if (!/^\+?[0-9\s\(\)-]{10,20}$/.test(phone) || !/^[0-9\s\(\)-]{10,20}$/.test(phone.replace(/^\+/, ''))) {
            return res.status(400).json({ error: "Invalid phone number (10-15 digits, optional + prefix, parentheses, spaces, or hyphens)" });
        }

        // Optional: Fetch product details from Shopify GraphQL
        // If desired place code here

        // Prepare email
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
        <hr>
        <p>Thank you,</p>
        <p>The Waldoch Team</p>
        <p style="margin-top:20px; text-align:center;">
            <img src="https://www.waldoch.com/wp-content/uploads/2021/02/logo-wo-w-50th-314-86-1.png"
                    alt="Waldoch Logo" style="max-width:200px; height:auto;">
        </p>
      `,
        };

        // Prepare customer confirmation email
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
        <hr>
        <p>Best regards,</p>
        <p>The Waldoch Team</p>
        <p style="margin-top:20px; text-align:center;">
          <img src="https://www.waldoch.com/wp-content/uploads/2021/02/logo-wo-w-50th-314-86-1.png" alt="Waldoch Logo" class="logo">
        </p>
      `,
        };

        // Send emails via SendGrid
        try {
            await Promise.all([
                sgMail.send(salesEmailData),
                sgMail.send(customerEmailData),
            ]);
        } catch (emailErr) {
            console.error("SendGrid error:", emailErr.response?.body || emailErr);
            return res.status(500).json({ error: "Failed to send email" });
        }

        res.json({ message: "Quote request submitted successfully!" });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Health check endpoint
app.get("/health", (req, res) => res.json({ status: "OK" }));

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
