import { useState } from 'react'
import { logout, useAuth } from './hooks/useAuth'
import { useCategories, useGeolocation, usePoints } from './hooks/useData'
import { useTheme } from './hooks/useTheme'
import { useLocationPref } from './hooks/useLocationPref'
import AuthGate from './components/AuthGate'
import MapView from './components/MapView'
import PointList from './components/PointList'
import PointDetail from './components/PointDetail'
import SuggestionForm from './components/SuggestionForm'
import SuggestionsTab from './components/SuggestionsTab'
import MoreTab from './components/MoreTab'
import UpdateBanner from './components/UpdateBanner'

// Icone SVG (stroke = currentColor: seguono il colore attivo/inattivo della tab)
const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}
const TAB_ICONS = {
  map: (
    <svg {...svgProps}>
      <path d="M9 3 3.6 5.2a1 1 0 0 0-.6.9v13.1a.6.6 0 0 0 .8.5L9 18l6 3 5.4-2.2a1 1 0 0 0 .6-.9V4.8a.6.6 0 0 0-.8-.5L15 6 9 3Z" />
      <path d="M9 3v15" />
      <path d="M15 6v15" />
    </svg>
  ),
  list: (
    <svg {...svgProps}>
      <circle cx="10.5" cy="10.5" r="7" />
      <path d="m21 21-5.2-5.2" />
    </svg>
  ),
  suggestions: (
    <svg {...svgProps}>
      <path d="M22 12h-5l-2 3h-6l-2-3H2" />
      <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1Z" />
    </svg>
  ),
  more: (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1.5v3M12 19.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M1.5 12h3M19.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" />
    </svg>
  ),
}

const TABS = [
  { id: 'map', label: 'Mappa' },
  { id: 'list', label: 'Elenco' },
  { id: 'suggestions', label: 'Proposte' },
  { id: 'more', label: 'Altro' },
]

export default function App() {
  const { user, profile, loading, isAdmin, approved } = useAuth()
  const themeState = useTheme() // applica data-theme sull'<html> anche prima del login

  if (loading) return <div className="center-page">Caricamento…</div>
  if (!user) return <AuthGate />
  if (!approved) return <PendingScreen profile={profile} />
  return <Shell user={user} profile={profile} isAdmin={isAdmin} themeState={themeState} />
}

// Whitelist: account registrato ma non ancora approvato da un admin.
// Il profilo è ascoltato in realtime: appena l'admin accetta, si sblocca da solo.
function PendingScreen({ profile }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo-drop">💧</div>
        <h1>Fontanelle</h1>
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

function Shell({ user, profile, isAdmin, themeState }) {
  const [tab, setTab] = useState('map')
  const points = usePoints()
  const categories = useCategories()
  const locationPref = useLocationPref()
  const { location, status: geoStatus, request: requestLocation } = useGeolocation(locationPref.enabled)
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
            theme={themeState.effective}
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
          <MoreTab
            user={user}
            profile={profile}
            isAdmin={isAdmin}
            categories={categories}
            theme={themeState.theme}
            onSetTheme={themeState.setTheme}
            locationEnabled={locationPref.enabled}
            onSetLocationEnabled={locationPref.setEnabled}
          />
        )}
      </main>

      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{TAB_ICONS[t.id]}</span>
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
