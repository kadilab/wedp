// Public share routes (NOT under /api). These serve a tiny HTML page with
// dynamic OpenGraph / Twitter meta so that when an invitation link is pasted in
// WhatsApp / Facebook / etc., a rich card (couple, date, image) is shown.
// Real browsers are instantly redirected to the SPA invitation view (/i/...).
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { eventName } = require('../utils/guestMessaging');

const prisma = new PrismaClient();
const router = express.Router();

const esc = (s) => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function frontendBase() {
  return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
}

// Resolve an image path to an absolute URL usable by crawlers (skips data: URLs).
function absImage(pathLike) {
  if (!pathLike || pathLike.startsWith('data:')) return null;
  if (pathLike.startsWith('http')) return pathLike;
  return `${frontendBase()}${pathLike.startsWith('/') ? '' : '/'}${pathLike}`;
}

function formatDate(date) {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return ''; }
}

function ogPage({ title, description, image, canonical, redirectTo }) {
  const img = image || `${frontendBase()}/og-image.jpg`;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${esc(img)}" />
<meta property="og:url" content="${esc(canonical)}" />
<meta property="og:locale" content="fr_FR" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(img)}" />
<link rel="canonical" href="${esc(canonical)}" />
<meta http-equiv="refresh" content="0; url=${esc(redirectTo)}" />
<script>window.location.replace(${JSON.stringify(redirectTo)});</script>
</head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:40px;color:#374151">
<p>Ouverture de votre invitation…</p>
<p><a href="${esc(redirectTo)}">Cliquez ici si rien ne se passe</a></p>
</body>
</html>`;
}

async function handleShare(req, res) {
  try {
    const { slug, code } = req.params;
    const wedding = await prisma.wedding.findUnique({
      where: { slug },
      include: { template: { select: { previewImage: true } } }
    });

    const base = frontendBase();
    if (!wedding) {
      return res.status(404).type('html').send(ogPage({
        title: 'Invitation', description: 'Invitation introuvable.',
        image: null, canonical: `${base}/s/${esc(slug)}`, redirectTo: `${base}/`
      }));
    }

    const who = eventName(wedding);
    const date = formatDate(wedding.weddingDate);
    const venue = wedding.venueName ? ` · ${wedding.venueName}` : '';
    const description = `Vous êtes convié(e)${date ? ` le ${date}` : ''}${venue}. Confirmez votre présence en un clic.`;
    const image = absImage(wedding.template?.previewImage) || absImage(wedding.couplePhoto);
    const redirectTo = code ? `${base}/i/${slug}/${code}` : `${base}/i/${slug}`;
    const canonical = code ? `${base}/s/${slug}/${code}` : `${base}/s/${slug}`;

    res.type('html').send(ogPage({
      title: `${who} — Invitation`, description, image, canonical, redirectTo
    }));
  } catch (err) {
    const base = frontendBase();
    res.status(500).type('html').send(ogPage({
      title: 'Invitation', description: '', image: null,
      canonical: `${base}/`, redirectTo: `${base}/`
    }));
  }
}

router.get('/:slug/:code', handleShare);
router.get('/:slug', handleShare);

module.exports = router;
