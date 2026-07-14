import { useState } from 'react'

const KEY = 'fontanelle-location-enabled'

function readStored() {
  try {
    return localStorage.getItem(KEY) !== 'false' // default: attiva
  } catch {
    return true
  }
}

// Interruttore locale (non e' il permesso del browser): quando spento,
// l'app non chiama mai la geolocalizzazione, a prescindere dal permesso
// concesso al sito. Revocabile in ogni momento da Altro > Privacy.
export function useLocationPref() {
  const [enabled, setEnabledState] = useState(readStored)

  function setEnabled(next) {
    setEnabledState(next)
    try {
      localStorage.setItem(KEY, String(next))
    } catch {
      // storage non disponibile: la preferenza non persiste, non e' bloccante
    }
  }

  return { enabled, setEnabled }
}
