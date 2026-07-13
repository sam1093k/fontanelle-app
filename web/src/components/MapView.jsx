import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { STATUSES } from '../constants'
import { GEO_DENIED_HELP } from '../hooks/useData'

const TILE_URL = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
}

export default function MapView({
  points,
  categories,
  location,
  geoStatus,
  theme,
  onRequestLocation,
  onSelect,
  onPickConfirm,
}) {
  const elRef = useRef(null)
  const mapObj = useRef(null)
  const tilesRef = useRef(null)
  const markersRef = useRef(new Map())
  const meMarkerRef = useRef(null)
  const pickMarkerRef = useRef(null)
  const centeredOnceRef = useRef(false)

  const [picking, setPicking] = useState(false)
  const [pickPos, setPickPos] = useState(null)
  const [showGeoHelp, setShowGeoHelp] = useState(false)
  const pickingRef = useRef(false)
  pickingRef.current = picking

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  useEffect(() => {
    const map = L.map(elRef.current, { zoomControl: false }).setView([42.5, 12.5], 6)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    // Tile Carto (gratuite, retina, con variante scura secondo il tema scelto in Altro).
    const tiles = L.tileLayer(TILE_URL[theme] || TILE_URL.light, {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map)
    tilesRef.current = tiles
    map.on('click', (e) => {
      if (!pickingRef.current) return
      setPickPos({ lat: e.latlng.lat, lng: e.latlng.lng })
    })
    mapObj.current = map
    return () => {
      map.remove()
      mapObj.current = null
      tilesRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Cambia i tile quando l'utente cambia tema da Altro > Aspetto.
  useEffect(() => {
    tilesRef.current?.setUrl(TILE_URL[theme] || TILE_URL.light)
  }, [theme])

  // Sincronizza i marker con i punti (realtime).
  useEffect(() => {
    const map = mapObj.current
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
        existing.off('click').on('click', () => {
          if (!pickingRef.current) onSelect(p)
        })
      } else {
        const m = L.marker([p.lat, p.lng], { icon }).addTo(map)
        m.on('click', () => {
          if (!pickingRef.current) onSelect(p)
        })
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
    const map = mapObj.current
    if (!map || !location) return
    if (!meMarkerRef.current) {
      const meIcon = L.divIcon({
        className: 'me-marker',
        html: '<div class="me-dot"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      })
      meMarkerRef.current = L.marker([location.lat, location.lng], {
        icon: meIcon,
        interactive: false,
        zIndexOffset: 500,
      }).addTo(map)
    } else {
      meMarkerRef.current.setLatLng([location.lat, location.lng])
    }
    if (!centeredOnceRef.current) {
      centeredOnceRef.current = true
      map.setView([location.lat, location.lng], 15)
    }
  }, [location])

  // Puntina della posizione scelta in modalità selezione.
  useEffect(() => {
    const map = mapObj.current
    if (!map) return
    if (picking && pickPos) {
      const icon = L.divIcon({
        className: 'poi-icon',
        html: '<div class="pick-pin">📍</div>',
        iconSize: [40, 40],
        iconAnchor: [20, 36],
      })
      if (!pickMarkerRef.current) {
        pickMarkerRef.current = L.marker([pickPos.lat, pickPos.lng], { icon, zIndexOffset: 1000 }).addTo(map)
      } else {
        pickMarkerRef.current.setLatLng([pickPos.lat, pickPos.lng])
      }
    } else if (pickMarkerRef.current) {
      pickMarkerRef.current.remove()
      pickMarkerRef.current = null
    }
  }, [picking, pickPos])

  function confirmPick(coords) {
    setPicking(false)
    setPickPos(null)
    onPickConfirm(coords)
  }

  function cancelPick() {
    setPicking(false)
    setPickPos(null)
  }

  function handleLocate() {
    if (location) {
      mapObj.current?.setView([location.lat, location.lng], 16)
    } else if (geoStatus === 'denied') {
      setShowGeoHelp(true)
    } else {
      onRequestLocation()
    }
  }

  return (
    <div className="map-wrap">
      <div ref={elRef} className="map" />

      {picking && (
        <div className="pick-banner">
          <span>{pickPos ? 'Confermi questa posizione?' : 'Tocca la mappa nel punto esatto'}</span>
          <div className="pick-actions">
            {pickPos && (
              <button className="pick-btn confirm" onClick={() => confirmPick(pickPos)}>
                ✅ Conferma qui
              </button>
            )}
            <button
              className="pick-btn"
              onClick={() => {
                if (location) confirmPick(location)
                else if (geoStatus === 'denied') setShowGeoHelp(true)
                else onRequestLocation()
              }}
            >
              📍 Usa la mia posizione
            </button>
            <button className="pick-btn cancel" onClick={cancelPick}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {!picking && (
        <button
          className="fab"
          title="Proponi un nuovo punto"
          onClick={() => {
            setPickPos(null)
            setPicking(true)
          }}
        >
          ＋
        </button>
      )}

      <button
        className="locate-btn"
        title={location ? 'Vai alla mia posizione' : 'Attiva la posizione'}
        onClick={handleLocate}
      >
        {location ? '🎯' : geoStatus === 'prompting' ? '⏳' : '📡'}
      </button>

      {showGeoHelp && (
        <div className="geo-help">
          <p>{GEO_DENIED_HELP}</p>
          <button className="button" onClick={() => setShowGeoHelp(false)}>
            Ho capito
          </button>
        </div>
      )}
    </div>
  )
}
