import { useState } from 'react'
import { login, signup } from '../hooks/useAuth'

export default function AuthGate() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'signup') {
        if (displayName.trim().length < 1) throw new Error('Inserisci un nome')
        await signup(email, password, displayName.trim())
      } else {
        await login(email, password)
      }
    } catch (err) {
      const messages = {
        'auth/invalid-credential': 'Email o password errati',
        'auth/email-already-in-use': 'Email già registrata',
        'auth/weak-password': 'Password troppo debole (min 6 caratteri)',
        'auth/invalid-email': 'Email non valida',
      }
      setError(messages[err.code] || err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>💧 Fontanelle</h1>
        <p className="muted">Mappa privata dei punti di interesse</p>
        <form onSubmit={submit}>
          {mode === 'signup' && (
            <input
              placeholder="Il tuo nome"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>
            {mode === 'login' ? 'Accedi' : 'Registrati'}
          </button>
        </form>
        <button className="link" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
        </button>
      </div>
    </div>
  )
}
