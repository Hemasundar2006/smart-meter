require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// 1. Connect to MongoDB (Local or Atlas)
// Use environment variable for MongoDB URI, with local fallback
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartmeter';

mongoose.connect(MONGODB_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log("DB Error:", err));

// 2. Data Schema
const MeterSchema = new mongoose.Schema({
    voltage: Number,
    current: Number,
    power: Number,
    units: Number,
    bill: Number,
    timestamp: { type: Date, default: Date.now }
});
const Data = mongoose.model('Data', MeterSchema);

// Global variable for Relay (1 = ON, 0 = OFF)
let relayStatus = "0"; 

// --- ROUTES ---

// Root route (for testing)
app.get('/', (req, res) => {
    res.send("Smart Meter Backend is running...");
});

// ESP32 POSTS data here every 2 seconds
app.post('/api/meter', async (req, res) => {
    try {
        console.log("Receiving data:", req.body);
        const newData = new Data(req.body);
        await newData.save();
        
        // Respond to ESP32 with the current relay command
        res.send(relayStatus); 
    } catch (err) {
        console.error("Error saving data:", err);
        res.status(500).send("Error saving data");
    }
});

// Website (Frontend) GETS latest data here
app.get('/api/meter/latest', async (req, res) => {
    try {
        const latest = await Data.findOne().sort({ timestamp: -1 });
        res.json({ ...latest?._doc, relayStatus });
    } catch (err) {
        res.status(500).json({ error: "No data found" });
    }
});

// Website (Frontend) SENDS relay toggle command here
app.post('/api/meter/toggle', (req, res) => {
    if (req.body.command !== undefined) {
        relayStatus = req.body.command.toString(); 
        console.log("Relay changed to:", relayStatus);
        res.json({ success: true, currentStatus: relayStatus });
    } else {
        res.status(400).json({ success: false, message: "Missing 'command' in request body" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
