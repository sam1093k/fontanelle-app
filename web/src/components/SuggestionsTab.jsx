import { useState } from 'react'
import { collection, deleteDoc, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { STATUSES } from '../constants'
import { useMySuggestions, usePendingSuggestions, useReviewedSuggestions, useUsers } from '../hooks/useData'
import PhotoImg from './PhotoImg'

const SUGGESTION_STATUS = {
  pending: { label: 'In attesa', color: '#d97706' },
  approved: { label: 'Approvata', color: '#16a34a' },
  rejected: { label: 'Rifiutata', color: '#dc2626' },
}

const TYPE_LABELS = { add: '🆕 Nuovo punto', edit: '✏️ Modifica', remove: '🗑 Rimozione' }

function SuggestionCard({ s, categories, authorName, actions }) {
  const cat = categories.find((c) => c.id === s.payload.category)
  const isRemove = s.type === 'remove'
  return (
    <div className="card">
      <div className="card-head">
        <strong>
          {TYPE_LABELS[s.type] || s.type}: {s.payload.name}
        </strong>
        <span className="status-chip" style={{ '--c': SUGGESTION_STATUS[s.status]?.color }}>
          {SUGGESTION_STATUS[s.status]?.label}
        </span>
      </div>
      {!isRemove && (
        <>
          <p className="small muted">
            {cat ? `${cat.emoji} ${cat.label}` : s.payload.category}
            {s.payload.subcategory && ` · ${s.payload.subcategory}`}
            {' · '}{STATUSES[s.payload.status]?.label}
            {authorName && ` · da ${authorName}`}
          </p>
          {s.payload.description && <p className="small">{s.payload.description}</p>}
          <p className="small muted">
            📍 {s.payload.lat.toFixed(5)}, {s.payload.lng.toFixed(5)}
          </p>
        </>
      )}
      {isRemove && authorName && <p className="small muted">da {authorName}</p>}
      {s.note && <p className="small">💬 {s.note}</p>}
      {s.payload.photoFileIds?.length > 0 && (
        <div className="photo-strip">
          {s.payload.photoFileIds.map((id) => (
            <PhotoImg key={id} fileId={id} />
          ))}
        </div>
      )}
      {actions}
    </div>
  )
}

export default function SuggestionsTab({ user, isAdmin, categories }) {
  const mine = useMySuggestions(user.uid)
  const pending = usePendingSuggestions(isAdmin)
  const reviewed = useReviewedSuggestions(isAdmin)
  const users = useUsers(isAdmin)
  const userNames = Object.fromEntries(users.map((u) => [u.id, u.displayName]))
  const [error, setError] = useState('')
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(null)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [clearing, setClearing] = useState(false)

  async function approve(s) {
    setError('')
    try {
      const batch = writeBatch(db)
      if (s.type === 'add') {
        batch.set(doc(collection(db, 'points')), {
          ...s.payload,
          createdAt: serverTimestamp(),
          createdBy: s.authorUid,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        })
      } else if (s.type === 'edit') {
        batch.update(doc(db, 'points', s.pointId), {
          ...s.payload,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        })
      } else if (s.type === 'remove') {
        batch.delete(doc(db, 'points', s.pointId))
      }
      batch.update(doc(db, 'suggestions', s.id), {
        status: 'approved',
        reviewedBy: user.uid,
        reviewedAt: serverTimestamp(),
      })
      await batch.commit()
    } catch (err) {
      setError('Approvazione fallita: ' + err.message)
    }
  }

  async function reject(s) {
    setError('')
    try {
      await updateDoc(doc(db, 'suggestions', s.id), {
        status: 'rejected',
        reviewedBy: user.uid,
        reviewedAt: serverTimestamp(),
      })
    } catch (err) {
      setError('Rifiuto fallito: ' + err.message)
    }
  }

  async function removeMine(s) {
    setError('')
    try {
      await deleteDoc(doc(db, 'suggestions', s.id))
      setConfirmingWithdraw(null)
    } catch (err) {
      setError('Ritiro fallito: ' + err.message)
    }
  }

  // Svuota la cronologia (proposte già approvate/rifiutate, di tutti gli
  // utenti). Batch da 450: il limite Firestore è 500 operazioni per batch.
  async function clearHistory() {
    setError('')
    setClearing(true)
    try {
      for (let i = 0; i < reviewed.length; i += 450) {
        const batch = writeBatch(db)
        for (const s of reviewed.slice(i, i + 450)) {
          batch.delete(doc(db, 'suggestions', s.id))
        }
        await batch.commit()
      }
      setConfirmingClear(false)
    } catch (err) {
      setError('Svuotamento fallito: ' + err.message)
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="list-page">
      {error && <p className="error">{error}</p>}
      {isAdmin && (
        <>
          <h3>Da approvare ({pending.length})</h3>
          {pending.length === 0 && <p className="muted">Nessuna proposta in attesa.</p>}
          {pending.map((s) => (
            <SuggestionCard
              key={s.id}
              s={s}
              categories={categories}
              authorName={userNames[s.authorUid]}
              actions={
                <div className="card-actions">
                  <button className="button" onClick={() => approve(s)}>✅ Approva</button>
                  <button className="button danger" onClick={() => reject(s)}>❌ Rifiuta</button>
                </div>
              }
            />
          ))}

          <h3>Cronologia ({reviewed.length})</h3>
          <p className="muted small">
            Proposte già approvate o rifiutate, di tutti gli utenti.
          </p>
          {reviewed.length > 0 && !confirmingClear && (
            <button className="button secondary" onClick={() => setConfirmingClear(true)}>
              🧹 Svuota cronologia
            </button>
          )}
          {confirmingClear && (
            <div className="inline-confirm">
              <p className="small">
                <strong>Eliminare definitivamente {reviewed.length} proposte già valutate?</strong>{' '}
                Spariranno anche dalla sezione "Le mie proposte" di ogni utente. I punti già
                pubblicati non vengono toccati.
              </p>
              <div className="card-actions">
                <button className="button danger" disabled={clearing} onClick={clearHistory}>
                  {clearing ? 'Eliminazione…' : 'Sì, svuota'}
                </button>
                <button className="button secondary" disabled={clearing} onClick={() => setConfirmingClear(false)}>
                  Annulla
                </button>
              </div>
            </div>
          )}
          <hr />
        </>
      )}

      <h3>Le mie proposte</h3>
      {mine.length === 0 && <p className="muted">Non hai ancora inviato proposte.</p>}
      {mine.map((s) => (
        <SuggestionCard
          key={s.id}
          s={s}
          categories={categories}
          actions={
            s.status === 'pending' && (
              <div className="card-actions">
                {confirmingWithdraw === s.id ? (
                  <>
                    <button className="button danger" onClick={() => removeMine(s)}>Confermo il ritiro</button>
                    <button className="button secondary" onClick={() => setConfirmingWithdraw(null)}>Annulla</button>
                  </>
                ) : (
                  <button className="button secondary" onClick={() => setConfirmingWithdraw(s.id)}>Ritira</button>
                )}
              </div>
            )
          }
        />
      ))}
    </div>
  )
}
