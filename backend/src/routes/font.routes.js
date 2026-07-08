const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const { uploadSingle, handleUploadError } = require('../middleware/upload.middleware');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const SETTING_KEY = 'customFonts';

// CSS @font-face format keyword per file extension.
const FORMAT_BY_EXT = {
  '.woff2': 'woff2',
  '.woff': 'woff',
  '.ttf': 'truetype',
  '.otf': 'opentype'
};

async function readCustomFonts() {
  const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  if (!row?.value) return [];
  try { return JSON.parse(row.value); } catch { return []; }
}

async function writeCustomFonts(fonts) {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(fonts) },
    create: { key: SETTING_KEY, value: JSON.stringify(fonts), type: 'json', description: 'Polices personnalisées importées' }
  });
}

/**
 * @route   GET /api/fonts
 * @desc    List custom (uploaded) fonts. Public — needed by the public invitation page.
 */
router.get('/', async (req, res) => {
  try {
    res.json({ fonts: await readCustomFonts() });
  } catch (error) {
    logger.error('List fonts error:', error);
    res.json({ fonts: [] });
  }
});

/**
 * @route   POST /api/fonts
 * @desc    Upload a custom font file (.ttf/.otf/.woff/.woff2) + family name.
 * @access  Admin or Creator (both build templates that may need custom fonts)
 */
const allowFontUpload = (req, res, next) => {
  const u = req.user;
  if (u && (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN' || u.isCreator)) return next();
  return res.status(403).json({ error: 'Réservé aux administrateurs et créateurs.' });
};
router.post('/', authenticate, allowFontUpload, uploadSingle('font'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier de police reçu' });

    const family = (req.body.family || '').trim();
    if (!family) {
      // Clean up the orphan file.
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Le nom de la police est requis' });
    }

    const ext = path.extname(req.file.filename).toLowerCase();
    const format = FORMAT_BY_EXT[ext] || 'truetype';
    const url = `/uploads/fonts/${req.file.filename}`;

    const fonts = await readCustomFonts();

    // Reject duplicate family names (case-insensitive).
    if (fonts.some(f => f.family.toLowerCase() === family.toLowerCase())) {
      fs.unlink(req.file.path, () => {});
      return res.status(409).json({ error: 'Une police porte déjà ce nom' });
    }

    const font = { id: uuidv4(), family, url, format, createdAt: new Date().toISOString() };
    fonts.push(font);
    await writeCustomFonts(fonts);

    res.status(201).json({ font });
  } catch (error) {
    logger.error('Upload font error:', error);
    res.status(500).json({ error: "Erreur lors de l'import de la police" });
  }
});

/**
 * @route   DELETE /api/fonts/:id
 * @desc    Remove a custom font (metadata + file).
 * @access  Admin
 */
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const fonts = await readCustomFonts();
    const font = fonts.find(f => f.id === req.params.id);
    if (!font) return res.status(404).json({ error: 'Police non trouvée' });

    await writeCustomFonts(fonts.filter(f => f.id !== req.params.id));

    // Best-effort delete of the file.
    if (font.url) {
      const abs = path.join(__dirname, '../../', font.url.replace(/^\//, ''));
      fs.unlink(abs, () => {});
    }
    res.json({ message: 'Police supprimée' });
  } catch (error) {
    logger.error('Delete font error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// Shared helper so the PDF generator can embed @font-face for custom fonts.
router.readCustomFonts = readCustomFonts;

module.exports = router;
