const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Middleware to parse JSON
app.use(express.json());

// MySQL database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to the MySQL database');
});

// Sample route to fetch data
app.get('/api/events', (req, res) => {
  console.log('received request.');
  db.query('SELECT * FROM Event', (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// User Registration
app.post('/api/register', (req, res) => {
  const { fullName, email, password, phoneNumber, userType } = req.body;

  // Check if all fields are provided
  if (!fullName || !email || !password || !userType) {
    return res.status(400).json({ error: 'All fields are required' });
  }


  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      return res.status(500).json({ error: 'Error hashing password' });
    }

    // Insert user into the database
    const query = 'INSERT INTO User (FullName, Email, Password, PhoneNumber, UserType) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [fullName, email, hashedPassword, phoneNumber, userType], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    });
  });
});

// User Login

// User Login
app.post('/api/login', (req, res) => {
  console.log("Received login request.");
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Look up user by email
  const query = 'SELECT * FROM User WHERE Email = ?';
  db.query(query, [email], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = results[0];

    // Compare passwords
    bcrypt.compare(password, user.Password, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ error: 'Error comparing passwords' });
      }

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // On success
      res.status(200).json({
        message: 'Login successful',
        user: {
          id: user.UserID,
          fullName: user.FullName,
          email: user.Email,
          userType: user.UserType
        }
      });
    });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});