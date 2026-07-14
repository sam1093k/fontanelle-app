import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { MAX_PHOTOS, STATUSES } from '../constants'
import { uploadPhoto } from '../lib/photos'
import PhotoImg from './PhotoImg'

import { GEO_DENIED_HELP } from '../hooks/useData'

// mode: { type: 'add', coords: {lat,lng} } oppure { type: 'edit', point }
export default function SuggestionForm({ mode, categories, user, location, geoStatus, onRequestLocation, onClose }) {
  const editing = mode.type === 'edit'
  const p = editing ? mode.point : null

  const [name, setName] = useState(p?.name ?? '')
  const [category, setCategory] = useState(p?.category ?? categories[0]?.id ?? '')
  const [status, setStatus] = useState(p?.status ?? 'active')
  const [description, setDescription] = useState(p?.description ?? '')
  const [lat, setLat] = useState(p?.lat ?? mode.coords?.lat ?? '')
  const [lng, setLng] = useState(p?.lng ?? mode.coords?.lng ?? '')
  const [photoFileIds, setPhotoFileIds] = useState(p?.photoFileIds ?? [])
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function pickPhotos(e) {
    const files = [...e.target.files].slice(0, MAX_PHOTOS - photoFileIds.length)
    e.target.value = ''
    if (files.length === 0) return
    setUploading(true)
    setError('')
    try {
      for (const f of files) {
        const fileId = await uploadPhoto(f)
        setPhotoFileIds((prev) => [...prev, fileId])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    const nLat = Number(lat)
    const nLng = Number(lng)
    if (!name.trim()) return setError('Il nome è obbligatorio')
    if (!category) return setError('Scegli una categoria')
    if (Number.isNaN(nLat) || Number.isNaN(nLng) || nLat < -90 || nLat > 90 || nLng < -180 || nLng > 180)
      return setError('Coordinate non valide')
    setBusy(true)
    try {
      await addDoc(collection(db, 'suggestions'), {
        type: editing ? 'edit' : 'add',
        pointId: editing ? p.id : null,
        payload: {
          name: name.trim(),
          category,
          status,
          description: description.trim(),
          lat: nLat,
          lng: nLng,
          photoFileIds,
        },
        note: note.trim(),
        authorUid: user.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      setDone(true)
    } catch (err) {
      setError('Invio fallito: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="sheet" onClick={(e) => e.stopPropagation()}>
          <h2>✅ Proposta inviata</h2>
          <p>Un amministratore la esaminerà. Puoi seguirne lo stato nella scheda Proposte.</p>
          <button className="button" onClick={onClose}>Chiudi</button>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{editing ? `Modifica: ${p.name}` : 'Nuovo punto'}</h2>
          <button className="close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit} className="form">
          <label>
            Nome *
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
          </label>

          <label>
            Categoria *
            <select value={category} onChange={(e) => setCategory(e.target.value)} required>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Stato *
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(STATUSES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Descrizione
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={3}
            />
          </label>

          <div className="coord-row">
            <label>
              Lat *
              <input value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" required />
            </label>
            <label>
              Lng *
              <input value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" required />
            </label>
          </div>
          <button
            type="button"
            className="button secondary small-btn"
            onClick={() => {
              if (location) {
                setLat(location.lat)
                setLng(location.lng)
              } else if (geoStatus === 'denied') {
                setError(GEO_DENIED_HELP)
              } else if (geoStatus === 'disabled') {
                setError('Hai disattivato la posizione per questa app. Riattivala da Altro → Privacy → Posizione, oppure inserisci le coordinate a mano.')
              } else {
                onRequestLocation()
                setError('Attivazione posizione in corso: consenti l’accesso e ripremi il tasto.')
              }
            }}
          >
            📍 Usa la mia posizione
          </button>

          <label>
            Foto ({photoFileIds.length}/{MAX_PHOTOS})
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={pickPhotos}
              disabled={uploading || photoFileIds.length >= MAX_PHOTOS}
            />
          </label>
          {uploading && <p className="muted small">Caricamento foto…</p>}
          {photoFileIds.length > 0 && (
            <div className="photo-strip">
              {photoFileIds.map((id) => (
                <div key={id} className="photo-thumb">
                  <PhotoImg fileId={id} />
                  <button
                    type="button"
                    className="remove-photo"
                    onClick={() => setPhotoFileIds((prev) => prev.filter((x) => x !== id))}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <label>
            Nota per gli admin
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </label>

          {error && <p className="error">{error}</p>}
          <button type="submit" className="button" disabled={busy || uploading}>
            {busy ? 'Invio…' : 'Invia proposta'}
          </button>
        </form>
      </div>
    </div>
  )
}
