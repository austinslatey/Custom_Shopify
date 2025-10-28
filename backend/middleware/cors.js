import cors from 'cors';

// Define allowed origins from environment variables
const allowedOrigins = [
  process.env.SHOPIFY_SHOP,
  process.env.SHOPIFY_SHOP_ADMIN,
  process.env.WORDPRESS_SITE,
].filter(Boolean); // Remove undefined/null values


// CORS middleware configuration
const corsMiddleware = cors({
  origin: (origin, callback) => {
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
  optionsSuccessStatus: 200, // Ensure preflight returns 200
});

export default corsMiddleware; 