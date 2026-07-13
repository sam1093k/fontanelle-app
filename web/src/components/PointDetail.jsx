import { useState } from 'react'
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { STATUSES } from '../constants'
import { distanceMeters, formatDistance } from '../lib/geo'
import PhotoImg from './PhotoImg'

// Niente confirm()/prompt()/alert() nativi: nelle PWA installate su iOS
// spesso non vengono mostrati (il tasto sembra "cliccare a vuoto").
// Tutte le conferme e gli errori sono elementi dell'interfaccia.
export default function PointDetail({ point, categories, location, isAdmin, user, onClose, onProposeEdit }) {
  const cat = categories.find((c) => c.id === point.category)
  const dist = location ? distanceMeters(location, point) : null

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [removalOpen, setRemovalOpen] = useState(false)
  const [removalNote, setRemovalNote] = useState('')
  const [removalSent, setRemovalSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function adminSetStatus(status) {
    setError('')
    try {
      await updateDoc(doc(db, 'points', point.id), {
        status,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      })
    } catch (err) {
      setError('Cambio stato fallito: ' + err.message)
    }
  }

  async function adminDelete() {
    setError('')
    setBusy(true)
    try {
      await deleteDoc(doc(db, 'points', point.id))
      onClose()
    } catch (err) {
      setError('Eliminazione fallita: ' + err.message)
      setConfirmingDelete(false)
    } finally {
      setBusy(false)
    }
  }

  async function sendRemoval() {
    setError('')
    setBusy(true)
    try {
      await addDoc(collection(db, 'suggestions'), {
        type: 'remove',
        pointId: point.id,
        payload: { name: point.name },
        note: removalNote.trim().slice(0, 500),
        authorUid: user.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      setRemovalSent(true)
    } catch (err) {
      setError('Invio fallito: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>
            {cat?.emoji || '📍'} {point.name}
          </h2>
          <button className="close" onClick={onClose}>✕</button>
        </div>

        <div className="chips">
          <span
            className="status-chip"
            style={{ background: STATUSES[point.status]?.color || STATUSES.unknown.color }}
          >
            {STATUSES[point.status]?.label || point.status}
          </span>
          <span className="chip">{cat?.label || point.category}</span>
          {dist != null && <span className="chip">📍 {formatDistance(dist)}</span>}
        </div>

        {point.description && <p className="description">{point.description}</p>}

        {point.photoFileIds?.length > 0 && (
          <div className="photo-strip">
            {point.photoFileIds.map((id) => (
              <PhotoImg key={id} fileId={id} alt={point.name} />
            ))}
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <a
          className="button secondary"
          href={`https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`}
          target="_blank"
          rel="noreferrer"
        >
          🧭 Indicazioni
        </a>

        <button className="button" onClick={() => onProposeEdit(point)}>
          ✏️ Proponi una modifica
        </button>

        {!isAdmin && !removalOpen && !removalSent && (
          <button className="button secondary" onClick={() => setRemovalOpen(true)}>
            🗑 Proponi la rimozione
          </button>
        )}

        {!isAdmin && removalOpen && !removalSent && (
          <div className="inline-confirm">
            <label className="small muted">
              Perché va rimosso? (facoltativo)
              <textarea
                value={removalNote}
                onChange={(e) => setRemovalNote(e.target.value)}
                maxLength={500}
                rows={2}
              />
            </label>
            <div className="card-actions">
              <button className="button danger" disabled={busy} onClick={sendRemoval}>
                {busy ? 'Invio…' : 'Invia proposta di rimozione'}
              </button>
              <button className="button secondary" onClick={() => setRemovalOpen(false)}>
                Annulla
              </button>
            </div>
          </div>
        )}

        {removalSent && (
          <p className="success">✅ Proposta di rimozione inviata: un admin la esaminerà.</p>
        )}

        {isAdmin && (
          <div className="admin-box">
            <p className="small muted">Azioni admin (immediate, senza approvazione):</p>
            <div className="status-buttons">
              {Object.entries(STATUSES).map(([k, v]) => (
                <button
                  key={k}
                  className={`status-btn ${point.status === k ? 'active' : ''}`}
                  style={{ '--c': v.color }}
                  onClick={() => adminSetStatus(k)}
                >
                  {v.label}
                </button>
              ))}
            </div>
            {!confirmingDelete ? (
              <button className="button danger" onClick={() => setConfirmingDelete(true)}>
                🗑 Elimina punto
              </button>
            ) : (
              <div className="inline-confirm">
                <p className="small">
                  <strong>Eliminare definitivamente "{point.name}"?</strong>
                </p>
                <div className="card-actions">
                  <button className="button danger" disabled={busy} onClick={adminDelete}>
                    {busy ? 'Eliminazione…' : 'Sì, elimina'}
                  </button>
                  <button className="button secondary" onClick={() => setConfirmingDelete(false)}>
                    Annulla
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
