import { Routes, Route, Navigate } from 'react-router-dom'
import PatientHome from './pages/PatientHome'
import Navigation from './pages/Navigation'
import CaregiverDashboard from './pages/CaregiverDashboard'
import SetupHome from './pages/SetupHome'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <div className="h-screen bg-gray-50">
      <Routes>
        {/* Patient Routes */}
        <Route path="/" element={<PatientHome />} />
        <Route path="/navigate" element={<Navigation />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Caregiver Routes */}
        <Route path="/caregiver" element={<CaregiverDashboard />} />
        <Route path="/caregiver/dashboard" element={<CaregiverDashboard />} />
        <Route path="/caregiver/setup" element={<SetupHome />} />
        
        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App