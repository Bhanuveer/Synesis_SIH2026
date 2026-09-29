import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Drill, Ruler, Layers3, ShieldAlert, MapPin, History, Lightbulb, Bell } from 'lucide-react'
import { api } from '../api/client'
import { useSimulationContext } from '../api/SimulationContext'
import RiskBadge from '../components/RiskBadge'
import StatCard from '../components/StatCard'

export default function DecisionSupport() {
  const { state, connected } = useSimulationContext()
  const [alerts, setAlerts] = useState([])
  const [wellMeta, setWellMeta] = useState(null)

  useEffect(() => {
    api.listAlerts().then(setAlerts).catch(() => {})
    api.getActiveWell().then((d) => setWellMeta(d.well)).catch(() => {})
  }, [])

  useEffect(() => {
    if (state?.new_alert) {
      api.listAlerts().then(setAlerts).catch(() => {})
    }
  }, [state])

  const depth = state?.depth
  const formation = state?.formation ?? '—'
  const risk = state?.risk
  const nearby = state?.nearby_wells ?? []

  const RISK_COLOR = { Normal: '#0f7a4f', Low: '#a05a00', Medium: '#b8460e', High: '#c01e3a' }

  return (
    <div>
      <h1>Decision Support</h1>
      <p className="muted">
        Landing view — everything the on-duty engineer needs at a glance.{' '}
        {!connected && <span style={{ color: '#c2410c' }}>Connecting to live eRTMAC stream…</span>}
      </p>

      <div className="grid grid-4" style={{ marginTop: 16 }}>
        <StatCard icon={Drill} color="#1d4ed8" label="Active well" value={wellMeta?.name ?? '—'} sub={wellMeta?.reservoir} />
        <StatCard icon={Ruler} color="#0891b2" label="Current depth"
          value={typeof depth === 'number' ? `${depth.toFixed(0)} m` : '—'}
          sub={`of ${wellMeta?.total_depth ?? '—'} m planned TD`} />
        <StatCard icon={Layers3} color="#7c3aed" label="Current formation" value={formation} sub="auto-detected from depth" />
        <StatCard icon={ShieldAlert} color={RISK_COLOR[risk?.level ?? 'Normal']} label="Current risk"
          value={<RiskBadge level={risk?.level ?? 'Normal'} size="lg" />}
          sub={risk?.risk_type ?? 'Normal'} />
      </div>

      <div className="grid grid-2" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="card-title"><MapPin size={13} strokeWidth={1.8} /> Nearby wells (within default 25 km)</div>
          {nearby.length === 0 && <p className="muted">No nearby wells loaded yet — open Nearby Wells page.</p>}
          <ul className="list-plain">
            {nearby.map((w) => (
              <li key={w.name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{w.name}</span>
                <span className="muted">{w.distance_km} km</span>
              </li>
            ))}
          </ul>
          <Link to="/nearby-wells" className="small">Open Nearby Wells →</Link>
        </div>

        <div className="card">
          <div className="card-title"><History size={13} strokeWidth={1.8} /> Historical evidence</div>
          {(!risk?.offset_evidence || risk.offset_evidence.length === 0) && (
            <p className="muted">No matching offset evidence for the current depth/formation right now.</p>
          )}
          <ul className="list-plain">
            {risk?.offset_evidence?.map((e, i) => (
              <li key={i}>
                <strong>{e.well}</strong> — {e.event_type} at {e.depth} m ({e.distance_km} km away)
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="card-title"><Lightbulb size={13} strokeWidth={1.8} /> Recommendation</div>
          <p style={{ margin: 0 }}>{risk?.recommendation ?? 'Continue normal monitoring cadence.'}</p>
          {risk?.rules?.length > 0 && (
            <div className="small muted" style={{ marginTop: 6 }}>Rule check: {risk.rules.map((r) => r.detail).join(' ')}</div>
          )}
        </div>
        <div className="card">
          <div className="card-title"><Bell size={13} strokeWidth={1.8} /> Recent alerts</div>
          {alerts.length === 0 && <p className="muted">No alerts yet.</p>}
          <ul className="list-plain">
            {alerts.slice(0, 5).map((a) => (
              <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RiskBadge level={a.level} /> {a.risk_type} @ {a.depth} m — {a.formation}
              </li>
            ))}
          </ul>
          <Link to="/alerts" className="small">Open Alerts & Feedback →</Link>
        </div>
      </div>
    </div>
  )
}
