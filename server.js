const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const axios = require('axios');  
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.PLUGIN_CLIENT_KEY;

console.log("PLUGIN_CLIENT_KEY: ", API_KEY);

// Middleware
app.use(express.json());
app.use(cors({
    origin: "*",  // Allow all origins (change to specific domains later for security)
    methods: "GET, POST, DELETE",
    allowedHeaders: "Content-Type, x-api-key"
}));

// Middleware to allow CORS for plugin requests
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); // Allow all origins
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, x-api-key");
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});


// Define database file path
const dbPath = path.join(__dirname, "domains.db");

// Ensure database file exists before initializing SQLite
if (!fs.existsSync(dbPath)) {
    console.log("Database file not found, creating...");
    fs.writeFileSync(dbPath, ""); // Create an empty file
}

// Initialize SQLite database
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

// Middleware for API Key Authentication
const authenticateAPIKey = (req, res, next) => {
    const providedKey = req.headers['x-api-key'];

    if (!providedKey || providedKey !== API_KEY) {
        console.log("Unauthorized API access attempt.");
        return res.status(403).send("Forbidden: Invalid API Key");
    }

    console.log("API Key authenticated.");
    next();
};

const checkDomainAccess = async (req, res, next) => {
    try {
        const requestOrigin = req.get('origin') || req.get('referer');

        if (!requestOrigin) {
            console.log("Request has no origin or referer.");
            return res.status(403).send();
        }

        const url = new URL(requestOrigin);
        const domain = url.hostname;

        // Convert db.get into a promise to handle async behavior
        const domainExists = await new Promise((resolve, reject) => {
            db.get("SELECT name FROM domains WHERE name = ?", [domain], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!domainExists) {
            console.log(`Unauthorized access attempt from: ${domain}`);
            return res.status(403).send();
        }

        console.log(`Authorized access for domain: ${domain}`);
        next();
    } catch (error) {
        console.error("Error in checkDomainAccess:", error.message);
        return res.status(403).send();
    }
};



// // Serve the plugin from the external CDN, protecting it with API Key & Domain Check
// app.get('/accessibility-plugin', authenticateAPIKey, checkDomainAccess, (req, res) => {
//     res.redirect("https://roaring-gingersnap-106db5.netlify.app/accessibility-plugin.min.js");
// });


// Serve the plugin with CORS headers before redirecting
app.get('/accessibility-plugin', authenticateAPIKey, checkDomainAccess, async (req, res) => {
    try {
        const pluginUrl = "https://roaring-gingersnap-106db5.netlify.app/accessibility-plugin.min.js";
        const response = await axios.get(pluginUrl, { responseType: 'stream' });

        // Set necessary CORS headers
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type, x-api-key");

        // Stream the plugin file directly to the client
        response.data.pipe(res);
    } catch (error) {
        console.error("Failed to fetch plugin:", error.message);
        res.status(500).send("Error fetching plugin");
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Plugin access: http://localhost:${PORT}/accessibility-plugin (requires API Key)`);
});
