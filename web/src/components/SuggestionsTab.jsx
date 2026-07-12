import { collection, deleteDoc, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { STATUSES } from '../constants'
import { useMySuggestions, usePendingSuggestions, useUsers } from '../hooks/useData'
import PhotoImg from './PhotoImg'

const SUGGESTION_STATUS = {
  pending: { label: 'In attesa', color: '#d97706' },
  approved: { label: 'Approvata', color: '#16a34a' },
  rejected: { label: 'Rifiutata', color: '#dc2626' },
}

function SuggestionCard({ s, categories, authorName, actions }) {
  const cat = categories.find((c) => c.id === s.payload.category)
  return (
    <div className="card">
      <div className="card-head">
        <strong>
          {s.type === 'add' ? '🆕 Nuovo punto' : '✏️ Modifica'}: {s.payload.name}
        </strong>
        <span className="status-chip" style={{ background: SUGGESTION_STATUS[s.status]?.color }}>
          {SUGGESTION_STATUS[s.status]?.label}
        </span>
      </div>
      <p className="small muted">
        {cat ? `${cat.emoji} ${cat.label}` : s.payload.category} · {STATUSES[s.payload.status]?.label}
        {authorName && ` · da ${authorName}`}
      </p>
      {s.payload.description && <p className="small">{s.payload.description}</p>}
      <p className="small muted">
        📍 {s.payload.lat.toFixed(5)}, {s.payload.lng.toFixed(5)}
      </p>
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
  const users = useUsers(isAdmin)
  const userNames = Object.fromEntries(users.map((u) => [u.id, u.displayName]))

  async function approve(s) {
    const batch = writeBatch(db)
    const pointData = {
      ...s.payload,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    }
    if (s.type === 'add') {
      batch.set(doc(collection(db, 'points')), {
        ...pointData,
        createdAt: serverTimestamp(),
        createdBy: s.authorUid,
      })
    } else {
      batch.update(doc(db, 'points', s.pointId), pointData)
    }
    batch.update(doc(db, 'suggestions', s.id), {
      status: 'approved',
      reviewedBy: user.uid,
      reviewedAt: serverTimestamp(),
    })
    await batch.commit()
  }

  async function reject(s) {
    await updateDoc(doc(db, 'suggestions', s.id), {
      status: 'rejected',
      reviewedBy: user.uid,
      reviewedAt: serverTimestamp(),
    })
  }

  async function removeMine(s) {
    if (!confirm('Ritirare questa proposta?')) return
    await deleteDoc(doc(db, 'suggestions', s.id))
  }

  return (
    <div className="list-page">
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
                <button className="button secondary" onClick={() => removeMine(s)}>Ritira</button>
              </div>
            )
          }
        />
      ))}
    </div>
  )
}
