// Helpers for sending personalized invitations to guests (WhatsApp click-to-chat
// + the per-guest invitation link). Centralizes the message wording and the
// "make sure this guest has an invitation code" logic so every channel uses the
// same link.
const { PrismaClient } = require('@prisma/client');
const { generateQRCode, generateUniqueCode } = require('./qrcode');

const prisma = new PrismaClient();

// Event display name: couple for weddings, event title otherwise.
function eventName(wedding) {
  if (wedding.eventType === 'WEDDING' || !wedding.eventTitle) {
    const names = [wedding.brideName, wedding.groomName].filter(Boolean).join(' & ');
    return names || wedding.eventTitle || 'notre événement';
  }
  return wedding.eventTitle;
}

function formatDate(date) {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

// The public, per-guest invitation URL.
function buildInvitationUrl(wedding, invitation) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/i/${wedding.slug}/${invitation.uniqueCode}`;
}

// Ensure the guest has an Invitation (with a unique code + QR). Returns it.
async function ensureInvitation(wedding, guest) {
  if (guest.invitation) return guest.invitation;
  const existing = await prisma.invitation.findUnique({ where: { guestId: guest.id } });
  if (existing) return existing;

  const uniqueCode = generateUniqueCode();
  const qrResult = await generateQRCode(uniqueCode, wedding.slug, wedding);
  return prisma.invitation.create({
    data: {
      weddingId: wedding.id,
      guestId: guest.id,
      uniqueCode,
      qrCodeData: qrResult.dataUrl,
      qrCodeUrl: qrResult.filePath,
      shortUrl: qrResult.url
    }
  });
}

// Default personalized WhatsApp / message body.
function buildMessage(wedding, guest, invitationUrl) {
  const who = eventName(wedding);
  const date = formatDate(wedding.weddingDate);
  const venue = wedding.venueName ? ` à ${wedding.venueName}` : '';
  const lines = [
    `Bonjour ${guest.firstName} 👋`,
    '',
    `Vous êtes convié(e) à ${who}${date ? ` le ${date}` : ''}${venue}.`,
    `Voici votre invitation personnalisée :`,
    invitationUrl,
    '',
    `Merci de confirmer votre présence (RSVP) directement sur le lien. 💍`
  ];
  return lines.join('\n');
}

// Normalize a phone number for wa.me: digits only, no '+', no leading zeros of
// an international prefix. The admin should store full international numbers.
function normalizePhone(phone) {
  if (!phone) return '';
  let p = String(phone).replace(/[^\d+]/g, '');
  p = p.replace(/^\+/, '');
  p = p.replace(/^00/, ''); // international "00" prefix → drop
  return p;
}

// wa.me click-to-chat URL with the message pre-filled.
function buildWaUrl(phone, message) {
  const p = normalizePhone(phone);
  const text = encodeURIComponent(message);
  // If no phone, still return a shareable link the admin can paste anywhere.
  return p ? `https://wa.me/${p}?text=${text}` : `https://wa.me/?text=${text}`;
}

// Build everything needed to share a guest's invitation over WhatsApp.
async function buildGuestShare(wedding, guest) {
  const invitation = await ensureInvitation(wedding, guest);
  const invitationUrl = buildInvitationUrl(wedding, invitation);
  const message = buildMessage(wedding, guest, invitationUrl);
  const phone = normalizePhone(guest.phone);
  return {
    guestId: guest.id,
    guestName: `${guest.firstName} ${guest.lastName}`.trim(),
    phone,
    hasPhone: !!phone,
    invitationUrl,
    message,
    waUrl: buildWaUrl(guest.phone, message)
  };
}

module.exports = {
  eventName,
  buildInvitationUrl,
  ensureInvitation,
  buildMessage,
  normalizePhone,
  buildWaUrl,
  buildGuestShare
};
