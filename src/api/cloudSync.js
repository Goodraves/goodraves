/**
 * Cloud Sync via jsonblob.com
 * Free, no auth required, CORS-enabled JSON storage.
 * Each "blob" is a JSON document with a unique ID.
 * The blob ID becomes the user's sync code.
 */

const API_BASE = 'https://jsonblob.com/api/jsonBlob'

/**
 * Create a new sync blob with initial data.
 * @param {object} data - The user data to store
 * @returns {string} blobId - The unique sync code
 */
export async function createSyncBlob(data) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ data, updatedAt: Date.now() }),
  })

  if (!res.ok) throw new Error(`Failed to create sync: ${res.status}`)

  // The blob ID comes from the Location header
  const location = res.headers.get('Location') || res.headers.get('location')
  if (!location) throw new Error('No Location header returned from API')

  return location.split('/').pop()
}

/**
 * Read data from a sync blob.
 * @param {string} blobId - The sync code
 * @returns {{ data: object, updatedAt: number }}
 */
export async function readSyncBlob(blobId) {
  const res = await fetch(`${API_BASE}/${blobId}`, {
    headers: { 'Accept': 'application/json' },
  })

  if (res.status === 404) throw new Error('SYNC_NOT_FOUND')
  if (!res.ok) throw new Error(`Failed to read sync: ${res.status}`)

  return res.json()
}

/**
 * Update a sync blob with new data.
 * @param {string} blobId - The sync code
 * @param {object} data - The user data to store
 */
export async function updateSyncBlob(blobId, data) {
  const res = await fetch(`${API_BASE}/${blobId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ data, updatedAt: Date.now() }),
  })

  if (!res.ok) throw new Error(`Failed to update sync: ${res.status}`)
}
