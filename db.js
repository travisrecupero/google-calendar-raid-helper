const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sqlitedatabase', 'database.db');

// Connect to the SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        createTables(); // Call function to create tables
    }
});

// Function to create tables
function createTables() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT NOT NULL,
        refresh_token TEXT NOT NULL
    )`, (err) => {
        if (err) {
            console.error('Error creating users table:', err.message);
        } else {
            console.log('Users table created.');
        }
    });
}

// Function to insert a new user
function insertUser(username, email, refreshToken) {
    console.log(username);
    console.log(email);
    console.log(refreshToken);
    db.run('INSERT INTO users (username, email, refresh_token) VALUES (?, ?, ?)', [username, email, refreshToken], (err) => {
        if (err) {
            console.error('Error inserting user:', err.message);
        } else {
            console.log('User inserted successfully.');
        }
    });
}

// Function to retrieve all users
function getAllUsers(callback) {
    db.all('SELECT * FROM users', (err, rows) => {
        if (err) {
            console.error('Error retrieving users:', err.message);
        } else {
            callback(rows);
        }
    });
}

// Close the database connection when done
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            return console.error('Error closing database:', err.message);
        }
        console.log('Closed the SQLite database connection.');
        process.exit(0);
    });
});

module.exports = {
    insertUser,
    getAllUsers
};
