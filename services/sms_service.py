import os
import sys
from datetime import datetime
from twilio.rest import Client
from dotenv import load_dotenv

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

class SMSService:
    def __init__(self):
        """Initialize Twilio SMS service"""
        self.enabled = os.getenv('SMS_ENABLED', 'true').lower() == 'true'
        
        if self.enabled:
            self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
            self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
            self.twilio_phone = os.getenv('TWILIO_PHONE_NUMBER')
            self.caregiver_phone = os.getenv('CAREGIVER_PHONE_NUMBER')
            
            if not all([self.account_sid, self.auth_token, self.twilio_phone, self.caregiver_phone]):
                print("⚠ SMS Service: Missing Twilio configuration in .env file")
                self.enabled = False
            else:
                try:
                    self.client = Client(self.account_sid, self.auth_token)
                    print("✓ SMS Service initialized successfully")
                except Exception as e:
                    print(f"⚠ SMS Service initialization failed: {e}")
                    self.enabled = False
        else:
            print("📱 SMS Service disabled via SMS_ENABLED=false")
    
    def send_sms(self, message: str, phone_number: str = None) -> bool:
        """Send SMS message using Twilio"""
        if not self.enabled:
            return False
        
        try:
            recipient = phone_number or self.caregiver_phone
            
            message_instance = self.client.messages.create(
                body=message,
                from_=self.twilio_phone,
                to=recipient
            )
            
            print(f"✓ SMS sent successfully: {message_instance.sid}")
            return True
            
        except Exception as e:
            print(f"⚠ SMS sending failed: {e}")
            return False
    
    def send_pill_reminder_sms(self, patient_id: str, day_of_week: str, meal_time: str) -> bool:
        """Send pill reminder SMS notification"""
        message = f"🔔 REMINDER: It's {day_of_week} {meal_time}. Time to take your medication."
        return self.send_sms(message)
    
    def send_pill_consumed_sms(self, patient_id: str) -> bool:
        """Send pill consumed confirmation SMS"""
        timestamp = datetime.now().strftime("%I:%M %p")
        message = f"✅ CONFIRMED: Medication taken at {timestamp}"
        return self.send_sms(message)
    
    def send_food_consumed_sms(self, patient_id: str) -> bool:
        """Send food consumption SMS notification"""
        timestamp = datetime.now().strftime("%I:%M %p")
        message = f"🍽️ MEAL: Food consumption detected at {timestamp}"
        return self.send_sms(message)
    
    def send_water_consumed_sms(self, patient_id: str) -> bool:
        """Send water consumption SMS notification"""
        timestamp = datetime.now().strftime("%I:%M %p")
        message = f"💧 HYDRATION: Water intake logged at {timestamp}"
        return self.send_sms(message)
    
    def send_fall_alert_sms(self, patient_id: str, fall_type: str = "unknown", location: str = "unknown location") -> bool:
        """Send fall detection alert SMS with location"""
        timestamp = datetime.now().strftime("%I:%M %p")
        message = f"🚨 FALL ALERT: Patient {patient_id} may have fallen at {timestamp} at {location}. Fall type: {fall_type}. Please check immediately!"
        return self.send_sms(message)
    
    def trigger_emergency_call(self, patient_id: str, location: str = "unknown location") -> bool:
        """Trigger emergency voice call for fall detection"""
        try:
            import requests
            
            # Call the emergency notification system
            api_url = "http://localhost:5000/send_notification"
            payload = {
                "teammate": "Fall Detection System",
                "notification_type": "all",  # SMS + Voice call
                "person_name": patient_id,
                "location": location
            }
            
            response = requests.post(api_url, json=payload, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    print(f"✅ Emergency call and SMS triggered successfully for {patient_id} at {location}")
                    return True
                else:
                    print(f"❌ Emergency call failed: {result.get('error')}")
                    return False
            else:
                print(f"❌ Emergency call HTTP error: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Emergency call system error: {e}")
            # Fall back to SMS only
            return self.send_fall_alert_sms(patient_id, "fall detected", location)
    
    def test_sms(self) -> bool:
        """Send a test SMS to verify configuration"""
        test_message = "🧪 TEST: SMS service is working correctly!"
        return self.send_sms(test_message)