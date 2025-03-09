const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.PLUGIN_CLIENT_KEY;

console.log("PLUGIN_CLIENT_KEY: ", API_KEY);

// Middleware
app.use(express.json());
app.use(cors({
    origin: "*",  
    methods: "GET, POST, DELETE",
    allowedHeaders: "Content-Type, x-api-key"
}));

// Middleware to allow CORS for plugin requests
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, x-api-key");
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

// Database Setup
const dbPath = path.join(__dirname, "domains.db");
if (!fs.existsSync(dbPath)) {
    console.log("Database file not found, creating...");
    fs.writeFileSync(dbPath, "");
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error connecting to database", err.message);
    } else {
        console.log(`Connected to SQLite database at ${dbPath}.`);
        db.run(
            "CREATE TABLE IF NOT EXISTS domains (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)",
            (err) => {
                if (err) console.error("Error creating table", err.message);
            }
        );
    }
});

// New Endpoint to Validate Domain (No API Key Validation)
app.post('/validate-domain', async (req, res) => {
    try {
        const { domain } = req.body;
        if (!domain) {
            console.log("Missing domain");
            return res.status(400).json({ success: false, message: "Domain is required" });
        }

        // Check domain in the database
        const domainExists = await new Promise((resolve, reject) => {
            db.get("SELECT name FROM domains WHERE name = ?", [domain], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        // Send API key in headers even if the domain does not exist
        res.set("x-api-key", API_KEY);

        if (!domainExists) {
            console.log(`Domain not allowed: ${domain}`);
            return res.status(403).json({
                success: false,
                message: "Domain not allowed"
            });
        }

        console.log(`Domain allowed: ${domain}`);
        return res.status(200).json({
            success: true,
            message: "Domain is allowed"
        });
    } catch (error) {
        console.error("Error in /validate-domain:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running smoothly.' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on https://localhost:${PORT}`);
    console.log(`Domain validation endpoint: https://localhost:${PORT}/validate-domain`);
});
