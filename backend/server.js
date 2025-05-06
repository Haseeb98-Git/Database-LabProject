const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

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
  port: process.env.DB_PORT,
  multipleStatements: true // Enable multiple statements
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    return;
  }
  console.log('Connected to MySQL database');
  
  // Load and execute stored procedures and triggers
  const storedProceduresFile = path.join(__dirname, 'stored_procedures.sql');
  
  if (fs.existsSync(storedProceduresFile)) {
    const storedProceduresSQL = fs.readFileSync(storedProceduresFile, 'utf8');
    
    // Execute the SQL file as a whole for proper handling of all statements
    db.query(storedProceduresSQL, (err) => {
      if (err) {
        console.error('Error initializing stored procedures:', err);
      } else {
        console.log('Stored procedures and triggers initialization complete');
      }
    });
    
    // Set up daily schedule to run event reminders procedure
    // This runs the procedure once when the server starts and then daily at midnight
    const runEventReminders = () => {
      db.query('CALL GenerateEventReminders()', (err, results) => {
        if (err) {
          console.error('Failed to run event reminders:', err);
        } else {
          console.log('Event reminders generated successfully');
        }
      });
    };
    
    // Run once at startup
    runEventReminders();
    
    // Schedule to run daily at midnight
    const scheduleReminders = () => {
      const now = new Date();
      const night = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1, // tomorrow
        0, 0, 0 // at 00:00:00
      );
      const msUntilMidnight = night.getTime() - now.getTime();
      
      // Schedule first run at next midnight
      setTimeout(() => {
        runEventReminders();
        
        // Then schedule to run every 24 hours
        setInterval(runEventReminders, 24 * 60 * 60 * 1000);
      }, msUntilMidnight);
      
      console.log(`Scheduled reminder generation to run in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);
    };
    
    scheduleReminders();
  } else {
    console.log('No stored procedures file found');
  }
});

// ==== EVENT MANAGEMENT ====

// Get all events
app.get('/api/events', (req, res) => {
  const query = 'SELECT * FROM Event';
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Get a specific event
app.get('/api/events/:id', (req, res) => {
  const eventId = req.params.id;
  const query = 'SELECT * FROM Event WHERE EventID = ?';
  db.query(query, [eventId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(results[0]);
  });
});

// Create a new event
app.post('/api/events', (req, res) => {
  const { EventName, EventType, Description, Rules, MaxParticipants, RegistrationFee, EventDateTime, VenueID } = req.body;
  
  if (!EventName || !EventType || !EventDateTime || !VenueID) {
    return res.status(400).json({ error: 'Required fields missing' });
  }
  
  const query = 'INSERT INTO Event (EventName, EventType, Description, Rules, MaxParticipants, RegistrationFee, EventDateTime, VenueID) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  db.query(query, [EventName, EventType, Description, Rules, MaxParticipants, RegistrationFee, EventDateTime, VenueID], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Fetch the created event
    db.query('SELECT * FROM Event WHERE EventID = ?', [result.insertId], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json(results[0]);
    });
  });
});

// Update an event
app.put('/api/events/:id', (req, res) => {
  const eventId = req.params.id;
  const { EventName, EventType, Description, Rules, MaxParticipants, RegistrationFee, EventDateTime, VenueID } = req.body;
  
  if (!EventName || !EventType || !EventDateTime || !VenueID) {
    return res.status(400).json({ error: 'Required fields missing' });
  }
  
  const query = 'UPDATE Event SET EventName = ?, EventType = ?, Description = ?, Rules = ?, MaxParticipants = ?, RegistrationFee = ?, EventDateTime = ?, VenueID = ? WHERE EventID = ?';
  db.query(query, [EventName, EventType, Description, Rules, MaxParticipants, RegistrationFee, EventDateTime, VenueID, eventId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ message: 'Event updated successfully', eventId });
  });
});

// Delete an event
app.delete('/api/events/:id', (req, res) => {
  const eventId = req.params.id;
  
  // First check if there are registrations for this event
  const checkQuery = 'SELECT COUNT(*) as count FROM Registration WHERE EventID = ?';
  db.query(checkQuery, [eventId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (results[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete event with existing registrations' });
    }
    
    // If no registrations, proceed with deletion
    const deleteQuery = 'DELETE FROM Event WHERE EventID = ?';
    db.query(deleteQuery, [eventId], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      res.json({ message: 'Event deleted successfully' });
    });
  });
});

// Get registration count for an event
app.get('/api/events/:id/registrations/count', (req, res) => {
  const eventId = req.params.id;
  const query = 'SELECT COUNT(*) as count FROM Registration WHERE EventID = ?';
  db.query(query, [eventId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ count: results[0].count });
  });
});

// Check if a specific user is registered for an event
app.get('/api/events/:eventId/registrations/:userId', (req, res) => {
  const { eventId, userId } = req.params;
  const query = 'SELECT * FROM Registration WHERE EventID = ? AND UserID = ?';
  db.query(query, [eventId, userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ registered: false });
    }
    res.json(results[0]);
  });
});

// Get judges assigned to an event
app.get('/api/events/:id/judges', (req, res) => {
  const eventId = req.params.id;
  const query = `
    SELECT u.UserID, u.FullName, u.Email 
    FROM User u
    JOIN Judge_Assignment ja ON u.UserID = ja.JudgeID
    WHERE ja.EventID = ?
  `;
  db.query(query, [eventId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// ==== VENUE MANAGEMENT ====

// Get all venues
app.get('/api/venues', (req, res) => {
  const query = 'SELECT * FROM Venue';
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Get a specific venue
app.get('/api/venues/:id', (req, res) => {
  const venueId = req.params.id;
  const query = 'SELECT * FROM Venue WHERE VenueID = ?';
  db.query(query, [venueId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Venue not found' });
    }
    res.json(results[0]);
  });
});

// Check venue availability at a specific datetime
app.get('/api/venues/:id/availability', (req, res) => {
  const venueId = req.params.id;
  const datetime = req.query.datetime;
  
  if (!datetime) {
    return res.status(400).json({ error: 'Datetime parameter is required' });
  }
  
  const query = `
    SELECT EventID as conflictingEventId
    FROM Event
    WHERE VenueID = ? 
    AND ABS(TIMESTAMPDIFF(HOUR, EventDateTime, ?)) < 4
  `;
  
  db.query(query, [venueId, datetime], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (results.length > 0) {
      return res.json({ isAvailable: false, conflictingEventId: results[0].conflictingEventId });
    }
    
    res.json({ isAvailable: true });
  });
});

// Create a new venue
app.post('/api/venues', (req, res) => {
  const { VenueName, Capacity, Location } = req.body;
  
  if (!VenueName) {
    return res.status(400).json({ error: 'Venue name is required' });
  }
  
  const query = 'INSERT INTO Venue (VenueName, Capacity, Location, AvailabilityStatus) VALUES (?, ?, ?, TRUE)';
  db.query(query, [VenueName, Capacity, Location], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.status(201).json({ 
      message: 'Venue created successfully', 
      venueId: result.insertId 
    });
  });
});

// ==== TEAM MANAGEMENT ====

// Get teams where user is a leader
app.get('/api/users/:id/teams', (req, res) => {
  const userId = req.params.id;
  const query = 'SELECT * FROM Team WHERE LeaderID = ?';
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Create a new team
app.post('/api/teams', (req, res) => {
  const { TeamName, LeaderID, Members } = req.body;
  
  if (!TeamName || !LeaderID) {
    return res.status(400).json({ error: 'Team name and leader ID are required' });
  }
  
  // Start a transaction to ensure all operations succeed or fail together
  db.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // First create the team
    const createTeamQuery = 'INSERT INTO Team (TeamName, LeaderID) VALUES (?, ?)';
    db.query(createTeamQuery, [TeamName, LeaderID], (err, result) => {
      if (err) {
        return db.rollback(() => {
          res.status(500).json({ error: err.message });
        });
      }
      
      const teamId = result.insertId;
      
      // If members array is empty or not provided, commit and return
      if (!Members || Members.length === 0) {
        return db.commit(err => {
          if (err) {
            return db.rollback(() => {
              res.status(500).json({ error: err.message });
            });
          }
          res.status(201).json({ TeamID: teamId, TeamName, LeaderID });
        });
      }
      
      // Process members if provided (just mock this part for now)
      // In a real implementation, you would validate emails, send invitations, etc.
      db.commit(err => {
        if (err) {
          return db.rollback(() => {
            res.status(500).json({ error: err.message });
          });
        }
        res.status(201).json({ 
          TeamID: teamId, 
          TeamName, 
          LeaderID,
          message: 'Team created and invitations sent to members'
        });
      });
    });
  });
});

// ==== REGISTRATION MANAGEMENT ====

// Create a new registration
app.post('/api/registrations', (req, res) => {
  const { UserID, EventID, TeamID } = req.body;
  
  if (!UserID || !EventID) {
    return res.status(400).json({ error: 'User ID and Event ID are required' });
  }
  
  // Check if user is already registered for this event
  const checkQuery = 'SELECT * FROM Registration WHERE UserID = ? AND EventID = ?';
  db.query(checkQuery, [UserID, EventID], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (results.length > 0) {
      return res.status(400).json({ error: 'User is already registered for this event' });
    }
    
    // Check if event has reached max participants
    const maxParticipantsQuery = `
      SELECT e.MaxParticipants, COUNT(r.RegistrationID) as currentCount
      FROM Event e 
      LEFT JOIN Registration r ON e.EventID = r.EventID
      WHERE e.EventID = ?
      GROUP BY e.EventID
    `;
    
    db.query(maxParticipantsQuery, [EventID], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      const { MaxParticipants, currentCount } = results[0];
      
      if (MaxParticipants !== null && currentCount >= MaxParticipants) {
        return res.status(400).json({ error: 'Event has reached maximum number of participants' });
      }
      
      // If all checks pass, create the registration
      const registerQuery = 'INSERT INTO Registration (UserID, EventID, TeamID, RegistrationDate) VALUES (?, ?, ?, NOW())';
      db.query(registerQuery, [UserID, EventID, TeamID], (err, result) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.status(201).json({ 
          message: 'Registration successful', 
          registrationId: result.insertId 
        });
      });
    });
  });
});

// Get all registrations for a user
app.get('/api/users/:id/registrations', (req, res) => {
  const userId = req.params.id;
  const query = `
    SELECT r.*, e.EventName, e.EventDateTime, e.EventType, t.TeamName
    FROM Registration r
    JOIN Event e ON r.EventID = e.EventID
    LEFT JOIN Team t ON r.TeamID = t.TeamID
    WHERE r.UserID = ?
    ORDER BY e.EventDateTime DESC
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// ==== PAYMENT MANAGEMENT ====

// Create a new payment
app.post('/api/payments', (req, res) => {
  const { UserID, EventID, SponsorshipID, AmountPaid, PaymentMethod } = req.body;
  
  if (!UserID || !AmountPaid || !PaymentMethod) {
    return res.status(400).json({ error: 'User ID, amount paid, and payment method are required' });
  }
  
  if (!EventID && !SponsorshipID) {
    return res.status(400).json({ error: 'Either Event ID or Sponsorship ID must be provided' });
  }
  
  const query = 'INSERT INTO Payment (UserID, EventID, SponsorshipID, AmountPaid, PaymentDate, PaymentMethod) VALUES (?, ?, ?, ?, NOW(), ?)';
  db.query(query, [UserID, EventID, SponsorshipID, AmountPaid, PaymentMethod], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.status(201).json({ 
      message: 'Payment recorded successfully', 
      paymentId: result.insertId 
    });
  });
});

// Get payments for a user
app.get('/api/users/:id/payments', (req, res) => {
  const userId = req.params.id;
  const query = `
    SELECT p.*, e.EventName, s.SponsorshipType
    FROM Payment p
    LEFT JOIN Event e ON p.EventID = e.EventID
    LEFT JOIN Sponsorship s ON p.SponsorshipID = s.SponsorshipID
    WHERE p.UserID = ?
    ORDER BY p.PaymentDate DESC
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// ==== FINANCE MANAGEMENT ====

// Get financial summary
app.get('/api/finance/summary', (req, res) => {
  // Query 1: Total revenue
  const revenueQuery = `
    SELECT SUM(AmountPaid) as totalRevenue
    FROM Payment
  `;
  
  // Query 2: Total from registration fees
  const registrationQuery = `
    SELECT SUM(p.AmountPaid) as totalRegistrationFees
    FROM Payment p
    WHERE p.EventID IS NOT NULL
  `;
  
  // Query 3: Total from sponsorships
  const sponsorshipQuery = `
    SELECT SUM(p.AmountPaid) as totalSponsorships
    FROM Payment p
    WHERE p.SponsorshipID IS NOT NULL
  `;
  
  // Query 4: Total payments count
  const paymentsCountQuery = `
    SELECT COUNT(*) as totalPayments
    FROM Payment
  `;
  
  // Run all queries in parallel
  db.query(revenueQuery, (err, revenueResults) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching total revenue: ' + err.message });
    }
    
    db.query(registrationQuery, (err, registrationResults) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching registration fees: ' + err.message });
      }
      
      db.query(sponsorshipQuery, (err, sponsorshipResults) => {
        if (err) {
          return res.status(500).json({ error: 'Error fetching sponsorship amounts: ' + err.message });
        }
        
        db.query(paymentsCountQuery, (err, countResults) => {
          if (err) {
            return res.status(500).json({ error: 'Error fetching payment count: ' + err.message });
          }
          
          // Combine all results
          const summary = {
            totalRevenue: revenueResults[0].totalRevenue || 0,
            totalRegistrationFees: registrationResults[0].totalRegistrationFees || 0,
            totalSponsorships: sponsorshipResults[0].totalSponsorships || 0,
            totalAccommodation: 0, // Not implemented in this schema
            totalPayments: countResults[0].totalPayments || 0
          };
          
          res.json(summary);
        });
      });
    });
  });
});

// Get revenue report
app.get('/api/finance/reports/revenue', (req, res) => {
  // Get date range from query parameters
  const { startDate, endDate, period } = req.query;
  let dateFilter = '';
  
  if (startDate && endDate) {
    dateFilter = `WHERE p.PaymentDate BETWEEN '${startDate}' AND '${endDate}'`;
  } else if (period) {
    if (period === 'this_month') {
      dateFilter = 'WHERE MONTH(p.PaymentDate) = MONTH(CURRENT_DATE()) AND YEAR(p.PaymentDate) = YEAR(CURRENT_DATE())';
    } else if (period === 'this_year') {
      dateFilter = 'WHERE YEAR(p.PaymentDate) = YEAR(CURRENT_DATE())';
    }
  }
  
  // Query for revenue summary by category
  const query = `
    SELECT 
      CASE 
        WHEN p.EventID IS NOT NULL THEN 'Event Registrations' 
        WHEN p.SponsorshipID IS NOT NULL THEN 'Sponsorships'
        ELSE 'Other'
      END as category,
      SUM(p.AmountPaid) as amount
    FROM Payment p
    ${dateFilter}
    GROUP BY category
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error generating revenue report: ' + err.message });
    }
    
    // Calculate percentages
    const total = results.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    
    const reportData = results.map(item => ({
      category: item.category,
      amount: item.amount || 0,
      percentage: total > 0 ? Math.round((item.amount / total) * 100) : 0
    }));
    
    res.json(reportData);
  });
});

// Get event revenue report
app.get('/api/finance/reports/events', (req, res) => {
  // Get date range from query parameters
  const { startDate, endDate, period } = req.query;
  let dateFilter = '';
  
  if (startDate && endDate) {
    dateFilter = `AND p.PaymentDate BETWEEN '${startDate}' AND '${endDate}'`;
  } else if (period) {
    if (period === 'this_month') {
      dateFilter = 'AND MONTH(p.PaymentDate) = MONTH(CURRENT_DATE()) AND YEAR(p.PaymentDate) = YEAR(CURRENT_DATE())';
    } else if (period === 'this_year') {
      dateFilter = 'AND YEAR(p.PaymentDate) = YEAR(CURRENT_DATE())';
    }
  }
  
  // Query for event revenue
  const query = `
    SELECT 
      e.EventID,
      e.EventName,
      e.EventType,
      e.RegistrationFee,
      COUNT(DISTINCT p.UserID) as ParticipantCount,
      SUM(p.AmountPaid) as TotalRevenue
    FROM Event e
    JOIN Payment p ON e.EventID = p.EventID
    WHERE p.EventID IS NOT NULL ${dateFilter}
    GROUP BY e.EventID, e.EventName
    ORDER BY TotalRevenue DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error generating event revenue report: ' + err.message });
    }
    
    res.json(results);
  });
});

// Get sponsorship report
app.get('/api/finance/reports/sponsorships', (req, res) => {
  // Get date range from query parameters
  const { startDate, endDate, period } = req.query;
  let dateFilter = '';
  
  if (startDate && endDate) {
    dateFilter = `AND p.PaymentDate BETWEEN '${startDate}' AND '${endDate}'`;
  } else if (period) {
    if (period === 'this_month') {
      dateFilter = 'AND MONTH(p.PaymentDate) = MONTH(CURRENT_DATE()) AND YEAR(p.PaymentDate) = YEAR(CURRENT_DATE())';
    } else if (period === 'this_year') {
      dateFilter = 'AND YEAR(p.PaymentDate) = YEAR(CURRENT_DATE())';
    }
  }
  
  // Query for sponsorship data
  const query = `
    SELECT 
      s.SponsorshipID,
      u.FullName as SponsorName,
      s.SponsorshipType,
      p.AmountPaid,
      p.PaymentDate
    FROM Sponsorship s
    JOIN User u ON s.SponsorID = u.UserID
    JOIN Payment p ON s.SponsorshipID = p.SponsorshipID
    WHERE p.SponsorshipID IS NOT NULL ${dateFilter}
    ORDER BY p.PaymentDate DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error generating sponsorship report: ' + err.message });
    }
    
    res.json(results);
  });
});

// Get payment transactions report
app.get('/api/finance/reports/payments', (req, res) => {
  // Get date range from query parameters
  const { startDate, endDate, period } = req.query;
  let dateFilter = '';
  
  if (startDate && endDate) {
    dateFilter = `WHERE p.PaymentDate BETWEEN '${startDate}' AND '${endDate}'`;
  } else if (period) {
    if (period === 'this_month') {
      dateFilter = 'WHERE MONTH(p.PaymentDate) = MONTH(CURRENT_DATE()) AND YEAR(p.PaymentDate) = YEAR(CURRENT_DATE())';
    } else if (period === 'this_year') {
      dateFilter = 'WHERE YEAR(p.PaymentDate) = YEAR(CURRENT_DATE())';
    }
  }
  
  // Query for payment transactions
  const query = `
    SELECT 
      p.PaymentID,
      u.FullName as UserName,
      CASE 
        WHEN p.EventID IS NOT NULL THEN 'Event Registration' 
        WHEN p.SponsorshipID IS NOT NULL THEN 'Sponsorship'
        ELSE 'Other'
      END as PaymentType,
      e.EventName,
      s.SponsorshipType,
      p.AmountPaid,
      p.PaymentMethod,
      p.PaymentDate
    FROM Payment p
    JOIN User u ON p.UserID = u.UserID
    LEFT JOIN Event e ON p.EventID = e.EventID
    LEFT JOIN Sponsorship s ON p.SponsorshipID = s.SponsorshipID
    ${dateFilter}
    ORDER BY p.PaymentDate DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error generating payment transactions report: ' + err.message });
    }
    
    res.json(results);
  });
});

// ==== JUDGE MANAGEMENT ====

// Get judge assignments
app.get('/api/judges/:id/assignments', (req, res) => {
  const judgeId = req.params.id;
  const query = `
    SELECT ja.*, e.EventName, e.EventDateTime, e.EventType, v.VenueName
    FROM Judge_Assignment ja
    JOIN Event e ON ja.EventID = e.EventID
    LEFT JOIN Venue v ON e.VenueID = v.VenueID
    WHERE ja.JudgeID = ?
    ORDER BY e.EventDateTime ASC
  `;
  
  db.query(query, [judgeId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// ==== USER MANAGEMENT ====

// User Registration
app.post('/api/register', (req, res) => {
  const { fullName, email, password, phoneNumber, userType } = req.body;

  // Check if all fields are provided
  if (!fullName || !email || !password || !userType) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Check if email already exists
  const checkEmailQuery = 'SELECT * FROM User WHERE Email = ?';
  db.query(checkEmailQuery, [email], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (results.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    
    // Hash password and create user
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
});

// User Login
app.post('/api/login', (req, res) => {
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
          UserID: user.UserID,
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