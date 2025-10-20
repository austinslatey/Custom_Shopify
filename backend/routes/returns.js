import { Router } from "express";
import sgMail from "@sendgrid/mail";
import { netsuiteRequest } from "../utils/netsuite.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const {
      email,
      firstName,
      lastName,
      orderNumber,
      products, // [{ sku, reason, quantity }]
      message
    } = req.body;

    // Validate input
    if (!email || !orderNumber || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Missing required fields: email, orderNumber, or products" });
    }

    // Send to NetSuite RESTlet
    const netsuiteResponse = await netsuiteRequest({
      email,
      firstName,
      lastName,
      orderNumber,
      products,
      message
    }, process.env.NETSUITE_RETURN_URL);

    if (!netsuiteResponse?.success) {
      console.error("NetSuite RMA creation failed:", netsuiteResponse.error);
      return res.status(500).json({ error: netsuiteResponse.error });
    }

    // Confirmation email
    const html = `
      <h2>Return Request Received</h2>
      <p>Dear ${firstName || ''} ${lastName || ''},</p>
      <p>We have received your return request for order #${orderNumber}.</p>
      <p><strong>Items:</strong></p>
      <ul>${products.map(p => `<li>${p.sku} – ${p.reason}</li>`).join('')}</ul>
      <p>${message || ''}</p>
      <hr>
      <p>Our team will review your request and contact you soon.</p>
    `;

    await sgMail.send({
      to: email,
      from: process.env.EMAIL_FROM,
      subject: `Return Request Received for Order #${orderNumber}`,
      html
    });

    res.json({
      success: true,
      message: "Return Authorization created successfully",
      rmaId: netsuiteResponse.rmaId
    });

  } catch (error) {
    console.error("Returns endpoint error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
