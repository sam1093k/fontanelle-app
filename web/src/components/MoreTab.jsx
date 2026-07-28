import { useState } from 'react'
import { doc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { deleteAccount, logout } from '../hooks/useAuth'
import { useUsers } from '../hooks/useData'
import { SEED_CATEGORIES } from '../constants'
import { exportUserData } from '../lib/privacyData'
import PrivacyPolicy from './PrivacyPolicy'

function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const THEME_OPTIONS = [
  { id: 'system', label: 'Sistema', icon: '🌗' },
  { id: 'light', label: 'Chiaro', icon: '☀️' },
  { id: 'dark', label: 'Scuro', icon: '🌙' },
]

export default function MoreTab({
  user,
  profile,
  isAdmin,
  isOwner,
  categories,
  theme,
  onSetTheme,
  locationEnabled,
  onSetLocationEnabled,
}) {
  const users = useUsers(isAdmin)
  const [newLabel, setNewLabel] = useState('')
  const [newEmoji, setNewEmoji] = useState('📍')
  const [msg, setMsg] = useState('')
  const [confirmingUser, setConfirmingUser] = useState(null)
  const [requestSearch, setRequestSearch] = useState('')
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [editingCat, setEditingCat] = useState(null) // id categoria in modifica
  const [editLabel, setEditLabel] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editSubs, setEditSubs] = useState('')
  const [exporting, setExporting] = useState(false)
  const [deleteStep, setDeleteStep] = useState('idle') // idle | confirm | password | busy
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')

  // In attesa = mai approvati, non rifiutati, non admin.
  const pendingUsers = users.filter((u) => u.approved !== true && u.rejected !== true && u.isAdmin !== true)
  const shownRequests = pendingUsers.filter((u) =>
    (u.displayName || '').toLowerCase().includes(requestSearch.trim().toLowerCase())
  )
  const activeUsers = users.filter((u) => u.approved === true || u.isAdmin === true)

  async function approveUser(u) {
    setMsg('')
    try {
      await updateDoc(doc(db, 'users', u.id), { approved: true, rejected: false })
    } catch (err) {
      setMsg('❌ Approvazione fallita: ' + err.message)
    }
  }

  async function rejectUser(u) {
    setMsg('')
    try {
      await updateDoc(doc(db, 'users', u.id), { approved: false, rejected: true })
    } catch (err) {
      setMsg('❌ Rifiuto fallito: ' + err.message)
    }
  }

  // Solo l'owner puo' promuovere/rimuovere admin (impostato dalle rules).
  async function toggleAdmin(u) {
    setMsg('')
    try {
      await updateDoc(doc(db, 'users', u.id), { isAdmin: !u.isAdmin })
      setConfirmingUser(null)
    } catch (err) {
      setMsg('❌ Operazione fallita: ' + err.message)
    }
  }

  async function seedCategories() {
    const batch = writeBatch(db)
    for (const c of SEED_CATEGORIES) {
      batch.set(doc(db, 'categories', c.id), {
        label: c.label,
        emoji: c.emoji,
        subcategories: c.subcategories || [],
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
      subcategories: [],
      createdAt: serverTimestamp(),
    })
    setNewLabel('')
    setNewEmoji('📍')
    setMsg(`Categoria "${newLabel.trim()}" creata ✅`)
  }

  function startEditCategory(c) {
    setEditingCat(c.id)
    setEditLabel(c.label)
    setEditEmoji(c.emoji)
    setEditSubs((c.subcategories || []).join(', '))
  }

  async function saveCategory(c) {
    setMsg('')
    const label = editLabel.trim()
    if (!label) return setMsg('Il nome della categoria non può essere vuoto')
    const subcategories = editSubs
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10)
    try {
      await updateDoc(doc(db, 'categories', c.id), {
        label,
        emoji: editEmoji.trim() || '📍',
        subcategories,
      })
      setEditingCat(null)
      setMsg(`Categoria "${label}" aggiornata ✅`)
    } catch (err) {
      setMsg('❌ Aggiornamento fallito: ' + err.message)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      await exportUserData(user)
    } catch (err) {
      setMsg('❌ Esportazione fallita: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

  async function handleDelete(password) {
    setDeleteError('')
    setDeleteStep('busy')
    try {
      await deleteAccount(password)
      // Da qui l'utente risulta disconnesso: App torna alla schermata di login da sola.
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        setDeleteStep('password')
        return
      }
      const messages = {
        'auth/wrong-password': 'Password errata',
        'auth/invalid-credential': 'Password errata',
        'auth/too-many-requests': 'Troppi tentativi: riprova più tardi',
      }
      setDeleteError(messages[err.code] || err.message)
      setDeleteStep(password ? 'password' : 'confirm')
    }
  }

  return (
    <div className="list-page">
      <h3>Profilo</h3>
      <div className="card">
        <p>
          <strong>{profile?.displayName}</strong>{' '}
          {isOwner && <span className="chip owner">👑 owner</span>}
          {isAdmin && <span className="chip">admin</span>}
        </p>
        <p className="small muted">{user.email}</p>
        <button className="button secondary" onClick={logout}>Esci</button>
      </div>

      <h3>Aspetto</h3>
      <div className="theme-picker">
        {THEME_OPTIONS.map((t) => (
          <button
            key={t.id}
            className={`theme-btn ${theme === t.id ? 'active' : ''}`}
            onClick={() => onSetTheme(t.id)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <h3>Privacy</h3>
      <div className="card">
        <div className="switch-row">
          <div className="switch-text">
            <strong>Posizione</strong>
            <p className="small muted">
              Usata per centrare la mappa e ordinare i punti per distanza. Disattivabile in ogni momento.
            </p>
          </div>
          <button
            type="button"
            className={`switch ${locationEnabled ? 'on' : ''}`}
            role="switch"
            aria-checked={locationEnabled}
            onClick={() => onSetLocationEnabled(!locationEnabled)}
          />
        </div>
      </div>

      <button className="button secondary" onClick={() => setShowPrivacy(true)}>
        📄 Informativa privacy
      </button>
      <button className="button secondary" onClick={handleExport} disabled={exporting}>
        {exporting ? 'Esportazione…' : '⬇️ Esporta i miei dati'}
      </button>

      {deleteStep === 'idle' && (
        <button className="button danger" onClick={() => setDeleteStep('confirm')}>
          🗑 Elimina il mio account
        </button>
      )}
      {deleteStep === 'confirm' && (
        <div className="inline-confirm">
          <p className="small">
            <strong>Eliminare definitivamente il tuo account?</strong> Profilo e proposte ancora in attesa
            verranno cancellati. Le proposte già valutate restano come cronologia per gli admin; le foto già
            caricate restano nell'archivio Telegram (per rimuoverle contatta un admin).
          </p>
          {deleteError && <p className="error">{deleteError}</p>}
          <div className="card-actions">
            <button className="button danger" onClick={() => handleDelete()}>Sì, elimina</button>
            <button
              className="button secondary"
              onClick={() => {
                setDeleteStep('idle')
                setDeleteError('')
              }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}
      {deleteStep === 'password' && (
        <div className="inline-confirm">
          <p className="small">Per sicurezza conferma la password per completare la cancellazione.</p>
          <input
            type="password"
            placeholder="Password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
          />
          {deleteError && <p className="error">{deleteError}</p>}
          <div className="card-actions">
            <button className="button danger" onClick={() => handleDelete(deletePassword)}>
              Conferma ed elimina
            </button>
            <button
              className="button secondary"
              onClick={() => {
                setDeleteStep('idle')
                setDeleteError('')
                setDeletePassword('')
              }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}
      {deleteStep === 'busy' && <p className="small muted">Eliminazione in corso…</p>}

      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}

      {isAdmin && (
        <>
          <h3>Richieste di accesso {pendingUsers.length > 0 && `(${pendingUsers.length})`}</h3>
          {pendingUsers.length === 0 && <p className="muted small">Nessuna richiesta in attesa.</p>}
          {pendingUsers.length > 0 && (
            <input
              placeholder="Cerca per nome…"
              value={requestSearch}
              onChange={(e) => setRequestSearch(e.target.value)}
              style={{ marginBottom: 10 }}
            />
          )}
          {pendingUsers.length > 0 && shownRequests.length === 0 && (
            <p className="muted small">Nessuna richiesta corrisponde a "{requestSearch}".</p>
          )}
          {shownRequests.map((u) => (
            <div key={u.id} className="card row-card">
              <div>
                <strong>{u.displayName}</strong>
                <span className="small muted"> in attesa</span>
              </div>
              <span className="card-actions">
                <button className="button" onClick={() => approveUser(u)}>Accetta</button>
                <button className="button danger" onClick={() => rejectUser(u)}>Rifiuta</button>
              </span>
            </div>
          ))}

          <h3>Utenti</h3>
          {activeUsers.map((u) => (
            <div key={u.id} className="card row-card">
              <div>
                <strong>{u.displayName}</strong>{' '}
                {u.isOwner && <span className="chip owner">👑 owner</span>}
                {u.isAdmin && <span className="chip">admin</span>}
              </div>
              {u.id === user.uid ? (
                <span className="small muted">(tu)</span>
              ) : u.isOwner ? (
                <span className="small muted">gestione riservata</span>
              ) : !isOwner ? null : confirmingUser === u.id ? (
                <span className="card-actions">
                  <button className="button danger" onClick={() => toggleAdmin(u)}>Confermo</button>
                  <button className="button secondary" onClick={() => setConfirmingUser(null)}>Annulla</button>
                </span>
              ) : (
                <button className="button secondary" onClick={() => setConfirmingUser(u.id)}>
                  {u.isAdmin ? 'Rimuovi admin' : 'Rendi admin'}
                </button>
              )}
            </div>
          ))}

          <h3>Categorie</h3>
          {categories.length === 0 && (
            <button className="button" onClick={seedCategories}>
              Crea le categorie di base
            </button>
          )}
          {categories.map((c) =>
            editingCat === c.id ? (
              <div key={c.id} className="card form">
                <label>
                  Nome
                  <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} maxLength={50} />
                </label>
                <label>
                  Emoji
                  <input value={editEmoji} onChange={(e) => setEditEmoji(e.target.value)} maxLength={4} />
                </label>
                <label>
                  Sottocategorie (separate da virgola, vuoto = nessuna)
                  <input
                    value={editSubs}
                    onChange={(e) => setEditSubs(e.target.value)}
                    placeholder="Es. Fontanella, Macchinetta, Distributore"
                    maxLength={300}
                  />
                </label>
                <div className="card-actions">
                  <button className="button" onClick={() => saveCategory(c)}>Salva</button>
                  <button className="button secondary" onClick={() => setEditingCat(null)}>Annulla</button>
                </div>
              </div>
            ) : (
              <div key={c.id} className="card row-card">
                <span>
                  {c.emoji} {c.label} <span className="small muted">({c.id})</span>
                  {c.subcategories?.length > 0 && (
                    <span className="small muted">
                      <br />↳ {c.subcategories.join(', ')}
                    </span>
                  )}
                </span>
                <button className="button secondary" onClick={() => startEditCategory(c)}>
                  Modifica
                </button>
              </div>
            )
          )}
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
