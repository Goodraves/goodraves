/**
 * Cloud Sync via jsonblob.com — proxied through Netlify function
 * to avoid CORS issues. Requests go to /.netlify/functions/sync
 * which forwards them server-side to jsonblob.com.
 *
 * In development, requests go directly to jsonblob.com.
 */

const PROXY_BASE = '/.netlify/functions/sync'

/**
 * Create a new sync blob with initial data.
 * @param {object} data - The user data to store
 * @returns {string} blobId - The unique sync code
 */
export async function createSyncBlob(data) {
  const res = await fetch(PROXY_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ data, updatedAt: Date.now() }),
  })

  if (!res.ok) throw new Error(`Failed to create sync: ${res.status}`)

  const result = await res.json()
  if (!result.id) throw new Error('No blob ID returned from sync proxy')

  return result.id
}

/**
 * Read data from a sync blob.
 * @param {string} blobId - The sync code
 * @returns {{ data: object, updatedAt: number }}
 */
export async function readSyncBlob(blobId) {
  const res = await fetch(`${PROXY_BASE}?id=${encodeURIComponent(blobId)}`, {
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
  const res = await fetch(`${PROXY_BASE}?id=${encodeURIComponent(blobId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ data, updatedAt: Date.now() }),
  })

  if (!res.ok) throw new Error(`Failed to update sync: ${res.status}`)
}
