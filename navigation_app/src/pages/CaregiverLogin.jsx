import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePatient } from '../contexts/PatientContext'
import { Shield, ArrowLeft, Lock } from 'lucide-react'

export default function CaregiverLogin() {
  const navigate = useNavigate()
  const { loginCaregiver } = usePatient()
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')

  // Simple passcode for demo - in production, use proper authentication
  const CAREGIVER_PASSCODE = '1234'

  const handleLogin = () => {
    if (passcode === CAREGIVER_PASSCODE) {
      loginCaregiver()
      navigate('/caregiver/dashboard')
    } else {
      setError('Invalid passcode')
      setPasscode('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8 pt-4">
          <button
            onClick={() => navigate('/')}
            className="p-3 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-all duration-200 mr-4"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-200 rounded-3xl flex items-center justify-center shadow-sm">
              <Shield className="w-7 h-7 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Staff Access</h1>
              <p className="text-gray-600 text-sm">Secure Login</p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-purple-200 rounded-3xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-white/70 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
              <Lock className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-3">Secure Login</h2>
            <p className="text-gray-600 text-lg">Enter your staff passcode to continue</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-lg font-medium text-gray-800 mb-3">
                Staff Passcode
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-6 py-4 bg-white/70 border border-purple-300 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-transparent text-xl text-center text-gray-800 placeholder-gray-500"
                placeholder="Enter passcode"
                maxLength={10}
              />
              {error && (
                <p className="text-red-600 text-lg mt-3 text-center font-medium">{error}</p>
              )}
            </div>

            <button
              onClick={handleLogin}
              className="w-full bg-purple-300 hover:bg-purple-400 text-gray-800 py-4 rounded-2xl font-bold text-xl transition-all duration-300 transform hover:scale-105 shadow-md"
            >
              Access Dashboard
            </button>
          </div>

          {/* Demo Note */}
          <div className="mt-8 p-6 bg-blue-200 rounded-2xl">
            <div className="flex items-center gap-3 justify-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <p className="text-lg text-gray-700 font-medium">
                Demo Mode: Use passcode <span className="font-mono text-gray-800 font-bold">1234</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-lg">
            Authorized personnel only
          </p>
        </div>
      </div>
    </div>
  )
}