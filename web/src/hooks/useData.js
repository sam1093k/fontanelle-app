import { useCallback, useEffect, useRef, useState } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase'

// buildQuery viene invocata dentro l'effetto: le dipendenze sono i soli
// parametri primitivi (deps), così il listener non si riattacca a ogni render.
function useLiveQuery(buildQuery, deps, enabled = true) {
  const [docs, setDocs] = useState([])
  useEffect(() => {
    if (!enabled) {
      setDocs([])
      return
    }
    return onSnapshot(buildQuery(), (snap) =>
      setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    )
  }, [enabled, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps
  return docs
}

// La cerchia è ristretta: carichiamo tutti i punti in un unico listener
// realtime e ordiniamo per distanza lato client. Con centinaia di punti
// è più semplice ED economico (in letture) delle query geospaziali.
export function usePoints() {
  return useLiveQuery(() => collection(db, 'points'), [])
}

export function useCategories() {
  return useLiveQuery(() => query(collection(db, 'categories'), orderBy('label')), [])
}

export function useMySuggestions(uid) {
  return useLiveQuery(
    () => query(collection(db, 'suggestions'), where('authorUid', '==', uid), orderBy('createdAt', 'desc')),
    [uid],
    !!uid
  )
}

export function usePendingSuggestions(enabled) {
  return useLiveQuery(
    () => query(collection(db, 'suggestions'), where('status', '==', 'pending'), orderBy('createdAt', 'asc')),
    [],
    enabled
  )
}

export function useUsers(enabled) {
  return useLiveQuery(() => collection(db, 'users'), [], enabled)
}

// status: 'idle' (mai chiesta) | 'prompting' | 'granted' | 'denied' | 'unavailable' | 'disabled'
// request() va chiamata da un gesto utente (tasto): su iOS il prompt
// del permesso non appare in modo affidabile senza interazione.
//
// `enabled` è l'interruttore locale in Altro > Privacy (useLocationPref):
// separato dal permesso del browser, revocabile in ogni momento. Quando
// false, la geolocalizzazione non viene mai interrogata, anche se il
// browser ha già concesso il permesso.
export function useGeolocation(enabled) {
  const [location, setLocation] = useState(null)
  const [status, setStatus] = useState('idle')
  const watchRef = useRef(null)

  const clearWatch = useCallback(() => {
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
  }, [])

  const request = useCallback(() => {
    if (!enabled) return
    if (!navigator.geolocation) {
      setStatus('unavailable')
      return
    }
    if (watchRef.current != null) return
    setStatus((s) => (s === 'granted' ? s : 'prompting'))
    watchRef.current = navigator.geolocation.watchPosition(
      (p) => {
        setStatus('granted')
        setLocation({ lat: p.coords.latitude, lng: p.coords.longitude })
      },
      (err) => {
        if (err.code === 1) {
          setStatus('denied')
          clearWatch()
        }
      },
      { enableHighAccuracy: true, maximumAge: 15000 }
    )
  }, [enabled, clearWatch])

  useEffect(() => {
    if (!enabled) {
      clearWatch()
      setLocation(null)
      setStatus('disabled')
      return
    }
    let cancelled = false
    // Auto-avvio solo se il permesso risulta già concesso; altrimenti
    // aspettiamo che l'utente tocchi il tasto posizione.
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((r) => {
          if (cancelled) return
          if (r.state === 'granted') request()
          else if (r.state === 'denied') setStatus('denied')
          else setStatus('idle')
        })
        .catch(() => request())
    } else {
      request()
    }
    return () => {
      cancelled = true
    }
  }, [enabled, request, clearWatch])

  useEffect(() => clearWatch, [clearWatch])

  return { location, status, request }
}

export const GEO_DENIED_HELP =
  'La posizione è bloccata per questo sito. Per riattivarla:\n\n' +
  '• iPhone (Safari): tocca "AA"/icona nella barra indirizzo → Impostazioni sito → Posizione → Consenti. ' +
  'Oppure Impostazioni iPhone → Privacy e sicurezza → Localizzazione → Safari.\n\n' +
  '• Android (Chrome): tocca il lucchetto nella barra indirizzo → Autorizzazioni → Posizione → Consenti.'
