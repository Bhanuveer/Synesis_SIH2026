import { useEffect, useMemo, useState } from 'react'
import { Layers3 } from 'lucide-react'
import { api } from '../api/client'
import { EVENT_COLORS } from '../components/RiskBadge'

const FORMATION_COLORS = {
  Girujan: '#dbeafe',
  Tipam: '#dcfce7',
  Barail: '#fef3c7',
  Kopili: '#fce7f3',
}

const COLUMN_HEIGHT = 560

export default function WellCorrelation() {
  const [allWells, setAllWells] = useState([])
  const [selected, setSelected] = useState([])
  const [data, setData] = useState(null)

  useEffect(() => {
    api.getWells().then((wells) => {
      setAllWells(wells)
      const offsets = wells.filter((w) => !w.is_active).map((w) => w.name)
      setSelected(offsets.slice(0, 3).length ? ['WELL-04', 'WELL-07', 'WELL-09'].filter((n) => offsets.includes(n)) : offsets.slice(0, 3))
    })
  }, [])

  useEffect(() => {
    if (selected.length === 0) { setData(null); return }
    api.getCorrelation(selected).then(setData).catch(() => {})
  }, [selected])

  const maxDepth = useMemo(() => {
    if (!data) return 4000
    return Math.max(...data.wells.map((w) => w.total_depth))
  }, [data])

  function toggleWell(name) {
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name)
      if (prev.length >= 5) return prev
      return [...prev, name]
    })
  }

  const offsetWellNames = allWells.filter((w) => !w.is_active).map((w) => w.name)

  return (
    <div>
      <h1>Well Correlation</h1>
      <p className="muted">Active well and 3–5 selected offset wells, formation tops aligned on a shared depth scale.</p>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">Select 3–5 offset wells</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {offsetWellNames.map((name) => (
            <button
              key={name}
              className={selected.includes(name) ? 'btn' : 'btn-outline'}
              onClick={() => toggleWell(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {data && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-title"><Layers3 size={13} strokeWidth={1.8} /> Correlation panel — depth scale 0 to {maxDepth} m</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 60, height: COLUMN_HEIGHT, position: 'relative' }}>
              {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                <div key={f} className="small muted" style={{ position: 'absolute', top: `${f * 100}%`, transform: 'translateY(-50%)' }}>
                  {Math.round(maxDepth * f)} m
                </div>
              ))}
            </div>
            {data.wells.map((w) => (
              <WellColumn key={w.name} well={w} maxDepth={maxDepth} activeDepth={data.active_depth} isActive={w.is_active} />
            ))}
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <Legend title="Formations" colorMap={FORMATION_COLORS} />
            <Legend title="Events" colorMap={EVENT_COLORS} />
          </div>
        </div>
      )}
    </div>
  )
}

function WellColumn({ well, maxDepth, activeDepth, isActive }) {
  return (
    <div style={{ flex: 1, minWidth: 90 }}>
      <div style={{ textAlign: 'center', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>
        {well.name} {isActive && <span className="badge badge-blue" style={{ fontSize: 10 }}>ACTIVE</span>}
      </div>
      <div style={{ position: 'relative', height: COLUMN_HEIGHT, border: '1px solid var(--color-border)', borderRadius: 6, overflow: 'hidden' }}>
        {well.formation_tops.map((f) => {
          const top = (f.top / maxDepth) * 100
          const height = ((f.bottom - f.top) / maxDepth) * 100
          return (
            <div
              key={f.formation}
              title={`${f.formation} ${f.top}-${f.bottom} m`}
              style={{
                position: 'absolute', top: `${top}%`, height: `${height}%`, width: '100%',
                background: FORMATION_COLORS[f.formation] || '#eee',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#3f3f46', borderTop: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              {f.formation}
            </div>
          )
        })}

        {isActive && (
          <div
            title={`Current depth ${activeDepth} m`}
            style={{ position: 'absolute', top: `${(activeDepth / maxDepth) * 100}%`, width: '100%', borderTop: '2px dashed #4f46e5', zIndex: 5 }}
          />
        )}

        {well.historical_events.map((e, i) => (
          <div
            key={i}
            title={`${e.event_type} @ ${e.depth} m — ${e.description}`}
            style={{
              position: 'absolute', top: `${(e.depth / maxDepth) * 100}%`, left: 4, right: 4,
              height: 5, borderRadius: 2, background: EVENT_COLORS[e.event_type] || '#333',
              transform: 'translateY(-50%)', zIndex: 4,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function Legend({ title, colorMap }) {
  return (
    <div>
      <div className="small muted" style={{ marginBottom: 4 }}>{title}</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {Object.entries(colorMap).map(([k, c]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <span style={{ width: 11, height: 11, background: c, display: 'inline-block', borderRadius: 3, border: '1px solid rgba(0,0,0,0.1)' }} /> {k}
          </div>
        ))}
      </div>
    </div>
  )
}
