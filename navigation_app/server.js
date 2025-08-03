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

// Get checklist data based on MongoDB events
app.get('/api/checklist-data', async (req, res) => {
    try {
        if (!logs) {
            return res.status(503).json({ error: "MongoDB not connected" });
        }
        
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        
        // Get all events from today
        const events = await logs.find({
            time: { $gte: startOfDay, $lt: endOfDay }
        }).toArray();
        
        // Define time ranges and their corresponding checklist items
        const timeRanges = {
            morning: { start: 6, end: 12, label: 'Morning' },
            afternoon: { start: 12, end: 18, label: 'Afternoon' },
            evening: { start: 18, end: 22, label: 'Evening' },
            night: { start: 22, end: 6, label: 'Night' }
        };
        
        // Define event mappings to checklist items
        const eventMappings = {
            'ate food': 'food',
            'consumed water': 'water',
            'took pills': 'medication',
            'consumed pill': 'medication',
            'pill reminder': 'medication',
            'took medication': 'medication'
        };
        
        // Initialize checklist data
        const checklistData = {
            morning: { food: false, water: false, medication: false },
            afternoon: { food: false, water: false, medication: false },
            evening: { food: false, water: false, medication: false }
        };
        
        // Process each event
        events.forEach(event => {
            const eventTime = new Date(event.time);
            const hour = eventTime.getHours();
            const eventName = event.event.toLowerCase();
            
            // Determine time range
            let timeRange = null;
            if (hour >= 6 && hour < 12) timeRange = 'morning';
            else if (hour >= 12 && hour < 18) timeRange = 'afternoon';
            else if (hour >= 18 && hour < 22) timeRange = 'evening';
            else timeRange = 'night';
            
            // Check if event matches any checklist item
            for (const [eventPattern, checklistItem] of Object.entries(eventMappings)) {
                if (eventName.includes(eventPattern)) {
                    if (checklistData[timeRange] && checklistData[timeRange][checklistItem] !== undefined) {
                        checklistData[timeRange][checklistItem] = true;
                    }
                    break;
                }
            }
        });
        
        console.log(`✅ Generated checklist data from ${events.length} events`);
        res.json({
            checklist: checklistData,
            totalEvents: events.length,
            date: today.toISOString().split('T')[0]
        });
        
    } catch (error) {
        console.error('❌ Error generating checklist data:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get medical summary by calling check.py
app.get('/api/medical-summary', async (req, res) => {
    try {
        const { spawn } = require('child_process');
        const path = require('path');
        
        // Path to check.py in the parent directory
        const checkPyPath = path.join(__dirname, '..', 'db', 'check.py');
        
        console.log(`🔍 Running check.py from: ${checkPyPath}`);
        
        // Spawn Python process
        const pythonProcess = spawn('python3', [checkPyPath]);
        
        let output = '';
        let errorOutput = '';
        
        // Collect stdout
        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        // Collect stderr
        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        
        // Handle process completion
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`❌ check.py exited with code ${code}`);
                console.error(`Error output: ${errorOutput}`);
                return res.status(500).json({ 
                    error: 'Failed to generate medical summary',
                    details: errorOutput
                });
            }
            
            console.log(`✅ check.py completed successfully`);
            console.log(`📊 Generated summary: ${output.length} characters`);
            
            // Return the formatted output from check.py
            res.json({
                summary: output,
                timestamp: new Date().toISOString(),
                source: 'check.py'
            });
        });
        
        // Handle process errors
        pythonProcess.on('error', (error) => {
            console.error(`❌ Failed to start check.py: ${error.message}`);
            res.status(500).json({ 
                error: 'Failed to start medical summary generation',
                details: error.message
            });
        });
        
    } catch (error) {
        console.error('❌ Error in medical summary endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
async function startServer() {
    await connectToMongoDB();
    
    app.listen(PORT, () => {
        console.log(`🚀 Node.js server running on http://localhost:${PORT}`);
    });
}

startServer().catch(console.error); 