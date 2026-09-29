import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageSquarePlus } from 'lucide-react'
import { api } from '../api/client'
import RiskBadge, { EventTag } from '../components/RiskBadge'

const EVENT_TYPES = ['Mud Loss', 'Kick', 'Stuck Pipe', 'Overpressure', 'Torque Spike', 'Cementing Issue']

export default function AlertsFeedback() {
  const [alerts, setAlerts] = useState([])
  const [feedbackFor, setFeedbackFor] = useState(null)
  const [form, setForm] = useState({ actual_event: '', lesson: '', mitigation: '' })
  const [message, setMessage] = useState('')

  function refresh() {
    api.listAlerts().then(setAlerts).catch(() => {})
  }
  useEffect(refresh, [])

  async function quickStatus(alert, status) {
    await api.sendFeedback(alert.id, { status })
    refresh()
  }

  async function submitFeedback(alert) {
    const res = await api.sendFeedback(alert.id, { status: 'Acknowledged', ...form, well: 'ACTIVE-01', formation: alert.formation, depth: alert.depth })
    if (res.message) setMessage(res.message)
    setFeedbackFor(null)
    setForm({ actual_event: '', lesson: '', mitigation: '' })
    refresh()
  }

  return (
    <div>
      <h1>Alerts & Feedback</h1>
      <p className="muted">Alert history with engineer feedback — this is how the system builds institutional memory over time.</p>
      {message && <p style={{ color: '#15803d', marginTop: 8 }}>{message}</p>}

      {alerts.length === 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <p className="muted">No alerts yet. Start the simulation on the Risk & Live eRTMAC page.</p>
        </div>
      )}

      {alerts.map((a) => (
        <div className="card" key={a.id} style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <RiskBadge level={a.level} />
              <EventTag type={a.risk_type} />
              <strong>{a.depth} m</strong>
              <span className="muted small">{a.formation}</span>
            </div>
            <span className="badge badge-gray">{a.status}</span>
          </div>

          <p style={{ marginTop: 10 }} className="small">
            <strong>Evidence:</strong>{' '}
            {a.offset_evidence?.length ? a.offset_evidence.map((e) => `${e.well} @ ${e.depth}m`).join(', ') : 'none'}
            {' · '}
            <strong>Rule:</strong> {a.rules?.map((r) => r.detail).join(' ') || 'n/a'}
          </p>
          <p className="small"><strong>Recommendation:</strong> {a.recommendation}</p>

          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="btn-outline" onClick={() => quickStatus(a, 'Acknowledged')}>Acknowledge</button>
            <button className="btn-outline" onClick={() => quickStatus(a, 'Useful')}>Useful</button>
            <button className="btn-outline" onClick={() => quickStatus(a, 'Not Useful')}>Not Useful</button>
            <button className="btn" onClick={() => setFeedbackFor(feedbackFor === a.id ? null : a.id)}>
              <MessageSquarePlus size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Add Feedback
            </button>
          </div>

          <AnimatePresence initial={false}>
            {feedbackFor === a.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ marginTop: 12, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                  <div className="grid grid-2">
                    <label>
                      <div className="small muted">Actual event</div>
                      <select className="input" style={{ width: '100%' }} value={form.actual_event} onChange={(e) => setForm({ ...form, actual_event: e.target.value })}>
                        <option value="">—</option>
                        {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                    <label>
                      <div className="small muted">Mitigation</div>
                      <input className="input" style={{ width: '100%' }} value={form.mitigation} onChange={(e) => setForm({ ...form, mitigation: e.target.value })} />
                    </label>
                  </div>
                  <label style={{ display: 'block', marginTop: 8 }}>
                    <div className="small muted">Lesson learned</div>
                    <textarea className="input" rows={2} style={{ width: '100%' }} value={form.lesson} onChange={(e) => setForm({ ...form, lesson: e.target.value })} />
                  </label>
                  <button className="btn" style={{ marginTop: 8 }} onClick={() => submitFeedback(a)}>Save feedback</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}
