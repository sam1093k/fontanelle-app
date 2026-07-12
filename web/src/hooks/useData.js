import { useEffect, useState } from 'react'
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

export function useGeolocation() {
  const [pos, setPos] = useState(null)
  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])
  return pos
}
