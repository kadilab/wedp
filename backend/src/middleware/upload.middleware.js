const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const sharp = require('sharp');
const logger = require('../utils/logger');

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/images', 'uploads/covers', 'uploads/logos', 'uploads/csv', 'uploads/pdfs', 'uploads/qrcodes', 'uploads/backgrounds', 'uploads/qr-logos', 'uploads/couple-photos', 'uploads/avatars', 'uploads/template-backgrounds', 'uploads/templates', 'uploads/icons', 'uploads/fonts', 'uploads/guestbook', 'uploads/music'];
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
    } else if (file.fieldname === 'guestbookPhoto') {
      folder = 'uploads/guestbook';
    } else if (file.fieldname === 'music') {
      folder = 'uploads/music';
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
  } else if (file.fieldname === 'music') {
    // Background music — mimetypes are inconsistent across browsers/devices,
    // so also trust the extension (mirrors the 'font' handling above).
    const allowedAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/aac'];
    if (allowedAudioTypes.includes(file.mimetype) || /\.(mp3|wav|ogg|m4a|aac)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Formats acceptés : .mp3, .wav, .ogg, .m4a, .aac'), false);
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

// Max pixel width to keep per upload field — guests download every one of
// these on the public invitation page, often on mobile data, so raw
// phone-camera originals (often 3000px+/several MB) get downsized and
// recompressed in place. Fields not listed here (music, font, csv, avatar
// handled separately, etc.) are left untouched.
const RESIZE_WIDTH_BY_FIELD = {
  cover: 1920,
  coverPhoto: 1920,
  background: 1920,
  backgroundImage: 1920,
  templateBackground: 1920,
  couplePhoto: 1600,
  guestbookPhoto: 1600,
  previewImage: 1200,
  bannerImage: 1920,
  logo: 800,
  qrLogo: 400,
  qrCodeLogo: 400,
  profileImage: 600,
  avatar: 600,
  icon: 400,
  thumbnail: 800,
};

// Resizes + recompresses an uploaded image in place, right after multer has
// written it to disk. Runs before handleUploadError in the middleware chain,
// but since it's a normal (3-arg) middleware, Express automatically skips it
// on a multer error (next(err) jumps straight to the 4-arg error handler) —
// so ordering is safe without any extra checks here.
const optimizeImage = async (req, res, next) => {
  if (!req.file) return next();
  const maxWidth = RESIZE_WIDTH_BY_FIELD[req.file.fieldname];
  const mimetype = req.file.mimetype || '';
  // Skip formats sharp shouldn't rewrite: vector (SVG) and animated (GIF).
  if (!maxWidth || !mimetype.startsWith('image/') || mimetype === 'image/svg+xml' || mimetype === 'image/gif') {
    return next();
  }

  try {
    const filePath = req.file.path;
    const original = fs.readFileSync(filePath);
    const image = sharp(original, { failOn: 'none' }).rotate(); // auto-orient from EXIF
    const metadata = await sharp(original).metadata();
    if (metadata.width && metadata.width > maxWidth) {
      image.resize({ width: maxWidth, withoutEnlargement: true });
    }

    let buffer;
    if (metadata.format === 'png') {
      buffer = await image.png({ compressionLevel: 9, palette: true }).toBuffer();
    } else if (metadata.format === 'webp') {
      buffer = await image.webp({ quality: 82 }).toBuffer();
    } else {
      buffer = await image.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    }

    // Only replace the original if we actually saved space — a tiny/already
    // optimized source could theoretically grow slightly after re-encoding.
    if (buffer.length < original.length) {
      fs.writeFileSync(filePath, buffer);
      req.file.size = buffer.length;
    }
  } catch (err) {
    // Never fail an upload because optimization failed — keep the original file.
    logger.warn(`Image optimization skipped for ${req.file.fieldname}: ${err.message}`);
  }
  next();
};

// Single file upload (multer, then automatic resize/compression for images)
const uploadSingle = (fieldName) => [upload.single(fieldName), optimizeImage];

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
