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
            // Array of { sku: string, reason: string }
            products, 
            message
        } = req.body;

        // Validation
        if (!email || !orderNumber || !products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ error: "Missing required fields: email, orderNumber, or products" });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        const validReasons = [
            "Ordered wrong item",
            "Duplicate order of product",
            "Wrong part",
            "Damaged in shipping",
            "Did not fit",
            "Changed my mind"
        ];

        for (const product of products) {
            if (!product.sku || !product.reason || !validReasons.includes(product.reason)) {
                return res.status(400).json({ error: "Invalid product data or return reason" });
            }
        }

        // Map to NetSuite RMA payload
        const payload = {
            entity: { id: await getCustomerId(email) },
            createdFrom: { id: await getOrderId(orderNumber) },
            memo: message || "Customer return request",
            item: {
                items: products.map(product => ({
                    item: { id: getItemId(product.sku) },
                    quantity: 1, // Adjust if quantity is collected
                    description: product.reason
                }))
            }
        };

        // Send to NetSuite RMA endpoint
        const rmaEndpoint = `https://${process.env.NETSUITE_ACCOUNT_ID}.suitetalk.api.netsuite.com/services/rest/record/v1/returnAuthorization`;
        const netsuiteResponse = await netsuiteRequest(payload, rmaEndpoint);

        // Send confirmation email
        const customerEmailData = {
            to: email,
            from: process.env.EMAIL_FROM,
            subject: `Your Return Request for Order #${orderNumber}`,
            html: `
                <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    h2 { color: #007bff; }
                    p { margin: 5px 0; }
                    .logo { max-width: 200px; height: auto; }
                </style>
                <h2>Return Request Received</h2>
                <p>Dear ${firstName || ''} ${lastName || ''},</p>
                <p>Thank you for submitting a return request for Order #${orderNumber}.</p>
                <p><strong>Details:</strong></p>
                <p>Email: ${email}</p>
                <p>Products to Return:</p>
                <ul>
                    ${products.map(p => `<li>${p.sku} - ${p.reason}</li>`).join('')}
                </ul>
                ${message ? `<p>Message: ${message}</p>` : ''}
                <p>Our team will review your request and contact you soon.</p>
                <hr>
                <p>Best regards,</p>
                <p>The Waldoch Team</p>
                <p style="margin-top:20px; text-align:center;">
                    <img src="https://www.waldoch.com/wp-content/uploads/2021/02/logo-wo-w-50th-314-86-1.png" alt="Waldoch Logo" class="logo">
                </p>
            `
        };

        await sgMail.send(customerEmailData);

        res.json({ message: "Return request submitted successfully!" });
    } catch (error) {
        console.error("Returns endpoint error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Placeholder lookup functions (implement with NetSuite REST API searches)
async function getCustomerId(email) {
    // Example: GET /customer?q=email eq "<email>"
    return "123"; // Replace with actual lookup
}

async function getOrderId(orderNumber) {
    // Example: GET /salesOrder?q=tranId eq "<orderNumber>"
    return "456"; // Replace with actual lookup
}

function getItemId(sku) {
    // Example: GET /item?q=sku eq "<sku>"
    return "789"; // Replace with actual lookup
}

export default router;