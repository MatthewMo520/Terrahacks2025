import os
import requests
from dotenv import load_dotenv
from twilio.rest import Client
load_dotenv()
sid = os.getenv("TWILIO_ACCOUNT_SID")
token = os.getenv("TWILIO_AUTH_TOKEN")
