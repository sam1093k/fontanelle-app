import { useState } from 'react'
import { logout, useAuth } from './hooks/useAuth'
import { useCategories, useGeolocation, usePoints } from './hooks/useData'
import AuthGate from './components/AuthGate'
import MapView from './components/MapView'
import PointList from './components/PointList'
import PointDetail from './components/PointDetail'
import SuggestionForm from './components/SuggestionForm'
import SuggestionsTab from './components/SuggestionsTab'
import MoreTab from './components/MoreTab'
import UpdateBanner from './components/UpdateBanner'

const TABS = [
  { id: 'map', label: 'Mappa', icon: '🗺️' },
  { id: 'list', label: 'Elenco', icon: '📋' },
  { id: 'suggestions', label: 'Proposte', icon: '📨' },
  { id: 'more', label: 'Altro', icon: '⚙️' },
]

export default function App() {
  const { user, profile, loading, isAdmin, approved } = useAuth()

  if (loading) return <div className="center-page">Caricamento…</div>
  if (!user) return <AuthGate />
  if (!approved) return <PendingScreen profile={profile} />
  return <Shell user={user} profile={profile} isAdmin={isAdmin} />
}

// Whitelist: account registrato ma non ancora approvato da un admin.
// Il profilo è ascoltato in realtime: appena l'admin accetta, si sblocca da solo.
function PendingScreen({ profile }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>💧 Fontanelle</h1>
        {profile?.rejected === true ? (
          <p style={{ marginTop: 16 }}>❌ La tua richiesta di accesso è stata rifiutata.</p>
        ) : (
          <>
            <p style={{ marginTop: 16 }}>⏳ Registrazione ricevuta!</p>
            <p className="muted" style={{ marginTop: 8 }}>
              Un amministratore deve approvare il tuo account. Questa schermata si sbloccherà
              automaticamente appena verrai accettato.
            </p>
          </>
        )}
        <button className="button secondary" onClick={logout}>
          Esci
        </button>
      </div>
    </div>
  )
}

function Shell({ user, profile, isAdmin }) {
  const [tab, setTab] = useState('map')
  const points = usePoints()
  const categories = useCategories()
  const { location, status: geoStatus, request: requestLocation } = useGeolocation()
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(null) // {type:'add', coords} | {type:'edit', point}

  // Il punto selezionato va riletto dai dati live (potrebbe cambiare in realtime).
  const selectedLive = selected ? points.find((p) => p.id === selected.id) : null

  return (
    <div className="app">
      <UpdateBanner />

      <main className="content">
        {tab === 'map' && (
          <MapView
            points={points}
            categories={categories}
            location={location}
            geoStatus={geoStatus}
            onRequestLocation={requestLocation}
            onSelect={setSelected}
            onPickConfirm={(coords) => setForm({ type: 'add', coords })}
          />
        )}
        {tab === 'list' && (
          <PointList
            points={points}
            categories={categories}
            location={location}
            onSelect={setSelected}
          />
        )}
        {tab === 'suggestions' && (
          <SuggestionsTab user={user} isAdmin={isAdmin} categories={categories} />
        )}
        {tab === 'more' && (
          <MoreTab user={user} profile={profile} isAdmin={isAdmin} categories={categories} />
        )}
      </main>

      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      {selectedLive && (
        <PointDetail
          point={selectedLive}
          categories={categories}
          location={location}
          isAdmin={isAdmin}
          user={user}
          onClose={() => setSelected(null)}
          onProposeEdit={(point) => {
            setSelected(null)
            setForm({ type: 'edit', point })
          }}
        />
      )}

      {form && (
        <SuggestionForm
          mode={form}
          categories={categories}
          user={user}
          location={location}
          geoStatus={geoStatus}
          onRequestLocation={requestLocation}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  )
}
