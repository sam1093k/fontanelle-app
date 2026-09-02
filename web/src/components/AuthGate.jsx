import { useState } from 'react'
import { login, resetPassword, signup } from '../hooks/useAuth'
import PrivacyPolicy from './PrivacyPolicy'

const RESET_NOTICE =
  'Se l’indirizzo è registrato, riceverai un’email con le istruzioni per reimpostare la password. Controlla anche lo spam.'

export default function AuthGate() {
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [consent, setConsent] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  function switchMode(next) {
    setMode(next)
    setError('')
    setNotice('')
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    try {
      if (mode === 'signup') {
        if (displayName.trim().length < 1) throw new Error('Inserisci un nome')
        if (!consent) throw new Error('Devi accettare l’informativa privacy per registrarti')
        await signup(email, password, displayName.trim())
      } else if (mode === 'reset') {
        await resetPassword(email.trim())
        setNotice(RESET_NOTICE)
        setMode('login')
      } else {
        await login(email, password)
      }
    } catch (err) {
      // In modalità reset non riveliamo se un'email è registrata o no:
      // per un indirizzo sconosciuto Firebase risponde comunque "ok".
      if (mode === 'reset' && err.code === 'auth/user-not-found') {
        setNotice(RESET_NOTICE)
        setMode('login')
      } else {
        const messages = {
          'auth/invalid-credential': 'Email o password errati',
          'auth/email-already-in-use': 'Email già registrata',
          'auth/weak-password': 'Password troppo debole (min 6 caratteri)',
          'auth/invalid-email': 'Email non valida',
          'auth/missing-email': 'Inserisci la tua email',
          'auth/too-many-requests': 'Troppi tentativi. Riprova tra qualche minuto.',
          'auth/network-request-failed': 'Connessione assente o instabile',
          'auth/firebase-app-check-token-is-invalid': 'Verifica anti-bot fallita: ricarica la pagina',
          'auth/internal-error': 'Errore interno di Firebase. Riprova.',
        }
        setError(messages[err.code] || `${err.message}${err.code ? ` (${err.code})` : ''}`)
      }
    } finally {
      setBusy(false)
    }
  }

  const submitLabel = { login: 'Accedi', signup: 'Registrati', reset: 'Invia link di reset' }[mode]

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo-drop">💧</div>
        <h1>Fontanelle</h1>
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
          {mode !== 'reset' && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
          {mode === 'signup' && (
            <label className="consent-row small">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                Ho letto e accetto l'{' '}
                <button type="button" className="link inline" onClick={() => setShowPrivacy(true)}>
                  informativa privacy
                </button>
              </span>
            </label>
          )}
          {mode === 'login' && (
            <button type="button" className="forgot" onClick={() => switchMode('reset')}>
              Password dimenticata?
            </button>
          )}
          {mode === 'reset' && (
            <p className="muted small" style={{ textAlign: 'left' }}>
              Inserisci la tua email: ti invieremo un link per scegliere una nuova password.
            </p>
          )}
          {notice && <p className="success">{notice}</p>}
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>
            {submitLabel}
          </button>
        </form>
        {mode === 'reset' ? (
          <button className="link" onClick={() => switchMode('login')}>
            ← Torna all’accesso
          </button>
        ) : (
          <button className="link" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
          </button>
        )}
      </div>
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
    </div>
  )
}
