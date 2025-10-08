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

    if (!/^[0-9]{10,15}$/.test(phone)) {
      return res.status(400).json({ error: "Invalid phone number (10-15 digits)" });
    }

    // Optional: Fetch product details from Shopify GraphQL
    // If desired place code here

    // Prepare email
    const emailData = {
      to: process.env.SALES_EMAIL,
      from: process.env.EMAIL_FROM,
      subject: `New Quote Request: ${product_title}`,
      html: `
        <h2>New Quote Request</h2>
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

    // Send email via SendGrid
    try {
      await sgMail.send(emailData);
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
