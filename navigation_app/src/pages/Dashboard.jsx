import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WelcomeBanner from '../components/WelcomeBanner'
import Updates from '../components/Updates'
import Checklist from '../components/Checklist'
import MedicalSummary from '../components/MedicalSummary'
import { USER_CONFIG } from '../lib/dashboard-config'
import { Home, AlertCircle, Navigation as NavigationIcon } from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const [userName] = useState(USER_CONFIG.userName)
  const [brandName] = useState(USER_CONFIG.brandName)
  const [showEmergency, setShowEmergency] = useState(false)

  const handleNavigateHome = () => {
    navigate('/navigate')
  }

  const handleEmergency = () => {
    setShowEmergency(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 overflow-y-scroll">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Wider */}
          <div className="lg:col-span-2 space-y-6">
            <WelcomeBanner userName={userName} brandName={brandName} />
            <Updates />
            <MedicalSummary />
          </div>

          {/* Right Column - Narrower */}
          <div className="space-y-6">
            <Checklist />
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-[#C8B5E8] px-6 py-4">
                <h2 className="text-xl font-bold text-gray-900">Map</h2>
              </div>
              <div className="p-6">
                <div className="text-center text-gray-600">
                  Map will be integrated here
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Modal */}
      {showEmergency && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Emergency Alert</h3>
              <p className="text-gray-600 mb-4">Emergency services have been contacted. Help is on the way.</p>
              <div className="space-y-2">
                <button
                  onClick={() => setShowEmergency(false)}
                  className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => setShowEmergency(false)}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 