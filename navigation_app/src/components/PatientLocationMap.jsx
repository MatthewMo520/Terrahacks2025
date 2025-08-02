import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { MapPin, Home, WifiOff } from 'lucide-react'

// Custom marker icons
const createPatientLocationIcon = () => L.divIcon({
  className: 'patient-location-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  html: '<div class="w-5 h-5 bg-blue-500 border-2 border-white rounded-full shadow-lg pulse"></div>'
})

const homeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
})

// Component to auto-center map on patient location
function AutoCenter({ center }) {
  const map = useMap()
  
  useEffect(() => {
    if (center) {
      map.setView(center, 15)
    }
  }, [center, map])
  
  return null
}

export default function PatientLocationMap() {
  const [patientLocation, setPatientLocation] = useState(null)
  const [homeLocation] = useState({ lat: 40.7128, lng: -74.0060 }) // This should come from patient data
  const [locationError, setLocationError] = useState(false)
  const [isLocationActive, setIsLocationActive] = useState(false)

  useEffect(() => {
    // Function to update patient location
    const updateLocation = () => {
      if (navigator.geolocation) {
        setIsLocationActive(true)
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setPatientLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            })
            setLocationError(false)
          },
          (error) => {
            console.error('Error getting patient location:', error)
            setLocationError(true)
            setIsLocationActive(false)
            // Use a default location for demo purposes
            setPatientLocation({ lat: 40.7580, lng: -73.9855 })
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000 // Cache position for 1 minute
          }
        )
      } else {
        setLocationError(true)
        setIsLocationActive(false)
      }
    }

    // Update location immediately
    updateLocation()

    // Update location every 30 seconds for real-time tracking
    const locationInterval = setInterval(updateLocation, 30000)

    return () => clearInterval(locationInterval)
  }, [])

  if (!patientLocation) {
    return (
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden h-64">
        <div className="bg-[#C8B5E8] px-4 py-3">
          <h2 className="text-lg font-bold text-gray-900">Patient Location</h2>
        </div>
        <div className="p-6 h-full flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Getting patient location...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-[#C8B5E8] px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Patient Location</h2>
        <div className="flex items-center gap-2">
          {locationError ? (
            <WifiOff className="w-4 h-4 text-red-500" />
          ) : (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-700">Live</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="h-48 relative">
        <MapContainer
          center={patientLocation}
          zoom={15}
          className="h-full w-full"
          zoomControl={false}
          scrollWheelZoom={false}
          dragging={false}
          touchZoom={false}
          doubleClickZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          
          {/* Auto-center on patient location */}
          <AutoCenter center={patientLocation} />
          
          {/* Patient Location Marker */}
          <Marker position={patientLocation} icon={createPatientLocationIcon()} />
          
          {/* Home Marker */}
          <Marker position={homeLocation} icon={homeIcon} />
        </MapContainer>

        {/* Status overlay */}
        <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 rounded px-2 py-1 text-xs">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-blue-500" />
            <span className="text-gray-700">Patient</span>
          </div>
        </div>
        
        <div className="absolute bottom-2 right-2 bg-white bg-opacity-90 rounded px-2 py-1 text-xs">
          <div className="flex items-center gap-1">
            <Home className="w-3 h-3 text-green-500" />
            <span className="text-gray-700">Home</span>
          </div>
        </div>
      </div>

      {/* Location info */}
      <div className="px-4 py-3 bg-gray-50 text-xs text-gray-600">
        {locationError ? (
          <span className="text-red-600">Location services unavailable</span>
        ) : (
          <span>
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  )
}