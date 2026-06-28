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
function parseCSV(content, delimiter = ',') {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter);
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });
    
    data.push(row);
  }
  
  return data;
}

/**
 * Map CSV headers to guest fields
 */
function mapCSVToGuest(row) {
  return {
    firstName: row['prénom'] || row['prenom'] || row['first_name'] || row['firstname'] || '',
    lastName: row['nom'] || row['last_name'] || row['lastname'] || row['name'] || '',
    email: row['email'] || row['e-mail'] || '',
    phone: row['téléphone'] || row['telephone'] || row['phone'] || row['tel'] || '',
    tableNumber: row['table'] || row['table_number'] || row['numéro_table'] || '',
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
