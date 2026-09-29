import { useCallback, useEffect, useRef, useState } from 'react'

// In dev, relative to this page's own host (Vite's proxy forwards it to localhost:8000).
// In production, derive from VITE_API_ORIGIN so the deployed frontend can reach a
// separately-hosted backend, converting http(s) -> ws(s).
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN
const WS_URL = API_ORIGIN
  ? `${API_ORIGIN.replace(/^http/, 'ws')}/ws/simulation`
  : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/simulation`

export function useSimulation() {
  const [state, setState] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let ws

    function connect() {
      ws = new WebSocket(WS_URL)
      wsRef.current = ws
      ws.onopen = () => !cancelled && setConnected(true)
      ws.onclose = () => {
        if (cancelled) return
        setConnected(false)
        setTimeout(connect, 1500)
      }
      ws.onerror = () => ws.close()
      ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data)
        if (msg.type === 'state') {
          setState(msg)
          if (msg.new_alert) {
            setAlerts((prev) => [msg.new_alert, ...prev])
          }
        }
      }
    }
    connect()
    return () => {
      cancelled = true
      wsRef.current?.close()
    }
  }, [])

  const send = useCallback((action, value) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, value }))
    }
  }, [])

  return {
    state,
    connected,
    latestAlerts: alerts,
    start: () => send('start'),
    pause: () => send('pause'),
    reset: () => { setAlerts([]); send('reset') },
    setSpeed: (v) => send('speed', v),
  }
}
