import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import sgMail from "@sendgrid/mail";
import fetch from "node-fetch";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: `${process.env.SHOPIFY_SHOP}` })); // Restrict to your Shopify store
app.use(express.json()); // Parse JSON bodies

// SendGrid setup
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Shopify API base URL
const SHOPIFY_API_URL = `${process.env.ADMIN_SHOP}/admin/api/2024-07`;

// POST /api/quote endpoint
app.post("/api/quote", async (req, res) => {
  try {
    const { first_name, last_name, email, phone, product_title, collection_handle, product_id } = req.body;

    // Basic validation
    if (!first_name || !last_name || !email || !phone || !product_title || !product_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (!/^[0-9]{10,15}$/.test(phone)) {
      return res.status(400).json({ error: "Invalid phone number (10-15 digits)" });
    }

    // Optional: Fetch product details from Shopify
    let productDetails = {};
    try {
      const response = await fetch(`${SHOPIFY_API_URL}/products/${product_id}.json`, {
        headers: {
          "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
        },
      });
      if (response.ok) {
        const data = await response.json();
        productDetails = {
          vendor: data.product?.vendor || "N/A",
          price: data.product?.variants[0]?.price || "N/A",
        };
      }
    } catch (shopifyErr) {
      console.error("Shopify fetch error:", shopifyErr);
      // Continue without product details
    }

    // Prepare email
    const emailData = {
      to: process.env.SALES_EMAIL,
      from: process.env.EMAIL_FROM,
      subject: `New Quote Request: ${product_title}`,
      html: `
        <h2>New Quote Request</h2>
        <p><strong>Product:</strong> ${product_title} (Collection: ${collection_handle || "N/A"})</p>
        <p><strong>Customer:</strong> ${first_name} ${last_name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Product ID:</strong> ${product_id}</p>
        ${Object.entries(productDetails)
          .map(([k, v]) => `<p><strong>${k.charAt(0).toUpperCase() + k.slice(1)}:</strong> ${v}</p>`)
          .join("")}
        <hr>
        <p>Please respond promptly!</p>
      `,
    };

    // Send email via SendGrid
    await sgMail.send(emailData);

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
