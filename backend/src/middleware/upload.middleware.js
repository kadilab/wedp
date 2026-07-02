const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/images', 'uploads/covers', 'uploads/logos', 'uploads/csv', 'uploads/pdfs', 'uploads/qrcodes', 'uploads/backgrounds', 'uploads/qr-logos', 'uploads/couple-photos', 'uploads/avatars', 'uploads/template-backgrounds', 'uploads/templates', 'uploads/icons', 'uploads/fonts'];
uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '../../', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'uploads/images';
    
    if (file.fieldname === 'cover' || file.fieldname === 'coverPhoto') {
      folder = 'uploads/covers';
    } else if (file.fieldname === 'logo') {
      folder = 'uploads/logos';
    } else if (file.fieldname === 'background' || file.fieldname === 'backgroundImage') {
      folder = 'uploads/backgrounds';
    } else if (file.fieldname === 'qrLogo' || file.fieldname === 'qrCodeLogo') {
      folder = 'uploads/qr-logos';
    } else if (file.fieldname === 'couplePhoto') {
      folder = 'uploads/couple-photos';
    } else if (file.fieldname === 'avatar') {
      folder = 'uploads/avatars';
    } else if (file.fieldname === 'templateBackground') {
      folder = 'uploads/template-backgrounds';
    } else if (file.fieldname === 'previewImage') {
      folder = 'uploads/templates';
    } else if (file.fieldname === 'icon') {
      folder = 'uploads/icons';
    } else if (file.fieldname === 'font') {
      folder = 'uploads/fonts';
    } else if (file.fieldname === 'csv' || file.fieldname === 'guestList' || file.fieldname === 'file') {
      folder = 'uploads/csv';
    }
    
    cb(null, path.join(__dirname, '../../', folder));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  const allowedDocTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  // Guest import (fieldname 'file') and legacy 'csv'/'guestList' accept spreadsheets.
  if (file.fieldname === 'csv' || file.fieldname === 'guestList' || file.fieldname === 'file') {
    if (allowedDocTypes.includes(file.mimetype) || /\.(csv|xlsx|xls)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Formats acceptés : .csv, .xlsx, .xls'), false);
    }
  } else if (file.fieldname === 'font') {
    // Font files — browsers send inconsistent mimetypes, so trust the extension.
    if (/\.(ttf|otf|woff|woff2)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Formats acceptés : .ttf, .otf, .woff, .woff2'), false);
    }
  } else {
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
};

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// Single file upload
const uploadSingle = (fieldName) => upload.single(fieldName);

// Multiple files upload
const uploadMultiple = (fieldName, maxCount = 10) => upload.array(fieldName, maxCount);

// Multiple fields
const uploadFields = (fields) => upload.fields(fields);

// Error handler middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files.' });
    }
    return res.status(400).json({ error: err.message });
  }
  
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  
  next();
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  handleUploadError
};
