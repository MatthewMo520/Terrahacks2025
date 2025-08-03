const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const path = require('path');

// Load .env from parent directory (root)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection using your provided code
const uri = process.env.MONGO_URI;
let client;
let db;
let logs;

if (!uri) {
    console.error("❌ MONGO_URI environment variable not set!");
    console.error("Please set your MongoDB connection string in a .env file or environment variable");
}

async function connectToMongoDB() {
    if (!uri) {
        console.error("❌ Cannot connect to MongoDB: MONGO_URI not set");
        return;
    }
    
    try {
        // Create a MongoClient with a MongoClientOptions object to set the Stable API version
        client = new MongoClient(uri, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            }
        });
        
        // Connect the client to the server
        await client.connect();
        
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("✅ Pinged your deployment. You successfully connected to MongoDB!");
        
        // Set up database and collection
        db = client.db("Terrahacks2025");
        logs = db.collection("logs");
        console.log("✅ Using database: Terrahacks2025, collection: logs");
        
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error);
        console.error("❌ URI used:", uri);
        console.error("Please check your MongoDB connection string and ensure MongoDB is running");
    }
}

// Helper function to format time ago
function formatTimeAgo(timestamp) {
    const now = new Date();
    const diff = now - timestamp;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (days > 0) {
        return `${days}d ago`;
    } else if (hours > 0) {
        return `${hours}h ago`;
    } else if (minutes > 0) {
        return `${minutes}m ago`;
    } else {
        return "Just now";
    }
}

// API Routes

// Get recent events from MongoDB logs
app.get('/api/recent-events', async (req, res) => {
    try {
        if (!logs) {
            return res.status(503).json({ error: "MongoDB not connected" });
        }
        
        const limit = parseInt(req.query.limit) || 10;
        
        // Get recent events from MongoDB logs collection
        const events = await logs.find().sort({ time: -1 }).limit(limit).toArray();
        
        // Format events for frontend
        const formattedEvents = events.map(event => ({
            event: event.event || '',
            timestamp: event.time ? event.time.toISOString() : new Date().toISOString(),
            time: formatTimeAgo(event.time || new Date())
        }));
        
        console.log(`✅ Retrieved ${formattedEvents.length} events from MongoDB logs`);
        res.json(formattedEvents);
    } catch (error) {
        console.error("❌ Error fetching recent events:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get event stats
app.get('/api/event-stats', async (req, res) => {
    try {
        if (!logs) {
            return res.status(503).json({ error: "MongoDB not connected" });
        }
        
        const eventName = req.query.event || '';
        const days = parseInt(req.query.days) || 1;
        
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - days);
        
        // Find all occurrences of the specific event
        const events = await logs.find({
            event: eventName,
            time: { $gte: startTime }
        }).sort({ time: -1 }).toArray();
        
        if (events.length === 0) {
            return res.json({
                event: eventName,
                count: 0,
                first_occurrence: null,
                last_occurrence: null,
                average_per_day: 0
            });
        }
        
        const count = events.length;
        const firstOccurrence = events[events.length - 1].time;
        const lastOccurrence = events[0].time;
        const averagePerDay = count / days;
        
        res.json({
            event: eventName,
            count: count,
            first_occurrence: firstOccurrence.toISOString(),
            last_occurrence: lastOccurrence.toISOString(),
            average_per_day: averagePerDay
        });
    } catch (error) {
        console.error("Error fetching event stats:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get daily summary
app.get('/api/daily-summary', async (req, res) => {
    try {
        if (!logs) {
            return res.status(503).json({ error: "MongoDB not connected" });
        }
        
        const days = parseInt(req.query.days) || 1;
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - days);
        
        // Aggregate events by type
        const pipeline = [
            {
                $match: {
                    time: { $gte: startTime }
                }
            },
            {
                $group: {
                    _id: "$event",
                    count: { $sum: 1 },
                    last_occurrence: { $max: "$time" }
                }
            },
            {
                $sort: { count: -1 }
            }
        ];
        
        const results = await logs.aggregate(pipeline).toArray();
        
        // Convert to a more readable format
        const eventSummary = {};
        for (const result of results) {
            eventSummary[result._id] = {
                count: result.count,
                last_occurrence: result.last_occurrence.toISOString()
            };
        }
        
        res.json(eventSummary);
    } catch (error) {
        console.error("Error fetching daily summary:", error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        mongodb: logs ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Start server
async function startServer() {
    await connectToMongoDB();
    
    app.listen(PORT, () => {
        console.log(`🚀 Node.js server running on http://localhost:${PORT}`);
    });
}

startServer().catch(console.error); 