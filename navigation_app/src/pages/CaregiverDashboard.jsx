import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, MapPin, Settings, Clock, Heart, CheckCircle, XCircle } from 'lucide-react'
import axios from 'axios'

export default function CaregiverDashboard() {
  const navigate = useNavigate()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)

  const handleRefresh = () => {
    loadActivities()
  }

  const loadActivities = async () => {
    try {
      const response = await axios.get('/api/activities')
      if (response.data.success) {
        setActivities(response.data.activities)
      }
    } catch (error) {
      console.error('Error loading activities:', error)
    }
  }

  useEffect(() => {
    if (!loading) {
      loadActivities()
    }
  }, [loading])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-200 rounded-3xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Users className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Loading...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 pt-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Patient Dashboard
            </h1>
            <p className="text-gray-600 text-lg">Monitor and manage patient information</p>
          </div>
        </div>

        {/* Patient Info */}
        <div className="bg-purple-200 rounded-3xl p-8 mb-8 shadow-lg">
          {patients.length > 0 ? (
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Patient Status</h2>
                <p className="text-gray-600 text-lg">
                  Last active: {patients[0].last_active_display || 'Never'}
                </p>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={() => navigate('/caregiver/setup')}
                  className="bg-blue-200 hover:bg-blue-300 text-gray-800 px-6 py-3 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 shadow-md"
                >
                  {patients[0].home_address ? 'Edit Address' : 'Set Address'}
                </button>
                
                <button
                  onClick={() => navigate('/')}
                  className="bg-white/70 border border-purple-300 text-gray-800 px-6 py-3 rounded-2xl hover:bg-white transition-all duration-200 font-medium"
                >
                  View Patient App
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-lg">No patient data available</p>
          )}
        </div>

        {/* Activity Log */}
        <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Activity Log</h2>
            <button
              onClick={handleRefresh}
              className="text-purple-600 hover:text-purple-700 font-medium text-lg underline transition-colors"
            >
              Refresh
            </button>
          </div>
          
          <div className="space-y-4">
            {activities.length > 0 ? (
              activities.map((activity, index) => (
                <div key={index} className="border-l-4 border-purple-300 bg-purple-50 rounded-r-2xl pl-6 py-4">
                  <p className="text-gray-800 text-lg">
                    <span className="font-bold">{activity.patient_name}</span> - {activity.description}
                  </p>
                  <p className="text-gray-600 mt-1">{activity.time_display}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-xl">No activity yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}