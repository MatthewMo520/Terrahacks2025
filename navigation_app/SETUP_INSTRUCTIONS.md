# 🚀 Setup Instructions - React Navigation App

## Quick Start Guide

### 1. Install Python Dependencies
```bash
cd navigation_app
pip install -r requirements.txt
```

### 2. Install Node.js Dependencies  
```bash
npm install
```

### 3. Start Both Servers

**Terminal 1 - Backend (Flask):**
```bash
python app.py
```
*Should show: Running on http://127.0.0.1:5001*

**Terminal 2 - Frontend (React):**
```bash
npm run dev
```
*Should show: Local: http://localhost:3000*

### 4. Access the App
- **Main App**: `http://localhost:3000`
- **API**: `http://localhost:5001`

## 🎯 How to Test the Connection

### Test 1: Patient Flow
1. Go to `http://localhost:3000`
2. Click on a patient (John Smith, Mary Johnson, or Robert Brown)
3. Click "TAKE ME HOME" - should start navigation
4. Click "EMERGENCY" - should show emergency modal

### Test 2: Caregiver Flow  
1. Go to `http://localhost:3000`
2. Click "Caregiver Login" at bottom
3. Enter passcode: `1234`
4. Click "Setup Home Address" for a patient
5. Click on map to set location → Click "Save Address"
6. Return to dashboard - should show "✓ Set" for home address

### Test 3: API Connection
1. Open browser dev tools (F12)
2. Go to Network tab
3. Navigate through the app
4. Should see API calls to `/api/patients`, `/api/patient/*/home`, etc.

## 🐛 Troubleshooting

### Problem: "Cannot connect to backend"
**Solution**: Make sure Flask is running on port 5001
```bash
cd navigation_app
python app.py
```

### Problem: "npm install fails"
**Solution**: Make sure you have Node.js installed
- Download from: https://nodejs.org/
- Restart terminal after installation

### Problem: "ModuleNotFoundError" in Python
**Solution**: Install missing Python packages
```bash
pip install flask flask-cors python-dotenv pymongo twilio
```

### Problem: React app shows blank page
**Solution**: Check browser console (F12) for errors
```bash
npm run dev
```

### Problem: "Database connection failed"
**Solution**: MongoDB is optional for testing
- App will work with mock data if MongoDB isn't connected
- To use MongoDB: Install MongoDB and set MONGO_URI in .env

## 🔧 Configuration

### Environment Variables (Optional)
Create `.env` file in navigation_app folder:
```
FLASK_SECRET_KEY=your-secret-key
MONGO_URI=mongodb://localhost:27017/
SMS_ENABLED=true
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number
CAREGIVER_PHONE_NUMBER=+1234567890
```

### Default Credentials
- **Caregiver Passcode**: `1234`
- **Patient IDs**: `patient001`, `patient002`, `patient003`

## ✅ Success Indicators

### Backend Working:
- Console shows: "Running on http://127.0.0.1:5001"
- Visit `http://localhost:5001/api/patients` shows JSON

### Frontend Working:
- Console shows: "Local: http://localhost:3000"
- Patient selection screen loads with 3 patients

### Connection Working:
- Patient dashboard loads after selecting patient
- Caregiver dashboard shows patient data
- Home address setup saves successfully
- Emergency button sends API requests

## 🚨 Common Issues

1. **Port 3000 already in use**: Change port in `vite.config.js`
2. **Port 5001 already in use**: Change port in `app.py` 
3. **CORS errors**: Make sure flask-cors is installed
4. **Map not loading**: Check internet connection
5. **Navigation not working**: Ensure HTTPS or allow location on HTTP

Need help? Check the browser console (F12) and terminal output for error messages!