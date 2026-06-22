const path = require('path');
const fs = require('fs').promises;
const logger = require('./logger');

// All uploaded files live under backend/uploads and are served at /uploads/...
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

/**
 * Resolve a stored URL/path (e.g. "/uploads/covers/abc.jpg" or a full
 * "https://host/uploads/...") to an absolute path on disk, but ONLY if it
 * lands inside the uploads directory. Returns null for anything else
 * (external URLs, data: URIs, path traversal attempts, template assets, ...).
 */
function resolveUploadPath(stored) {
  if (!stored || typeof stored !== 'string') return null;
  if (stored.startsWith('data:')) return null;

  let rel = stored;
  // Strip an absolute origin if present (keep only the path part)
  const uploadsIdx = rel.indexOf('/uploads/');
  if (uploadsIdx !== -1) {
    rel = rel.slice(uploadsIdx); // -> "/uploads/..."
  }
  if (!rel.startsWith('/uploads/')) return null;

  const relToUploads = rel.replace(/^\/uploads\//, '');
  const abs = path.join(UPLOADS_ROOT, relToUploads);

  // Guard against path traversal - the resolved path must stay under UPLOADS_ROOT
  const normalizedRoot = path.resolve(UPLOADS_ROOT) + path.sep;
  if (!path.resolve(abs).startsWith(normalizedRoot)) return null;

  return abs;
}

/**
 * Best-effort deletion of a list of stored file URLs from disk.
 * - Only touches files physically inside the uploads directory.
 * - Skips any path present in `excludePaths` (e.g. shared template assets).
 * - Never throws: a missing file or permission error is logged and ignored,
 *   so cleanup can never break the request that triggered it.
 *
 * @param {string[]} storedPaths  stored URLs/paths to remove
 * @param {string[]} excludePaths stored URLs/paths that must be preserved
 * @returns {Promise<number>} number of files actually deleted
 */
async function safeDeleteUploads(storedPaths = [], excludePaths = []) {
  const excluded = new Set(
    excludePaths.map(resolveUploadPath).filter(Boolean)
  );

  // De-duplicate so we never try to unlink the same file twice
  const targets = new Set(
    storedPaths.map(resolveUploadPath).filter(Boolean)
  );

  let deleted = 0;
  for (const abs of targets) {
    if (excluded.has(abs)) continue;
    try {
      await fs.unlink(abs);
      deleted++;
    } catch (err) {
      if (err.code !== 'ENOENT') {
        logger.warn(`File cleanup: could not delete ${abs}: ${err.message}`);
      }
    }
  }
  return deleted;
}

module.exports = { safeDeleteUploads, resolveUploadPath };
