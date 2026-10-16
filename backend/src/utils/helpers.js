const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { getEventDisplayTitle } = require('./eventTypes');

/**
 * Generate a URL-friendly slug
 */
function generateSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate unique wedding slug
 */
function generateWeddingSlug(brideName, groomName) {
  const base = `${brideName}-${groomName}`.toLowerCase();
  const slug = generateSlug(base);
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${slug}-${suffix}`;
}

/**
 * Format date for display
 */
function formatDate(date, locale = 'fr-FR') {
  return new Date(date).toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Calculate days until wedding
 */
function daysUntilWedding(weddingDate) {
  const now = new Date();
  const wedding = new Date(weddingDate);
  const diffTime = wedding - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Paginate results
 */
function paginate(page = 1, limit = 10) {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;
  
  return {
    skip,
    take: limitNum,
    page: pageNum,
    limit: limitNum
  };
}

/**
 * Build pagination meta
 */
function buildPaginationMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
}

/**
 * Parse CSV content
 */
function parseCSV(content, delimiter) {
  // Excel exports: UTF-8 BOM, CRLF line endings, and ';' as separator in
  // French locales. Quoted fields may contain the separator or "" escapes.
  const text = String(content || '').replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const sep = delimiter || ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',');

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === sep) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(v => v.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some(v => v.trim() !== '')) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase());
  return rows.slice(1).map(values => {
    const obj = {};
    headers.forEach((header, index) => { obj[header] = (values[index] ?? '').trim(); });
    return obj;
  });
}

/**
 * Map CSV headers to guest fields
 */
function mapCSVToGuest(row) {
  return {
    firstName: row['prénom'] || row['prenom'] || row['first_name'] || row['firstname'] || '',
    lastName: row['nom'] || row['last_name'] || row['lastname'] || row['name'] || '',
    email: row['email'] || row['e-mail'] || row['mail'] || '',
    phone: row['téléphone'] || row['telephone'] || row['phone'] || row['tel'] || row['whatsapp'] || '',
    tableNumber: String(row['table'] || row['table_number'] || row['numéro_table'] || row['numéro de table'] || ''),
    plusOnes: parseInt(row['accompagnants'] || row['plus_ones'] || row['guests'] || '0') || 0,
    category: row['catégorie'] || row['categorie'] || row['category'] || row['type'] || '',
    dietaryRestrictions: row['régime'] || row['dietary'] || row['restrictions'] || '',
    notes: row['notes'] || row['remarques'] || row['comments'] || ''
  };
}

/**
 * Generate random token
 */
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Sanitize object (remove undefined/null values)
 */
function sanitizeObject(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null && v !== '')
  );
}

/**
 * Human-readable name for an event, coherent across event types:
 * couple events show "Bride & Groom", honoree events "Anniversaire de X",
 * everything else its free title. Delegates to the shared taxonomy so the
 * rule stays in one place (utils/eventTypes.js).
 */
function eventDisplayName(wedding) {
  return getEventDisplayTitle(wedding);
}

module.exports = {
  generateSlug,
  generateWeddingSlug,
  formatDate,
  daysUntilWedding,
  paginate,
  buildPaginationMeta,
  parseCSV,
  mapCSVToGuest,
  generateToken,
  sanitizeObject,
  eventDisplayName
};
