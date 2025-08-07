import { useState } from 'react'
import { X, Phone, CheckCircle } from 'lucide-react'
import axios from 'axios'

export default function EmergencyModal({ isOpen, onClose, patientId }) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  if (!isOpen) return null

  const handleEmergency = async () => {
    setLoading(true)
    
    // Get current location
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await axios.post('/api/emergency', {
            patient_id: patientId,
            current_lat: position.coords.latitude,
            current_lng: position.coords.longitude
          })
          setSent(true)
          
          // Auto-close after 3 seconds
          setTimeout(() => {
            setSent(false)
            onClose()
          }, 3000)
        } catch (error) {
          console.error('Emergency alert error:', error)
          alert('Error sending emergency alert')
        } finally {
          setLoading(false)
        }
      },
      (error) => {
        console.error('Location error:', error)
        alert('Cannot get your location. Please call for help.')
        setLoading(false)
      }
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
      <div className="bg-red-200 rounded-3xl p-10 max-w-md w-full shadow-2xl transform transition-all border border-gray-200">
        {sent ? (
          <div className="text-center">
            <div className="w-28 h-28 bg-white/70 rounded-full flex items-center justify-center mx-auto mb-8 shadow-md">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
            <h2 className="text-4xl font-bold text-gray-800 mb-6">
              Help is Coming!
            </h2>
            <p className="text-xl text-gray-600">
              Your caregiver has been notified.
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-4xl font-bold text-gray-800">Need Help?</h2>
              <button
                onClick={onClose}
                className="p-3 hover:bg-white/70 rounded-full transition-all duration-200"
              >
                <X className="w-8 h-8 text-gray-700" />
              </button>
            </div>

            <p className="text-xl text-gray-600 mb-10 text-center">
              This will send your location to your caregiver
            </p>

            <div className="space-y-6">
              <button
                onClick={handleEmergency}
                disabled={loading}
                className="w-full bg-red-300 hover:bg-red-400 text-gray-800 rounded-3xl p-8 text-2xl font-bold flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-md"
              >
                <Phone className="w-10 h-10" />
                {loading ? 'Sending...' : 'YES, GET HELP'}
              </button>

              <button
                onClick={onClose}
                className="w-full bg-white/70 border border-red-300 hover:bg-white text-gray-800 rounded-3xl p-8 text-2xl font-bold transition-all duration-200"
              >
                NO, I'M OK
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}