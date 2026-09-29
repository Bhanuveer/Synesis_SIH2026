export default function AnimatedNumber({ value, decimals = 0, suffix = '' }) {
  const numeric = typeof value === 'number' ? value : parseFloat(value)
  if (Number.isNaN(numeric)) return <span>{value}</span>
  return <span>{numeric.toFixed(decimals)}{suffix}</span>
}
