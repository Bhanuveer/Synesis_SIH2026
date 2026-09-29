import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'
import { Play, Pause, RotateCcw, Brain, ListChecks, History, Lightbulb } from 'lucide-react'
import { useSimulationContext } from '../api/SimulationContext'
import RiskBadge, { EventTag } from '../components/RiskBadge'

const PARAM_UNITS = {
  rop: 'm/hr', wob: 'klbf', torque: 'kN·m', mud_pressure: 'psi',
  flow_out: 'gpm', pit_volume: 'bbl', hookload: 'klbf',
}
const PARAM_LABELS = {
  rop: 'ROP', wob: 'WOB', torque: 'Torque', mud_pressure: 'Mud Pressure',
  flow_out: 'Flow Out', pit_volume: 'Pit Volume', hookload: 'Hookload / Drag',
}

export default function RiskLive() {
  const { state, connected, start, pause, reset, setSpeed } = useSimulationContext()
  const [history, setHistory] = useState([])

  useEffect(() => {
    if (!state) return
    setHistory((prev) => {
      const next = [...prev, { tick: state.tick, depth: state.depth, ...state.params }]
      return next.slice(-80)
    })
  }, [state])

  function handleReset() {
    setHistory([])
    reset()
  }

  const risk = state?.risk

  return (
    <div>
      <h1>Risk & Live eRTMAC</h1>
      <p className="muted">
        Deterministic simulated drilling data stream (seeded — same scenario every run).{' '}
        {!connected && <span style={{ color: '#c2410c' }}>reconnecting…</span>}
      </p>

      <div className="card" style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn" onClick={start} disabled={state?.running}><Play size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Start</button>
        <button className="btn-outline" onClick={pause} disabled={!state?.running}><Pause size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Pause</button>
        <button className="btn-danger" onClick={handleReset}><RotateCcw size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Reset</button>
        <span className="small muted" style={{ marginLeft: 12 }}>Speed:</span>
        {[1, 2, 5].map((v) => (
          <button key={v} className={'btn-outline' + (state?.speed === v ? ' active' : '')} onClick={() => setSpeed(v)}>{v}×</button>
        ))}
        <span className="badge badge-gray mono" style={{ marginLeft: 'auto' }}>
          {state?.depth?.toFixed(0) ?? '—'} m · {state?.formation ?? '—'} · tick {state?.tick ?? 0}
        </span>
      </div>

      <div className="grid grid-2" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="card-title">Current risk</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RiskBadge level={risk?.level ?? 'Normal'} size="lg" />
            {risk?.risk_type && risk.risk_type !== 'Normal' && <EventTag type={risk.risk_type} />}
          </div>
          <p style={{ marginTop: 10, display: 'flex', gap: 6, margin: '10px 0 0' }}>
            <Lightbulb size={14} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 2 }} className="muted" />
            {risk?.recommendation}
          </p>
        </div>
        <div className="card">
          <div className="card-title">Why? — hybrid evidence</div>
          <div className="small" style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', gap: 6 }}><Brain size={14} strokeWidth={1.8} className="muted" style={{ flexShrink: 0, marginTop: 1 }} />
              <span><strong>ML:</strong> predicted "{risk?.ml?.label}" (confidence {(risk?.ml?.confidence * 100 || 0).toFixed(0)}%)</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}><ListChecks size={14} strokeWidth={1.8} className="muted" style={{ flexShrink: 0, marginTop: 1 }} />
              <span><strong>Rule check:</strong> {risk?.rules?.length ? risk.rules.map((r) => r.detail).join(' ') : 'No rule thresholds breached.'}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}><History size={14} strokeWidth={1.8} className="muted" style={{ flexShrink: 0, marginTop: 1 }} />
              <span><strong>Offset evidence:</strong> {risk?.offset_evidence?.length
                ? `${risk.offset_evidence.length} nearby well event(s): ` + risk.offset_evidence.map((e) => `${e.well} (${e.depth} m)`).join(', ')
                : 'No matching offset evidence yet.'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 12 }}>
        <ParamChart title="Depth (m)" data={history} lines={[{ key: 'depth', color: '#4f46e5' }]} />
        <ParamChart
          title="Flow Out (gpm) & Pit Volume (bbl)"
          data={history}
          lines={[{ key: 'flow_out', color: '#0e7490' }, { key: 'pit_volume', color: '#be185d' }]}
        />
        <ParamChart title="Torque (kN·m) & Hookload (klbf)" data={history} lines={[{ key: 'torque', color: '#c2410c' }, { key: 'hookload', color: '#0891b2' }]} />
        <ParamChart title="ROP (m/hr), WOB (klbf), Mud Pressure (psi)" data={history} lines={[{ key: 'rop', color: '#15803d' }, { key: 'wob', color: '#7e22ce' }, { key: 'mud_pressure', color: '#52525b' }]} />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-title">Current drilling parameters</div>
        <div className="grid grid-4">
          {state?.params && Object.entries(state.params).map(([k, v]) => (
            <div key={k}>
              <div className="small muted">{PARAM_LABELS[k]}</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{v} <span className="small muted" style={{ fontWeight: 400 }}>{PARAM_UNITS[k]}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ParamChart({ title, data, lines }) {
  return (
    <div className="card" style={{ height: 230 }}>
      <div className="card-title">{title}</div>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f1" />
          <XAxis dataKey="tick" tick={{ fontSize: 10, fill: '#a1a1aa' }} />
          <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid #e4e4e7', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {lines.map((l) => (
            <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color} strokeWidth={1.75} dot={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
