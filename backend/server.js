import express from 'express';
import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';
import routes from './routes/index.js';
import corsMiddleware from './middleware/cors.js';
import cors from 'cors';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;


// Middleware
app.use(corsMiddleware);

// Allow all
app.use(cors({ origin: '*', credentials: true }));

// Increase JSON and URL-encoded payload limit to 15MB (for 12.6 MB PDF)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// SendGrid setup
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Routes
app.use('/', routes);

// Health check endpoint
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// Start server
app.listen(PORT, () => {
  console.log(`[Server] Server running on http://localhost:${PORT}`);
});