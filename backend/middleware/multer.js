import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure upload directory
const uploadDir = path.join(__dirname, '../../Uploads');

// Configure Multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      console.error('[Vehicle Config Upload Middleware] Error creating upload directory:', error.message);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Configure Multer instance
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.pdf') {
      console.error('[Vehicle Config Upload Middleware] Invalid file type:', file.originalname);
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  },
});

// Export Multer middleware for single PDF upload
export const vehicleConfigUpload = upload.single('pdf');