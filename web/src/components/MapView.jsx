import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { STATUSES } from '../constants'

export default function MapView({ points, categories, location, onSelect, onPropose, mapRef }) {
  const elRef = useRef(null)
  const leafletRef = useRef(null)
  const markersRef = useRef(new Map())
  const meMarkerRef = useRef(null)
  const centeredOnceRef = useRef(false)

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  useEffect(() => {
    const map = L.map(elRef.current, { zoomControl: false }).setView([42.5, 12.5], 6)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    leafletRef.current = map
    if (mapRef) mapRef.current = map
    return () => {
      map.remove()
      if (mapRef) mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sincronizza i marker con i punti (realtime).
  useEffect(() => {
    const map = leafletRef.current
    if (!map) return
    const seen = new Set()
    for (const p of points) {
      seen.add(p.id)
      const emoji = catMap[p.category]?.emoji || '📍'
      const color = STATUSES[p.status]?.color || STATUSES.unknown.color
      const icon = L.divIcon({
        className: 'poi-icon',
        html: `<div class="pin" style="border-color:${color}">${emoji}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })
      const existing = markersRef.current.get(p.id)
      if (existing) {
        existing.setLatLng([p.lat, p.lng]).setIcon(icon)
        existing.off('click').on('click', () => onSelect(p))
      } else {
        const m = L.marker([p.lat, p.lng], { icon }).addTo(map)
        m.on('click', () => onSelect(p))
        markersRef.current.set(p.id, m)
      }
    }
    for (const [id, m] of markersRef.current) {
      if (!seen.has(id)) {
        m.remove()
        markersRef.current.delete(id)
      }
    }
  }, [points, categories]) // eslint-disable-line react-hooks/exhaustive-deps

  // Marker della posizione utente + centratura al primo fix.
  useEffect(() => {
    const map = leafletRef.current
    if (!map || !location) return
    if (!meMarkerRef.current) {
      meMarkerRef.current = L.circleMarker([location.lat, location.lng], {
        radius: 8,
        color: '#fff',
        weight: 2,
        fillColor: '#2563eb',
        fillOpacity: 1,
      }).addTo(map)
    } else {
      meMarkerRef.current.setLatLng([location.lat, location.lng])
    }
    if (!centeredOnceRef.current) {
      centeredOnceRef.current = true
      map.setView([location.lat, location.lng], 15)
    }
  }, [location])

  return (
    <div className="map-wrap">
      <div ref={elRef} className="map" />
      <button
        className="fab"
        title="Proponi un nuovo punto (al centro della mappa)"
        onClick={() => {
          const c = leafletRef.current?.getCenter()
          if (c) onPropose({ lat: c.lat, lng: c.lng })
        }}
      >
        ＋
      </button>
      {location && (
        <button
          className="locate-btn"
          title="Vai alla mia posizione"
          onClick={() => leafletRef.current?.setView([location.lat, location.lng], 16)}
        >
          🎯
        </button>
      )}
    </div>
  )
}
