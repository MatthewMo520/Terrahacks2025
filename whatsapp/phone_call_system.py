import os
import logging
import smtplib
import requests
import json
from datetime import datetime
from flask import Flask, request, jsonify, render_template_string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('phone_call_system.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'default-secret-key')

# Configuration
TARGET_PHONE_NUMBER = os.getenv('TARGET_PHONE_NUMBER', '647-236-5358')
TARGET_EMAIL = os.getenv('TARGET_EMAIL', 'emergency@example.com')
# Emergency message with name placeholder
EMERGENCY_MESSAGE_TEMPLATE = "{name} has fallen. 911 services have been contacted."

# Email configuration (optional)
EMAIL_ENABLED = os.getenv('EMAIL_ENABLED', 'false').lower() == 'true'
SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
EMAIL_USER = os.getenv('EMAIL_USER', '')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD', '')

# WhatsApp Business API configuration
WHATSAPP_ENABLED = os.getenv('WHATSAPP_ENABLED', 'false').lower() == 'true'
WHATSAPP_TOKEN = os.getenv('WHATSAPP_TOKEN', '')
WHATSAPP_PHONE_ID = os.getenv('WHATSAPP_PHONE_ID', '')

class EmergencyNotificationSystem:
    def __init__(self):
        self.emergency_message_template = EMERGENCY_MESSAGE_TEMPLATE
        self.notification_history = []
        self.simulation_mode = True  # Set to False for real notifications
    
    def send_emergency_notification(self, teammate_name="Unknown", notification_type="all", person_name="[NAME_PLACEHOLDER]"):
        """
        Send emergency notification via multiple channels
        """
        try:
            logger.info(f"Sending emergency notification from {teammate_name} for {person_name}")
            
            # Create the personalized emergency message
            emergency_message = self.emergency_message_template.format(name=person_name)
            
            # Create notification record
            notification_record = {
                "id": f"emergency_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "timestamp": datetime.now().isoformat(),
                "teammate": teammate_name,
                "person_name": person_name,
                "type": notification_type,
                "status": "initiated",
                "message": emergency_message
            }
            
            success_channels = []
            
            # 1. Web Notification (always works)
            if self._send_web_notification(notification_record):
                success_channels.append("web")
            
            # 2. Email Notification (if configured)
            if EMAIL_ENABLED and notification_type in ["email", "all"]:
                if self._send_email_notification(notification_record):
                    success_channels.append("email")
            
            # 3. WhatsApp Business API (if configured)
            if WHATSAPP_ENABLED and notification_type in ["whatsapp", "all"]:
                if self._send_whatsapp_message(notification_record):
                    success_channels.append("whatsapp")
            
            # 4. Simulated Phone Call
            if notification_type in ["phone", "all"]:
                if self._simulate_phone_call(notification_record):
                    success_channels.append("phone_simulation")
            
            # 5. Log to file
            self._log_emergency(notification_record)
            
            # Update status
            notification_record["status"] = "completed"
            notification_record["success_channels"] = success_channels
            self.notification_history.append(notification_record)
            
            logger.info(f"Emergency notification sent via: {', '.join(success_channels)}")
            return {
                "success": True,
                "notification_id": notification_record["id"],
                "channels": success_channels,
                "message": emergency_message
            }
            
        except Exception as e:
            logger.error(f"Failed to send emergency notification: {e}")
            return {"success": False, "error": str(e)}
    
    def _send_web_notification(self, notification_record):
        """Send web-based notification"""
        try:
            # This could integrate with web push notifications, Slack, Discord, etc.
            logger.info(f"Web notification sent: {notification_record['message']}")
            return True
        except Exception as e:
            logger.error(f"Web notification failed: {e}")
            return False
    
    def _send_email_notification(self, notification_record):
        """Send email notification"""
        try:
            if not EMAIL_USER or not EMAIL_PASSWORD:
                logger.warning("Email not configured, skipping email notification")
                return False
            
            msg = MIMEMultipart()
            msg['From'] = EMAIL_USER
            msg['To'] = TARGET_EMAIL
            msg['Subject'] = "🚨 EMERGENCY ALERT - Person Fall"
            
            body = f"""
            EMERGENCY NOTIFICATION
            
            {notification_record['message']}
            
            Details:
            - Time: {notification_record['timestamp']}
            - Triggered by: {notification_record['teammate']}
            - Person: {notification_record['person_name']}
            - Target Phone: {TARGET_PHONE_NUMBER}
            
            Please respond immediately!
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            text = msg.as_string()
            server.sendmail(EMAIL_USER, TARGET_EMAIL, text)
            server.quit()
            
            logger.info(f"Email notification sent to {TARGET_EMAIL}")
            return True
            
        except Exception as e:
            logger.error(f"Email notification failed: {e}")
            return False
    
    def _send_whatsapp_message(self, notification_record):
        """Send WhatsApp message using WhatsApp Business API"""
        try:
            if not WHATSAPP_TOKEN or not WHATSAPP_PHONE_ID:
                logger.warning("WhatsApp not configured, skipping WhatsApp notification")
                return False
            
            # Format phone number for WhatsApp (remove + and add country code if needed)
            phone_number = TARGET_PHONE_NUMBER.replace('-', '').replace(' ', '')
            if not phone_number.startswith('1'):
                phone_number = '1' + phone_number  # Add US country code
            
            # WhatsApp Business API endpoint
            url = f"https://graph.facebook.com/v18.0/{WHATSAPP_PHONE_ID}/messages"
            
            headers = {
                'Authorization': f'Bearer {WHATSAPP_TOKEN}',
                'Content-Type': 'application/json'
            }
            
            # Create the message payload
            payload = {
                "messaging_product": "whatsapp",
                "to": phone_number,
                "type": "text",
                "text": {
                    "body": f"🚨 EMERGENCY ALERT 🚨\n\n{notification_record['message']}\n\nTime: {notification_record['timestamp']}\nTriggered by: {notification_record['teammate']}\n\nPlease respond immediately!"
                }
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"WhatsApp message sent successfully to {phone_number}")
                logger.info(f"WhatsApp response: {result}")
                return True
            else:
                logger.error(f"WhatsApp API error: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"WhatsApp notification failed: {e}")
            return False
    
    def _simulate_phone_call(self, notification_record):
        """Simulate a phone call (for demo purposes)"""
        try:
            logger.info(f"SIMULATION: Making emergency call to {TARGET_PHONE_NUMBER}")
            logger.info(f"SIMULATION: Playing message: {notification_record['message']}")
            
            # In a real implementation, this could:
            # - Use a free SMS service like TextLocal, MSG91
            # - Use WhatsApp Business API (now implemented above)
            # - Use Telegram Bot API
            # - Use Discord webhooks
            
            return True
        except Exception as e:
            logger.error(f"Phone call simulation failed: {e}")
            return False
    
    def _log_emergency(self, notification_record):
        """Log emergency to file"""
        try:
            with open('emergency_log.txt', 'a') as f:
                f.write(f"{notification_record['timestamp']} - EMERGENCY: {notification_record['message']} (by {notification_record['teammate']} for {notification_record['person_name']})\n")
        except Exception as e:
            logger.error(f"Failed to log emergency: {e}")
    
    def get_notification_history(self):
        """Get the history of emergency notifications"""
        return self.notification_history

# Initialize the notification system
notification_system = EmergencyNotificationSystem()

@app.route('/')
def home():
    """Home page with simple interface"""
    html_template = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Emergency Notification System</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .emergency-btn { background-color: #dc3545; color: white; padding: 15px 30px; border: none; border-radius: 5px; font-size: 18px; cursor: pointer; margin: 10px 5px; }
            .emergency-btn:hover { background-color: #c82333; }
            .secondary-btn { background-color: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; font-size: 14px; cursor: pointer; margin: 5px; }
            .secondary-btn:hover { background-color: #0056b3; }
            .whatsapp-btn { background-color: #25D366; color: white; padding: 10px 20px; border: none; border-radius: 5px; font-size: 14px; cursor: pointer; margin: 5px; }
            .whatsapp-btn:hover { background-color: #128C7E; }
            .status { margin: 20px 0; padding: 15px; border-radius: 5px; }
            .success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
            .info { background-color: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
            .history { margin-top: 30px; }
            .history-item { background-color: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 5px; }
            .config { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .input-group { margin: 15px 0; }
            .input-group label { display: block; margin-bottom: 5px; font-weight: bold; }
            .input-group input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚨 Emergency Notification System</h1>
            <p>This system can send emergency notifications via multiple channels to alert about person falls.</p>
            
            <div class="config">
                <h3>📋 Current Configuration:</h3>
                <p><strong>Target Phone:</strong> 647-236-5358</p>
                <p><strong>Message Template:</strong> "{name} has fallen. 911 services have been contacted."</p>
                <p><strong>Available Channels:</strong> Web, Email, WhatsApp Business API, Phone Simulation</p>
            </div>
            
            <div class="input-group">
                <label for="personName">Person Name:</label>
                <input type="text" id="personName" placeholder="Enter person's name" value="[NAME_PLACEHOLDER]">
            </div>
            
            <div>
                <button class="emergency-btn" onclick="sendEmergencyNotification('all')">🚨 Send Emergency Alert (All Channels)</button>
                <button class="secondary-btn" onclick="sendEmergencyNotification('web')">🌐 Web Only</button>
                <button class="secondary-btn" onclick="sendEmergencyNotification('email')">📧 Email Only</button>
                <button class="whatsapp-btn" onclick="sendEmergencyNotification('whatsapp')">📱 WhatsApp Only</button>
                <button class="secondary-btn" onclick="sendEmergencyNotification('phone')">📞 Phone Simulation</button>
            </div>
            
            <div>
                <button class="secondary-btn" onclick="getNotificationHistory()">📋 Notification History</button>
                <button class="secondary-btn" onclick="checkSystemStatus()">🔍 System Status</button>
            </div>
            
            <div id="status"></div>
            <div id="history" class="history"></div>
        </div>
        
        <script>
            function sendEmergencyNotification(type) {
                const personName = document.getElementById('personName').value || '[NAME_PLACEHOLDER]';
                document.getElementById('status').innerHTML = '<div class="status info">Sending emergency notification...</div>';
                
                fetch('/send_notification', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        teammate: 'Web Interface',
                        notification_type: type,
                        person_name: personName
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('status').innerHTML = 
                            '<div class="status success">✅ Emergency notification sent successfully!<br>' +
                            'Notification ID: ' + data.notification_id + '<br>' +
                            'Channels: ' + data.channels.join(', ') + '<br>' +
                            'Message: ' + data.message + '</div>';
                    } else {
                        document.getElementById('status').innerHTML = 
                            '<div class="status error">❌ Failed to send notification: ' + data.error + '</div>';
                    }
                })
                .catch(error => {
                    document.getElementById('status').innerHTML = 
                        '<div class="status error">❌ Error: ' + error + '</div>';
                });
            }
            
            function getNotificationHistory() {
                fetch('/notification_history')
                .then(response => response.json())
                .then(data => {
                    let historyHtml = '<h3>Notification History:</h3>';
                    if (data.length === 0) {
                        historyHtml += '<p>No notifications sent yet.</p>';
                    } else {
                        data.forEach(notification => {
                            historyHtml += '<div class="history-item">';
                            historyHtml += '<strong>ID:</strong> ' + notification.id + '<br>';
                            historyHtml += '<strong>Time:</strong> ' + notification.timestamp + '<br>';
                            historyHtml += '<strong>Teammate:</strong> ' + notification.teammate + '<br>';
                            historyHtml += '<strong>Person:</strong> ' + notification.person_name + '<br>';
                            historyHtml += '<strong>Type:</strong> ' + notification.type + '<br>';
                            historyHtml += '<strong>Status:</strong> ' + notification.status;
                            if (notification.success_channels) {
                                historyHtml += '<br><strong>Channels:</strong> ' + notification.success_channels.join(', ');
                            }
                            historyHtml += '</div>';
                        });
                    }
                    document.getElementById('history').innerHTML = historyHtml;
                });
            }
            
            function checkSystemStatus() {
                fetch('/health')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('status').innerHTML = 
                        '<div class="status info">✅ System Status: ' + data.status + '<br>' +
                        'Target Phone: ' + data.target_number + '<br>' +
                        'Email Enabled: ' + data.email_enabled + '<br>' +
                        'WhatsApp Enabled: ' + data.whatsapp_enabled + '</div>';
                });
            }
        </script>
    </body>
    </html>
    """
    return render_template_string(html_template)

@app.route('/send_notification', methods=['POST'])
def send_notification():
    """API endpoint to send emergency notification"""
    try:
        data = request.get_json()
        teammate_name = data.get('teammate', 'Unknown') if data else 'Unknown'
        notification_type = data.get('notification_type', 'all') if data else 'all'
        person_name = data.get('person_name', '[NAME_PLACEHOLDER]') if data else '[NAME_PLACEHOLDER]'
        
        result = notification_system.send_emergency_notification(teammate_name, notification_type, person_name)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in send_notification endpoint: {e}")
        return jsonify({"success": False, "error": str(e)})

@app.route('/notification_history')
def notification_history():
    """API endpoint to get notification history"""
    return jsonify(notification_system.get_notification_history())

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "target_number": TARGET_PHONE_NUMBER,
        "email_enabled": EMAIL_ENABLED,
        "whatsapp_enabled": WHATSAPP_ENABLED,
        "simulation_mode": notification_system.simulation_mode
    })

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚨 Emergency Notification System")
    print("="*60)
    print("✅ No external APIs required!")
    print("📞 Target Number: 647-236-5358")
    print("💬 Message Template: '{name} has fallen. 911 services have been contacted.'")
    print("🌐 Web Interface: http://localhost:5000")
    print("📋 Health Check: http://localhost:5000/health")
    print()
    print("💡 Features:")
    print("   - Web notifications (always works)")
    print("   - Email notifications (if configured)")
    print("   - WhatsApp Business API (if configured)")
    print("   - Phone call simulation")
    print("   - Comprehensive logging")
    print("   - Multiple notification channels")
    print("   - Customizable person name")
    print("="*60)
    
    app.run(debug=True, host='0.0.0.0', port=5000) 