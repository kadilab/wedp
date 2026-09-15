// Public share routes (NOT under /api). These serve a tiny HTML page with
// dynamic OpenGraph / Twitter meta so that when an invitation link is pasted in
// WhatsApp / Facebook / etc., a rich card (couple, date, image) is shown.
// Real browsers are instantly redirected to the SPA invitation view (/i/...).
const express = require('express');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { eventName, eventInvitePhrase } = require('../utils/guestMessaging');
const { generateInvitationImage } = require('../utils/pdf');
const logger = require('../utils/logger');

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

// Renders the invitation image (Puppeteer) and caches its path on the
// invitation. Runs standalone (not awaited by the request that triggered it,
// see below) so a slow render never gets abandoned mid-way.
async function generateAndCacheInvitationImage(wedding, invitation) {
  try {
    const imagePath = await generateInvitationImage({
      wedding,
      guest: invitation.guest,
      invitation,
      template: wedding.template,
      qrCodeDataUrl: invitation.qrCodeData
    });
    await prisma.invitation.update({ where: { id: invitation.id }, data: { imageUrl: imagePath } });
    return imagePath;
  } catch (err) {
    logger.error('Invitation image generation for share preview failed:', err);
    return null;
  }
}

// Resolves the richest possible preview image for a specific guest's invitation
// link: the actual rendered invitation (names, date, QR, decorations — exactly
// what the guest sees), not just the template's blank background. Generating
// that render is a Puppeteer screenshot ("Générer Images" in the dashboard),
// which most organizers never click manually before sending links, so this
// generates it on demand the first time the link is shared and caches the
// result on the invitation — every later share (WhatsApp re-scrape, another
// guest's link, etc.) reuses the cached file instantly.
//
// Puppeteer's cold start + font loading can take several seconds, well past
// what WhatsApp/Facebook's own crawler waits for before giving up on the
// whole page — if we just awaited it here, the FIRST share of every
// invitation would risk timing out and showing NO preview at all (worse than
// the old plain-background fallback). So generation is capped: if it isn't
// done within IMAGE_GENERATION_BUDGET_MS, this returns null (the caller falls
// back to the existing image) while the render keeps running in the
// background and still gets cached for the next share/open.
const IMAGE_GENERATION_BUDGET_MS = 2500;

async function resolveInvitationPreviewImage(wedding, code) {
  if (!code) return null;
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { uniqueCode: code },
      include: { guest: true }
    });
    if (!invitation || invitation.weddingId !== wedding.id || !invitation.guest) return null;

    if (invitation.imageUrl) {
      const existingPath = path.join(__dirname, '../../', invitation.imageUrl);
      if (fs.existsSync(existingPath)) return invitation.imageUrl;
    }

    const generation = generateAndCacheInvitationImage(wedding, invitation);
    const budget = new Promise((resolve) => setTimeout(() => resolve(null), IMAGE_GENERATION_BUDGET_MS));
    return await Promise.race([generation, budget]);
  } catch (err) {
    logger.error('On-demand invitation image generation for share preview failed:', err);
    return null;
  }
}

async function handleShare(req, res) {
  try {
    const { slug, code } = req.params;
    const wedding = await prisma.wedding.findUnique({
      where: { slug },
      include: { template: true }
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
    const description = `Vous êtes convié(e) ${eventInvitePhrase(wedding)}${date ? ` le ${date}` : ''}${venue}. Confirmez votre présence en un clic.`;
    const invitationImage = await resolveInvitationPreviewImage(wedding, code);
    const image = absImage(invitationImage) || absImage(wedding.template?.previewImage) || absImage(wedding.couplePhoto);
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
