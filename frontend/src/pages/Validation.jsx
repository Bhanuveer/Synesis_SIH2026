import { useEffect, useState } from 'react'
import { GraduationCap, FlaskConical, Lock } from 'lucide-react'
import { api } from '../api/client'

export default function Validation() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.getValidation().then(setData).catch(() => {})
  }, [])

  if (!data) return <p className="muted">Loading…</p>

  const m = data.metrics

  return (
    <div>
      <h1>Validation</h1>
      <p className="muted">Prototype Risk Model — trained on synthetic data only. No claim of real-world accuracy.</p>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">Status</div>
        <h2>{data.status}</h2>
      </div>

      <div className="grid grid-3" style={{ marginTop: 12 }}>
        <WellListCard icon={GraduationCap} color="#1d4ed8" title="Training wells" wells={data.training_wells} />
        <WellListCard icon={FlaskConical} color="#0891b2" title="Validation wells" wells={data.validation_wells} />
        <WellListCard icon={Lock} color="#7c3aed" title="Held-out wells" wells={data.held_out_wells} />
      </div>

      {m ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-title">Metrics — {m.label}</div>
          <table>
            <thead><tr><th>Split</th><th>N</th><th>Accuracy</th><th>Precision</th><th>Recall</th><th>F1</th></tr></thead>
            <tbody>
              {['train', 'validation', 'held_out_test'].map((split) => (
                <tr key={split}>
                  <td style={{ textTransform: 'capitalize' }}>{split.replace('_', ' ')}</td>
                  <td>{m[split].n}</td>
                  <td>{m[split].accuracy}</td>
                  <td>{m[split].precision}</td>
                  <td>{m[split].recall}</td>
                  <td>{m[split].f1}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small muted" style={{ marginTop: 10 }}>
            Metrics computed on a held-out split of the synthetic training data used to seed the Random Forest —
            not a validation against real drilling outcomes.
          </p>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 12 }}>
          <p className="muted">Validation pending — run scripts/train_model.py to generate metrics.</p>
        </div>
      )}
    </div>
  )
}

function WellListCard({ icon: Icon, color, title, wells }) {
  return (
    <div className="card">
      <div className="accent-bar" style={{ background: color }} />
      <div className="card-title"><Icon size={13} strokeWidth={2} color={color} /> {title}</div>
      {(!wells || wells.length === 0) && <p className="muted small">None</p>}
      <ul className="list-plain">
        {wells?.map((w) => <li key={w}>{w}</li>)}
      </ul>
    </div>
  )
}
