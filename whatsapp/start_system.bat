@echo off
echo 🚨 Starting Emergency Phone Call System...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.7+ from https://python.org
    pause
    exit /b 1
)

REM Check if requirements are installed
echo 📦 Checking dependencies...
pip show twilio >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  .env file not found!
    echo 📝 Please create a .env file with your Twilio credentials
    echo 📋 See env_example.txt for the required format
    echo.
    echo 💡 Quick setup:
    echo 1. Copy env_example.txt to .env
    echo 2. Edit .env with your Twilio credentials
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
)

echo ✅ Dependencies and configuration ready
echo 🚀 Starting phone call system...
echo.
echo 📞 Target Number: 647-236-5358
echo 🌐 Web Interface: http://localhost:5000
echo 📋 Health Check: http://localhost:5000/health
echo.
echo 💡 To trigger calls from command line:
echo    python trigger_call.py call
echo.
echo Press Ctrl+C to stop the system
echo.

python phone_call_system.py

pause 