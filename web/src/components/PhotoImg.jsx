import { useEffect, useState } from 'react'
import { getPhotoUrl } from '../lib/photos'

export default function PhotoImg({ fileId, alt = '' }) {
  const [src, setSrc] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    setSrc(null)
    setFailed(false)
    getPhotoUrl(fileId)
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [fileId])

  if (failed) return <div className="photo placeholder">📷 non disponibile</div>
  if (!src) return <div className="photo placeholder">…</div>
  return <img className="photo" src={src} alt={alt} />
}
