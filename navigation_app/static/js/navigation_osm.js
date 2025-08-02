// Navigation App for Alzheimer's Patients - OpenStreetMap Version
let map;
let routeControl;
let watchId;
let currentPosition;
let homeLocation;
let isNavigating = false;
let patientId = 'default_patient';
let currentLocationMarker;
let homeMarker;

// Voice synthesis
const synth = window.speechSynthesis;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Get patient home address from backend
    fetchHomeAddress();
    
    // Set up button listeners
    document.getElementById('take-me-home').addEventListener('click', startNavigation);
    document.getElementById('stop-nav').addEventListener('click', stopNavigation);
    document.getElementById('emergency-btn').addEventListener('click', showEmergencyConfirm);
    document.getElementById('nav-emergency').addEventListener('click', showEmergencyConfirm);
    document.getElementById('confirm-emergency').addEventListener('click', sendEmergencyAlert);
    document.getElementById('cancel-emergency').addEventListener('click', hideEmergencyConfirm);
    
    // Check if geolocation is available
    if (!navigator.geolocation) {
        alert('Your device does not support GPS navigation.');
    }
}

async function fetchHomeAddress() {
    try {
        // Try cached home position first
        const cachedHome = localStorage.getItem('homePosition');
        if (cachedHome) {
            try {
                homeLocation = JSON.parse(cachedHome);
            } catch (e) {
                console.error('Error parsing cached home:', e);
            }
        }

        const response = await fetch(`/api/patient/${patientId}/home`);
        const data = await response.json();
        
        if (data.success && data.home_lat && data.home_lng) {
            homeLocation = {
                lat: data.home_lat,
                lng: data.home_lng
            };
            // Cache the home position
            localStorage.setItem('homePosition', JSON.stringify(homeLocation));
        } else {
            // For demo, use a default location (Toronto)
            const defaultHome = {
                lat: 43.6532,
                lng: -79.3832
            };
            homeLocation = defaultHome;
            localStorage.setItem('homePosition', JSON.stringify(defaultHome));
        }
    } catch (error) {
        console.error('Error fetching home address:', error);
        // Use default for demo
        const defaultHome = {
            lat: 43.6532,
            lng: -79.3832
        };
        homeLocation = defaultHome;
        localStorage.setItem('homePosition', JSON.stringify(defaultHome));
    }
}

async function requestLocationPermission() {
    try {
        if ('permissions' in navigator) {
            const permission = await navigator.permissions.query({name: 'geolocation'});
            if (permission.state === 'denied') {
                speak('Location access is blocked. Please enable GPS in your browser settings.');
                return false;
            }
        }
        return true;
    } catch (error) {
        console.error('Permission check error:', error);
        return true; // Continue anyway for older browsers
    }
}

async function startNavigation() {
    if (!homeLocation) {
        speak("I'm sorry, I don't know where home is. Please ask your caregiver for help.");
        return;
    }
    
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;
    
    // Disable button during loading
    document.getElementById('take-me-home').classList.add('loading');
    
    // Try to get cached location first
    const cachedPos = localStorage.getItem('lastKnownPosition');
    if (cachedPos) {
        try {
            currentPosition = JSON.parse(cachedPos);
        } catch (e) {
            console.error('Error parsing cached position:', e);
        }
    }
    
    // Get current location
    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentPosition = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
            
            // Cache the position
            localStorage.setItem('lastKnownPosition', JSON.stringify(currentPosition));
            
            // Log navigation start
            logNavigationStart();
            
            // Initialize map and directions
            initializeNavigation();
            
            // Switch screens
            document.getElementById('main-screen').classList.remove('active');
            document.getElementById('nav-screen').classList.add('active');
            
            // Start voice guidance
            speak("Starting navigation to take you home. Follow the directions on screen.");
            
            isNavigating = true;
        },
        (error) => {
            document.getElementById('take-me-home').classList.remove('loading');
            let message = 'Cannot find your location. ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    message += 'Please allow location access and refresh the page.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message += 'GPS not available. Please try moving to an open area.';
                    break;
                case error.TIMEOUT:
                    message += 'GPS timeout. Please make sure GPS is turned on.';
                    break;
                default:
                    message += 'Please make sure GPS is turned on and try again.';
            }
            speak(message);
            console.error('Geolocation error:', error);
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000
        }
    );
}

function initializeNavigation() {
    // Initialize Leaflet map
    if (!map) {
        map = L.map('map-container').setView([currentPosition.lat, currentPosition.lng], 16);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);
    }
    
    // Add current location marker
    if (currentLocationMarker) {
        currentLocationMarker.setLatLng([currentPosition.lat, currentPosition.lng]);
    } else {
        currentLocationMarker = L.marker([currentPosition.lat, currentPosition.lng], {
            icon: L.divIcon({
                className: 'current-location-marker',
                html: '<div style="background-color: #4285F4; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(map);
    }
    
    // Add home marker
    if (!homeMarker) {
        homeMarker = L.marker([homeLocation.lat, homeLocation.lng], {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            })
        }).addTo(map);
    }
    
    // Calculate route
    calculateRoute();
    
    // Start watching position with better error handling
    watchId = navigator.geolocation.watchPosition(
        (position) => {
            currentPosition = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
            localStorage.setItem('lastKnownPosition', JSON.stringify(currentPosition));
            updatePosition(position);
        },
        (error) => {
            console.error('Location tracking error:', error);
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    speak('Location access denied. Please enable GPS permissions.');
                    break;
                case error.POSITION_UNAVAILABLE:
                    speak('GPS signal lost. Trying to reconnect...');
                    break;
                case error.TIMEOUT:
                    speak('GPS is taking longer than usual. Please wait...');
                    break;
                default:
                    speak('Having trouble with GPS. Please check your connection.');
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 30000
        }
    );
}

function calculateRoute() {
    // Remove existing route
    if (routeControl) {
        map.removeControl(routeControl);
    }
    
    // Create new route
    routeControl = L.Routing.control({
        waypoints: [
            L.latLng(currentPosition.lat, currentPosition.lng),
            L.latLng(homeLocation.lat, homeLocation.lng)
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        createMarker: function() { return null; }, // Don't create markers (we have our own)
        lineOptions: {
            styles: [{ color: '#4CAF50', weight: 6, opacity: 0.8 }]
        },
        show: false, // Hide the default instructions panel
        router: L.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1',
            profile: 'foot' // Walking directions
        })
    }).on('routesfound', function(e) {
        const routes = e.routes;
        if (routes && routes.length > 0) {
            updateDirectionsFromRoute(routes[0]);
        }
    }).on('routingerror', function(e) {
        console.error('Routing error:', e);
        speak("I'm having trouble finding the way. Please try again.");
    }).addTo(map);
}

function updateDirectionsFromRoute(route) {
    if (!route.instructions || route.instructions.length === 0) return;
    
    const instruction = route.instructions[0];
    const distance = route.summary.totalDistance;
    
    // Update arrow based on direction
    const arrow = getArrowForDirection(instruction.type);
    document.getElementById('direction-arrow').textContent = arrow;
    
    // Update direction text
    document.getElementById('direction-text').textContent = instruction.text;
    
    // Update distance
    if (distance < 1000) {
        document.getElementById('distance-text').textContent = Math.round(distance) + ' meters';
    } else {
        document.getElementById('distance-text').textContent = (distance / 1000).toFixed(1) + ' km';
    }
    
    // Check if arrived (within 50 meters)
    if (distance < 50) {
        arrivedHome();
    }
    
    // Voice guidance for close turns
    if (instruction.distance < 50 && !instruction.announced) {
        speak(instruction.text);
        instruction.announced = true;
    }
}

function getArrowForDirection(type) {
    // Leaflet Routing Machine direction types
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
    };
    return arrows[type] || '⬆️';
}

function updatePosition(position) {
    currentPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
    };
    
    // Update current location marker
    if (currentLocationMarker) {
        currentLocationMarker.setLatLng([currentPosition.lat, currentPosition.lng]);
        map.panTo([currentPosition.lat, currentPosition.lng]);
    }
    
    // Recalculate route
    if (routeControl) {
        routeControl.setWaypoints([
            L.latLng(currentPosition.lat, currentPosition.lng),
            L.latLng(homeLocation.lat, homeLocation.lng)
        ]);
    }
}

function arrivedHome() {
    stopNavigation();
    speak("Great job! You have arrived home safely.");
    
    // Log arrival
    fetch('/api/navigation/arrived', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId })
    });
    
    // Return to main screen after delay
    setTimeout(() => {
        document.getElementById('nav-screen').classList.remove('active');
        document.getElementById('main-screen').classList.add('active');
    }, 3000);
}

function stopNavigation() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    
    isNavigating = false;
    document.getElementById('take-me-home').classList.remove('loading');
    
    // Clear route
    if (routeControl) {
        map.removeControl(routeControl);
        routeControl = null;
    }
    
    // Return to main screen
    document.getElementById('nav-screen').classList.remove('active');
    document.getElementById('main-screen').classList.add('active');
}

// Emergency functions
function showEmergencyConfirm() {
    document.getElementById('emergency-confirm').classList.add('active');
    speak("Do you need help? Press yes to send your location to your caregiver.");
}

function hideEmergencyConfirm() {
    document.getElementById('emergency-confirm').classList.remove('active');
}

async function sendEmergencyAlert() {
    hideEmergencyConfirm();
    
    // Get current location
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            try {
                const response = await fetch('/api/emergency', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        patient_id: patientId,
                        current_lat: location.lat,
                        current_lng: location.lng
                    })
                });
                
                if (response.ok) {
                    speak("Help is on the way. Your caregiver has been notified.");
                }
            } catch (error) {
                console.error('Emergency alert error:', error);
                speak("I'm having trouble sending the alert. Please call for help.");
            }
        },
        (error) => {
            speak("I cannot find your location. Please call for help.");
        }
    );
}

// Utility functions
function speak(text) {
    // Cancel any ongoing speech
    synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    synth.speak(utterance);
}

async function logNavigationStart() {
    try {
        await fetch('/api/navigation/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_id: patientId,
                current_lat: currentPosition.lat,
                current_lng: currentPosition.lng
            })
        });
    } catch (error) {
        console.error('Error logging navigation start:', error);
    }
}

function handleLocationError(error) {
    console.error('Location error:', error);
    speak("I'm having trouble finding your location. Please make sure GPS is on.");
}