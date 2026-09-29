import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import DecisionSupport from './pages/DecisionSupport'
import NearbyWells from './pages/NearbyWells'
import WellCorrelation from './pages/WellCorrelation'
import KnowledgeDocuments from './pages/KnowledgeDocuments'
import RiskLive from './pages/RiskLive'
import AlertsFeedback from './pages/AlertsFeedback'
import Query from './pages/Query'
import Validation from './pages/Validation'
import { SimulationProvider } from './api/SimulationContext'

export default function App() {
  return (
    <SimulationProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<DecisionSupport />} />
            <Route path="/nearby-wells" element={<NearbyWells />} />
            <Route path="/correlation" element={<WellCorrelation />} />
            <Route path="/knowledge" element={<KnowledgeDocuments />} />
            <Route path="/risk-live" element={<RiskLive />} />
            <Route path="/alerts" element={<AlertsFeedback />} />
            <Route path="/query" element={<Query />} />
            <Route path="/validation" element={<Validation />} />
          </Route>
        </Routes>
      </HashRouter>
    </SimulationProvider>
  )
}
