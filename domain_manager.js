const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_FILE = path.join(__dirname, "domains.db");

// Initialize the database and create the table if not exists
const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error("Error connecting to the database:", err.message);
        process.exit(1);
    }
    console.log(`Connected to SQLite database at ${DB_FILE}.`);

    db.run(
        "CREATE TABLE IF NOT EXISTS domains (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)", 
        (err) => {
            if (err) {
                console.error("Error creating table:", err.message);
                process.exit(1);
            }
            // Proceed with the command after the table is confirmed to exist
            handleCommand();
        }
    );
});

// Function to add domains
const addDomains = (domains) => {
    const stmt = db.prepare("INSERT OR IGNORE INTO domains (name) VALUES (?)");
    domains.forEach(domain => stmt.run(domain));
    stmt.finalize(() => {
        console.log("Domains added successfully!");
        db.close();
    });
};

// Function to delete domains
const deleteDomains = (domains) => {
    const stmt = db.prepare("DELETE FROM domains WHERE name = ?");
    domains.forEach(domain => stmt.run(domain));
    stmt.finalize(() => {
        console.log("Domains deleted successfully!");
        db.close();
    });
};

// Function to list domains
const listDomains = () => {
    db.all("SELECT name FROM domains", [], (err, rows) => {
        if (err) {
            console.error("Error retrieving domains:", err.message);
            process.exit(1);
        }
        console.log("Stored Domains:");
        rows.forEach(row => console.log(row.name));
        db.close();
    });
};

// Function to handle command-line arguments
const handleCommand = () => {
    const action = process.argv[2];
    const domains = process.argv.slice(3);

    switch (action) {
        case "add":
            if (domains.length === 0) {
                console.log("Usage: node domain_manager.js add <domain1> <domain2> ...");
                process.exit(1);
            }
            addDomains(domains);
            break;

        case "delete":
            if (domains.length === 0) {
                console.log("Usage: node domain_manager.js delete <domain1> <domain2> ...");
                process.exit(1);
            }
            deleteDomains(domains);
            break;

        case "list":
            listDomains();
            break;

        default:
            console.log("Usage: node domain_manager.js {add|delete|list} <domain(s)>");
            process.exit(1);
    }
};
