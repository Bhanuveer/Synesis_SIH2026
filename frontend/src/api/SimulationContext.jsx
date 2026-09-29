import { createContext, useContext } from 'react'
import { useSimulation } from './useSimulation'

const Ctx = createContext(null)

export function SimulationProvider({ children }) {
  const sim = useSimulation()
  return <Ctx.Provider value={sim}>{children}</Ctx.Provider>
}

export function useSimulationContext() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSimulationContext must be used within SimulationProvider')
  return ctx
}
