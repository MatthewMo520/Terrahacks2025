import { useNavigate } from 'react-router-dom'
import { usePatient } from '../contexts/PatientContext'
import { UserCircle, Settings } from 'lucide-react'

export default function PatientSelect() {
  const navigate = useNavigate()
  const { patients, selectPatient } = usePatient()

  const handlePatientSelect = (patient) => {
    selectPatient(patient.id)
    navigate(`/patient/${patient.id}`)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 pt-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Select Your Name
          </h1>
          <p className="text-xl text-gray-600">
            Choose your name to continue
          </p>
        </div>

        {/* Patient List */}
        <div className="space-y-6 mb-12">
          {patients.map((patient) => (
            <button
              key={patient.id}
              onClick={() => handlePatientSelect(patient)}
              className="w-full bg-purple-200 hover:bg-purple-300 rounded-3xl p-8 text-left transition-all duration-300 transform hover:scale-105 shadow-lg border border-gray-200"
            >
              <div className="flex items-center gap-6">
                <div className="text-6xl">{patient.photo}</div>
                <h2 className="text-3xl font-bold text-gray-800">
                  {patient.name}
                </h2>
              </div>
            </button>
          ))}
        </div>

        {/* Staff Access */}
        <div className="text-center">
          <button
            onClick={() => navigate('/caregiver')}
            className="text-purple-600 hover:text-purple-700 underline text-xl font-medium transition-colors"
          >
            Staff Login
          </button>
        </div>
      </div>
    </div>
  )
}