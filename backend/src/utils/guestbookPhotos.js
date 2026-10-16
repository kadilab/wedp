// Guestbook photo downloads: single photo as an attachment, or every photo of
// an event as one ZIP. Shared by the public wall (guests) and the organiser
// dashboard.
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const logger = require('./logger');

const GUESTBOOK_DIR = path.resolve(__dirname, '../../uploads/guestbook');

// '/uploads/guestbook/<file>' → absolute path, only inside the guestbook folder.
function resolvePhotoPath(photoUrl) {
  if (!photoUrl || !photoUrl.startsWith('/uploads/guestbook/')) return null;
  const abs = path.resolve(GUESTBOOK_DIR, path.basename(photoUrl));
  if (!abs.startsWith(GUESTBOOK_DIR + path.sep)) return null;
  return fs.existsSync(abs) ? abs : null;
}

const slugify = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  .slice(0, 40) || 'invite';

// Readable file name: "livre-dor-<event>-<n>-<author>.<ext>"
function photoFileName(post, index, eventTitle) {
  const ext = path.extname(post.photoUrl || '').toLowerCase() || '.jpg';
  const n = String(index + 1).padStart(3, '0');
  return `livre-dor-${slugify(eventTitle)}-${n}-${slugify(post.authorName)}${ext}`;
}

function sendPhoto(res, post, index, eventTitle) {
  const abs = resolvePhotoPath(post.photoUrl);
  if (!abs) return res.status(404).json({ error: 'Photo introuvable' });
  return res.download(abs, photoFileName(post, index, eventTitle));
}

// Streams a ZIP of the posts' photos (oldest first, numbered).
function sendPhotosZip(res, posts, eventTitle) {
  const files = posts
    .map((post, i) => ({ post, i, abs: resolvePhotoPath(post.photoUrl) }))
    .filter(f => f.abs);
  if (files.length === 0) return res.status(404).json({ error: 'Aucune photo à télécharger' });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="photos-${slugify(eventTitle)}.zip"`);
  // Photos are already compressed (JPEG/WebP): store them, don't re-deflate.
  const archive = archiver('zip', { store: true });
  archive.on('error', (err) => {
    logger.error('Guestbook ZIP error:', err);
    res.destroy(err);
  });
  archive.pipe(res);
  files.forEach(({ post, i, abs }) => archive.file(abs, { name: photoFileName(post, i, eventTitle) }));
  archive.finalize();
}

module.exports = { resolvePhotoPath, sendPhoto, sendPhotosZip };
