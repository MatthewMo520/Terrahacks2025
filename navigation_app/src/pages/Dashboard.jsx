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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <WelcomeBanner userName={userName} brandName={brandName} />
            <Updates />
            <MedicalSummary />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Quick Actions</h3>
                <p className="text-gray-600">Get help or navigate home</p>
              </div>

              <div className="space-y-4">
                {/* Take Me Home Button */}
                <button 
                  onClick={handleNavigateHome}
                  className="w-full bg-purple-100 hover:bg-purple-200 rounded-xl p-6 shadow-md text-center transition-all duration-300 transform hover:scale-105 border-2 border-purple-200"
                >
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Home className="w-8 h-8 text-purple-600" />
                  </div>
                  <span className="text-lg font-bold text-gray-800 block">Take Me Home</span>
                  <span className="text-gray-600 block mt-1 text-sm">Get directions to your house</span>
                </button>

                {/* Emergency Button */}
                <button
                  onClick={handleEmergency}
                  className="w-full bg-red-100 hover:bg-red-200 rounded-xl p-6 shadow-md text-center transition-all duration-300 transform hover:scale-105 border-2 border-red-200"
                >
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <span className="text-lg font-bold text-gray-800 block">Need Help</span>
                  <span className="text-gray-600 block mt-1 text-sm">Call for assistance</span>
                </button>

                {/* Navigation Status */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <NavigationIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Navigation Status</p>
                      <p className="text-xs text-gray-600">GPS tracking active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Checklist />
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