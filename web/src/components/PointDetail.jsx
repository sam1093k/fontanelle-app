import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { STATUSES } from '../constants'
import { distanceMeters, formatDistance } from '../lib/geo'
import PhotoImg from './PhotoImg'

export default function PointDetail({ point, categories, location, isAdmin, user, onClose, onProposeEdit }) {
  const cat = categories.find((c) => c.id === point.category)
  const dist = location ? distanceMeters(location, point) : null

  async function adminSetStatus(status) {
    try {
      await updateDoc(doc(db, 'points', point.id), {
        status,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      })
    } catch (err) {
      alert('Cambio stato fallito: ' + err.message)
    }
  }

  async function adminDelete() {
    if (!confirm(`Eliminare definitivamente "${point.name}"?`)) return
    try {
      await deleteDoc(doc(db, 'points', point.id))
      onClose()
    } catch (err) {
      alert('Eliminazione fallita: ' + err.message)
    }
  }

  async function proposeRemoval() {
    const note = prompt('Perché questo punto va rimosso? (facoltativo)')
    if (note === null) return
    try {
      await addDoc(collection(db, 'suggestions'), {
        type: 'remove',
        pointId: point.id,
        payload: { name: point.name },
        note: note.trim().slice(0, 500),
        authorUid: user.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      alert('Proposta di rimozione inviata ✅ Un admin la esaminerà.')
      onClose()
    } catch (err) {
      alert('Invio fallito: ' + err.message)
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

        {!isAdmin && (
          <button className="button secondary" onClick={proposeRemoval}>
            🗑 Proponi la rimozione
          </button>
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
            <button className="button danger" onClick={adminDelete}>
              🗑 Elimina punto
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
