import { useState } from 'react'
import { Search } from 'lucide-react'
import { api } from '../api/client'
import { EventTag } from '../components/RiskBadge'

const SAMPLES = [
  'What happened in nearby wells around this depth?',
  'Any mud loss events near 2800 m?',
  'Show torque spike history in WELL-09',
  'What happened in Tipam formation nearby?',
]

export default function Query() {
  const [text, setText] = useState('')
  const [radius, setRadius] = useState(25)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function runQuery(q) {
    const query = q ?? text
    if (!query.trim()) return
    setText(query)
    setLoading(true)
    try {
      const res = await api.runQuery(query, radius)
      setResult(res)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>Query</h1>
      <p className="muted">Institutional-memory search — regex + keyword dictionary + TF-IDF over well history and the knowledge repository. No LLM.</p>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} strokeWidth={1.8} color="#a1a1aa" style={{ position: 'absolute', left: 10, top: 9 }} />
            <input
              className="input"
              style={{ width: '100%', paddingLeft: 30 }}
              placeholder='e.g. "What happened in nearby wells around this depth?"'
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runQuery()}
            />
          </div>
          <input className="input" style={{ width: 90 }} type="number" value={radius} onChange={(e) => setRadius(parseFloat(e.target.value) || 25)} title="radius km for 'nearby'" />
          <button className="btn" onClick={() => runQuery()} disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
        </div>
        <div className="small muted pill-btn-row" style={{ marginTop: 10 }}>
          {SAMPLES.map((s) => (
            <button key={s} className="btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => runQuery(s)}>{s}</button>
          ))}
        </div>
      </div>

      {result && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-title">Resolved context</div>
          <div className="small pill-btn-row">
            {Object.entries(result.resolved_context).map(([k, v]) => (
              <span key={k} className="badge badge-gray">{k}: {String(v ?? '—')}</span>
            ))}
          </div>

          <div className="card-title" style={{ marginTop: 16 }}>Results ({result.results.length})</div>
          {result.results.length === 0 && <p className="muted">No matching evidence found.</p>}
          <ul className="list-plain">
            {result.results.map((r, i) => (
              <li key={i}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <EventTag type={r.event_type} />
                  <strong>{r.well}</strong>
                  <span className="muted small">{r.formation} @ {r.depth} m</span>
                  <span className="badge badge-gray">score {r.score}</span>
                  {r.source === 'knowledge_repository' && <span className="badge badge-blue">from knowledge repo</span>}
                </div>
                <div className="small muted">{r.description}</div>
                {r.mitigation && <div className="small">Mitigation: {r.mitigation}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
