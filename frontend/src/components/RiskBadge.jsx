const CLASS_MAP = {
  Normal: 'badge-normal',
  Low: 'badge-low',
  Medium: 'badge-medium',
  High: 'badge-high',
}

const LABEL_MAP = {
  Normal: 'Normal',
  Low: 'Warning',
  Medium: 'Medium risk',
  High: 'High risk',
}

export default function RiskBadge({ level, size }) {
  const cls = CLASS_MAP[level] || 'badge-gray'
  const label = LABEL_MAP[level] || level || 'Unknown'
  const lg = size === 'lg'
  const style = lg ? { fontSize: 14, padding: '4px 12px' } : undefined

  return (
    <span className={`badge ${cls}`} style={style}>
      <span className="status-dot" />
      {label}
    </span>
  )
}

export const EVENT_COLORS = {
  'Mud Loss': '#4f46e5',
  'Kick': '#b91c1c',
  'Stuck Pipe': '#c2410c',
  'Overpressure': '#7e22ce',
  'Torque Spike': '#0e7490',
  'Cementing Issue': '#52525b',
}

export function EventTag({ type }) {
  const bg = EVENT_COLORS[type] || '#52525b'
  return <span className="event-tag" style={{ background: bg }}>{type}</span>
}
