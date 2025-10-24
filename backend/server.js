import express from "express";
import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";
import routes from "./routes/index.js";
import corsMiddleware from "./middleware/cors.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;


// Middleware
app.use(corsMiddleware);

// Increase JSON payload limit to 5MB
app.use(express.json({ limit: '5mb' })); 
 // Increase URL-encoded payload limit
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// SendGrid setup
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Routes
app.use("/", routes);

// Health check endpoint
app.get("/health", (req, res) => res.json({ status: "OK" }));

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});