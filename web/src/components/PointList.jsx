import { useMemo, useState } from 'react'
import { STATUSES } from '../constants'
import { distanceMeters, formatDistance } from '../lib/geo'

export default function PointList({ points, categories, location, onSelect }) {
  const [text, setText] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  const filtered = useMemo(() => {
    let list = points
    if (text) {
      const t = text.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(t) ||
          (p.description || '').toLowerCase().includes(t)
      )
    }
    if (category) list = list.filter((p) => p.category === category)
    if (status) list = list.filter((p) => p.status === status)
    const withDist = list.map((p) => ({
      ...p,
      _dist: location ? distanceMeters(location, p) : null,
    }))
    if (location) withDist.sort((a, b) => a._dist - b._dist)
    else withDist.sort((a, b) => a.name.localeCompare(b.name))
    return withDist
  }, [points, text, category, status, location])

  return (
    <div className="list-page">
      <div className="filters">
        <input
          placeholder="Cerca per nome o descrizione…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="filter-row">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Tutte le categorie</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Ogni stato</option>
            {Object.entries(STATUSES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {filtered.length === 0 && <p className="muted center-text">Nessun punto trovato.</p>}
      <ul className="point-list">
        {filtered.map((p) => (
          <li key={p.id} onClick={() => onSelect(p)}>
            <span className="cat-emoji">{catMap[p.category]?.emoji || '📍'}</span>
            <div className="point-info">
              <strong>{p.name}</strong>
              <span className="muted small">
                {catMap[p.category]?.label || p.category}
                {p._dist != null && ` · ${formatDistance(p._dist)}`}
              </span>
            </div>
            <span
              className="status-chip"
              style={{ background: STATUSES[p.status]?.color || STATUSES.unknown.color }}
            >
              {STATUSES[p.status]?.label || '?'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
