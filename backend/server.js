import express from 'express';
import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';
import routes from './routes/index.js';
import corsMiddleware from './middleware/cors.js';

// Load environment variables
const result = dotenv.config();
if (result.error) {
  console.error('[Server] Failed to load .env file:', result.error.message);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to log full request URL
app.use((req, res, next) => {
  const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  console.log(`[Server] Incoming request: ${req.method} ${fullUrl}`);
  next();
});

// Middleware
app.use(corsMiddleware);

// Increase JSON and URL-encoded payload limit to 15MB (for 12.6 MB PDF)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// SendGrid setup
if (!process.env.SENDGRID_API_KEY) {
  console.error('[Server] SENDGRID_API_KEY is not set');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Routes
app.use('/', routes);

// Health check endpoint
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// Start server
app.listen(PORT, () => {
  console.log(`[Server] Server running on http://localhost:${PORT}`);
});