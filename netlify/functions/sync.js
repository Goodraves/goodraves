/**
 * Netlify serverless function that proxies requests to jsonblob.com
 * to avoid CORS issues from the browser.
 *
 * Routes:
 *   POST   /api/sync          → Create a new blob
 *   GET    /api/sync?id=XYZ   → Read blob XYZ
 *   PUT    /api/sync?id=XYZ   → Update blob XYZ
 */

const JSONBLOB_API = 'https://jsonblob.com/api/jsonBlob'

export async function handler(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  try {
    const blobId = event.queryStringParameters?.id

    // ── POST: Create new blob ──
    if (event.httpMethod === 'POST') {
      const res = await fetch(JSONBLOB_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: event.body,
      })

      if (!res.ok) {
        return {
          statusCode: res.status,
          headers,
          body: JSON.stringify({ error: `jsonblob returned ${res.status}` }),
        }
      }

      // Extract blob ID from Location header
      const location = res.headers.get('Location') || res.headers.get('location')
      if (!location) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'No Location header from jsonblob' }),
        }
      }

      const id = location.split('/').pop()
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ id }),
      }
    }

    // ── GET: Read blob ──
    if (event.httpMethod === 'GET') {
      if (!blobId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing id parameter' }),
        }
      }

      const res = await fetch(`${JSONBLOB_API}/${blobId}`, {
        headers: { 'Accept': 'application/json' },
      })

      if (res.status === 404) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'SYNC_NOT_FOUND' }),
        }
      }

      if (!res.ok) {
        return {
          statusCode: res.status,
          headers,
          body: JSON.stringify({ error: `jsonblob returned ${res.status}` }),
        }
      }

      const data = await res.json()
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data),
      }
    }

    // ── PUT: Update blob ──
    if (event.httpMethod === 'PUT') {
      if (!blobId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing id parameter' }),
        }
      }

      const res = await fetch(`${JSONBLOB_API}/${blobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: event.body,
      })

      if (!res.ok) {
        return {
          statusCode: res.status,
          headers,
          body: JSON.stringify({ error: `jsonblob returned ${res.status}` }),
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true }),
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    }
  }
}
