import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-control-geocoder'
import { ArrowLeft, MapPin, Save, Search } from 'lucide-react'
import { usePatient } from '../contexts/PatientContext'
import axios from 'axios'

// Custom marker icon
const homeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function LocationMarker({ position, setPosition, onAddressUpdate }) {
  const map = useMapEvents({
    async click(e) {
      const newPos = e.latlng
      setPosition(newPos)
      map.flyTo(newPos, map.getZoom())
      
      // Reverse geocode to get address
      try {
        const response = await axios.post('/api/reverse-geocode', {
          lat: newPos.lat,
          lng: newPos.lng
        })
        
        if (response.data.success && response.data.data) {
          onAddressUpdate(response.data.data.formatted_address)
        } else {
          onAddressUpdate('')
        }
      } catch (error) {
        console.error('Reverse geocoding error:', error)
        onAddressUpdate('')
      }
    },
  })

  return position === null ? null : (
    <Marker position={position} icon={homeIcon} draggable={true} 
      eventHandlers={{
        dragend: async (e) => {
          const newPos = e.target.getLatLng()
          setPosition(newPos)
          
          // Reverse geocode to get address
          try {
            const response = await axios.post('/api/reverse-geocode', {
              lat: newPos.lat,
              lng: newPos.lng
            })
            
            if (response.data.success && response.data.data) {
              onAddressUpdate(response.data.data.formatted_address)
            } else {
              onAddressUpdate('')
            }
          } catch (error) {
            console.error('Reverse geocoding error:', error)
            onAddressUpdate('')
          }
        }
      }} 
    />
  )
}

export default function SetupHome() {
  const navigate = useNavigate()
  const { refreshPatients, loginCaregiver, isCaregiver } = usePatient()
  const [position, setPosition] = useState(null)
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [inputRef, setInputRef] = useState(null)

  // Default to Toronto
  const defaultCenter = [43.6532, -79.3832]

  // Automatically log in as caregiver when accessing this page
  useEffect(() => {
    if (!isCaregiver) {
      loginCaregiver()
    }
  }, [isCaregiver, loginCaregiver])

  // Load existing home address
  useEffect(() => {
    const loadExistingAddress = async () => {
      try {
        const response = await axios.get('/api/patient/patient/home')
        if (response.data.success && response.data.home_lat && response.data.home_lng) {
          const pos = { lat: response.data.home_lat, lng: response.data.home_lng }
          setPosition(pos)
          setAddress(response.data.home_address || '')
        }
      } catch (error) {
        console.error('Error loading existing address:', error)
      }
    }
    loadExistingAddress()
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  }, [searchTimeout])

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c // Distance in kilometers
  }

  // Get user's current location for distance-based sorting
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'))
        return
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.warn('Could not get current location:', error)
          // Fall back to default Toronto location for distance calculation
          resolve({ lat: 43.6532, lng: -79.3832 })
        },
        { 
          enableHighAccuracy: false, 
          timeout: 5000, 
          maximumAge: 300000 // Use cached location up to 5 minutes old
        }
      )
    })
  }

  // Fetch search suggestions with nearby-first prioritization
  const fetchSuggestions = async (query) => {
    if (!query.trim() || query.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      setLoadingSuggestions(false)
      return
    }

    setLoadingSuggestions(true)
    try {
      // Get current location for distance calculation
      const currentLocation = await getCurrentLocation()
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1`
      )
      const data = await response.json()
      
      if (data && data.length > 0) {
        console.log('Search results:', data) // Debug log
        const formattedSuggestions = data.map(item => {
          const lat = parseFloat(item.lat)
          const lng = parseFloat(item.lon)
          const distance = calculateDistance(currentLocation.lat, currentLocation.lng, lat, lng)
          
          return {
            id: item.place_id,
            display_name: item.display_name,
            lat: lat,
            lng: lng,
            type: item.type,
            class: item.class,
            address: item.address,
            importance: item.importance,
            distance: distance // Distance in kilometers
          }
        })
        
        // Sort by distance (nearby first), then by importance
        const sortedSuggestions = formattedSuggestions.sort((a, b) => {
          // Primary sort: distance (closer first)
          const distanceDiff = a.distance - b.distance
          if (Math.abs(distanceDiff) > 0.1) { // If distance difference is significant (>100m)
            return distanceDiff
          }
          // Secondary sort: importance (higher importance first)
          return (b.importance || 0) - (a.importance || 0)
        })
        
        // Limit to top 5 results after sorting
        setSuggestions(sortedSuggestions.slice(0, 5))
        setShowSuggestions(true)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    } catch (error) {
      console.error('Search suggestions error:', error)
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  // Handle search input change with debouncing
  const handleSearchInputChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    
    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      fetchSuggestions(value)
    }, 300)
    
    setSearchTimeout(timeout)
  }

  // Format distance for display
  const formatDistance = (distanceKm) => {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`
    } else if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)}km`
    } else {
      return `${Math.round(distanceKm)}km`
    }
  }

  // Format suggestion display text
  const formatSuggestion = (suggestion) => {
    const addr = suggestion.address || {}
    
    // Primary line - most specific address
    let primaryLine = ''
    if (addr.house_number && addr.road) {
      primaryLine = `${addr.house_number} ${addr.road}`
    } else if (addr.road) {
      primaryLine = addr.road
    } else if (addr.name) {
      primaryLine = addr.name
    } else if (suggestion.display_name) {
      primaryLine = suggestion.display_name.split(',')[0]
    }
    
    // Secondary line - location context with distance
    const locationParts = [
      addr.neighbourhood,
      addr.suburb,
      addr.quarter,
      addr.city || addr.town || addr.village,
      addr.county,
      addr.state || addr.province
    ].filter(Boolean)
    
    let secondaryLine = locationParts.length > 0 ? locationParts.join(', ') : ''
    
    // Add distance if available
    if (suggestion.distance !== undefined) {
      const distanceText = formatDistance(suggestion.distance)
      secondaryLine = secondaryLine ? `${secondaryLine} • ${distanceText} away` : `${distanceText} away`
    }
    
    // Icon based on place type
    let icon = '📍' // default location pin
    if (suggestion.class === 'highway' || suggestion.type === 'primary' || suggestion.type === 'secondary') {
      icon = '🛣️'
    } else if (suggestion.class === 'building' || addr.house_number) {
      icon = '🏠'
    } else if (suggestion.class === 'amenity') {
      icon = '🏢'
    } else if (suggestion.class === 'place') {
      if (suggestion.type === 'city' || suggestion.type === 'town') {
        icon = '🏙️'
      } else if (suggestion.type === 'village') {
        icon = '🏘️'
      }
    }
    
    return {
      primary: primaryLine,
      secondary: secondaryLine,
      full: suggestion.display_name,
      icon: icon,
      distance: suggestion.distance
    }
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion) => {
    const newPos = { lat: suggestion.lat, lng: suggestion.lng }
    setPosition(newPos)
    setAddress(suggestion.display_name)
    setSearchQuery(formatSuggestion(suggestion).primary)
    setShowSuggestions(false)
    setSuggestions([])
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      // Simple geocoding using Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      )
      const data = await response.json()
      
      if (data && data.length > 0) {
        const result = data[0]
        const newPos = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) }
        setPosition(newPos)
        setAddress(result.display_name)
        setShowSuggestions(false)
      } else {
        alert('Address not found. Please try a different search.')
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      alert('Error searching for address. Please try again.')
    }
  }

  const handleSave = async () => {
    if (!position && !searchQuery.trim()) {
      alert('Please select a location on the map or enter an address')
      return
    }

    setLoading(true)
    try {
      let saveData
      
      if (position) {
        // Use coordinates if we have them
        // Don't send address if it's empty - let backend reverse geocode
        if (address && address.trim()) {
          saveData = {
            home_address: address.trim(),
            home_lat: position.lat,
            home_lng: position.lng
          }
        } else {
          // Just send coordinates, backend will reverse geocode
          saveData = {
            home_lat: position.lat,
            home_lng: position.lng
          }
        }
      } else if (searchQuery.trim()) {
        // Use address only - backend will geocode it
        saveData = {
          home_address: searchQuery.trim()
        }
      }

      const response = await axios.post('/api/patient/patient/home', saveData)
      
      if (response.data.success) {
        setSaved(true)
        
        // Update the display with the geocoded result
        if (response.data.home_address) {
          setAddress(response.data.home_address)
        }
        if (response.data.home_lat && response.data.home_lng) {
          setPosition({ lat: response.data.home_lat, lng: response.data.home_lng })
        }
        
        // Refresh patient data to show updated home address
        await refreshPatients()
        
        setTimeout(() => {
          navigate('/caregiver/dashboard')
        }, 2000)
      } else {
        alert(response.data.error || 'Error saving address. Please try again.')
      }
    } catch (error) {
      console.error('Error saving address:', error)
      if (error.response?.data?.error) {
        alert(`Error: ${error.response.data.error}`)
      } else {
        alert('Error saving address. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-purple-200 p-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/caregiver/dashboard')}
            className="p-3 bg-white/70 border border-purple-300 rounded-2xl hover:bg-white transition-all duration-200"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Set Home Address</h1>
            <p className="text-gray-600 text-lg">Configure patient home location</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading || !position}
          className="bg-green-200 hover:bg-green-300 disabled:bg-gray-300 text-gray-800 px-6 py-3 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 shadow-md"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-gray-200 bg-purple-100 p-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchInputChange}
              onKeyPress={handleKeyPress}
              onFocus={() => setShowSuggestions(suggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Enter address..."
              className="w-full px-6 py-4 bg-white/70 border border-purple-300 rounded-2xl text-gray-800 placeholder-gray-500 text-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            className="bg-blue-200 hover:bg-blue-300 text-gray-800 px-8 py-4 rounded-2xl font-bold transition-all duration-300 shadow-md"
          >
            Search
          </button>
        </div>
      </div>

      {/* Search suggestions */}
      {(showSuggestions || loadingSuggestions) && (
        <div className="bg-white border-b border-gray-200 max-h-64 overflow-y-auto shadow-sm">
          {loadingSuggestions ? (
            <div className="px-6 py-6 text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
                <span className="text-lg text-gray-600">Searching...</span>
              </div>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion) => {
              const formatted = formatSuggestion(suggestion)
              return (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className="w-full text-left px-6 py-4 hover:bg-purple-50 border-b border-gray-100 last:border-b-0 transition-all duration-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-2xl mt-1">
                      {formatted.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-800 text-lg">
                        {formatted.primary}
                      </div>
                      {formatted.secondary && (
                        <div className="text-gray-600 mt-1 truncate">
                          {formatted.secondary}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          ) : (
            <div className="px-6 py-6 text-center text-lg text-gray-500">
              No addresses found
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative bg-gray-100">
        <MapContainer
          center={position ? [position.lat, position.lng] : defaultCenter}
          zoom={15}
          className="h-full w-full"
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='© OpenStreetMap © CARTO'
            maxZoom={19}
          />
          
          <LocationMarker 
            position={position} 
            setPosition={setPosition} 
            onAddressUpdate={(newAddress) => {
              setAddress(newAddress)
              // Clear search query when clicking on map to avoid confusion
              setSearchQuery('')
              setShowSuggestions(false)
            }}
          />
        </MapContainer>

        {/* Instructions */}
        <div className="absolute top-4 left-4 bg-white rounded-2xl shadow-lg border border-gray-200 p-4 max-w-xs">
          <p className="text-lg text-gray-800 font-medium mb-2">
            📍 Tap on the map to set home location
          </p>
          {position && (
            <div className="text-gray-600 text-sm">
              {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
            </div>
          )}
        </div>

        {/* Current Address */}
        {address && (
          <div className="absolute bottom-4 left-4 bg-white rounded-2xl shadow-lg border border-gray-200 p-4 max-w-sm">
            <h3 className="font-bold text-gray-800 text-lg mb-2">Selected Address:</h3>
            <p className="text-gray-600">{address}</p>
          </div>
        )}
      </div>

      {/* Success Message */}
      {saved && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-green-200 rounded-3xl p-8 text-center shadow-2xl border border-gray-200">
            <div className="w-20 h-20 bg-white/70 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
              <MapPin className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-3">Address Saved</h2>
            <p className="text-gray-600 text-lg">Returning to dashboard...</p>
          </div>
        </div>
      )}
    </div>
  )
}