import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const activeIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#1d4ed8;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.25)"></div>',
  iconSize: [14, 14],
})
const nearbyIcon = (selected) => new L.DivIcon({
  className: '',
  html: `<div style="width:11px;height:11px;border-radius:50%;background:${selected ? '#b91c1c' : '#71717a'};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.2)"></div>`,
  iconSize: [11, 11],
})

function FallbackGrid({ activeWell, wells, radiusKm, onSelectWell, selectedWellName }) {
  const points = useMemo(() => {
    const all = [activeWell, ...wells]
    const lats = all.map((w) => w.lat)
    const lons = all.map((w) => w.lon)
    const pad = 0.08
    const minLat = Math.min(...lats) - pad, maxLat = Math.max(...lats) + pad
    const minLon = Math.min(...lons) - pad, maxLon = Math.max(...lons) + pad
    const toXY = (lat, lon) => ({
      x: ((lon - minLon) / (maxLon - minLon)) * 100,
      y: (1 - (lat - minLat) / (maxLat - minLat)) * 100,
    })
    return { active: toXY(activeWell.lat, activeWell.lon), wells: wells.map((w) => ({ ...w, ...toXY(w.lat, w.lon) })) }
  }, [activeWell, wells])

  return (
    <div className="map-fallback">
      <div className="small muted" style={{ position: 'absolute', top: 6, left: 8, zIndex: 2 }}>
        Offline grid map (tiles unavailable) — radius {radiusKm} km
      </div>
      <div className="map-marker" style={{ left: `${points.active.x}%`, top: `${points.active.y}%`, zIndex: 3 }}>
        <div className="dot" style={{ background: '#1d4ed8', width: 14, height: 14 }} />
        <div className="label">{activeWell.name}</div>
      </div>
      {points.wells.map((w) => (
        <div
          key={w.name}
          className="map-marker"
          style={{ left: `${w.x}%`, top: `${w.y}%`, zIndex: 2 }}
          onClick={() => onSelectWell?.(w.name)}
        >
          <div className="dot" style={{ background: w.name === selectedWellName ? '#b91c1c' : '#71717a' }} />
          <div className="label">{w.name} · {w.distance_km} km</div>
        </div>
      ))}
    </div>
  )
}

export default function WellMap({ activeWell, wells, radiusKm, onSelectWell, selectedWellName }) {
  const [tileFailed, setTileFailed] = useState(false)
  const [failCount, setFailCount] = useState(0)

  if (!activeWell) return <div className="map-fallback" />

  if (tileFailed) {
    return (
      <FallbackGrid
        activeWell={activeWell}
        wells={wells}
        radiusKm={radiusKm}
        onSelectWell={onSelectWell}
        selectedWellName={selectedWellName}
      />
    )
  }

  return (
    <MapContainer center={[activeWell.lat, activeWell.lon]} zoom={10} scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        eventHandlers={{
          tileerror: () => {
            setFailCount((c) => {
              const next = c + 1
              if (next >= 4) setTileFailed(true)
              return next
            })
          },
        }}
      />
      <Circle
        center={[activeWell.lat, activeWell.lon]}
        radius={radiusKm * 1000}
        pathOptions={{ color: '#1d4ed8', fillColor: '#1d4ed8', fillOpacity: 0.05, weight: 1.5 }}
      />
      <Marker position={[activeWell.lat, activeWell.lon]} icon={activeIcon}>
        <Popup>{activeWell.name} (active)</Popup>
      </Marker>
      {wells.map((w) => (
        <Marker
          key={w.name}
          position={[w.lat, w.lon]}
          icon={nearbyIcon(w.name === selectedWellName)}
          eventHandlers={{ click: () => onSelectWell?.(w.name) }}
        >
          <Popup>{w.name} — {w.distance_km} km</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
