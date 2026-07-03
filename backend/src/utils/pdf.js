const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { DATE_VARIABLE_KEYS, DEFAULT_DATE_FORMAT, formatEventDate, componentVars, TIME_VARIABLE_KEYS, DEFAULT_TIME_FORMAT, formatEventTime, timeComponentVars, getElementDateKey, miniCalendarHTML } = require('./dateFormats');
const { buildGoogleFontsHref, customFontFaceCss } = require('./fonts');
const { getSiteName } = require('./settings');

// Lazily read admin-uploaded custom fonts and build their @font-face CSS so the
// puppeteer page can render them (absolute URLs fetched over the network).
async function getCustomFontCss() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const row = await prisma.setting.findUnique({ where: { key: 'customFonts' } });
    const fonts = row?.value ? JSON.parse(row.value) : [];
    return customFontFaceCss(fonts);
  } catch {
    return '';
  }
}

// Runs INSIDE the puppeteer page: shrink the font-size of [data-autofit]
// elements until their text fits their fixed box. Mirrors the frontend
// AutoFitText so generated PDF/PNG match the web render.
function applyAutoFitInPage() {
  document.querySelectorAll('[data-autofit="1"]').forEach((el) => {
    let s = parseFloat(el.style.fontSize) || 16;
    let guard = 0;
    while (
      (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) &&
      s > 6 && guard < 400
    ) {
      s -= 0.5;
      el.style.fontSize = s + 'px';
      guard++;
    }
  });
}

// Convert a hex color + opacity (0-100) to an rgba() CSS string (used for photo element borders)
function hexToRgba(hex, alphaPercent = 100) {
  let h = (hex || '#FFFFFF').replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(100, alphaPercent)) / 100})`;
}

// Shape options for "photo"/"image" design elements - mirrors
// frontend/src/utils/imageShapes.js. 'rect' (default/null) keeps the
// existing border-radius behavior; every other shape clips via clip-path.
// 'custom' (Forme libre) uses the per-element customClipPath string.
const DEFAULT_CUSTOM_CLIP_PATH = 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)';
function getClipPath(shape, customValue) {
  switch (shape) {
    case 'circle': return 'circle(50% at 50% 50%)';
    case 'hexagon': return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
    case 'diamond': return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
    case 'octagon': return 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';
    case 'star': return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
    case 'heart': return 'polygon(50% 100%, 12% 62%, 0% 36%, 4% 17%, 20% 6%, 36% 8%, 50% 22%, 64% 8%, 80% 6%, 96% 17%, 100% 36%, 88% 62%)';
    case 'custom': return (customValue && customValue.trim()) || DEFAULT_CUSTOM_CLIP_PATH;
    default: return null;
  }
}

// Resolve a local upload path (or URL/data-uri) to a base64 data URI for embedding in Puppeteer-rendered PDFs
function resolveImageToDataUri(imgPath) {
  if (!imgPath) return '';
  if (imgPath.startsWith('http') || imgPath.startsWith('data:')) return imgPath;
  try {
    const relPath = imgPath.startsWith('/') ? imgPath.slice(1) : imgPath;
    const absPath = path.join(__dirname, '../../', relPath);
    if (!fs.existsSync(absPath)) return '';
    const buf = fs.readFileSync(absPath);
    const ext = path.extname(absPath).toLowerCase().replace('.', '');
    const mimeMap = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', svg: 'svg+xml', webp: 'webp' };
    const mime = mimeMap[ext] || ext;
    return `data:image/${mime};base64,${buf.toString('base64')}`;
  } catch (e) {
    logger.warn(`Error loading image ${imgPath}: ${e.message}`);
    return '';
  }
}

/**
 * Generate HTML content for the invitation PDF
 * This HTML faithfully reproduces the InvitationView.jsx frontend component
 */
function generateInvitationHTML(options) {
  const { wedding, guest, invitation, template, siteName = 'WeddingInvite Pro' } = options;
  
  // Extract template config with fallbacks
  const templateConfig = template?.config || {};
  const canvasW = templateConfig.canvasWidth || template?.canvasWidth || 800;
  const canvasH = templateConfig.canvasHeight || template?.canvasHeight || 1120;
  
  let colorScheme = template?.colorScheme || {};
  if (typeof colorScheme === 'string') {
    try { colorScheme = JSON.parse(colorScheme); } catch (e) { colorScheme = {}; }
  }
  
  const templateColors = { ...colorScheme, ...(templateConfig.colors || {}) };
  const templateFonts = templateConfig.fonts || {};
  
  const primaryColor = wedding.primaryColor || templateColors.primary || '#df6746';
  const secondaryColor = wedding.secondaryColor || templateColors.secondary || '#f2b5a3';
  const backgroundColor = wedding.bgColor || templateColors.background || '#ffffff';
  const textColor = wedding.textColor || templateColors.text || '#1f2937';
  
  const headingFont = templateFonts.heading || 'Playfair Display, serif';
  const bodyFont = templateFonts.body || 'Inter, sans-serif';
  
  // Background style
  const getBodyBackground = () => {
    const bgType = wedding.backgroundType || 'color';
    if (bgType === 'image' && wedding.backgroundImage) {
      let bgUrl = wedding.backgroundImage;
      if (!bgUrl.startsWith('http') && !bgUrl.startsWith('data:')) {
        try {
          const relativePath = bgUrl.startsWith('/') ? bgUrl.slice(1) : bgUrl;
          const absolutePath = path.join(__dirname, '../../', relativePath);
          if (fs.existsSync(absolutePath)) {
            const imageBuffer = fs.readFileSync(absolutePath);
            const base64Image = imageBuffer.toString('base64');
            const ext = path.extname(absolutePath).toLowerCase().replace('.', '');
            const mimeType = ext === 'jpg' ? 'jpeg' : ext;
            bgUrl = `data:image/${mimeType};base64,${base64Image}`;
          } else {
            return { hasCustomBg: false };
          }
        } catch (err) {
          return { hasCustomBg: false };
        }
      }
      return {
        hasCustomBg: true,
        css: `background-image: url('${bgUrl}'); background-size: cover; background-position: center; background-repeat: no-repeat;`
      };
    } else if (bgType === 'gradient' && wedding.backgroundGradient) {
      return { hasCustomBg: true, css: `background: ${wedding.backgroundGradient};` };
    }
    return { hasCustomBg: false };
  };
  
  const bgInfo = getBodyBackground();
  const bgOpacity = (wedding.backgroundOpacity || 100) / 100;
  
  // Format date in French
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
  };
  
  const hasCommune = wedding.communeDate || wedding.communeVenue;
  const hasEglise = wedding.egliseDate || wedding.egliseVenue;
  const hasReception = wedding.receptionDate || wedding.receptionVenue;
  const hasProgram = hasCommune || hasEglise || hasReception;
  
  const getUnifiedDate = () => {
    const dates = [wedding.communeDate, wedding.egliseDate, wedding.receptionDate]
      .filter(Boolean).map(d => new Date(d).toDateString());
    const uniqueDates = [...new Set(dates)];
    if (uniqueDates.length === 1) {
      return formatDate(wedding.communeDate || wedding.egliseDate || wedding.receptionDate);
    }
    return null;
  };
  const unifiedDate = getUnifiedDate();
  
  const qrCodeSrc = invitation.qrCodeData || '';
  const socialLinks = wedding.socialLinks || {};
  const hasSocialLinks = socialLinks.instagram || socialLinks.hashtag || socialLinks.website;

  // Program colors from template config (fallback to default blue/purple/pink)
  const programConfig = templateConfig.program || {};
  const communeColor = programConfig.communeColor || '#3B82F6';
  const egliseColor = programConfig.egliseColor || '#8B5CF6';
  const receptionColor = programConfig.receptionColor || '#EC4899';

  // Helper: convert hex color to rgba for light backgrounds
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  // SVG icons as inline strings (matching heroicons from the frontend)
  const heartSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;color:rgba(255,255,255,0.5)"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/></svg>`;
  const heartSmallSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="${primaryColor}" stroke-width="1.5" style="width:22px;height:22px"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/></svg>`;
  const calendarSVG = (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" style="width:20px;height:20px;flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg>`;
  const clockSVG = (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" style="width:20px;height:20px;flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  const mapPinSVG = (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" style="width:20px;height:20px;flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>`;
  const buildingSVG = `<svg viewBox="0 0 24 24" fill="currentColor" style="width:22px;height:22px;color:white"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>`;
  const churchSVG = `<svg viewBox="0 0 24 24" fill="currentColor" style="width:22px;height:22px;color:white"><path d="M18 12.22V9l-5-2.5V5h1V3h-1V1h-2v2h-1v2h1v1.5L6 9v3.22l-2 1V22h8v-3c0-1.1.9-2 2-2s2 .9 2 2v3h8v-8.78l-2-1zM12 13.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>`;
  const musicSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:22px;height:22px;color:white"><path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"/></svg>`;

  // Build event card HTML helper
  const buildEventCard = (type, title, subtitle, bgClass, borderClass, iconBg, iconSVG, accentColor, dateVal, timeVal, venueVal, addressVal, timePrefix) => {
    if (!dateVal && !venueVal) return '';
    return `
    <div style="background:${bgClass};border:1px solid ${borderClass};border-radius:12px;padding:20px;text-align:left;margin-bottom:12px">
      <div style="display:flex;align-items:flex-start;gap:16px">
        <div style="width:48px;height:48px;background:${iconBg};border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          ${iconSVG}
        </div>
        <div style="flex:1">
          <h4 style="font-weight:600;color:#1f2937;margin:0 0 4px 0;font-size:24px">${title}</h4>
          <p style="font-size:20px;font-weight:500;color:${accentColor};margin:0">${subtitle}</p>
          <div style="margin-top:10px;font-size:20px">
            ${!unifiedDate && dateVal ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;color:#374151">${calendarSVG(accentColor)}<span>${formatDate(dateVal)}</span></div>` : ''}
            ${timeVal ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;color:#374151">${clockSVG(accentColor)}<span>${timePrefix || ''}${timeVal}</span></div>` : ''}
            ${venueVal ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;color:#374151">${mapPinSVG(accentColor)}<span>${venueVal}</span></div>` : ''}
            ${addressVal ? `<p style="color:#6b7280;font-size:20px;margin:0 0 0 28px">${addressVal}</p>` : ''}
          </div>
        </div>
      </div>
    </div>`;
  };

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation - ${wedding.brideName} & ${wedding.groomName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&family=Great+Vibes&family=Cormorant+Garamond:wght@400;500;600;700&family=Lora:wght@400;500;600;700&family=Dancing+Script:wght@400;500;600;700&family=Tangerine:wght@400;700&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: ${canvasW}px ${canvasH}px; margin: 0; }
    body {
      font-family: ${bodyFont};
      color: ${textColor};
      width: ${canvasW}px;
      min-height: ${canvasH}px;
      position: relative;
      overflow: hidden;
      ${bgInfo.hasCustomBg ? bgInfo.css : ''}
    }
    /* Default gradient when no custom background */
    .default-bg {
      position: absolute; inset: 0;
      background: linear-gradient(to bottom right, #fff1f2, #ffffff, #fefce8);
      z-index: 0;
    }
    /* Overlay for custom backgrounds */
    .custom-bg-overlay {
      position: absolute; inset: 0;
      background: white;
      opacity: ${1 - bgOpacity};
      z-index: 1;
    }
    /* Decorative circles */
    .deco-circle-tl {
      position: absolute; top: 0; left: 0;
      width: 256px; height: 256px;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.3;
      background: ${primaryColor};
      z-index: 2;
    }
    .deco-circle-br {
      position: absolute; bottom: 0; right: 0;
      width: 384px; height: 384px;
      border-radius: 50%;
      transform: translate(50%, 50%);
      opacity: 0.3;
      background: ${secondaryColor};
      z-index: 2;
    }
    .page-wrapper {
      position: relative; z-index: 10;
      max-width: ${canvasW}px;
      margin: 0 auto;
      padding: 12px 10px;
    }
    .card {
      background: ${backgroundColor}e6;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      overflow: hidden;
    }
    /* Header */
    .header {
      position: relative;
      height: 210px;
      background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
      display: flex; align-items: center; justify-content: center;
    }
    .header img {
      width: 100%; height: 100%; object-fit: cover;
      position: absolute; inset: 0;
    }
    .header-overlay {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.2);
    }
    .header-icon {
      position: relative; z-index: 1;
    }
    .event-theme-badge {
      position: absolute; top: 10px; right: 10px;
      background: rgba(255,255,255,0.8);
      padding: 4px 12px; border-radius: 9999px;
      font-size: 16px; font-weight: 500; color: #1f2937;
      z-index: 2;
    }
    /* Content */
    .content {
      padding: 32px 48px;
      text-align: center;
    }
    @media print {
      .content { padding: 28px 40px; }
    }
    .invite-label {
      font-size: 20px; font-weight: 500;
      text-transform: uppercase; letter-spacing: 3px;
      color: ${primaryColor};
      margin-bottom: 12px;
    }
    .bride-name, .groom-name {
      font-family: ${headingFont};
      font-size: 48px; font-weight: 700;
      color: ${textColor};
      line-height: 1.2;
      margin: 0;
    }
    .ampersand {
      font-family: ${headingFont};
      font-size: 30px; color: ${secondaryColor};
      margin: 6px 0;
    }
    /* Divider */
    .divider {
      display: flex; align-items: center; justify-content: center;
      margin: 20px 0;
    }
    .divider-line {
      width: 80px; height: 1px;
      background: ${secondaryColor};
    }
    .divider-heart {
      margin: 0 20px;
    }
    /* Guest */
    .guest-section { margin-bottom: 24px; }
    .guest-label { color: #6b7280; font-size: 22px; }
    .guest-name {
      font-family: ${headingFont};
      font-size: 32px; font-weight: 700;
      color: ${primaryColor};
      margin: 6px 0;
    }
    .guest-message { color: #6b7280; font-size: 22px; margin-top: 8px; }
    /* Custom message */
    .custom-msg {
      font-style: italic; color: #6b7280;
      background: #f9fafb; border-radius: 12px;
      padding: 20px; margin-bottom: 20px;
      font-size: 22px;
    }
    /* Dress code */
    .dress-code {
      display: inline-flex; align-items: center;
      padding: 8px 18px; margin-bottom: 16px;
      background: #fffbeb; border: 1px solid #fde68a;
      border-radius: 9999px;
      font-size: 20px; font-weight: 500; color: #92400e;
    }
    /* Program */
    .program-title {
      font-family: ${headingFont};
      font-size: 24px; font-weight: 700;
      color: ${textColor}; margin-bottom: 12px;
    }
    .unified-date {
      display: flex; align-items: center; justify-content: center;
      gap: 6px; margin-bottom: 12px; color: #374151;
    }
    .unified-date-text { font-size: 22px; font-weight: 600; }
    /* Simple venue (no program) */
    .venue-grid {
      display: flex; justify-content: space-around;
      background: #f9fafb; border-radius: 12px;
      padding: 14px; margin-bottom: 14px;
    }
    .venue-item { text-align: center; flex: 1; }
    .venue-icon-circle {
      width: 32px; height: 32px; border-radius: 50%;
      background: ${primaryColor}20;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 6px;
    }
    .venue-label { font-size: 20px; color: #6b7280; margin-bottom: 4px; }
    .venue-value { font-weight: 600; color: #1f2937; font-size: 22px; }
    .venue-address { margin-top: 10px; font-size: 20px; color: #6b7280; text-align: center; }
    /* Additional info */
    .additional-info {
      background: #fffbeb; border: 1px solid #fde68a;
      border-radius: 10px; padding: 10px;
      margin-bottom: 12px; text-align: left;
    }
    .additional-info-title { font-size: 20px; font-weight: 500; color: #92400e; margin-bottom: 4px; }
    .additional-info-text { font-size: 20px; color: #a16207; }
    /* RSVP deadline */
    .rsvp-deadline { font-size: 20px; color: #6b7280; margin-bottom: 16px; }
    .rsvp-deadline strong { color: #374151; }
    /* QR Code */
    .qr-section {
      margin-top: 14px; padding-top: 14px;
      border-top: 1px solid #e5e7eb;
    }
    .qr-label { font-size: 20px; color: #6b7280; margin-bottom: 10px; }
    .qr-wrapper {
      display: inline-block; padding: 10px;
      background: ${wedding.qrCodeBgColor || '#ffffff'};
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
      ${wedding.qrCodeStyle === 'elegant' ? `border: 2px solid ${wedding.qrCodeColor || '#000'};` : ''}
    }
    .qr-code { width: ${Math.min(wedding.qrCodeSize || 100, 140)}px; height: ${Math.min(wedding.qrCodeSize || 100, 140)}px; display: block; }
    .qr-code-text { font-size: 14px; color: #9ca3af; margin-top: 6px; font-family: monospace; }
    /* Table number */
    .table-section {
      margin-top: 12px; display: inline-block;
      border-radius: 10px; padding: 8px 16px;
      background: ${primaryColor}10;
      border: 1px solid ${primaryColor}30;
    }
    .table-label { font-size: 20px; color: ${primaryColor}; }
    .table-value {
      font-family: ${headingFont};
      font-size: 28px; font-weight: 700;
      color: ${primaryColor};
    }
    /* Social links */
    .social-section {
      margin-top: 14px; padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      display: flex; flex-wrap: wrap;
      align-items: center; justify-content: center; gap: 10px;
    }
    .hashtag-badge {
      padding: 6px 14px; border-radius: 9999px;
      font-size: 18px; font-weight: 700;
      background: ${primaryColor}15; color: ${primaryColor};
    }
    .social-link {
      display: flex; align-items: center;
      font-size: 18px; color: #6b7280;
      text-decoration: none;
    }
    .social-link svg { width: 20px; height: 20px; margin-right: 6px; }
    /* Footer */
    .footer {
      margin-top: 18px; padding-top: 14px;
      border-top: 1px solid #e5e7eb;
      font-size: 16px; color: #9ca3af;
      text-align: center;
    }
    .map-link {
      display: inline-flex; align-items: center;
      color: ${primaryColor}; text-decoration: none;
      font-size: 22px; margin-bottom: 16px;
    }
    .map-link svg { width: 22px; height: 22px; margin-right: 8px; }
  </style>
</head>
<body>
  ${!bgInfo.hasCustomBg ? '<div class="default-bg"></div>' : ''}
  ${bgInfo.hasCustomBg ? '<div class="custom-bg-overlay"></div>' : ''}
  <div class="deco-circle-tl"></div>
  <div class="deco-circle-br"></div>

  <div class="page-wrapper">
    <div class="card">
      <!-- Header -->
      <div class="header">
        ${wedding.couplePhoto ? `<img src="${wedding.couplePhoto}" alt="Couple"/>` :
          wedding.coverPhoto ? `<img src="${wedding.coverPhoto}" alt="Cover"/>` : ''}
        <div class="header-overlay"></div>
        <div class="header-icon">${heartSVG}</div>
        ${wedding.eventTheme ? `<div class="event-theme-badge">✨ ${wedding.eventTheme}</div>` : ''}
      </div>

      <!-- Content -->
      <div class="content">
        <!-- Names -->
        <p class="invite-label">Invitation au mariage de</p>
        <h1 class="bride-name">${wedding.brideName}</h1>
        <p class="ampersand">&</p>
        <h1 class="groom-name">${wedding.groomName}</h1>

        <!-- Divider -->
        <div class="divider">
          <div class="divider-line"></div>
          <div class="divider-heart">${heartSmallSVG}</div>
          <div class="divider-line"></div>
        </div>

        <!-- Guest -->
        <div class="guest-section">
          <p class="guest-label">Cher(e)</p>
          <p class="guest-name">${guest.firstName} ${guest.lastName}</p>
          <p class="guest-message">Vous êtes cordialement invité(e) à célébrer notre union</p>
        </div>

        ${wedding.customMessage ? `
        <div class="custom-msg">"${wedding.customMessage}"</div>
        ` : ''}

        ${wedding.dressCode ? `
        <div class="dress-code">
          <span style="margin-right:8px">👔</span>
          Code vestimentaire : ${wedding.dressCode}
        </div>
        ` : ''}

        <!-- Programme -->
        ${hasProgram ? `
        <div style="margin-bottom:32px">
          <h3 class="program-title">Programme de la célébration</h3>
          ${unifiedDate ? `
          <div class="unified-date">
            ${calendarSVG(primaryColor).replace('16px', '20px').replace('16px', '20px')}
            <span class="unified-date-text">${unifiedDate}</span>
          </div>
          ` : '<div style="margin-bottom:12px"></div>'}

          ${buildEventCard('commune', 'Mariage Civil', 'Mairie',
            hexToRgba(communeColor, 0.08), hexToRgba(communeColor, 0.15), communeColor, buildingSVG, communeColor,
            wedding.communeDate, wedding.communeTime, wedding.communeVenue, wedding.communeAddress, '')}

          ${buildEventCard('eglise', 'Mariage Religieux', 'Église',
            hexToRgba(egliseColor, 0.08), hexToRgba(egliseColor, 0.15), egliseColor, churchSVG, egliseColor,
            wedding.egliseDate, wedding.egliseTime, wedding.egliseVenue, wedding.egliseAddress, '')}

          ${buildEventCard('reception', 'Réception & Soirée Dansante', 'Fête',
            hexToRgba(receptionColor, 0.08), hexToRgba(receptionColor, 0.15), receptionColor, musicSVG, receptionColor,
            wedding.receptionDate, wedding.receptionStartTime, wedding.receptionVenue, wedding.receptionAddress, 'à partir de ')}
        </div>
        ` : ''}

        <!-- Simple venue (no program) -->
        ${!hasProgram && (wedding.venueName || wedding.weddingDate) ? `
        <div class="venue-grid">
          <div class="venue-item">
            <div class="venue-icon-circle">
              ${calendarSVG(primaryColor).replace('16px', '24px').replace('16px', '24px')}
            </div>
            <p class="venue-label">Date</p>
            <p class="venue-value">${wedding.weddingDate ? formatDate(wedding.weddingDate) : '-'}</p>
          </div>
          <div class="venue-item">
            <div class="venue-icon-circle">
              ${clockSVG(primaryColor).replace('16px', '24px').replace('16px', '24px')}
            </div>
            <p class="venue-label">Heure</p>
            <p class="venue-value">${wedding.ceremonyTime || '-'}</p>
          </div>
          <div class="venue-item">
            <div class="venue-icon-circle">
              ${mapPinSVG(primaryColor).replace('16px', '24px').replace('16px', '24px')}
            </div>
            <p class="venue-label">Lieu</p>
            <p class="venue-value">${wedding.venueName || '-'}</p>
          </div>
        </div>
        ${wedding.venueAddress ? `<p class="venue-address">${wedding.venueAddress}</p>` : ''}
        ` : ''}

        <!-- Google Maps link -->
        ${wedding.venueMapUrl ? `
        <a href="${wedding.venueMapUrl}" class="map-link">
          ${mapPinSVG(primaryColor).replace('16px', '20px').replace('16px', '20px')}
          Voir l'itinéraire sur Google Maps
        </a>
        ` : ''}

        <!-- Additional info -->
        ${wedding.additionalInfo ? `
        <div class="additional-info">
          <p class="additional-info-title">📋 Informations pratiques</p>
          <p class="additional-info-text">${wedding.additionalInfo}</p>
        </div>
        ` : ''}

        <!-- RSVP Deadline -->
        ${wedding.rsvpDeadline ? `
        <p class="rsvp-deadline">
          Merci de confirmer votre présence avant le <strong>${formatDate(wedding.rsvpDeadline)}</strong>
        </p>
        ` : ''}

        <!-- QR Code -->
        ${qrCodeSrc ? `
        <div class="qr-section">
          <p class="qr-label">Présentez ce QR code à l'entrée</p>
          <div class="qr-wrapper">
            <img class="qr-code" src="${qrCodeSrc}" alt="QR Code"/>
            ${wedding.qrCodeStyle === 'elegant' ? `<p style="font-size:12px;margin-top:8px;text-align:center;font-family:${headingFont};color:${wedding.qrCodeColor || '#000'}">Scannez-moi</p>` : ''}
          </div>
          <p class="qr-code-text">${invitation.uniqueCode}</p>
        </div>
        ` : ''}

        <!-- Table Number -->
        ${guest.tableNumber ? `
        <div class="table-section">
          <p class="table-label">Votre table</p>
          <p class="table-value">Table ${guest.tableNumber}</p>
        </div>
        ` : ''}

        <!-- Social Links -->
        ${hasSocialLinks ? `
        <div class="social-section">
          ${socialLinks.hashtag ? `<span class="hashtag-badge">${socialLinks.hashtag}</span>` : ''}
          ${socialLinks.instagram ? `
          <a href="https://instagram.com/${socialLinks.instagram.replace('@', '')}" class="social-link" target="_blank">
            <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            ${socialLinks.instagram}
          </a>
          ` : ''}
          ${socialLinks.website ? `
          <a href="${socialLinks.website}" class="social-link" target="_blank">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"/></svg>
            Notre site
          </a>
          ` : ''}
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
          <p>Créé avec ❤️ sur ${siteName}</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Generate invitation HTML using the visual designer layout
 * Uses template.config.designElements for absolute positioning on background
 */
function generateDesignBasedHTML(options) {
  const { wedding, guest, invitation, template, customFontCss = '' } = options;
  const config = template?.config || {};
  const designElements = config.designElements || [];
  
  // Select best available background image (check which file exists)
  let bgImage = '';
  for (const candidate of [config.backgroundImage, template?.previewImage, template?.backgroundUrl]) {
    if (candidate) {
      const relPath = candidate.startsWith('/') ? candidate.slice(1) : candidate;
      const absPath = path.join(__dirname, '../../', relPath);
      if (fs.existsSync(absPath)) {
        bgImage = candidate;
        logger.debug(`Selected background image: ${bgImage}`);
        break;
      }
    }
  }
  
  const bgOpacity = (config.backgroundOpacity ?? template?.backgroundOpacity ?? 100) / 100;
  const canvasW = config.canvasWidth || 800;
  const canvasH = config.canvasHeight || 1120;
  const margins = config.margins || { top: 0, right: 0, bottom: 0, left: 0 };
  // Determine from guest data (plusOnes > 0 = couple), fallback to template config
  const invitationType = (guest?.plusOnes > 0) ? 'couple' : (guest ? 'single' : (config.invitationType || 'couple'));

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Build replacement data map
  const { EVENT_TYPE_LABELS, getEventDisplayTitle } = require('./eventTypes');
  const dataMap = {
    bride_name: wedding.brideName || '',
    groom_name: wedding.groomName || '',
    honoree_name: wedding.honoreeName || '',
    event_title: getEventDisplayTitle(wedding),
    event_type: EVENT_TYPE_LABELS[wedding.eventType] || 'Mariage',
    guest_name: guest ? `${guest.firstName} ${guest.lastName}` : '',
    custom_message: wedding.customMessage || '',
    additional_info: wedding.additionalInfo || '',
    wedding_date: formatDate(wedding.weddingDate),
    ceremony_time: wedding.ceremonyTime || wedding.communeTime || '',
    venue_name: wedding.venueName || wedding.receptionVenue || '',
    venue_address: wedding.venueAddress || wedding.receptionAddress || '',
    table_number: guest?.tableNumber || '',
    rsvp_date: wedding.rsvpDeadline ? formatDate(wedding.rsvpDeadline) : '',
    invitation_type: invitationType === 'couple' ? 'Couple' : 'Singleton',
    program: [
      wedding.communeVenue ? `Mairie ${wedding.communeTime || ''}` : '',
      wedding.egliseVenue ? `Église ${wedding.egliseTime || ''}` : '',
      wedding.receptionVenue ? `Réception ${wedding.receptionStartTime || ''}` : ''
    ].filter(Boolean).join(' • '),
    // Programme — Commune
    commune_date: wedding.communeDate ? formatDate(wedding.communeDate) : '',
    commune_time: wedding.communeTime || '',
    commune_venue: wedding.communeVenue || '',
    commune_address: wedding.communeAddress || '',
    // Programme — Église
    eglise_date: wedding.egliseDate ? formatDate(wedding.egliseDate) : '',
    eglise_time: wedding.egliseTime || '',
    eglise_venue: wedding.egliseVenue || '',
    eglise_address: wedding.egliseAddress || '',
    // Programme — Réception
    reception_date: wedding.receptionDate ? formatDate(wedding.receptionDate) : '',
    reception_time: wedding.receptionStartTime || '',
    reception_venue: wedding.receptionVenue || '',
    reception_address: wedding.receptionAddress || '',
    // Separated date components (day name/number, month name, year) for each date
    ...componentVars({
      wedding: wedding.weddingDate,
      commune: wedding.communeDate,
      eglise: wedding.egliseDate,
      reception: wedding.receptionDate,
      rsvp: wedding.rsvpDeadline
    }),
    // Separated time components (hour / minute) for each time
    ...timeComponentVars({
      ceremony: wedding.ceremonyTime || wedding.communeTime,
      commune: wedding.communeTime,
      eglise: wedding.egliseTime,
      reception: wedding.receptionStartTime
    })
  };

  // Raw (unformatted) date values so each element renders its own chosen format.
  const rawDateMap = {
    wedding_date: wedding.weddingDate || '',
    rsvp_date: wedding.rsvpDeadline || '',
    commune_date: wedding.communeDate || '',
    eglise_date: wedding.egliseDate || '',
    reception_date: wedding.receptionDate || ''
  };
  const rawTimeMap = {
    ceremony_time: wedding.ceremonyTime || wedding.communeTime || '',
    commune_time: wedding.communeTime || '',
    eglise_time: wedding.egliseTime || '',
    reception_time: wedding.receptionStartTime || ''
  };

  // Resolve background image path to base64 for PDF rendering
  let bgSrc = bgImage;
  if (bgImage && !bgImage.startsWith('http') && !bgImage.startsWith('data:')) {
    try {
      const relPath = bgImage.startsWith('/') ? bgImage.slice(1) : bgImage;
      const absPath = path.join(__dirname, '../../', relPath);
      logger.debug(`Attempting to load background image: ${absPath}`);
      if (fs.existsSync(absPath)) {
        const buf = fs.readFileSync(absPath);
        const ext = path.extname(absPath).toLowerCase().replace('.', '');
        const mime = ext === 'jpg' ? 'jpeg' : ext;
        bgSrc = `data:image/${mime};base64,${buf.toString('base64')}`;
        logger.debug(`Background image loaded: ${ext} (${buf.length} bytes)`);
      } else {
        logger.warn(`Background image not found at: ${absPath}`);
        bgSrc = ''; // Don't use if file doesn't exist
      }
    } catch (e) {
      logger.warn(`Error loading background image: ${e.message}`);
      bgSrc = ''; // Don't use if there's an error
    }
  }

  // QR code image
  const qrCodeSrc = invitation?.qrCodeData || '';

  // Margin offsets for element positioning
  const mTop = margins.top || 0;
  const mLeft = margins.left || 0;

  // Build element HTML
  const elementsHTML = designElements
    .filter(el => el.visible)
    .map((el, idx) => {
      let content = el.content || '';

      // Date variables first, using this element's chosen format.
      DATE_VARIABLE_KEYS.forEach((key) => {
        if (content.includes(`{{${key}}}`)) {
          content = content.replace(
            new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
            formatEventDate(rawDateMap[key], el.dateFormat || DEFAULT_DATE_FORMAT)
          );
        }
      });

      // Time variables, using this element's chosen time format.
      TIME_VARIABLE_KEYS.forEach((key) => {
        if (content.includes(`{{${key}}}`)) {
          content = content.replace(
            new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
            formatEventTime(rawTimeMap[key], el.timeFormat || DEFAULT_TIME_FORMAT)
          );
        }
      });

      // Replace remaining (non-date) variables
      Object.entries(dataMap).forEach(([key, val]) => {
        content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
      });

      const elZIndex = el.zIndex ?? (10 + idx);
      // Raw canvas coords — the editor positions elements without offsetting by
      // margins (margins are only a visual guide), so keep them raw for WYSIWYG.
      const elLeft = el.x;
      const elTop = el.y;

      // Decorative shape (rectangle / circle / line)
      if (el.type === 'shape') {
        const posStyle = `position:absolute;left:${elLeft}px;top:${elTop}px;width:${el.width}px;height:${el.height}px;z-index:${elZIndex};`;
        const op = (el.opacity ?? 100) / 100;
        if (el.shapeKind === 'line') {
          const t = el.lineThickness ?? 2;
          return `<div style="${posStyle}display:flex;align-items:center;opacity:${op};"><div style="width:100%;height:${t}px;background:${el.fillColor || '#333333'};border-radius:${t}px;"></div></div>`;
        }
        const hex = (el.fillColor || '#df6746').replace('#', '');
        const nn = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
        const fill = `rgba(${parseInt(nn.slice(0, 2), 16) || 0},${parseInt(nn.slice(2, 4), 16) || 0},${parseInt(nn.slice(4, 6), 16) || 0},${(el.fillOpacity ?? 100) / 100})`;
        const radius = el.shapeKind === 'circle' ? '9999px' : `${el.borderRadius || 0}px`;
        const border = el.borderWidth ? `border:${el.borderWidth}px solid ${el.borderColor || '#333333'};` : '';
        return `<div style="${posStyle}box-sizing:border-box;background:${fill};border-radius:${radius};${border}opacity:${op};"></div>`;
      }

      // Map / location card (static, links to Google Maps directions in PDFs).
      if (el.type === 'map') {
        const accent = el.color || '#df6746';
        const bg = el.fillColor || '#ffffff';
        const radius = el.borderRadius ?? 16;
        const fs = Math.max(9, Math.round((el.width || 320) / 26));
        const label = el.mapLabel || "Voir l'itinéraire";
        const venue = wedding.venueName || el.mapPlaceholder || 'Lieu de l\'événement';
        const address = [wedding.venueAddress, wedding.venueCity].filter(Boolean).join(', ') || el.mapAddress || '';
        const mapQuery = (wedding.venueMapUrl && /^https?:\/\//i.test(wedding.venueMapUrl))
          ? wedding.venueMapUrl
          : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([wedding.venueName, wedding.venueAddress, wedding.venueCity, wedding.venueCountry].filter(Boolean).join(', '))}`;
        const card = `<div style="width:100%;height:100%;overflow:hidden;display:flex;flex-direction:column;background:${bg};border-radius:${radius}px;box-shadow:0 2px 10px rgba(0,0,0,.08);border:1px solid rgba(0,0,0,.06);font-size:${fs}px;">
          <div style="position:relative;flex:1;background:#e8eef0;background-image:repeating-linear-gradient(90deg,rgba(0,0,0,.05) 0 1px,transparent 1px 26px),repeating-linear-gradient(0deg,rgba(0,0,0,.05) 0 1px,transparent 1px 26px);">
            <div style="position:absolute;top:38%;left:0;right:0;height:6px;background:#fff;opacity:.8;"></div>
            <div style="position:absolute;top:0;bottom:0;left:58%;width:6px;background:#fff;opacity:.8;transform:skewX(-12deg);"></div>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
              <svg viewBox="0 0 24 24" width="34" height="34" style="filter:drop-shadow(0 2px 2px rgba(0,0,0,.25));"><path fill="${accent}" d="M12 2C7.9 2 4.5 5.4 4.5 9.5c0 5.2 6.3 11.3 7 11.9.3.3.7.3 1 0 .7-.6 7-6.7 7-11.9C19.5 5.4 16.1 2 12 2z"/><circle cx="12" cy="9.5" r="2.6" fill="#fff"/></svg>
            </div>
          </div>
          <div style="flex-shrink:0;padding:6px 10px;display:flex;align-items:center;gap:8px;">
            <div style="min-width:0;flex:1;">
              <div style="font-weight:600;color:#111827;font-size:0.95em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${venue}</div>
              ${address ? `<div style="color:#6b7280;font-size:0.75em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${address}</div>` : ''}
            </div>
            <span style="flex-shrink:0;display:inline-flex;align-items:center;gap:4px;border-radius:9999px;padding:4px 10px;font-weight:600;color:#fff;background:${accent};font-size:0.72em;white-space:nowrap;">➜ ${label}</span>
          </div>
        </div>`;
        return `<div style="position:absolute;left:${elLeft}px;top:${elTop}px;width:${el.width}px;height:${el.height}px;z-index:${elZIndex};"><a href="${mapQuery}" target="_blank" style="text-decoration:none;display:block;width:100%;height:100%;">${card}</a></div>`;
      }

      // QR code element
      if (el.type === 'qrcode' && qrCodeSrc) {
        const alignItems = el.verticalAlign === 'top' ? 'flex-start' : el.verticalAlign === 'bottom' ? 'flex-end' : 'center';
        return `<div style="position:absolute;left:${elLeft}px;top:${elTop}px;width:${el.width}px;height:${el.height}px;z-index:${elZIndex};display:flex;align-items:${alignItems};justify-content:center;">
          <img src="${qrCodeSrc}" style="max-width:100%;max-height:100%;object-fit:contain;" />
        </div>`;
      }

      // Photo element (ex: photo des mariés, fournie par le client) or a fixed
      // decorative "image" uploaded by the admin - both support shapes
      // (rectangle/cercle/hexagone/losange/octogone/étoile) via clip-path.
      if (el.type === 'photo' || el.type === 'image') {
        const isDecorative = el.type === 'image';
        // Each client photo placeholder binds to its own image by element id
        // (multi-image templates), falling back to legacy couplePhoto.
        const templateImages = (wedding.templateImages && typeof wedding.templateImages === 'object') ? wedding.templateImages : {};
        const photoForElement = templateImages[el.id] || wedding.couplePhoto;
        const photoSrc = isDecorative ? resolveImageToDataUri(el.iconUrl) : resolveImageToDataUri(photoForElement);
        const borderColor = hexToRgba(el.borderColor || '#FFFFFF', el.borderOpacity ?? 100);
        const objectFit = el.objectFit || (isDecorative ? 'contain' : 'cover');
        const clipPath = getClipPath(el.shape, el.customClipPath);
        // No gray placeholder fill once a real image is set - many decorative
        // uploads (PNG logos, ornaments) rely on transparency.
        const placeholderBg = photoSrc ? 'transparent' : '#f3f4f6';

        // Mirror frontend getImageStyle(el): fit, anchor, zoom, rotation, opacity
        // so the crop inside a shape looks identical to the editor/public view.
        const imgScale = (el.imageScale ?? 100) / 100;
        const imgRotation = el.rotation ?? 0;
        const imgTransform = [
          imgRotation ? `rotate(${imgRotation}deg)` : '',
          imgScale !== 1 ? `scale(${imgScale})` : ''
        ].filter(Boolean).join(' ');
        const imgStyle = `width:100%;height:100%;object-fit:${objectFit};object-position:${el.objectPosition || 'center'};opacity:${(el.opacity ?? 100) / 100};${imgTransform ? `transform:${imgTransform};transform-origin:center center;` : ''}display:block;`;

        if (clipPath) {
          const pad = el.borderWidth || 0;
          return `<div style="position:absolute;left:${elLeft}px;top:${elTop}px;width:${el.width}px;height:${el.height}px;z-index:${elZIndex};box-sizing:border-box;clip-path:${clipPath};background:${pad ? borderColor : 'transparent'};padding:${pad}px;">
            <div style="width:100%;height:100%;clip-path:${clipPath};background:${placeholderBg};overflow:hidden;">
              ${photoSrc ? `<img src="${photoSrc}" style="${imgStyle}" />` : ''}
            </div>
          </div>`;
        }

        const borderStyle = el.borderWidth ? `border:${el.borderWidth}px solid ${borderColor};` : '';
        const radiusStyle = el.borderRadius ? `border-radius:${el.borderRadius}px;overflow:hidden;` : '';
        return `<div style="position:absolute;left:${elLeft}px;top:${elTop}px;width:${el.width}px;height:${el.height}px;z-index:${elZIndex};box-sizing:border-box;${borderStyle}${radiusStyle}background:${placeholderBg};">
          ${photoSrc ? `<img src="${photoSrc}" style="${imgStyle}" />` : ''}
        </div>`;
      }

      // Calendar (visual) date format — mini month calendar with the day highlighted.
      if (el.dateFormat === 'calendar') {
        const dk = getElementDateKey(el.content);
        if (dk && rawDateMap[dk]) {
          const base = Math.max(6, Math.round((el.width || 220) / 18));
          // Resolve a creator-supplied marker image to a data URL (Puppeteer safe).
          let markerUrl = el.calendarMarkerUrl || '';
          if (el.calendarMarker === 'image' && markerUrl && !markerUrl.startsWith('http') && !markerUrl.startsWith('data:')) {
            try {
              const relPath = markerUrl.startsWith('/') ? markerUrl.slice(1) : markerUrl;
              const absPath = path.join(__dirname, '../../', relPath);
              if (fs.existsSync(absPath)) {
                const buf = fs.readFileSync(absPath);
                const ext = path.extname(absPath).toLowerCase().replace('.', '');
                const mimeMap = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', svg: 'svg+xml', webp: 'webp' };
                markerUrl = `data:image/${mimeMap[ext] || ext};base64,${buf.toString('base64')}`;
              }
            } catch (e) { /* ignore */ }
          }
          const calOpts = { accent: el.color || '#df6746', textColor: el.color || '#1f2937', marker: el.calendarMarker || 'circle', markerUrl, markerSize: el.calendarMarkerSize || 1 };
          return `<div style="position:absolute;left:${elLeft}px;top:${elTop}px;width:${el.width}px;height:${el.height}px;z-index:${elZIndex};font-family:'${el.fontFamily}',serif;font-size:${base}px;">${miniCalendarHTML(rawDateMap[dk], calOpts)}</div>`;
        }
      }

      // Programme label elements with optional custom icon
      const isLabelType = ['communeLabel', 'egliseLabel', 'receptionLabel'].includes(el.type);
      if (isLabelType && el.iconUrl) {
        let iconSrc = el.iconUrl;
        if (iconSrc && !iconSrc.startsWith('http') && !iconSrc.startsWith('data:')) {
          try {
            const relPath = iconSrc.startsWith('/') ? iconSrc.slice(1) : iconSrc;
            const absPath = path.join(__dirname, '../../', relPath);
            if (fs.existsSync(absPath)) {
              const buf = fs.readFileSync(absPath);
              const ext = path.extname(absPath).toLowerCase().replace('.', '');
              const mimeMap = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', svg: 'svg+xml', webp: 'webp' };
              const mime = mimeMap[ext] || ext;
              iconSrc = `data:image/${mime};base64,${buf.toString('base64')}`;
            }
          } catch (e) { /* ignore */ }
        }
        // Strip emoji from content text when icon is present
        const textOnly = content.replace(/^[\p{Emoji}\u200d\uFE0F]+\s*/u, '').trim();
        const alignItems = el.verticalAlign === 'top' ? 'flex-start' : el.verticalAlign === 'bottom' ? 'flex-end' : 'center';
        const shadowStyle = el.textShadow && el.textShadow !== 'none' ? `text-shadow:${el.textShadow} ${el.shadowColor || '#000000'};` : '';
        return `<div style="position:absolute;left:${elLeft}px;top:${elTop}px;width:${el.width}px;height:${el.height}px;z-index:${elZIndex};display:flex;align-items:${alignItems};justify-content:${el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start'};gap:6px;font-family:'${el.fontFamily}',serif;font-size:${el.fontSize}px;font-weight:${el.fontWeight || 'normal'};font-style:${el.fontStyle || 'normal'};color:${el.color || '#000'};text-align:${el.textAlign || 'center'};letter-spacing:${el.letterSpacing || 0}px;text-transform:${el.textTransform || 'none'};overflow:hidden;word-break:break-word;${shadowStyle}">
          <img src="${iconSrc}" style="width:${Math.round(el.fontSize * 1.3)}px;height:${Math.round(el.fontSize * 1.3)}px;object-fit:contain;flex-shrink:0;" />
          <span>${textOnly}</span>
        </div>`;
      }

      // Text element
      const alignItems = el.verticalAlign === 'top' ? 'flex-start' : el.verticalAlign === 'bottom' ? 'flex-end' : 'center';
      const shadowStyle = el.textShadow && el.textShadow !== 'none' ? `text-shadow:${el.textShadow} ${el.shadowColor || '#000000'};` : '';
      return `<div ${el.autoFit ? 'data-autofit="1"' : ''} style="position:absolute;left:${elLeft}px;top:${elTop}px;width:${el.width}px;height:${el.height}px;z-index:${elZIndex};display:flex;align-items:${alignItems};justify-content:${el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start'};font-family:'${el.fontFamily}',serif;font-size:${el.fontSize}px;font-weight:${el.fontWeight || 'normal'};font-style:${el.fontStyle || 'normal'};color:${el.color || '#000'};text-align:${el.textAlign || 'center'};letter-spacing:${el.letterSpacing || 0}px;text-transform:${el.textTransform || 'none'};overflow:hidden;word-break:break-word;${shadowStyle}">
        <span style="width:100%">${content}</span>
      </div>`;
    })
    .join('\n');

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <link href="${buildGoogleFontsHref()}" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    ${customFontCss}
    @page { size: ${canvasW}px ${canvasH}px; margin: 0; }
    body { margin: 0; padding: 0; width: ${canvasW}px; height: ${canvasH}px; overflow: hidden; }
    .canvas { position: relative; width: ${canvasW}px; height: ${canvasH}px; background: #fff; overflow: hidden; }
    .bg-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; opacity: ${bgOpacity}; }
  </style>
</head>
<body>
  <div class="canvas">
    ${bgSrc ? `<img class="bg-img" src="${bgSrc}" />` : ''}
    ${elementsHTML}
  </div>
</body>
</html>`;
}

/**
 * Generate a PDF invitation using Puppeteer
 * @param {Object} options - PDF generation options
 * @returns {Promise<string>} - Path to generated PDF
 */
async function generateInvitationPDF(options) {
  const { wedding, guest, invitation, template, qrCodeDataUrl } = options;
  
  const invitationWithQR = {
    ...invitation,
    qrCodeData: qrCodeDataUrl || invitation.qrCodeData
  };

  const filename = `invitation_${invitation.uniqueCode}.pdf`;
  const outputPath = path.join(__dirname, '../../uploads/pdfs', filename);
  
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

  let browser = null;
  
  try {
    // Use design-based layout if template has designElements
    const hasDesignElements = template?.config?.designElements && Array.isArray(template.config.designElements) && template.config.designElements.length > 0;
    
    const customFontCss = await getCustomFontCss();
    const siteName = await getSiteName();
    const htmlContent = hasDesignElements
      ? generateDesignBasedHTML({ wedding, guest, invitation: invitationWithQR, template, customFontCss, siteName })
      : generateInvitationHTML({ wedding, guest, invitation: invitationWithQR, template, siteName });

    const canvasW = template?.config?.canvasWidth || 800;
    const canvasH = template?.config?.canvasHeight || 1120;

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--allow-file-access-from-files']
    });

    const page = await browser.newPage();
    
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await page.evaluateHandle('document.fonts.ready');
    await page.evaluate(applyAutoFitInPage);

    if (hasDesignElements) {
      await page.pdf({
        path: outputPath,
        width: `${canvasW}px`,
        height: `${canvasH}px`,
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        preferCSSPageSize: true
      });
    } else {
      await page.pdf({
        path: outputPath,
        width: `${canvasW}px`,
        height: `${canvasH}px`,
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        preferCSSPageSize: true
      });
    }

    logger.info(`PDF generated successfully: ${outputPath}`);
    
    return `/uploads/pdfs/${filename}`;
  } catch (error) {
    logger.error('PDF generation error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Generate an image invitation using Puppeteer
 * @param {Object} options - Image generation options
 * @returns {Promise<string>} - Path to generated image
 */
async function generateInvitationImage(options) {
  const { wedding, guest, invitation, template, qrCodeDataUrl } = options;
  
  const invitationWithQR = {
    ...invitation,
    qrCodeData: qrCodeDataUrl || invitation.qrCodeData
  };

  const filename = `invitation_${invitation.uniqueCode}.png`;
  const outputPath = path.join(__dirname, '../../uploads/images', filename);
  
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

  let browser = null;
  
  try {
    // Use design-based layout if template has designElements
    const hasDesignElements = template?.config?.designElements && Array.isArray(template.config.designElements) && template.config.designElements.length > 0;

    const customFontCss = await getCustomFontCss();
    const siteName = await getSiteName();
    const htmlContent = hasDesignElements
      ? generateDesignBasedHTML({ wedding, guest, invitation: invitationWithQR, template, customFontCss, siteName })
      : generateInvitationHTML({ wedding, guest, invitation: invitationWithQR, template, siteName });

    const canvasW = template?.config?.canvasWidth || 800;
    const canvasH = template?.config?.canvasHeight || 1120;

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--allow-file-access-from-files']
    });

    const page = await browser.newPage();
    
    await page.setViewport({
      width: canvasW,
      height: canvasH,
      deviceScaleFactor: 2
    });
    
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await page.evaluateHandle('document.fonts.ready');
    await page.evaluate(applyAutoFitInPage);

    // For design-based templates, screenshot the .canvas container at exact dimensions
    const canvasContainer = await page.$('.canvas');
    const pageWrapper = await page.$('.page-wrapper');
    if (hasDesignElements && canvasContainer) {
      await canvasContainer.screenshot({ path: outputPath, type: 'png', omitBackground: false });
    } else if (pageWrapper) {
      await pageWrapper.screenshot({ path: outputPath, type: 'png', omitBackground: false });
    } else {
      await page.screenshot({ path: outputPath, type: 'png', fullPage: true });
    }

    logger.info(`Image generated successfully: ${outputPath}`);
    
    return `/uploads/images/${filename}`;
  } catch (error) {
    logger.error('Image generation error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Generate batch PDFs for all guests
 */
async function generateBatchPDFs(wedding, template) {
  const pdfs = [];
  
  for (const guest of wedding.guests) {
    if (guest.invitation) {
      const pdfPath = await generateInvitationPDF({
        wedding,
        guest,
        invitation: guest.invitation,
        template,
        qrCodeDataUrl: guest.invitation.qrCodeData
      });
      pdfs.push({
        guestId: guest.id,
        guestName: `${guest.firstName} ${guest.lastName}`,
        pdfPath
      });
    }
  }
  
  return pdfs;
}

/**
 * Print size dimensions in mm
 */
const PRINT_SIZES_MM = {
  A6: { width: 105, height: 148 },
  A5: { width: 148, height: 210 },
  custom: { width: 148, height: 210 }
};

const SHEET_SIZE_MM = { width: 210, height: 297 }; // A4

/**
 * Calculate how many invitations fit on one A4 sheet.
 * If template config provides canvas dimensions, uses its aspect ratio
 * to compute the best-fit card size within the requested print size.
 */
function calculateImposition(printSize, templateConfig) {
  const baseDims = PRINT_SIZES_MM[printSize] || PRINT_SIZES_MM.A5;
  let cardW = baseDims.width;
  let cardH = baseDims.height;

  // If template specifies a canvas, respect its aspect ratio
  if (templateConfig) {
    const canvasW = templateConfig.canvasWidth || 800;
    const canvasH = templateConfig.canvasHeight || 1120;
    const ratio = canvasW / canvasH;
    // Try fitting by height first
    const byH = { w: Math.round(cardH * ratio), h: cardH };
    // Try fitting by width
    const byW = { w: cardW, h: Math.round(cardW / ratio) };
    // Pick whichever fits within the requested size
    if (byH.w <= cardW + 1) {
      cardW = byH.w;
      cardH = byH.h;
    } else {
      cardW = byW.w;
      cardH = byW.h;
    }
  }

  const cols = Math.max(1, Math.floor(SHEET_SIZE_MM.width / cardW));
  const rows = Math.max(1, Math.floor(SHEET_SIZE_MM.height / cardH));
  return { cols, rows, perPage: cols * rows, cardWidth: cardW, cardHeight: cardH };
}

/**
 * Generate a print-ready imposition PDF (multiple invitations per A4 page)
 * Supports both legacy HTML layout and design-based templates with designElements.
 * @param {Object} options - { wedding, guests (array), template, printSize }
 * @returns {Promise<string>} - Path to generated PDF
 */
async function generatePrintLayoutPDF(options) {
  const { wedding, guests, template, printSize = 'A6' } = options;

  const templateConfig = template?.config || {};
  const hasDesignElements = Array.isArray(templateConfig.designElements) && templateConfig.designElements.length > 0;
  const canvasW = templateConfig.canvasWidth || 800;
  const canvasH = templateConfig.canvasHeight || 1120;

  const imposition = calculateImposition(printSize, hasDesignElements ? templateConfig : null);
  const { cols, rows, perPage, cardWidth, cardHeight } = imposition;
  
  if (perPage < 1) {
    throw new Error(`Le format ${printSize} est trop grand pour une page A4`);
  }

  // Generate individual invitation HTML snippets
  const customFontCss = await getCustomFontCss();
  const siteName = await getSiteName();
  const snippets = [];
  for (const guest of guests) {
    if (guest.invitation) {
      // Use design-based layout if template has designElements
      const html = hasDesignElements
        ? generateDesignBasedHTML({ wedding, guest, invitation: guest.invitation, template, customFontCss, siteName })
        : generateInvitationHTML({ wedding, guest, invitation: guest.invitation, template, siteName });
      snippets.push(html);
    }
  }

  if (snippets.length === 0) {
    throw new Error('Aucune invitation à imprimer');
  }

  // Build pages of grid
  const pages = [];
  for (let i = 0; i < snippets.length; i += perPage) {
    pages.push(snippets.slice(i, i + perPage));
  }

  // Build composite HTML
  const compositeHTML = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&family=Great+Vibes&family=Cormorant+Garamond:wght@400;500;600;700&family=Lora:wght@400;500;600;700&family=Dancing+Script:wght@400;500;600;700&family=Tangerine:wght@400;700&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { margin: 0; padding: 0; }
    .print-page {
      width: 210mm;
      height: 297mm;
      position: relative;
      page-break-after: always;
      overflow: hidden;
      display: flex;
      flex-wrap: wrap;
      align-content: flex-start;
      justify-content: center;
      padding-top: ${Math.floor((297 - rows * cardHeight) / 2)}mm;
      padding-left: ${Math.floor((210 - cols * cardWidth) / 2)}mm;
    }
    .print-page:last-child { page-break-after: avoid; }
    .card-slot {
      width: ${cardWidth}mm;
      height: ${cardHeight}mm;
      overflow: hidden;
      position: relative;
      border: 0.1mm dashed #ccc;
    }
    .card-slot iframe {
      width: 1000px;
      height: 1500px;
      border: none;
      transform-origin: top left;
      transform: scale(${(cardWidth / 1000) * (96 / 25.4)});
      pointer-events: none;
    }
    /* Crop marks */
    .crop-mark {
      position: absolute;
      background: #000;
    }
    .crop-h { width: 5mm; height: 0.1mm; }
    .crop-v { width: 0.1mm; height: 5mm; }
  </style>
</head>
<body>
${pages.map((pageSnippets, pi) => `
  <div class="print-page">
    ${pageSnippets.map((snippet, si) => {
      const row = Math.floor(si / cols);
      const col = si % cols;
      return `<div class="card-slot" style="position:absolute; top:${Math.floor((297 - rows * cardHeight) / 2) + row * cardHeight}mm; left:${Math.floor((210 - cols * cardWidth) / 2) + col * cardWidth}mm;"></div>`;
    }).join('\n')}
  </div>
`).join('\n')}
</body>
</html>`;

  // Use Puppeteer to render each invitation inside its card slot
  const filename = `print_layout_${wedding.id}_${printSize}_${Date.now()}.pdf`;
  const outputPath = path.join(__dirname, '../../uploads/pdfs', filename);
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--allow-file-access-from-files']
    });

    // Strategy: render each invitation as a scaled image, then compose them on an A4 grid
    const cardImages = [];
    for (const snippet of snippets) {
      const page = await browser.newPage();
      // Use template canvas dimensions for design-based, or sensible defaults for legacy
      const vpW = hasDesignElements ? canvasW : 1000;
      const vpH = hasDesignElements ? canvasH : 1500;
      await page.setViewport({ width: vpW, height: vpH, deviceScaleFactor: 2 });
      await page.setContent(snippet, { waitUntil: 'networkidle0', timeout: 60000 }); // Increased to 60s per invitation
      await page.evaluateHandle('document.fonts.ready');
      // Shrink long auto-fit texts to fit their box — same as the single PDF/image
      // render, so the print layout (BàT) matches the editor/preview.
      await page.evaluate(applyAutoFitInPage);
      // For design-based: capture .canvas; for legacy: capture .page-wrapper
      const container = hasDesignElements
        ? (await page.$('.canvas'))
        : (await page.$('.page-wrapper'));
      const imgBuffer = container
        ? await container.screenshot({ type: 'png', omitBackground: false })
        : await page.screenshot({ type: 'png', fullPage: true });
      const base64 = imgBuffer.toString('base64');
      cardImages.push(`data:image/png;base64,${base64}`);
      await page.close();
    }

    // Build final grid PDF pages
    const gridPages = [];
    for (let i = 0; i < cardImages.length; i += perPage) {
      gridPages.push(cardImages.slice(i, i + perPage));
    }

    const marginTop = Math.floor((297 - rows * cardHeight) / 2);
    const marginLeft = Math.floor((210 - cols * cardWidth) / 2);

    const gridHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { margin: 0; }
    .page {
      width: 210mm; height: 297mm;
      position: relative;
      page-break-after: always;
    }
    .page:last-child { page-break-after: avoid; }
    .card {
      position: absolute;
      overflow: hidden;
      border: 0.1mm dashed #ccc;
    }
    .card img {
      width: 100%; height: 100%;
      object-fit: cover;
    }
    /* Crop marks at corners */
    .crop {
      position: absolute; background: #000; z-index: 10;
    }
  </style>
</head>
<body>
${gridPages.map((imgs, pi) => `
  <div class="page">
    ${imgs.map((src, si) => {
      const row = Math.floor(si / cols);
      const col = si % cols;
      const top = marginTop + row * cardHeight;
      const left = marginLeft + col * cardWidth;
      return `
        <div class="card" style="top:${top}mm;left:${left}mm;width:${cardWidth}mm;height:${cardHeight}mm;">
          <img src="${src}" />
        </div>
        <!-- crop marks -->
        <div class="crop" style="top:${top}mm;left:${left - 4}mm;width:3mm;height:0.15mm;"></div>
        <div class="crop" style="top:${top}mm;left:${left + cardWidth + 1}mm;width:3mm;height:0.15mm;"></div>
        <div class="crop" style="top:${top - 4}mm;left:${left}mm;width:0.15mm;height:3mm;"></div>
        <div class="crop" style="top:${top + cardHeight + 1}mm;left:${left}mm;width:0.15mm;height:3mm;"></div>
      `;
    }).join('\n')}
  </div>
`).join('\n')}
</body>
</html>`;

    const gridPage = await browser.newPage();
    logger.info(`Rendering print layout grid with ${gridPages.length} pages and ${snippets.length} invitations...`);
    await gridPage.setContent(gridHTML, { waitUntil: 'networkidle0', timeout: 90000 }); // Increased to 90s for grid composition

    await gridPage.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    await gridPage.close();
    logger.info(`Print layout PDF generated: ${outputPath} (${printSize}, ${perPage} per page, ${gridPages.length} pages, ${snippets.length} invitations)`);
    
    return `/uploads/pdfs/${filename}`;
  } catch (error) {
    logger.error('Print layout PDF generation error:', error);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = {
  generateInvitationPDF,
  generateInvitationImage,
  generateBatchPDFs,
  generateInvitationHTML,
  generateDesignBasedHTML,
  generatePrintLayoutPDF,
  calculateImposition,
  PRINT_SIZES_MM
};
