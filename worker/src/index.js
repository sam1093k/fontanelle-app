import { createRemoteJWKSet, jwtVerify } from 'jose'

// Chiavi pubbliche Google per verificare gli ID token Firebase (formato JWK).
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
)

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

async function verifyAuth(request, env) {
  const header = request.headers.get('Authorization') || ''
  if (!header.startsWith('Bearer ')) return null
  try {
    const { payload } = await jwtVerify(header.slice(7), JWKS, {
      issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
      audience: env.FIREBASE_PROJECT_ID,
    })
    return payload
  } catch {
    return null
  }
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || ''
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type',
    Vary: 'Origin',
  }
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const headers = corsHeaders(request, env)

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })

    const user = await verifyAuth(request, env)
    if (!user) return json({ error: 'unauthorized' }, 401, headers)

    // POST /upload — body: immagine JPEG. Inoltra al bot Telegram, ritorna il file_id.
    if (request.method === 'POST' && url.pathname === '/upload') {
      const img = await request.arrayBuffer()
      if (img.byteLength === 0) return json({ error: 'empty_body' }, 400, headers)
      if (img.byteLength > MAX_UPLOAD_BYTES) return json({ error: 'too_large' }, 413, headers)

      const form = new FormData()
      form.append('chat_id', env.TELEGRAM_CHAT_ID)
      form.append('photo', new Blob([img], { type: 'image/jpeg' }), 'photo.jpg')
      form.append('caption', `Upload da: ${user.email || user.user_id}`)

      const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json()
      if (!data.ok) return json({ error: 'telegram_error', detail: data.description }, 502, headers)

      // Telegram ritorna più risoluzioni: prendiamo la più grande.
      const sizes = data.result.photo
      return json({ fileId: sizes[sizes.length - 1].file_id }, 200, headers)
    }

    // GET /photo/<fileId> — risolve il file su Telegram e fa da proxy dello stream.
    // Il token del bot non lascia mai il Worker.
    if (request.method === 'GET' && url.pathname.startsWith('/photo/')) {
      const fileId = decodeURIComponent(url.pathname.slice('/photo/'.length))
      if (!fileId) return json({ error: 'missing_file_id' }, 400, headers)

      const metaRes = await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`
      )
      const meta = await metaRes.json()
      if (!meta.ok) return json({ error: 'not_found' }, 404, headers)

      const fileRes = await fetch(
        `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${meta.result.file_path}`
      )
      if (!fileRes.ok) return json({ error: 'fetch_failed' }, 502, headers)

      return new Response(fileRes.body, {
        status: 200,
        headers: {
          ...headers,
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'private, max-age=86400',
        },
      })
    }

    return json({ error: 'not_found' }, 404, headers)
  },
}
