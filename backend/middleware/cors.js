import cors from 'cors';

// Define allowed origins from environment variables
const allowedOrigins = [
  process.env.SHOPIFY_SHOP,
  process.env.WORDPRESS_SITE,
  process.env.LOCAL_URL,
  'http://127.0.0.1:5500', // Fallback for local testing
  'http://localhost:5500', // Additional fallback
].filter(Boolean); // Remove undefined/null values

// Log allowed origins for debugging
console.log('[CORS] Allowed origins:', allowedOrigins);

// CORS middleware configuration
const corsMiddleware = cors({
  origin: (origin, callback) => {
    console.log('[CORS] Incoming origin:', origin || 'No origin (e.g., Postman or file://)');
    // Allow requests with no origin (e.g., Postman, file://) or allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin || 'No origin'}`));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Support cookies (e.g., hubspotutk)
  optionsSuccessStatus: 204, // Ensure preflight returns 204
});

export default corsMiddleware;