import { useState } from 'react'
import { doc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { logout } from '../hooks/useAuth'
import { useUsers } from '../hooks/useData'
import { SEED_CATEGORIES } from '../constants'

function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function MoreTab({ user, profile, isAdmin, categories }) {
  const users = useUsers(isAdmin)
  const [newLabel, setNewLabel] = useState('')
  const [newEmoji, setNewEmoji] = useState('📍')
  const [msg, setMsg] = useState('')

  async function toggleAdmin(u) {
    const promoting = !u.isAdmin
    if (!confirm(`${promoting ? 'Promuovere' : 'Rimuovere'} ${u.displayName} ${promoting ? 'ad' : 'da'} amministratore?`))
      return
    await updateDoc(doc(db, 'users', u.id), { isAdmin: promoting })
  }

  async function seedCategories() {
    const batch = writeBatch(db)
    for (const c of SEED_CATEGORIES) {
      batch.set(doc(db, 'categories', c.id), {
        label: c.label,
        emoji: c.emoji,
        createdAt: serverTimestamp(),
      })
    }
    await batch.commit()
    setMsg('Categorie di base create ✅')
  }

  async function addCategory(e) {
    e.preventDefault()
    const id = slugify(newLabel)
    if (!id) return setMsg('Nome categoria non valido')
    await setDoc(doc(db, 'categories', id), {
      label: newLabel.trim(),
      emoji: newEmoji.trim() || '📍',
      createdAt: serverTimestamp(),
    })
    setNewLabel('')
    setNewEmoji('📍')
    setMsg(`Categoria "${newLabel.trim()}" creata ✅`)
  }

  return (
    <div className="list-page">
      <h3>Profilo</h3>
      <div className="card">
        <p>
          <strong>{profile?.displayName}</strong> {isAdmin && <span className="chip">admin</span>}
        </p>
        <p className="small muted">{user.email}</p>
        <button className="button secondary" onClick={logout}>Esci</button>
      </div>

      {isAdmin && (
        <>
          <h3>Utenti</h3>
          {users.map((u) => (
            <div key={u.id} className="card row-card">
              <div>
                <strong>{u.displayName}</strong>
                {u.isAdmin && <span className="chip">admin</span>}
              </div>
              {u.id !== user.uid ? (
                <button className="button secondary" onClick={() => toggleAdmin(u)}>
                  {u.isAdmin ? 'Rimuovi admin' : 'Rendi admin'}
                </button>
              ) : (
                <span className="small muted">(tu)</span>
              )}
            </div>
          ))}

          <h3>Categorie</h3>
          {categories.length === 0 && (
            <button className="button" onClick={seedCategories}>
              Crea le categorie di base
            </button>
          )}
          {categories.map((c) => (
            <div key={c.id} className="card row-card">
              <span>
                {c.emoji} {c.label} <span className="small muted">({c.id})</span>
              </span>
            </div>
          ))}
          <form onSubmit={addCategory} className="form card">
            <label>
              Nuova categoria
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Es. Panchina panoramica"
                maxLength={50}
              />
            </label>
            <label>
              Emoji
              <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} maxLength={4} />
            </label>
            <button type="submit" className="button" disabled={!newLabel.trim()}>
              Aggiungi categoria
            </button>
          </form>
          {msg && <p className="small">{msg}</p>}
        </>
      )}
    </div>
  )
}
