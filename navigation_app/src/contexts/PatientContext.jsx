import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const PatientContext = createContext()

export function usePatient() {
  const context = useContext(PatientContext)
  if (!context) {
    throw new Error('usePatient must be used within PatientProvider')
  }
  return context
}

export function PatientProvider({ children }) {
  const [currentPatient, setCurrentPatient] = useState(null)
  const [isCaregiver, setIsCaregiver] = useState(false)
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)

  // Load patients from backend
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const response = await axios.get('/api/patients')
        if (response.data.success) {
          setPatients(response.data.patients)
        } else {
          // Fallback to mock data if API fails
          setPatients([
            { id: 'patient001', name: 'John Smith', photo: '👴', home_address: null },
            { id: 'patient002', name: 'Mary Johnson', photo: '👵', home_address: null },
            { id: 'patient003', name: 'Robert Brown', photo: '🧑‍🦳', home_address: null },
          ])
        }
      } catch (error) {
        console.error('Error loading patients:', error)
        // Fallback to mock data
        setPatients([
          { id: 'patient001', name: 'John Smith', photo: '👴', home_address: null },
          { id: 'patient002', name: 'Mary Johnson', photo: '👵', home_address: null },
          { id: 'patient003', name: 'Robert Brown', photo: '🧑‍🦳', home_address: null },
        ])
      } finally {
        setLoading(false)
      }
    }

    loadPatients()

    // Check for stored login state
    const storedPatientId = localStorage.getItem('currentPatientId')
    const storedIsCaregiver = localStorage.getItem('isCaregiver')
    
    if (storedIsCaregiver === 'true') {
      setIsCaregiver(true)
    }
    
    if (storedPatientId && !storedIsCaregiver) {
      // Will set current patient after patients load
      setTimeout(() => {
        const patient = patients.find(p => p.id === storedPatientId)
        if (patient) {
          setCurrentPatient(patient)
        }
      }, 100)
    }
  }, [])

  const selectPatient = (patientId) => {
    const patient = patients.find(p => p.id === patientId)
    setCurrentPatient(patient)
    setIsCaregiver(false)
    localStorage.setItem('currentPatientId', patientId)
    localStorage.removeItem('isCaregiver')
  }

  const loginCaregiver = () => {
    setIsCaregiver(true)
    setCurrentPatient(null)
    localStorage.setItem('isCaregiver', 'true')
    localStorage.removeItem('currentPatientId')
  }

  const logout = () => {
    setCurrentPatient(null)
    setIsCaregiver(false)
    localStorage.removeItem('currentPatientId')
    localStorage.removeItem('isCaregiver')
  }

  const refreshPatients = async () => {
    try {
      const response = await axios.get('/api/patients')
      if (response.data.success) {
        setPatients(response.data.patients)
      }
    } catch (error) {
      console.error('Error refreshing patients:', error)
    }
  }

  const value = {
    currentPatient,
    isCaregiver,
    patients,
    loading,
    selectPatient,
    loginCaregiver,
    logout,
    refreshPatients,
  }

  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  )
}