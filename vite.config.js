import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'https'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-sync-proxy',
      configureServer(server) {
        server.middlewares.use('/.netlify/functions/sync', (req, res) => {
          const url = new URL(req.url, `http://${req.headers.host}`)
          const id = url.searchParams.get('id')
          
          let targetUrl = 'https://jsonblob.com/api/jsonBlob'
          if (id && (req.method === 'GET' || req.method === 'PUT')) {
            targetUrl += `/${id}`
          }

          const options = {
            method: req.method,
            headers: { 'Accept': 'application/json' }
          }
          
          if (req.method === 'POST' || req.method === 'PUT') {
            options.headers['Content-Type'] = 'application/json'
            if (req.headers['content-length']) {
              options.headers['Content-Length'] = req.headers['content-length']
            }
          }

          const proxyReq = https.request(targetUrl, options, (proxyRes) => {
            // Forward headers except those that might mess up our custom JSON response
            const headersToForward = { ...proxyRes.headers }
            delete headersToForward['content-length']
            
            if (req.method === 'POST') {
              proxyRes.resume()
              const location = proxyRes.headers['location']
              if (location) {
                const blobId = location.split('/').pop()
                res.writeHead(201, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ id: blobId }))
              } else {
                res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'No Location header' }))
              }
            } else {
              res.writeHead(proxyRes.statusCode, headersToForward)
              proxyRes.pipe(res)
            }
          })

          proxyReq.on('error', (err) => {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message }))
          })

          req.pipe(proxyReq)
        })
      }
    }
  ],
})
