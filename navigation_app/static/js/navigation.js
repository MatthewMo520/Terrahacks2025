// Navigation App for Alzheimer's Patients
let map;
let directionsService;
let directionsRenderer;
let watchId;
let currentPosition;
let homeLocation;
let isNavigating = false;
let patientId = 'default_patient'; // This should be set based on login

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
            // For demo, use a default location
            const defaultHome = {
                lat: 43.6532,  // Toronto
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
    // Initialize Google Maps
    map = new google.maps.Map(document.getElementById('map-container'), {
        zoom: 16,
        center: currentPosition,
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
    });
    
    // Initialize directions
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: false,
        polylineOptions: {
            strokeColor: '#4CAF50',
            strokeWeight: 6
        }
    });
    
    // Calculate initial route
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
    const request = {
        origin: currentPosition,
        destination: homeLocation,
        travelMode: google.maps.TravelMode.WALKING
    };
    
    directionsService.route(request, (result, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(result);
            updateDirectionDisplay(result.routes[0].legs[0]);
        } else {
            speak("I'm having trouble finding the way home. Please try again.");
            console.error('Directions error:', status);
        }
    });
}

function updatePosition(position) {
    currentPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
    };
    
    // Recalculate route
    calculateRoute();
    
    // Check if arrived home (within 50 meters)
    const distance = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(currentPosition.lat, currentPosition.lng),
        new google.maps.LatLng(homeLocation.lat, homeLocation.lng)
    );
    
    if (distance < 50) {
        arrivedHome();
    }
}

function updateDirectionDisplay(leg) {
    const step = leg.steps[0];
    if (!step) return;
    
    // Update arrow based on maneuver
    const arrow = getArrowForDirection(step.maneuver);
    document.getElementById('direction-arrow').textContent = arrow;
    
    // Update direction text
    const instruction = step.instructions.replace(/<[^>]*>/g, ''); // Remove HTML
    document.getElementById('direction-text').textContent = instruction;
    
    // Update distance
    document.getElementById('distance-text').textContent = step.distance.text;
    
    // Voice guidance for significant changes
    if (step.distance.value < 50) {
        speak(instruction);
    }
}

function getArrowForDirection(maneuver) {
    const arrows = {
        'turn-left': '⬅️',
        'turn-right': '➡️',
        'straight': '⬆️',
        'turn-slight-left': '↖️',
        'turn-slight-right': '↗️',
        'uturn-left': '↩️',
        'uturn-right': '↪️'
    };
    return arrows[maneuver] || '⬆️';
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
    
    // Return to main screen
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