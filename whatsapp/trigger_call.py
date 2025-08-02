#!/usr/bin/env python3
"""
Emergency Notification Trigger Script
This script allows teammates to trigger emergency notifications via command line.
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:5000"

def trigger_emergency_notification(teammate_name="Command Line", notification_type="all", person_name="[NAME_PLACEHOLDER]"):
    """
    Trigger an emergency notification via the API
    """
    try:
        print(f"🚨 Triggering emergency notification...")
        print(f"👤 Teammate: {teammate_name}")
        print(f"👥 Person: {person_name}")
        print(f"📡 Type: {notification_type}")
        print(f"⏰ Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Make the API call
        response = requests.post(
            f"{API_BASE_URL}/send_notification",
            json={
                "teammate": teammate_name,
                "notification_type": notification_type,
                "person_name": person_name
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                print("✅ Emergency notification sent successfully!")
                print(f"📋 Notification ID: {result.get('notification_id')}")
                print(f"📡 Channels: {', '.join(result.get('channels', []))}")
                print(f"💬 Message: '{result.get('message')}'")
                return True
            else:
                print(f"❌ Failed to send notification: {result.get('error')}")
                return False
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to the notification system.")
        print("💡 Make sure the system is running: python phone_call_system.py")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def get_notification_history():
    """
    Get the history of emergency notifications
    """
    try:
        response = requests.get(f"{API_BASE_URL}/notification_history", timeout=10)
        if response.status_code == 200:
            history = response.json()
            print("\n📋 Notification History:")
            print("=" * 60)
            if not history:
                print("No notifications sent yet.")
            else:
                for i, notification in enumerate(history, 1):
                    print(f"{i}. ID: {notification['id']}")
                    print(f"   Time: {notification['timestamp']}")
                    print(f"   Teammate: {notification['teammate']}")
                    print(f"   Person: {notification['person_name']}")
                    print(f"   Type: {notification['type']}")
                    print(f"   Status: {notification['status']}")
                    if notification.get('success_channels'):
                        print(f"   Channels: {', '.join(notification['success_channels'])}")
                    print()
        else:
            print(f"❌ Failed to get notification history: HTTP {response.status_code}")
    except Exception as e:
        print(f"❌ Error getting notification history: {e}")

def check_system_status():
    """
    Check if the system is running and healthy
    """
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            status = response.json()
            print("✅ System Status:")
            print(f"   Status: {status['status']}")
            print(f"   Target Number: {status['target_number']}")
            print(f"   Email Enabled: {status['email_enabled']}")
            print(f"   WhatsApp Enabled: {status['whatsapp_enabled']}")
            print(f"   Simulation Mode: {status['simulation_mode']}")
            return True
        else:
            print(f"❌ System unhealthy: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to system: {e}")
        return False

def main():
    """
    Main function to handle command line arguments
    """
    if len(sys.argv) < 2:
        print("🚨 Emergency Notification System")
        print("=" * 50)
        print("Usage:")
        print("  python trigger_call.py notify [type] [teammate_name] [person_name]  - Send emergency notification")
        print("  python trigger_call.py history                                         - Show notification history")
        print("  python trigger_call.py status                                          - Check system status")
        print()
        print("Notification Types:")
        print("  all       - All channels (web, email, whatsapp, phone simulation)")
        print("  web       - Web notifications only")
        print("  email     - Email notifications only")
        print("  whatsapp  - WhatsApp Business API only")
        print("  phone     - Phone call simulation only")
        print()
        print("Examples:")
        print("  python trigger_call.py notify")
        print("  python trigger_call.py notify all 'John Smith' 'Grandma'")
        print("  python trigger_call.py notify whatsapp 'Jane Doe' 'Dad'")
        print("  python trigger_call.py notify email 'Bob Wilson' 'Mom'")
        print("  python trigger_call.py history")
        print("  python trigger_call.py status")
        return
    
    command = sys.argv[1].lower()
    
    if command == "notify":
        notification_type = sys.argv[2] if len(sys.argv) > 2 else "all"
        teammate_name = sys.argv[3] if len(sys.argv) > 3 else "Command Line User"
        person_name = sys.argv[4] if len(sys.argv) > 4 else "[NAME_PLACEHOLDER]"
        trigger_emergency_notification(teammate_name, notification_type, person_name)
    
    elif command == "history":
        get_notification_history()
    
    elif command == "status":
        check_system_status()
    
    else:
        print(f"❌ Unknown command: {command}")
        print("Use: notify, history, or status")

if __name__ == "__main__":
    main() 