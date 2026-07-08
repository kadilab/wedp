const QRCode = require('qrcode');
const bwipjs = require('bwip-js');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// bwip-js wants 6-hex colors WITHOUT the leading '#'.
function bwipHex(value, fallback) {
  const v = (typeof value === 'string' ? value.trim() : '').replace('#', '');
  return /^[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : fallback;
}

// A 6-hex-digit color, falling back to a default when the stored value is
// missing or malformed (so a bad setting can never crash QR generation).
function safeHexColor(value, fallback) {
  if (typeof value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim())) {
    return value.trim();
  }
  return fallback;
}

/**
 * Generate a QR code for an invitation, honoring the event's configured QR
 * customization (colors + size) so every generated invitation matches the
 * style chosen during event creation instead of a default black/white code.
 *
 * @param {string} uniqueCode - The unique invitation code
 * @param {string} weddingSlug - The wedding slug for URL
 * @param {object} [style] - Optional QR styling, typically the wedding row:
 *        { qrCodeColor, qrCodeBgColor, qrCodeSize }
 * @returns {Promise<{dataUrl: string, filePath: string, url: string}>}
 */
async function generateQRCode(uniqueCode, weddingSlug, style = {}) {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const invitationUrl = `${baseUrl}/i/${weddingSlug}/${uniqueCode}`;

  // Barcode variant (Code128) — encodes the short uniqueCode (the check-in app
  // accepts either a full URL or a raw code). Style comes from the template.
  if (style.codeType === 'barcode') {
    const transparentBar = style.qrCodeBgColor === 'transparent';
    const barcolor = bwipHex(style.qrCodeColor, '000000');
    const opts = {
      bcid: 'code128',
      text: uniqueCode,
      scale: 3,
      height: 14,
      includetext: true,
      textxalign: 'center',
      textsize: 9,
      barcolor,
      paddingwidth: 6,
      paddingheight: 6,
    };
    if (!transparentBar) opts.backgroundcolor = bwipHex(style.qrCodeBgColor, 'FFFFFF');
    const buf = await bwipjs.toBuffer(opts);
    const dataUrl = `data:image/png;base64,${buf.toString('base64')}`;
    const filename = `bar_${uniqueCode}.png`;
    const filePath = path.join(__dirname, '../../uploads/qrcodes', filename);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buf);
    return { dataUrl, filePath: `/uploads/qrcodes/${filename}`, url: invitationUrl };
  }

  const dark = safeHexColor(style.qrCodeColor, '#000000');
  // A transparent background is requested by storing the literal "transparent";
  // the qrcode lib expects an #RRGGBBAA value, so map it to fully transparent.
  const light = style.qrCodeBgColor === 'transparent'
    ? '#00000000'
    : safeHexColor(style.qrCodeBgColor, '#FFFFFF');
  const width = Math.max(120, Math.min(1000, parseInt(style.qrCodeSize, 10) || 300));

  const options = {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    quality: 0.92,
    margin: 2,
    width,
    color: { dark, light }
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
