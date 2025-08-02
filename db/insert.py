from pymongo import MongoClient
import dotenv
 
import certifi
import os
import datetime 

dotenv.load_dotenv()
uri = os.getenv("MONGO_URI")
# Create a new client and connect to the server
client = MongoClient(uri, tlsCAFile=certifi.where())

def insert_logs(event):
    db = client["Terrahacks2025"]
    logs = db.logs
    log_data = {
        "time": datetime.datetime.now(),
        "event": event
    }
    result = logs.insert_one(log_data)
    print(f"✅ MongoDB: Event saved - {event}")
    return result
