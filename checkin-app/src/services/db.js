import { openDB } from 'idb'

const DB_NAME = 'checkin-db'
const DB_VERSION = 1

let dbPromise = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const guests = db.createObjectStore('guests', { keyPath: 'uniqueCode' })
        guests.createIndex('weddingId', 'weddingId')

        const pending = db.createObjectStore('pendingScans', { keyPath: 'id', autoIncrement: true })
        pending.createIndex('weddingId', 'weddingId')

        db.createObjectStore('meta', { keyPath: 'weddingId' })
      }
    })
  }
  return dbPromise
}

// Replace the local guest cache for a wedding with a freshly downloaded manifest.
export async function saveManifest(weddingId, weddingInfo, guests) {
  const db = await getDB()
  const tx = db.transaction(['guests', 'meta'], 'readwrite')

  // Clear previous guests for this wedding only (other weddings' caches stay intact).
  const index = tx.objectStore('guests').index('weddingId')
  let cursor = await index.openCursor(weddingId)
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }

  for (const guest of guests) {
    await tx.objectStore('guests').put({ ...guest, weddingId })
  }

  await tx.objectStore('meta').put({
    weddingId,
    weddingInfo,
    generatedAt: new Date().toISOString(),
    guestCount: guests.length
  })

  await tx.done
}

export async function getMeta(weddingId) {
  const db = await getDB()
  return db.get('meta', weddingId)
}

export async function getAllGuests(weddingId) {
  const db = await getDB()
  return db.getAllFromIndex('guests', 'weddingId', weddingId)
}

export async function getGuestByCode(uniqueCode) {
  const db = await getDB()
  return db.get('guests', uniqueCode)
}

export async function markGuestCheckedInLocally(uniqueCode, checkedInAt) {
  const db = await getDB()
  const guest = await db.get('guests', uniqueCode)
  if (!guest) return null
  guest.checkedIn = true
  guest.checkedInAt = checkedInAt
  await db.put('guests', guest)
  return guest
}

export async function addPendingScan(scan) {
  const db = await getDB()
  return db.add('pendingScans', scan)
}

export async function getPendingScans(weddingId) {
  const db = await getDB()
  return db.getAllFromIndex('pendingScans', 'weddingId', weddingId)
}

export async function removePendingScan(id) {
  const db = await getDB()
  return db.delete('pendingScans', id)
}

export async function countPendingScans(weddingId) {
  const scans = await getPendingScans(weddingId)
  return scans.length
}
