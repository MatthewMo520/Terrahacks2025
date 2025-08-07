import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, AlertCircle } from 'lucide-react'
import EmergencyModal from '../components/EmergencyModal'

export default function PatientHome() {
  const navigate = useNavigate()
  const [showEmergency, setShowEmergency] = useState(false)

  const handleNavigateHome = () => {
    navigate('/navigate')
  }

  const handleDashboard = () => {
    navigate('/dashboard')
  }

  const handleEmergency = () => {
    setShowEmergency(true)
  }



  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-md mx-auto h-full flex flex-col">
        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center gap-6 pb-8">
          {/* Dashboard Button */}
          <button
            onClick={handleDashboard}
            className="bg-blue-200 hover:bg-blue-300 rounded-3xl p-10 shadow-lg text-center transition-all duration-300 transform hover:scale-105"
          >
            <div className="w-24 h-24 bg-white/70 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">D</span>
              </div>
            </div>
            <span className="text-2xl font-bold text-gray-800 block">Dashboard</span>
            <span className="text-gray-600 block mt-2 text-lg">View your health summary</span>
          </button>

          {/* Take Me Home Button */}
          <button
            onClick={handleNavigateHome}
            className="bg-purple-200 hover:bg-purple-300 rounded-3xl p-10 shadow-lg text-center transition-all duration-300 transform hover:scale-105"
          >
            <div className="w-24 h-24 bg-white/70 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
              <Home className="w-12 h-12 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-gray-800 block">Take Me Home</span>
            <span className="text-gray-600 block mt-2 text-lg">Get directions to your house</span>
          </button>

          {/* Emergency Button */}
          <button
            onClick={handleEmergency}
            className="bg-red-200 hover:bg-red-300 rounded-3xl p-8 shadow-lg text-center transition-all duration-300 transform hover:scale-105"
          >
            <div className="w-20 h-20 bg-white/70 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <span className="text-xl font-bold text-gray-800 block">Need Help</span>
            <span className="text-gray-600 block mt-2">Call for assistance</span>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center pb-6">
          <p className="text-gray-500 text-lg">Tap the buttons above to get help</p>
        </div>
      </div>

      {/* Emergency Modal */}
      <EmergencyModal
        isOpen={showEmergency}
        onClose={() => setShowEmergency(false)}
        patientId="patient"
      />
    </div>
  )
}