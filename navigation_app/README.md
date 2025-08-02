# Navigation App for Alzheimer's Patients

A simple GPS navigation web application designed specifically for Alzheimer's patients to help them find their way home.

## Features

### For Patients
- **Large "Take Me Home" Button** - One-touch navigation to pre-set home address
- **Simple Interface** - Minimal, high-contrast design with large buttons
- **Voice Guidance** - Turn-by-turn audio instructions
- **Emergency Button** - Instant alert to caregiver with location
- **Visual Directions** - Large arrows and simple text directions

### For Caregivers
- **Home Address Setup** - Set patient's home address via `/setup` page
- **SMS Alerts** - Notifications when:
  - Patient starts navigation
  - Patient arrives home safely
  - Emergency button is pressed
- **Location Tracking** - Real-time patient location during navigation
- **Event Logging** - All navigation events stored in MongoDB

## Setup

### Prerequisites
- Python 3.8+
- MongoDB instance running
- Google Maps API key
- Twilio account (for SMS alerts)

### Installation

1. Install dependencies:
```bash
cd navigation_app
pip install -r requirements.txt
```

2. Set up environment variables in `.env`:
```
FLASK_SECRET_KEY=your-secret-key
MONGO_URI=mongodb://localhost:27017/
SMS_ENABLED=true
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number
CAREGIVER_PHONE_NUMBER=caregiver-phone
```

3. Add Google Maps API key:
- Edit `templates/index.html` and `templates/setup.html`
- Replace `YOUR_API_KEY` with your actual Google Maps API key

### Running the App

```bash
python app.py
```

The app will run on `http://localhost:5001`

## Usage

### For Caregivers
1. Go to `http://localhost:5001/setup`
2. Enter patient ID (e.g., "patient001")
3. Enter home address or drag marker on map
4. Click "Save Home Address"

### For Patients
1. Go to `http://localhost:5001`
2. Press "TAKE ME HOME" button
3. Follow the on-screen directions
4. Press "EMERGENCY" if help is needed

## API Endpoints

- `GET /` - Main navigation interface
- `GET /setup` - Caregiver setup page
- `GET /api/patient/<patient_id>/home` - Get patient's home address
- `POST /api/patient/<patient_id>/home` - Set patient's home address
- `POST /api/navigation/start` - Log navigation start
- `POST /api/navigation/arrived` - Log arrival at home
- `POST /api/emergency` - Send emergency alert

## Security Considerations

- Patient IDs should be properly authenticated in production
- HTTPS should be used for all connections
- API keys should be restricted and rotated regularly
- Consider adding login/authentication for caregivers

## Future Enhancements

- Offline mode using Progressive Web App (PWA)
- Multiple destination presets (doctor, pharmacy, etc.)
- Geofencing alerts when patient leaves safe zones
- Integration with wearable devices
- Family member app for real-time tracking
- Voice commands for hands-free operation

## Support

For issues or questions, please contact the development team.