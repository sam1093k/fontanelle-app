import { useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

export default function UpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const updateFn = useRef(null)

  useEffect(() => {
    updateFn.current = registerSW({
      onNeedRefresh: () => setNeedRefresh(true),
    })
  }, [])

  if (!needRefresh) return null
  return (
    <div className="update-banner">
      <span>Nuova versione disponibile</span>
      <button onClick={() => updateFn.current?.(true)}>Aggiorna</button>
    </div>
  )
}
