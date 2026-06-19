const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

/**
 * Generate a QR code for an invitation
 * @param {string} uniqueCode - The unique invitation code
 * @param {string} weddingSlug - The wedding slug for URL
 * @returns {Promise<{dataUrl: string, filePath: string}>}
 */
async function generateQRCode(uniqueCode, weddingSlug) {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const invitationUrl = `${baseUrl}/i/${weddingSlug}/${uniqueCode}`;
  
  const options = {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    quality: 0.92,
    margin: 2,
    width: 300,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  };

  // Generate as data URL
  const dataUrl = await QRCode.toDataURL(invitationUrl, options);

  // Generate and save file
  const filename = `qr_${uniqueCode}.png`;
  const filePath = path.join(__dirname, '../../uploads/qrcodes', filename);
  
  // Ensure directory exists
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  
  await QRCode.toFile(filePath, invitationUrl, options);

  return {
    dataUrl,
    filePath: `/uploads/qrcodes/${filename}`,
    url: invitationUrl
  };
}

/**
 * Generate QR code as Base64 for embedding in templates
 * @param {string} url - The URL to encode
 * @returns {Promise<string>} - Base64 data URL
 */
async function generateQRCodeBase64(url) {
  const options = {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    quality: 0.92,
    margin: 2,
    width: 200
  };

  return await QRCode.toDataURL(url, options);
}

/**
 * Generate unique invitation code
 * @returns {string} - Unique 8 character code
 */
function generateUniqueCode() {
  const uuid = uuidv4().replace(/-/g, '');
  return uuid.substring(0, 8).toUpperCase();
}

module.exports = {
  generateQRCode,
  generateQRCodeBase64,
  generateUniqueCode
};
