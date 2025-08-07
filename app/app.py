import os
import sys
import requests
import time
from flask import Flask, render_template, request, jsonify
from datetime import datetime
from dotenv import load_dotenv

# Add parent directory to path to import existing modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import only SMS service (MongoDB models not needed for in-memory demo)
try:
    from services.sms_service import SMSService
    sms_service = SMSService()
except (ImportError, UnicodeEncodeError, Exception) as e:
    print(f"SMS service not available - continuing without SMS functionality: {type(e).__name__}")
    class DummySMSService:
        def send_sms(self, message):
            print(f"SMS (not sent): {message}")
            return False
    sms_service = DummySMSService()
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'navigation-app-secret-key')

# Enable CORS for React frontend
CORS(app)

# Simple file-based persistence for demo
import json

def load_patient_data():
    """Load patient data from file with improved error handling"""
    file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'patient_data.json')
    backup_path = file_path + '.backup'
    
    # Try to load from main file first
    for path_to_try in [file_path, backup_path]:
        if os.path.exists(path_to_try):
            try:
                print(f"Loading patient data from {path_to_try}")
                with open(path_to_try, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # Convert datetime strings back to datetime objects
                    for patient_id, patient in data.items():
                        if patient.get('last_active'):
                            try:
                                patient['last_active'] = datetime.fromisoformat(patient['last_active'])
                            except (ValueError, TypeError):
                                patient['last_active'] = datetime.now()
                    print(f"Successfully loaded patient data with {len(data)} patients")
                    return data
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                print(f"Error reading {path_to_try}: {e}")
                continue
            except Exception as e:
                print(f"Unexpected error loading {path_to_try}: {e}")
                continue
    
    # Return default data if no file could be loaded
    print("No existing patient data found, using defaults")
    return {
        'patient': {
            'id': 'patient',
            'name': 'Patient',
            'home_address': None,
            'home_lat': None,
            'home_lng': None,
            'last_active': datetime.now()
        }
    }

def save_patient_data():
    """Save patient data to file with improved error handling"""
    try:
        # Use absolute path in app directory
        file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'patient_data.json')
        
        data_to_save = {}
        for patient_id, patient in PATIENT_DATA.items():
            patient_copy = patient.copy()
            # Convert datetime to string for JSON serialization
            if patient_copy.get('last_active'):
                patient_copy['last_active'] = patient_copy['last_active'].isoformat()
            data_to_save[patient_id] = patient_copy
        
        # Create backup of existing file if it exists
        if os.path.exists(file_path):
            backup_path = file_path + '.backup'
            try:
                import shutil
                shutil.copy2(file_path, backup_path)
            except Exception as backup_error:
                print(f"Warning: Could not create backup: {backup_error}")
        
        # Write to temporary file first, then rename for atomic operation
        temp_path = file_path + '.tmp'
        with open(temp_path, 'w', encoding='utf-8') as f:
            json.dump(data_to_save, f, indent=2, ensure_ascii=False)
        
        # Atomic rename
        if os.path.exists(temp_path):
            if os.name == 'nt':  # Windows
                if os.path.exists(file_path):
                    os.remove(file_path)
            os.rename(temp_path, file_path)
            
        print(f"Successfully saved patient data to {file_path}")
        return True
        
    except PermissionError as e:
        print(f"Permission error saving patient data: {e}")
        print("Location data will only be stored in memory for this session")
        return False
    except Exception as e:
        print(f"Error saving patient data: {e}")
        # Clean up temp file if it exists
        temp_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'patient_data.json.tmp')
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass
        return False

# Load patient data from file
PATIENT_DATA = load_patient_data()

# Activity tracking
RECENT_ACTIVITIES = []

def geocode_address(address):
    """Convert address to coordinates using OpenStreetMap Nominatim"""
    try:
        # Clean and format the address
        address = address.strip()
        if not address:
            return None, "Address cannot be empty"
        
        # Use Nominatim API (free, no API key required)
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            'q': address,
            'format': 'json',
            'limit': 1,
            'addressdetails': 1,
            'countrycodes': 'ca,us'  # Limit to Canada and US for better results
        }
        
        headers = {
            'User-Agent': 'AlzheimerNavigationApp/1.0'  # Required by Nominatim
        }
        
        # Add a small delay to be respectful to the API
        time.sleep(0.1)
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if not data:
            return None, f"Could not find coordinates for address: {address}"
        
        result = data[0]
        lat = float(result['lat'])
        lng = float(result['lon'])
        
        # Get the formatted address from the response
        display_name = result.get('display_name', address)
        
        return {
            'lat': lat,
            'lng': lng,
            'formatted_address': display_name,
            'original_address': address
        }, None
        
    except requests.exceptions.Timeout:
        return None, "Address lookup timed out. Please try again."
    except requests.exceptions.RequestException as e:
        return None, f"Network error during address lookup: {str(e)}"
    except (ValueError, KeyError, IndexError) as e:
        return None, f"Error processing address data: {str(e)}"
    except Exception as e:
        return None, f"Unexpected error during address lookup: {str(e)}"

def reverse_geocode(lat, lng):
    """Convert coordinates to address using OpenStreetMap Nominatim"""
    try:
        # Validate coordinates
        if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
            return None, "Invalid coordinates"
        
        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            return None, "Coordinates out of valid range"
        
        # Use Nominatim reverse geocoding API
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            'lat': lat,
            'lon': lng,
            'format': 'json',
            'addressdetails': 1,
            'zoom': 18  # Street level detail
        }
        
        headers = {
            'User-Agent': 'AlzheimerNavigationApp/1.0'  # Required by Nominatim
        }
        
        # Add a small delay to be respectful to the API
        time.sleep(0.1)
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if not data or 'display_name' not in data:
            return None, f"Could not find address for coordinates: {lat}, {lng}"
        
        # Extract address components
        address_parts = []
        addr = data.get('address', {})
        
        # Build a nice address format
        if addr.get('house_number'):
            address_parts.append(addr['house_number'])
        if addr.get('road'):
            address_parts.append(addr['road'])
        elif addr.get('pedestrian'):
            address_parts.append(addr['pedestrian'])
        
        # Add city/town
        city = addr.get('city') or addr.get('town') or addr.get('village') or addr.get('suburb')
        if city:
            address_parts.append(city)
            
        # Add province/state
        province = addr.get('state') or addr.get('province')
        if province:
            address_parts.append(province)
            
        # Add country if not Canada or US
        country = addr.get('country')
        if country and country not in ['Canada', 'United States']:
            address_parts.append(country)
        
        # Create formatted address
        if address_parts:
            formatted_address = ', '.join(address_parts)
        else:
            formatted_address = data['display_name']
        
        return {
            'formatted_address': formatted_address,
            'full_address': data['display_name'],
            'lat': lat,
            'lng': lng
        }, None
        
    except requests.exceptions.Timeout:
        return None, "Address lookup timed out. Please try again."
    except requests.exceptions.RequestException as e:
        return None, f"Network error during address lookup: {str(e)}"
    except Exception as e:
        return None, f"Unexpected error during reverse geocoding: {str(e)}"

def add_activity(patient_id, activity_type, description):
    """Add activity to recent activities list"""
    activity = {
        'patient_id': patient_id,
        'type': activity_type,
        'description': description,
        'timestamp': datetime.now()
    }
    RECENT_ACTIVITIES.insert(0, activity)  # Add to beginning
    # Keep only last 50 activities
    if len(RECENT_ACTIVITIES) > 50:
        RECENT_ACTIVITIES.pop()
    
    # Update patient last active
    if patient_id in PATIENT_DATA:
        PATIENT_DATA[patient_id]['last_active'] = datetime.now()

@app.route('/')
def index():
    """Main navigation interface"""
    return render_template('index.html')

@app.route('/setup')
def setup():
    """Caregiver setup page"""
    return render_template('setup.html')

@app.route('/api/patients')
def get_patients():
    """Get all patients"""
    try:
        patients = list(PATIENT_DATA.values())
        # Format last_active for display
        for patient in patients:
            if patient['last_active']:
                time_diff = datetime.now() - patient['last_active']
                if time_diff.seconds < 60:
                    patient['last_active_display'] = 'Just now'
                elif time_diff.seconds < 3600:
                    patient['last_active_display'] = f'{time_diff.seconds // 60} minutes ago'
                elif time_diff.days == 0:
                    patient['last_active_display'] = f'{time_diff.seconds // 3600} hours ago'
                else:
                    patient['last_active_display'] = f'{time_diff.days} days ago'
            else:
                patient['last_active_display'] = 'Never'
        
        return jsonify({
            'success': True,
            'patients': patients
        })
    except Exception as e:
        print(f"Error getting patients: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/patient/<patient_id>')
def get_patient(patient_id):
    """Get specific patient"""
    try:
        if patient_id not in PATIENT_DATA:
            return jsonify({
                'success': False,
                'error': 'Patient not found'
            }), 404
        
        patient = PATIENT_DATA[patient_id].copy()
        add_activity(patient_id, 'view', 'Patient profile viewed')
        
        return jsonify({
            'success': True,
            'patient': patient
        })
    except Exception as e:
        print(f"Error getting patient {patient_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/patient/<patient_id>/home')
def get_home_address(patient_id):
    """Get patient's home address"""
    try:
        if patient_id not in PATIENT_DATA:
            return jsonify({
                'success': False,
                'error': 'Patient not found'
            }), 404
        
        patient = PATIENT_DATA[patient_id]
        add_activity(patient_id, 'view', 'Home address viewed')
        
        if patient.get('home_address'):
            return jsonify({
                'success': True,
                'home_address': patient['home_address'],
                'home_lat': patient.get('home_lat', 0),
                'home_lng': patient.get('home_lng', 0)
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Home address not found'
            }), 404
    except Exception as e:
        print(f"Error getting home address for {patient_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/geocode', methods=['POST'])
def geocode_address_endpoint():
    """Convert address to coordinates"""
    try:
        data = request.json
        address = data.get('address', '').strip()
        
        if not address:
            return jsonify({
                'success': False,
                'error': 'Address is required'
            }), 400
        
        result, error = geocode_address(address)
        
        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 400
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        print(f"Error in geocode endpoint: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/reverse-geocode', methods=['POST'])
def reverse_geocode_endpoint():
    """Convert coordinates to address"""
    try:
        data = request.json
        lat = data.get('lat')
        lng = data.get('lng')
        
        if lat is None or lng is None:
            return jsonify({
                'success': False,
                'error': 'Latitude and longitude are required'
            }), 400
        
        result, error = reverse_geocode(lat, lng)
        
        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 400
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        print(f"Error in reverse geocode endpoint: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/patient/<patient_id>/home', methods=['POST'])
def set_home_address(patient_id):
    """Set patient's home address - supports both address string and coordinates"""
    try:
        data = request.json
        
        # Ensure patient exists in memory
        if patient_id not in PATIENT_DATA:
            return jsonify({
                'success': False,
                'error': 'Patient not found'
            }), 404
        
        # Check if we got coordinates directly or need to geocode an address
        home_lat = data.get('home_lat')
        home_lng = data.get('home_lng')
        home_address = data.get('home_address', '').strip()
        
        if home_lat is not None and home_lng is not None:
            # Direct coordinates provided
            if not isinstance(home_lat, (int, float)) or not isinstance(home_lng, (int, float)):
                return jsonify({
                    'success': False,
                    'error': 'Valid latitude and longitude coordinates are required'
                }), 400
                
            # Validate coordinate ranges
            if not (-90 <= home_lat <= 90) or not (-180 <= home_lng <= 180):
                return jsonify({
                    'success': False,
                    'error': 'Invalid coordinate values (lat: -90 to 90, lng: -180 to 180)'
                }), 400
            
            final_lat = float(home_lat)
            final_lng = float(home_lng)
            
            # If no address provided, try to reverse geocode
            if not home_address:
                print(f"Reverse geocoding coordinates: {final_lat}, {final_lng}")
                reverse_result, reverse_error = reverse_geocode(final_lat, final_lng)
                
                if reverse_result and not reverse_error:
                    final_address = reverse_result['formatted_address']
                    print(f"Reverse geocoded to: {final_address}")
                else:
                    final_address = f"Location ({final_lat}, {final_lng})"
                    print(f"Reverse geocoding failed: {reverse_error}, using default")
            else:
                final_address = home_address
            
        elif home_address:
            # Need to geocode the address
            print(f"Geocoding address: {home_address}")
            result, error = geocode_address(home_address)
            
            if error:
                return jsonify({
                    'success': False,
                    'error': f"Could not find location for address '{home_address}': {error}"
                }), 400
            
            final_address = result['formatted_address']
            final_lat = result['lat']
            final_lng = result['lng']
            print(f"Geocoded to: {final_lat}, {final_lng}")
            
        else:
            return jsonify({
                'success': False,
                'error': 'Either home_address or coordinates (home_lat, home_lng) are required'
            }), 400

        # Update patient data in memory
        PATIENT_DATA[patient_id]['home_address'] = final_address
        PATIENT_DATA[patient_id]['home_lat'] = final_lat
        PATIENT_DATA[patient_id]['home_lng'] = final_lng
        
        # Try to save to file
        save_success = save_patient_data()
        
        # Add activity
        add_activity(patient_id, 'home_setup', f'Home address updated: {final_address}')
        
        print(f"Updated home address for {patient_id}: {final_address} at ({final_lat}, {final_lng})")
        
        return jsonify({
            'success': True,
            'saved_to_file': save_success,
            'home_address': final_address,
            'home_lat': final_lat,
            'home_lng': final_lng,
            'message': 'Home address updated successfully' + ('' if save_success else ' (in memory only)')
        })
        
    except Exception as e:
        print(f"Error setting home address: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/navigation/start', methods=['POST'])
def start_navigation():
    """Log navigation start and send SMS alert"""
    try:
        data = request.json
        patient_id = data.get('patient_id', 'default_patient')
        current_lat = data.get('current_lat')
        current_lng = data.get('current_lng')
        
        # Add activity
        add_activity(patient_id, 'navigation', f'Started navigation from ({current_lat}, {current_lng})')
        
        # Send SMS alert to caregiver
        try:
            message = f"NAVIGATION ALERT: Patient {patient_id} has started navigation to go home from location: {current_lat}, {current_lng}"
            sms_service.send_sms(message)
        except Exception as sms_error:
            print(f"SMS error: {sms_error}")
        
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error starting navigation: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/navigation/arrived', methods=['POST'])
def navigation_arrived():
    """Log successful arrival at home"""
    try:
        data = request.json
        patient_id = data.get('patient_id', 'default_patient')
        
        # Add activity
        add_activity(patient_id, 'arrival', 'Successfully arrived home')
        
        # Send SMS confirmation
        try:
            message = f"✅ ARRIVED: Patient {patient_id} has safely arrived home."
            sms_service.send_sms(message)
        except Exception as sms_error:
            print(f"SMS error: {sms_error}")
        
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error logging arrival: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/emergency', methods=['POST'])
def emergency_alert():
    """Send emergency alert"""
    try:
        data = request.json
        patient_id = data.get('patient_id', 'default_patient')
        current_lat = data.get('current_lat')
        current_lng = data.get('current_lng')
        
        # Add high-priority activity
        add_activity(patient_id, 'emergency', f'EMERGENCY BUTTON PRESSED at ({current_lat}, {current_lng})')
        
        # Send emergency SMS
        try:
            message = f"🚨 EMERGENCY: Patient {patient_id} needs help! Location: {current_lat}, {current_lng}. Google Maps: https://maps.google.com/?q={current_lat},{current_lng}"
            sms_service.send_sms(message)
        except Exception as sms_error:
            print(f"SMS error: {sms_error}")
        
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error handling emergency: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/activities')
def get_recent_activities():
    """Get recent activities for all patients"""
    try:
        # Format activities for display
        formatted_activities = []
        for activity in RECENT_ACTIVITIES[:10]:  # Get last 10 activities
            patient_name = 'Unknown'
            if activity['patient_id'] in PATIENT_DATA:
                patient_name = PATIENT_DATA[activity['patient_id']]['name']
            
            # Format timestamp
            time_diff = datetime.now() - activity['timestamp']
            if time_diff.seconds < 60:
                time_display = 'Just now'
            elif time_diff.seconds < 3600:
                time_display = f'{time_diff.seconds // 60} minutes ago'
            elif time_diff.days == 0:
                time_display = f'{time_diff.seconds // 3600} hours ago'
            else:
                time_display = f'{time_diff.days} days ago'
            
            formatted_activities.append({
                'patient_name': patient_name,
                'type': activity['type'],
                'description': activity['description'],
                'time_display': time_display,
                'timestamp': activity['timestamp'].isoformat()
            })
        
        return jsonify({
            'success': True,
            'activities': formatted_activities
        })
    except Exception as e:
        print(f"Error getting activities: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)  # Different port from main app