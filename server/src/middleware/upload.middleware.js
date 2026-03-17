// server/src/middleware/upload.middleware.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const ApiError = require('../utils/ApiError');
const config = require('../config');

// Ensure upload directories exist
const uploadDirs = ['./uploads/documents', './uploads/temp', './uploads/vouchers', './uploads/invoices'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'temp';
    
    if (file.fieldname === 'gstCertificate' || file.fieldname === 'panCard') {
      folder = 'documents';
    } else if (file.fieldname === 'profilePicture') {
      folder = 'temp';
    }
    
    cb(null, `./uploads/${folder}`);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = config.upload.allowedTypes;
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.upload.maxSize
  },
  fileFilter: fileFilter
});

// Middleware to process image uploads
const processImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    if (req.file.mimetype.startsWith('image/')) {
      const filename = `processed-${req.file.filename}`;
      const filepath = path.join(path.dirname(req.file.path), filename);

      await sharp(req.file.path)
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toFile(filepath);

      // Delete original and replace with processed
      fs.unlinkSync(req.file.path);
      req.file.path = filepath;
      req.file.filename = filename;
    }

    next();
  } catch (error) {
    next(new ApiError(500, 'Error processing image'));
  }
};

// Middleware to handle multiple file uploads
const uploadMultiple = upload.fields([
  { name: 'gstCertificate', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'profilePicture', maxCount: 1 }
]);

module.exports = {
  upload,
  uploadMultiple,
  processImage
};