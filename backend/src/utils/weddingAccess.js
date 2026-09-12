const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Shared "can this user touch this wedding" check, used across every
// wedding-scoped route instead of each file repeating its own
// `prisma.wedding.findFirst({ where: { id, ...(not admin && { userId }) } })`.
// Grants access to: staff (ADMIN/SUPER_ADMIN), the owner, and any ACCEPTED
// collaborator. `prismaArgs` lets a call site pass extra `include`/`select`
// without a second round-trip.
async function findAccessibleWedding(user, weddingId, prismaArgs = {}) {
  const isStaff = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  return prisma.wedding.findFirst({
    ...prismaArgs,
    where: {
      ...(prismaArgs.where || {}),
      id: weddingId,
      ...(!isStaff && {
        OR: [
          { userId: user.id },
          { collaborators: { some: { userId: user.id, status: 'ACCEPTED' } } }
        ]
      })
    }
  });
}

// Stricter variant for owner-only actions (deleting the event, managing
// collaborators, payments/quota purchases) — collaborators are excluded.
async function findOwnedWedding(user, weddingId, prismaArgs = {}) {
  const isStaff = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  return prisma.wedding.findFirst({
    ...prismaArgs,
    where: {
      ...(prismaArgs.where || {}),
      id: weddingId,
      ...(!isStaff && { userId: user.id })
    }
  });
}

// For call sites that already loaded the wedding some other way (e.g. via an
// invitation) and just need a yes/no on an ACCEPTED collaborator.
async function isAcceptedCollaborator(userId, weddingId) {
  const collab = await prisma.weddingCollaborator.findFirst({
    where: { weddingId, userId, status: 'ACCEPTED' },
    select: { id: true }
  });
  return !!collab;
}

module.exports = { findAccessibleWedding, findOwnedWedding, isAcceptedCollaborator };
