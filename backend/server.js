import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import sgMail from "@sendgrid/mail";
import fetch from "node-fetch";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: process.env.SHOPIFY_SHOP }));
app.use(express.json()); // Parse JSON bodies

// SendGrid setup
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Shopify GraphQL API URL
const SHOPIFY_API_URL = `${process.env.ADMIN_URL}`;

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

    // Optional: Fetch product details from Shopify GraphQL
    let productDetails = {};
    try {
      const query = `
        query {
          product(id: "gid://shopify/Product/${product_id}") {
            vendor
            variants(first: 1) {
              edges {
                node {
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      `;
      const response = await fetch(SHOPIFY_API_URL, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.errors) {
          console.error("GraphQL errors:", data.errors);
        } else {
          const product = data.data.product;
          productDetails = {
            vendor: product?.vendor || "N/A",
            price: product?.variants.edges[0]?.node.price.amount || "N/A",
          };
        }
      } else {
        console.error("Shopify API error:", response.status, response.statusText);
      }
    } catch (shopifyErr) {
      console.error("Shopify GraphQL fetch error:", shopifyErr);
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
