import { useEffect, useState } from 'react'
import { Radar, MapPin } from 'lucide-react'
import { api } from '../api/client'
import WellMap from '../components/WellMap'
import { EventTag } from '../components/RiskBadge'

const PRESETS = [10, 25, 50]

export default function NearbyWells() {
  const [radius, setRadius] = useState(25)
  const [customRadius, setCustomRadius] = useState('')
  const [activeWell, setActiveWell] = useState(null)
  const [wells, setWells] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api.getActiveWell().then((d) => setActiveWell(d.well)).catch(() => {})
  }, [])

  useEffect(() => {
    api.getNearbyWells(radius).then(setWells).catch(() => {})
  }, [radius])

  const selectedWell = wells.find((w) => w.name === selected)

  return (
    <div>
      <h1>Nearby Wells</h1>
      <p className="muted">Offset wells around the active well, filtered by radius.</p>

      <div className="card" style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}><Radar size={14} strokeWidth={1.8} /> Radius:</span>
        {PRESETS.map((p) => (
          <button key={p} className={'btn-outline' + (radius === p ? ' active' : '')} onClick={() => { setRadius(p); setCustomRadius('') }}>
            {p} km
          </button>
        ))}
        <input
          className="input"
          style={{ width: 130 }}
          type="number"
          placeholder="custom km"
          value={customRadius}
          onChange={(e) => {
            setCustomRadius(e.target.value)
            const v = parseFloat(e.target.value)
            if (v > 0) setRadius(v)
          }}
        />
        <span className="muted small" style={{ marginLeft: 'auto' }}>{wells.length} well(s) within {radius} km</span>
      </div>

      <div className="grid grid-2" style={{ marginTop: 12, height: 480 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <WellMap
            activeWell={activeWell}
            wells={wells}
            radiusKm={radius}
            onSelectWell={setSelected}
            selectedWellName={selected}
          />
        </div>

        <div className="card scroll-thin" style={{ overflowY: 'auto' }}>
          <div className="card-title"><MapPin size={13} strokeWidth={1.8} /> Well detail</div>
          {!selectedWell && <p className="muted">Click a well on the map, or a row below, to see details.</p>}
          {selectedWell && (
            <div>
              <h2>{selectedWell.name}</h2>
              <p className="small muted">{selectedWell.distance_km} km from active well · {selectedWell.reservoir} · TD {selectedWell.total_depth} m</p>

              <h4 style={{ marginTop: 14 }}>Formation tops</h4>
              <table>
                <thead><tr><th>Formation</th><th>Top (m)</th><th>Bottom (m)</th></tr></thead>
                <tbody>
                  {selectedWell.formation_tops.map((f) => (
                    <tr key={f.formation}><td>{f.formation}</td><td>{f.top}</td><td>{f.bottom}</td></tr>
                  ))}
                </tbody>
              </table>

              <h4 style={{ marginTop: 14 }}>Historical events</h4>
              {selectedWell.historical_events.length === 0 && <p className="muted small">No recorded events.</p>}
              <ul className="list-plain">
                {selectedWell.historical_events.map((e, i) => (
                  <li key={i}>
                    <EventTag type={e.event_type} /> {e.formation} @ {e.depth} m
                    <div className="small muted">{e.description}</div>
                  </li>
                ))}
              </ul>

              <h4 style={{ marginTop: 14 }}>Lessons & mitigation</h4>
              <ul className="list-plain">
                {selectedWell.lessons.map((l, i) => <li key={i}>{l}</li>)}
                {selectedWell.mitigation_measures.map((m, i) => (
                  <li key={`m${i}`}><strong>{m.event_type}:</strong> {m.measure}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-title">All nearby wells</div>
        <table>
          <thead><tr><th>Well</th><th>Distance</th><th>Reservoir</th><th>TD</th><th></th></tr></thead>
          <tbody>
            {wells.map((w) => (
              <tr key={w.name}>
                <td>{w.name}</td>
                <td>{w.distance_km} km</td>
                <td>{w.reservoir}</td>
                <td>{w.total_depth} m</td>
                <td><button className="btn-outline" onClick={() => setSelected(w.name)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
