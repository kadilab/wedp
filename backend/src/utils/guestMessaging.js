// Helpers for sending personalized invitations to guests (WhatsApp click-to-chat
// + the per-guest invitation link). Centralizes the message wording and the
// "make sure this guest has an invitation code" logic so every channel uses the
// same link.
const { PrismaClient } = require('@prisma/client');
const { generateQRCode, generateUniqueCode } = require('./qrcode');
const { eventUsesCouple, eventUsesHonoree, EVENT_TYPE_LABELS } = require('./eventTypes');

const prisma = new PrismaClient();

// Event display name: couple names, honoree name, or free title — whichever
// applies to this event type. Falls back to the type label rather than a
// generic "notre événement" so a birthday/ceremony without a name still
// reads as "Anniversaire" / "Cérémonie" instead of nothing at all.
function eventName(wedding) {
  const type = wedding.eventType || 'WEDDING';
  if (eventUsesCouple(type)) {
    const names = [wedding.brideName, wedding.groomName].filter(Boolean).join(' & ');
    if (names) return names;
  } else if (eventUsesHonoree(type) && wedding.honoreeName) {
    return wedding.honoreeName;
  }
  return wedding.eventTitle || EVENT_TYPE_LABELS[type] || 'notre événement';
}

// The clause that follows "Vous êtes convié(e) ..." — spells out the event
// TYPE (mariage / mariage coutumier / anniversaire / cérémonie / conférence /
// autre) so the message never reads as a generic, unidentified invitation.
function eventInvitePhrase(wedding) {
  const type = wedding.eventType || 'WEDDING';
  if (eventUsesCouple(type)) {
    const names = [wedding.brideName, wedding.groomName].filter(Boolean).join(' & ');
    const label = type === 'DOT' ? 'mariage coutumier' : 'mariage';
    return names ? `au ${label} de ${names}` : `au ${label}`;
  }
  if (eventUsesHonoree(type)) {
    if (wedding.honoreeName) {
      return type === 'BIRTHDAY' ? `à l'anniversaire de ${wedding.honoreeName}` : `à la cérémonie de ${wedding.honoreeName}`;
    }
    return type === 'BIRTHDAY' ? `à un anniversaire` : `à une cérémonie`;
  }
  // CONFERENCE / OTHER — free title supplied by the organiser.
  if (wedding.eventTitle) {
    return type === 'CONFERENCE' ? `à la conférence « ${wedding.eventTitle} »` : `à « ${wedding.eventTitle} »`;
  }
  return type === 'CONFERENCE' ? `à une conférence` : `à notre événement`;
}

// A closing emoji that fits the event type (the wedding ring 💍 looked odd
// signing off a birthday or conference invite).
const SIGNOFF_EMOJI = { WEDDING: '💍', DOT: '💍', BIRTHDAY: '🎉', CEREMONY: '🙏', CONFERENCE: '📅', OTHER: '✨' };

function formatDate(date) {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

// The public, per-guest invitation URL (the SPA view).
function buildInvitationUrl(wedding, invitation) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/i/${wedding.slug}/${invitation.uniqueCode}`;
}

// The shareable URL (OG-enabled): shows a rich card on WhatsApp/Facebook then
// redirects to the SPA invitation view. Used in the message sent to guests.
function buildShareUrl(wedding, invitation) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/s/${wedding.slug}/${invitation.uniqueCode}`;
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
  const type = wedding.eventType || 'WEDDING';
  const phrase = eventInvitePhrase(wedding);
  const date = formatDate(wedding.weddingDate);
  const venue = wedding.venueName ? ` à ${wedding.venueName}` : '';
  const lines = [
    `Bonjour ${guest.firstName} 👋`,
    '',
    `Vous êtes convié(e) ${phrase}${date ? ` le ${date}` : ''}${venue}.`,
    `Voici votre invitation personnalisée :`,
    invitationUrl,
    '',
    `Merci de confirmer votre présence (RSVP) directement sur le lien. ${SIGNOFF_EMOJI[type] || '✨'}`
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

// Raised when a guest has no generated invitation yet. Callers turn this into a
// 400 (single send) or skip the guest (bulk) instead of silently creating one.
class NoInvitationError extends Error {
  constructor(guest) {
    super(`L'invitation de ${guest?.firstName || 'cet invité'} n'a pas encore été générée`);
    this.code = 'NO_INVITATION';
  }
}

// Build everything needed to share a guest's invitation over WhatsApp.
// Anti-fraud: never create an invitation here — it must already exist (generated
// from the Invitations page). Otherwise links could be sent before generation.
async function buildGuestShare(wedding, guest) {
  const invitation = guest.invitation
    || await prisma.invitation.findUnique({ where: { guestId: guest.id } });
  if (!invitation) throw new NoInvitationError(guest);
  const invitationUrl = buildInvitationUrl(wedding, invitation);
  const shareUrl = buildShareUrl(wedding, invitation);
  // The message embeds the OG-enabled share link so recipients see a rich card.
  const message = buildMessage(wedding, guest, shareUrl);
  const phone = normalizePhone(guest.phone);
  return {
    guestId: guest.id,
    guestName: `${guest.firstName} ${guest.lastName}`.trim(),
    phone,
    hasPhone: !!phone,
    invitationUrl,
    shareUrl,
    message,
    waUrl: buildWaUrl(guest.phone, message)
  };
}

module.exports = {
  eventName,
  eventInvitePhrase,
  buildInvitationUrl,
  buildShareUrl,
  ensureInvitation,
  buildMessage,
  normalizePhone,
  buildWaUrl,
  buildGuestShare,
  NoInvitationError
};
