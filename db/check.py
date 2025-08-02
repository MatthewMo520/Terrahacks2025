from pymongo import MongoClient
import dotenv
import certifi
import os
import datetime

dotenv.load_dotenv()
uri = os.getenv("MONGO_URI")
client = MongoClient(uri, tlsCAFile=certifi.where())

def check_logs(days=1):
    db = client["Terrahacks2025"]
    logs = db.logs
    
    # Calculate the start time (days ago from now)
    start_time = datetime.datetime.now() - datetime.timedelta(days=days)
    
    # Find all events within the time range
    pipeline = [
        {
            "$match": {
                "time": {"$gte": start_time}
            }
        },
        {
            "$group": {
                "_id": "$event",
                "count": {"$sum": 1},
                "last_occurrence": {"$max": "$time"}
            }
        },
        {
            "$sort": {"count": -1}
        }
    ]
    
    results = list(logs.aggregate(pipeline))
    
    # Convert to a more readable format
    event_summary = {}
    for result in results:
        event_summary[result["_id"]] = {
            "count": result["count"],
            "last_occurrence": result["last_occurrence"]
        }
    
    return event_summary

def print_daily_summary(days=1):
    """
    Print a formatted summary of events within the specified days
    Args:
        days (int): Number of days to look back (default: 1)
    """
    print(f"📊 Event Summary (Last {days} day{'s' if days > 1 else ''})")
    print("=" * 50)
    
    event_summary = check_logs(days)
    
    if not event_summary:
        print("No events found in the specified time period.")
        return
    
    total_events = sum(event["count"] for event in event_summary.values())
    print(f"Total events: {total_events}")
    print()
    
    for event_name, data in event_summary.items():
        count = data["count"]
        last_time = data["last_occurrence"]
        time_ago = datetime.datetime.now() - last_time
        
        # Format time ago
        if time_ago.days > 0:
            time_str = f"{time_ago.days} day{'s' if time_ago.days > 1 else ''} ago"
        elif time_ago.seconds > 3600:
            hours = time_ago.seconds // 3600
            time_str = f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif time_ago.seconds > 60:
            minutes = time_ago.seconds // 60
            time_str = f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            time_str = "Just now"
        
        print(f"📝 {event_name}:")
        print(f"   Count: {count}")
        print(f"   Last: {time_str}")
        print()

def get_event_stats(event_name, days=1):
    """
    Get detailed statistics for a specific event
    Args:
        event_name (str): Name of the event to check
        days (int): Number of days to look back (default: 1)
    Returns:
        dict: Statistics for the event
    """
    db = client["Terrahacks2025"]
    logs = db.logs
    
    start_time = datetime.datetime.now() - datetime.timedelta(days=days)
    
    # Find all occurrences of the specific event
    events = list(logs.find({
        "event": event_name,
        "time": {"$gte": start_time}
    }).sort("time", -1))
    
    if not events:
        return {
            "event": event_name,
            "count": 0,
            "first_occurrence": None,
            "last_occurrence": None,
            "average_per_day": 0
        }
    
    count = len(events)
    first_occurrence = events[-1]["time"]
    last_occurrence = events[0]["time"]
    average_per_day = count / days
    
    return {
        "event": event_name,
        "count": count,
        "first_occurrence": first_occurrence,
        "last_occurrence": last_occurrence,
        "average_per_day": average_per_day
    }

def get_recent_events(limit=10):
    """
    Get the most recent events
    Args:
        limit (int): Number of recent events to retrieve (default: 10)
    Returns:
        list: List of recent events
    """
    db = client["Terrahacks2025"]
    logs = db.logs
    
    events = list(logs.find().sort("time", -1).limit(limit))
    return events

def print_recent_events(limit=10):
    """
    Print the most recent events
    Args:
        limit (int): Number of recent events to display (default: 10)
    """
    print(f"🕒 Recent Events (Last {limit})")
    print("=" * 50)
    
    events = get_recent_events(limit)
    
    if not events:
        print("No events found.")
        return
    
    for i, event in enumerate(events, 1):
        event_name = event["event"]
        event_time = event["time"]
        time_ago = datetime.datetime.now() - event_time
        
        # Format time ago
        if time_ago.days > 0:
            time_str = f"{time_ago.days} day{'s' if time_ago.days > 1 else ''} ago"
        elif time_ago.seconds > 3600:
            hours = time_ago.seconds // 3600
            time_str = f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif time_ago.seconds > 60:
            minutes = time_ago.seconds // 60
            time_str = f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            time_str = "Just now"
        
        print(f"{i:2d}. {event_name} - {time_str}")

if __name__ == "__main__":
    # Example usage
    print("🔍 Alzheimer's Action Detection - Log Checker")
    print("=" * 60)
    
    # Print daily summary
    print_daily_summary()
    
    print("\n" + "=" * 60)
    
    # Print recent events
    print_recent_events(5)
    
    print("\n" + "=" * 60)
    
    # Check specific event stats
    fall_stats = get_event_stats("fallen", days=1)
    print(f"📊 Fall Detection Stats (Last 1 day):")
    print(f"   Count: {fall_stats['count']}")
    print(f"   Average per day: {fall_stats['average_per_day']:.2f}")
    if fall_stats['last_occurrence']:
        print(f"   Last occurrence: {fall_stats['last_occurrence']}") 

    