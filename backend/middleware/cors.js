import cors from 'cors';

// Define allowed origins from environment variables
const allowedOrigins = [
    process.env.SHOPIFY_SHOP,
    process.env.WORDPRESS_SITE
].filter(Boolean); // Remove undefined/null values

// CORS middleware configuration
const corsMiddleware = cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g., non-browser clients like Postman)
        if (!origin) return callback(null, true);
        // Check if the origin is in the allowed list
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
     // Allow specific methods
    methods: ['GET', 'POST', 'OPTIONS'],
     // Allow specific headers
    allowedHeaders: ['Content-Type', 'Authorization']
});

export default corsMiddleware;