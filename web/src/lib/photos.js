import { auth, getAppCheckToken } from '../firebase'

const WORKER_URL = (import.meta.env.VITE_WORKER_URL || '').replace(/\/$/, '')

// Cache in memoria degli object URL: ogni foto viene scaricata una volta per sessione.
const urlCache = new Map()

async function authHeader() {
  const [idToken, appCheckToken] = await Promise.all([auth.currentUser.getIdToken(), getAppCheckToken()])
  const headers = { Authorization: `Bearer ${idToken}` }
  if (appCheckToken) headers['X-Firebase-AppCheck'] = appCheckToken
  return headers
}

// Ridimensiona e comprime lato client prima dell'upload:
// meno banda, e restiamo sotto il limite del Worker.
export async function compressImage(file, maxDim = 1600, quality = 0.8) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Compressione fallita'))), 'image/jpeg', quality)
  )
}

export async function uploadPhoto(file) {
  const blob = await compressImage(file)
  const res = await fetch(`${WORKER_URL}/upload`, {
    method: 'POST',
    headers: { ...(await authHeader()), 'Content-Type': 'image/jpeg' },
    body: blob,
  })
  if (!res.ok) {
    let detail = ''
    try {
      const err = await res.json()
      detail = err.detail || err.error || ''
    } catch {
      /* corpo non JSON */
    }
    throw new Error(`Upload foto fallito (HTTP ${res.status}${detail ? `: ${detail}` : ''})`)
  }
  return (await res.json()).fileId
}

export async function getPhotoUrl(fileId) {
  if (urlCache.has(fileId)) return urlCache.get(fileId)
  const res = await fetch(`${WORKER_URL}/photo/${encodeURIComponent(fileId)}`, {
    headers: await authHeader(),
  })
  if (!res.ok) throw new Error('Foto non disponibile')
  const url = URL.createObjectURL(await res.blob())
  urlCache.set(fileId, url)
  return url
}
