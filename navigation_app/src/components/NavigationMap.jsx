import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-routing-machine'
import { Navigation as NavigationIcon, Home, AlertCircle } from 'lucide-react'

// Custom marker icons
const createCurrentLocationIcon = () => L.divIcon({
  className: 'current-location-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  html: '<div class="w-6 h-6 bg-blue-500 border-4 border-white rounded-full shadow-lg"></div>'
})

const homeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

// Voice synthesis utility
const speak = (text) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.volume = 1.0
    window.speechSynthesis.speak(utterance)
  }
}

// Routing component
function RoutingMachine({ currentPos, homePos, onRouteUpdate }) {
  const map = useMap()
  const routingControlRef = useRef(null)

  useEffect(() => {
    if (!currentPos || !homePos) return

    // Remove existing route
    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current)
    }

    // Create new route
    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(currentPos.lat, currentPos.lng),
        L.latLng(homePos.lat, homePos.lng)
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      createMarker: () => null, // Don't create markers (we have our own)
      lineOptions: {
        styles: [{ color: '#10B981', weight: 6, opacity: 0.8 }]
      },
      show: false, // Hide default instructions panel
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: 'foot'
      })
    })

    routingControl.on('routesfound', (e) => {
      const routes = e.routes
      if (routes && routes.length > 0) {
        onRouteUpdate(routes[0])
      }
    })

    routingControl.addTo(map)
    routingControlRef.current = routingControl

    return () => {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current)
      }
    }
  }, [map, currentPos, homePos, onRouteUpdate])

  return null
}

export default function NavigationMap() {
  const [currentPosition, setCurrentPosition] = useState(null)
  const [homePosition] = useState({ lat: 40.7128, lng: -74.0060 }) // Default to NYC, replace with actual home
  const [isNavigating, setIsNavigating] = useState(false)
  const [routeInstructions, setRouteInstructions] = useState([])
  const [currentInstruction, setCurrentInstruction] = useState('')
  const [showEmergency, setShowEmergency] = useState(false)

  useEffect(() => {
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('Error getting location:', error)
          // Use default position if geolocation fails
          setCurrentPosition({ lat: 40.7128, lng: -74.0060 })
        }
      )
    }
  }, [])

  const handleStartNavigation = () => {
    setIsNavigating(true)
    speak("Starting navigation to home")
  }

  const handleStopNavigation = () => {
    setIsNavigating(false)
    setRouteInstructions([])
    setCurrentInstruction('')
    speak("Navigation stopped")
  }

  const handleRouteUpdate = (route) => {
    if (route.instructions) {
      setRouteInstructions(route.instructions)
      if (route.instructions.length > 0) {
        const instruction = route.instructions[0]
        setCurrentInstruction(instruction.text)
        speak(instruction.text)
      }
    }
  }

  const handleEmergency = () => {
    setShowEmergency(true)
    speak("Emergency assistance requested")
  }

  if (!currentPosition) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <NavigationIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Navigation</h3>
          <p className="text-gray-600">Getting your location...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Map Container */}
      <div className="h-64 relative">
        <MapContainer
          center={currentPosition}
          zoom={15}
          className="h-full w-full"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Current Location Marker */}
          <Marker position={currentPosition} icon={createCurrentLocationIcon()} />
          
          {/* Home Marker */}
          <Marker position={homePosition} icon={homeIcon} />
          
          {/* Routing */}
          {isNavigating && (
            <RoutingMachine
              currentPos={currentPosition}
              homePos={homePosition}
              onRouteUpdate={handleRouteUpdate}
            />
          )}
        </MapContainer>

        {/* Navigation Controls */}
        <div className="absolute top-4 right-4 flex gap-2">
          {!isNavigating ? (
            <button
              onClick={handleStartNavigation}
              className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-full shadow-lg transition-colors"
            >
              <Home className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleStopNavigation}
              className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
            >
              <NavigationIcon className="w-5 h-5" />
            </button>
          )}
          
          <button
            onClick={handleEmergency}
            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
          >
            <AlertCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation Instructions */}
      {isNavigating && currentInstruction && (
        <div className="p-4 bg-blue-50 border-t">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <NavigationIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{currentInstruction}</p>
              <p className="text-xs text-gray-600">Follow the route on the map</p>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Modal */}
      {showEmergency && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Emergency Alert</h3>
              <p className="text-gray-600 mb-4">Emergency services have been contacted. Help is on the way.</p>
              <button
                onClick={() => setShowEmergency(false)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 