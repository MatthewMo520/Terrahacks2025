import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-routing-machine'
import { X, AlertCircle, Navigation as NavigationIcon } from 'lucide-react'
import EmergencyModal from '../components/EmergencyModal'
import axios from 'axios'

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

// Direction arrows mapping
const getArrowForDirection = (type) => {
  const arrows = {
    'Left': '⬅️',
    'Right': '➡️',
    'Straight': '⬆️',
    'SlightLeft': '↖️',
    'SlightRight': '↗️',
    'SharpLeft': '⬅️',
    'SharpRight': '➡️',
    'TurnAround': '⬇️',
    'DestinationReached': '🏁'
  }
  return arrows[type] || '⬆️'
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

export default function Navigation() {
  const navigate = useNavigate()
  const [currentPos, setCurrentPos] = useState(null)
  const [homePos, setHomePos] = useState(null)
  const [direction, setDirection] = useState({ arrow: '⬆️', text: 'Getting directions...', distance: '--' })
  const [showEmergency, setShowEmergency] = useState(false)
  const [watchId, setWatchId] = useState(null)
  const [hasStarted, setHasStarted] = useState(false)

  // Fetch home address with caching
  useEffect(() => {
    const fetchHome = async () => {
      try {
        // Try cached home position first
        const cachedHome = localStorage.getItem('homePosition')
        if (cachedHome) {
          try {
            const parsed = JSON.parse(cachedHome)
            setHomePos(parsed)
          } catch (e) {
            console.error('Error parsing cached home:', e)
          }
        }

        const response = await axios.get('/api/patient/patient/home')
        if (response.data.success && response.data.home_lat && response.data.home_lng) {
          const homeData = {
            lat: response.data.home_lat,
            lng: response.data.home_lng,
            address: response.data.home_address
          }
          setHomePos(homeData)
          // Cache the home position
          localStorage.setItem('homePosition', JSON.stringify(homeData))
          console.log('Home address loaded successfully:', response.data.home_address)
        } else {
          console.log('No home address found on server, using default')
          // Default to Toronto for demo
          const defaultHome = { lat: 43.6532, lng: -79.3832 }
          setHomePos(defaultHome)
          localStorage.setItem('homePosition', JSON.stringify(defaultHome))
        }
      } catch (error) {
        console.error('Error fetching home:', error)
        
        // Check if we have cached data as fallback
        const cachedHome = localStorage.getItem('homePosition')
        if (cachedHome && !homePos) {
          try {
            const parsed = JSON.parse(cachedHome)
            setHomePos(parsed)
            console.log('Using cached home address due to network error')
            return
          } catch (e) {
            console.error('Error parsing cached home fallback:', e)
          }
        }
        
        // Final fallback to default
        console.log('Using default home address due to network error')
        const defaultHome = { lat: 43.6532, lng: -79.3832 }
        setHomePos(defaultHome)
        localStorage.setItem('homePosition', JSON.stringify(defaultHome))
        
        // Optional: Show user notification about network issues
        if (error.response) {
          console.error('Server error:', error.response.status, error.response.data)
        } else if (error.request) {
          console.error('Network error: Could not reach server')
        } else {
          console.error('Request error:', error.message)
        }
      }
    }
    fetchHome()
  }, [])

  // Request location permission
  const requestLocationPermission = async () => {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({name: 'geolocation'})
        if (permission.state === 'denied') {
          speak('Location access is blocked. Please enable GPS in your browser settings.')
          return false
        }
      }
      return true
    } catch (error) {
      console.error('Permission check error:', error)
      return true // Continue anyway for older browsers
    }
  }

  // Start location tracking
  useEffect(() => {
    if (!homePos) return

    const startTracking = async () => {
      const hasPermission = await requestLocationPermission()
      if (!hasPermission) return

      // Try to get cached location first
      const cachedPos = localStorage.getItem('lastKnownPosition')
      if (cachedPos && !currentPos) {
        try {
          const parsed = JSON.parse(cachedPos)
          setCurrentPos(parsed)
        } catch (e) {
          console.error('Error parsing cached position:', e)
        }
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          }
          setCurrentPos(pos)
          
          // Cache the position
          localStorage.setItem('lastKnownPosition', JSON.stringify(pos))
          
          if (!hasStarted) {
            // Log navigation start
            axios.post('/api/navigation/start', {
              patient_id: 'patient',
              current_lat: pos.lat,
              current_lng: pos.lng
            }).catch(console.error)
            
            speak('Starting navigation to take you home. Follow the directions on screen.')
            setHasStarted(true)
          }

          // Start watching position with better error handling
          const id = navigator.geolocation.watchPosition(
            (position) => {
              const newPos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
              }
              setCurrentPos(newPos)
              localStorage.setItem('lastKnownPosition', JSON.stringify(newPos))
            },
            (error) => {
              console.error('Location tracking error:', error)
              switch(error.code) {
                case error.PERMISSION_DENIED:
                  speak('Location access denied. Please enable GPS permissions.')
                  break
                case error.POSITION_UNAVAILABLE:
                  speak('GPS signal lost. Trying to reconnect...')
                  break
                case error.TIMEOUT:
                  speak('GPS is taking longer than usual. Please wait...')
                  break
                default:
                  speak('Having trouble with GPS. Please check your connection.')
              }
            },
            { 
              enableHighAccuracy: true, 
              timeout: 15000, 
              maximumAge: 30000 
            }
          )
          setWatchId(id)
        },
        (error) => {
          console.error('Initial location error:', error)
          let message = 'Cannot find your location. '
          switch(error.code) {
            case error.PERMISSION_DENIED:
              message += 'Please allow location access and refresh the page.'
              break
            case error.POSITION_UNAVAILABLE:
              message += 'GPS not available. Please try moving to an open area.'
              break
            case error.TIMEOUT:
              message += 'GPS timeout. Please make sure GPS is turned on.'
              break
            default:
              message += 'Please make sure GPS is turned on and try again.'
          }
          speak(message)
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      )
    }

    startTracking()

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [homePos, hasStarted, watchId])

  const handleRouteUpdate = (route) => {
    if (!route.instructions || route.instructions.length === 0) return

    const instruction = route.instructions[0]
    const distance = route.summary.totalDistance

    setDirection({
      arrow: getArrowForDirection(instruction.type),
      text: instruction.text,
      distance: distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`
    })

    // Check if arrived (within 50 meters)
    if (distance < 50) {
      handleArrival()
    }

    // Voice guidance for close turns
    if (instruction.distance < 50 && !instruction.announced) {
      speak(instruction.text)
      instruction.announced = true
    }
  }

  const handleArrival = async () => {
    speak('Great job! You have arrived home safely.')
    
    try {
      await axios.post('/api/navigation/arrived', { patient_id: 'patient' })
    } catch (error) {
      console.error('Error logging arrival:', error)
    }

    setTimeout(() => {
      navigate('/')
    }, 3000)
  }

  const handleStop = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId)
    }
    navigate('/')
  }

  if (!currentPos || !homePos) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center bg-purple-200 rounded-3xl p-8 shadow-lg max-w-sm">
          <div className="w-20 h-20 bg-white/70 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
            <NavigationIcon className="w-10 h-10 text-purple-600 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Getting Ready</h2>
          <p className="text-gray-600 text-lg">Finding your location and home address...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-purple-200 border-b border-purple-300 p-4 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">Directions Home</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowEmergency(true)}
            className="p-3 bg-red-200 rounded-2xl hover:bg-red-300 transition-all duration-200"
          >
            <AlertCircle className="w-6 h-6 text-red-600" />
          </button>
          <button
            onClick={handleStop}
            className="p-3 bg-white/70 rounded-2xl hover:bg-white transition-all duration-200"
          >
            <X className="w-6 h-6 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Direction Display */}
      <div className="bg-purple-100 border-b border-purple-200 p-8 shadow-sm">
        <div className="text-center max-w-md mx-auto">
          <div className="w-32 h-32 bg-purple-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="text-5xl">{direction.arrow}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">{direction.text}</h2>
          <p className="text-xl text-gray-600">{direction.distance}</p>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative bg-gray-100">
        <MapContainer
          center={[currentPos.lat, currentPos.lng]}
          zoom={16}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='© OpenStreetMap © CARTO'
            maxZoom={19}
          />
          
          <Marker position={[currentPos.lat, currentPos.lng]} icon={createCurrentLocationIcon()} />
          <Marker position={[homePos.lat, homePos.lng]} icon={homeIcon} />
          
          <RoutingMachine
            currentPos={currentPos}
            homePos={homePos}
            onRouteUpdate={handleRouteUpdate}
          />
        </MapContainer>

        {/* Bottom Controls */}
        <div className="absolute bottom-6 left-4 right-4">
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <button
              onClick={handleArrival}
              className="w-full bg-green-200 hover:bg-green-300 text-gray-800 py-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-md"
            >
              I'm Home!
            </button>
          </div>
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