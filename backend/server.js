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

// Get venue schedules
app.get('/api/venues/schedules', (req, res) => {
  const query = `
    SELECT 
      e.EventID,
      e.EventName,
      e.EventType,
      e.EventDateTime,
      v.VenueID,
      v.VenueName
    FROM Event e
    JOIN Venue v ON e.VenueID = v.VenueID
    WHERE e.EventDateTime >= CURRENT_DATE
    ORDER BY e.EventDateTime ASC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Get venue utilization statistics
app.get('/api/venues/utilization', (req, res) => {
  const query = `
    SELECT 
      COUNT(DISTINCT v.VenueID) as totalVenues,
      COUNT(DISTINCT e.EventID) as totalEvents,
      ROUND(
        (COUNT(DISTINCT e.EventID) / (COUNT(DISTINCT v.VenueID) * 30)) * 100,
        2
      ) as averageUtilization
    FROM Venue v
    LEFT JOIN Event e ON v.VenueID = e.VenueID
    WHERE e.EventDateTime >= CURRENT_DATE
    AND e.EventDateTime <= DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY)
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results[0]);
  });
});

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

// Create a new venue
app.post('/api/venues', (req, res) => {
  const { VenueName, Capacity, Location, AvailabilityStatus } = req.body;
  
  if (!VenueName) {
    return res.status(400).json({ error: 'Venue name is required' });
  }
  
  const query = 'INSERT INTO Venue (VenueName, Capacity, Location, AvailabilityStatus) VALUES (?, ?, ?, ?)';
  db.query(query, [VenueName, Capacity, Location, AvailabilityStatus], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Fetch the created venue
    db.query('SELECT * FROM Venue WHERE VenueID = ?', [result.insertId], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json(results[0]);
    });
  });
});

// Update a venue
app.put('/api/venues/:id', (req, res) => {
  const venueId = req.params.id;
  const { VenueName, Capacity, Location, AvailabilityStatus } = req.body;
  
  if (!VenueName) {
    return res.status(400).json({ error: 'Venue name is required' });
  }
  
  const query = 'UPDATE Venue SET VenueName = ?, Capacity = ?, Location = ?, AvailabilityStatus = ? WHERE VenueID = ?';
  db.query(query, [VenueName, Capacity, Location, AvailabilityStatus, venueId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Venue not found' });
    }
    
    res.json({ message: 'Venue updated successfully', venueId });
  });
});

// Delete a venue
app.delete('/api/venues/:id', (req, res) => {
  const venueId = req.params.id;
  
  // First check if venue is being used in any events
  db.query('SELECT COUNT(*) as count FROM Event WHERE VenueID = ?', [venueId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (results[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete venue that is assigned to events' });
    }
    
    // If not in use, proceed with deletion
    const query = 'DELETE FROM Venue WHERE VenueID = ?';
    db.query(query, [venueId], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Venue not found' });
      }
      
      res.json({ message: 'Venue deleted successfully' });
    });
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

// Get all registrations for an event
app.get('/api/events/:id/registrations', (req, res) => {
  const eventId = req.params.id;
  const query = `
    SELECT r.*, u.FullName, u.Email, u.PhoneNumber
    FROM Registration r
    JOIN User u ON r.UserID = u.UserID
    WHERE r.EventID = ?
    ORDER BY r.RegistrationDate DESC
  `;
  
  db.query(query, [eventId], (err, results) => {
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

// ==== JUDGE & EVALUATION SYSTEM ====

// Get events assigned to a judge
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

// Assign a judge to an event
app.post('/api/judge-assignments', (req, res) => {
  const { JudgeID, EventID } = req.body;
  
  if (!JudgeID || !EventID) {
    return res.status(400).json({ error: 'Judge ID and Event ID are required' });
  }
  
  // Check if the user is a judge
  db.query('SELECT UserType FROM User WHERE UserID = ?', [JudgeID], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (results[0].UserType !== 'Judge') {
      return res.status(400).json({ error: 'User is not a judge' });
    }
    
    // Check if the assignment already exists
    db.query(
      'SELECT * FROM Judge_Assignment WHERE JudgeID = ? AND EventID = ?',
      [JudgeID, EventID],
      (err, results) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        if (results.length > 0) {
          return res.status(400).json({ error: 'Judge is already assigned to this event' });
        }
        
        // Create the assignment
        const query = 'INSERT INTO Judge_Assignment (JudgeID, EventID) VALUES (?, ?)';
        db.query(query, [JudgeID, EventID], (err, result) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          res.status(201).json({
            message: 'Judge assigned to event successfully',
            assignmentId: result.insertId
          });
        });
      }
    );
  });
});

// Remove a judge assignment
app.delete('/api/judge-assignments/:id', (req, res) => {
  const assignmentId = req.params.id;
  
  db.query(
    'DELETE FROM Judge_Assignment WHERE JudgeAssignmentID = ?',
    [assignmentId],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Judge assignment not found' });
      }
      
      res.json({ message: 'Judge assignment removed successfully' });
    }
  );
});

// Get judges assigned to an event
app.get('/api/events/:id/judges', (req, res) => {
  const eventId = req.params.id;
  const query = `
    SELECT u.UserID, u.FullName, u.Email, ja.JudgeAssignmentID
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

// Get all judges (for admin to assign)
app.get('/api/judges', (req, res) => {
  const query = `
    SELECT UserID, FullName, Email, PhoneNumber
    FROM User
    WHERE UserType = 'Judge'
    ORDER BY FullName
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json(results);
  });
});

// Submit scores for participants
app.post('/api/scores', (req, res) => {
  const { JudgeID, ParticipantID, EventID, Round, Score } = req.body;
  
  if (!JudgeID || !ParticipantID || !EventID || !Round || Score === undefined) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  // Validate the score (assuming scores are between 0 and 100)
  if (Score < 0 || Score > 100) {
    return res.status(400).json({ error: 'Score must be between 0 and 100' });
  }
  
  // Verify that the judge is assigned to this event
  db.query(
    'SELECT * FROM Judge_Assignment WHERE JudgeID = ? AND EventID = ?',
    [JudgeID, EventID],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (results.length === 0) {
        return res.status(400).json({ error: 'Judge is not assigned to this event' });
      }
      
      // Verify that the participant is registered for this event
      db.query(
        'SELECT * FROM Registration WHERE UserID = ? AND EventID = ?',
        [ParticipantID, EventID],
        (err, results) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          if (results.length === 0) {
            return res.status(400).json({ error: 'Participant is not registered for this event' });
          }
          
          // Check if score already exists and update it, or create a new one
          db.query(
            'SELECT * FROM Score WHERE JudgeID = ? AND ParticipantID = ? AND EventID = ? AND Round = ?',
            [JudgeID, ParticipantID, EventID, Round],
            (err, results) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              
              if (results.length > 0) {
                // Update existing score
                db.query(
                  'UPDATE Score SET Score = ? WHERE ScoreID = ?',
                  [Score, results[0].ScoreID],
                  (err, result) => {
                    if (err) {
                      return res.status(500).json({ error: err.message });
                    }
                    
                    res.json({
                      message: 'Score updated successfully',
                      scoreId: results[0].ScoreID
                    });
                  }
                );
              } else {
                // Create new score
                db.query(
                  'INSERT INTO Score (JudgeID, ParticipantID, EventID, Round, Score) VALUES (?, ?, ?, ?, ?)',
                  [JudgeID, ParticipantID, EventID, Round, Score],
                  (err, result) => {
                    if (err) {
                      return res.status(500).json({ error: err.message });
                    }
                    
                    res.status(201).json({
                      message: 'Score submitted successfully',
                      scoreId: result.insertId
                    });
                  }
                );
              }
            }
          );
        }
      );
    }
  );
});

// Get scores for a participant in an event
app.get('/api/events/:eventId/participants/:participantId/scores', (req, res) => {
  const { eventId, participantId } = req.params;
  
  const query = `
    SELECT s.*, u.FullName as JudgeName
    FROM Score s
    JOIN User u ON s.JudgeID = u.UserID
    WHERE s.EventID = ? AND s.ParticipantID = ?
    ORDER BY s.Round, s.JudgeID
  `;
  
  db.query(query, [eventId, participantId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json(results);
  });
});

// Get all scores submitted by a judge for an event
app.get('/api/judges/:judgeId/events/:eventId/scores', (req, res) => {
  const { judgeId, eventId } = req.params;
  
  const query = `
    SELECT s.*, u.FullName as ParticipantName
    FROM Score s
    JOIN User u ON s.ParticipantID = u.UserID
    WHERE s.EventID = ? AND s.JudgeID = ?
    ORDER BY s.Round, s.ParticipantID
  `;
  
  db.query(query, [eventId, judgeId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json(results);
  });
});

// Get leaderboard for an event
app.get('/api/events/:eventId/leaderboard', (req, res) => {
  const eventId = req.params.eventId;
  const round = req.query.round || 'Finals'; // Default to Finals if not specified
  
  // Use the stored procedure to calculate winners
  db.query('CALL CalculateEventWinners(?, ?)', [eventId, round], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // The stored procedure returns the result as the first element in the results array
    res.json(results[0]);
  });
});

// Check if all judges have submitted their scores
app.get('/api/events/:eventId/scores/status', (req, res) => {
  const eventId = req.params.eventId;
  const round = req.query.round || 'Finals';
  
  db.query('CALL CheckAllJudgesScored(?, ?)', [eventId, round], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json(results[0][0]);
  });
});

// Get all scores for a participant in an event with judge details
app.get('/api/participants/:participantId/events/:eventId/scores', (req, res) => {
  const { participantId, eventId } = req.params;
  
  db.query('CALL GetParticipantScores(?, ?)', [participantId, eventId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json(results[0]);
  });
});

// ==== ACCOMMODATION MANAGEMENT ====

// Get all accommodations (admin access)
app.get('/api/accommodations', (req, res) => {
  const query = `
    SELECT a.*, u.FullName, u.Email, u.PhoneNumber
    FROM Accommodation a
    JOIN User u ON a.UserID = u.UserID
    ORDER BY a.CheckInDate ASC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Get accommodation details for a specific user
app.get('/api/users/:id/accommodation', (req, res) => {
  const userId = req.params.id;
  const query = `
    SELECT * FROM Accommodation 
    WHERE UserID = ?
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Get a specific accommodation by ID
app.get('/api/accommodations/:id', (req, res) => {
  const accommodationId = req.params.id;
  const query = `
    SELECT a.*, u.FullName, u.Email, u.PhoneNumber 
    FROM Accommodation a
    JOIN User u ON a.UserID = u.UserID
    WHERE a.AccommodationID = ?
  `;
  
  db.query(query, [accommodationId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Accommodation not found' });
    }
    
    res.json(results[0]);
  });
});

// Request new accommodation
app.post('/api/accommodations', (req, res) => {
  const { UserID, Budget, CheckInDate, CheckOutDate } = req.body;
  
  // Validate required fields
  if (!UserID || !CheckInDate || !CheckOutDate) {
    return res.status(400).json({ error: 'UserID, check-in date, and check-out date are required' });
  }
  
  // Validate dates
  if (new Date(CheckOutDate) <= new Date(CheckInDate)) {
    return res.status(400).json({ error: 'Check-out date must be after check-in date' });
  }
  
  // Check if user already has an accommodation request
  const checkQuery = 'SELECT * FROM Accommodation WHERE UserID = ?';
  db.query(checkQuery, [UserID], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (results.length > 0) {
      return res.status(400).json({ error: 'User already has an accommodation request' });
    }
    
    // Insert new accommodation request
    const insertQuery = `
      INSERT INTO Accommodation (UserID, Budget, CheckInDate, CheckOutDate)
      VALUES (?, ?, ?, ?)
    `;
    
    db.query(insertQuery, [UserID, Budget, CheckInDate, CheckOutDate], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.status(201).json({
        message: 'Accommodation request submitted successfully',
        accommodationId: result.insertId
      });
    });
  });
});

// Update accommodation details (admin only)
app.put('/api/accommodations/:id', (req, res) => {
  const accommodationId = req.params.id;
  const { RoomNumber, Budget, CheckInDate, CheckOutDate } = req.body;
  
  // Validate required fields
  if (!CheckInDate || !CheckOutDate) {
    return res.status(400).json({ error: 'Check-in date and check-out date are required' });
  }
  
  // Validate dates
  if (new Date(CheckOutDate) <= new Date(CheckInDate)) {
    return res.status(400).json({ error: 'Check-out date must be after check-in date' });
  }
  
  // Update accommodation
  const updateQuery = `
    UPDATE Accommodation
    SET 
      RoomNumber = ?,
      Budget = ?,
      CheckInDate = ?,
      CheckOutDate = ?
    WHERE AccommodationID = ?
  `;
  
  db.query(updateQuery, [RoomNumber, Budget, CheckInDate, CheckOutDate, accommodationId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Accommodation not found' });
    }
    
    res.json({
      message: 'Accommodation updated successfully',
      accommodationId: accommodationId
    });
  });
});

// Delete accommodation request
app.delete('/api/accommodations/:id', (req, res) => {
  const accommodationId = req.params.id;
  
  const deleteQuery = 'DELETE FROM Accommodation WHERE AccommodationID = ?';
  db.query(deleteQuery, [accommodationId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Accommodation not found' });
    }
    
    res.json({ message: 'Accommodation request deleted successfully' });
  });
});

// Generate accommodation report
app.get('/api/reports/accommodations', (req, res) => {
  const query = `
    SELECT a.*, u.FullName, u.Email, u.PhoneNumber,
    DATEDIFF(a.CheckOutDate, a.CheckInDate) as StayDuration
    FROM Accommodation a
    JOIN User u ON a.UserID = u.UserID
    ORDER BY a.CheckInDate ASC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Calculate statistics
    const totalRequests = results.length;
    const assignedRooms = results.filter(item => item.RoomNumber !== null && item.RoomNumber !== '').length;
    const pendingRequests = totalRequests - assignedRooms;
    
    // Group by check-in date
    const groupedByDate = {};
    results.forEach(item => {
      const date = new Date(item.CheckInDate).toISOString().split('T')[0];
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(item);
    });
    
    res.json({
      statistics: {
        totalRequests,
        assignedRooms,
        pendingRequests,
        occupancyRate: totalRequests > 0 ? Math.round((assignedRooms / totalRequests) * 100) : 0
      },
      accommodations: results,
      groupedByDate: groupedByDate
    });
  });
});

// Search accommodations
app.get('/api/accommodations/search', (req, res) => {
  const { name, roomNumber, checkInDate, status } = req.query;
  
  let query = `
    SELECT a.*, u.FullName, u.Email, u.PhoneNumber
    FROM Accommodation a
    JOIN User u ON a.UserID = u.UserID
    WHERE 1=1
  `;
  
  const params = [];
  
  if (name) {
    query += ` AND u.FullName LIKE ?`;
    params.push(`%${name}%`);
  }
  
  if (roomNumber) {
    query += ` AND a.RoomNumber = ?`;
    params.push(roomNumber);
  }
  
  if (checkInDate) {
    query += ` AND a.CheckInDate = ?`;
    params.push(checkInDate);
  }
  
  if (status === 'assigned') {
    query += ` AND a.RoomNumber IS NOT NULL AND a.RoomNumber != ''`;
  } else if (status === 'pending') {
    query += ` AND (a.RoomNumber IS NULL OR a.RoomNumber = '')`;
  }
  
  query += ` ORDER BY a.CheckInDate ASC`;
  
  db.query(query, params, (err, results) => {
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

// ==== SPONSORSHIP MANAGEMENT ====

// Get all sponsorship packages
app.get('/api/sponsorship/packages', (req, res) => {
  const packages = [
    {
      type: 'Title',
      benefits: [
        'Logo placement on all event materials',
        'Keynote speaking opportunity',
        'Exclusive branding rights',
        'VIP access to all events'
      ],
      minAmount: 100000
    },
    {
      type: 'Gold',
      benefits: [
        'Logo placement on main event materials',
        'Speaking opportunity at main events',
        'Premium branding rights',
        'Access to all events'
      ],
      minAmount: 50000
    },
    {
      type: 'Silver',
      benefits: [
        'Logo placement on selected materials',
        'Booth space at the event',
        'Standard branding rights',
        'Access to main events'
      ],
      minAmount: 25000
    },
    {
      type: 'Media Partner',
      benefits: [
        'Media coverage rights',
        'Press pass for all events',
        'Social media promotion',
        'Access to event content'
      ],
      minAmount: 15000
    }
  ];
  res.json(packages);
});

// Create a new sponsorship contract
app.post('/api/sponsorship/contracts', (req, res) => {
  const { SponsorID, SponsorshipType, ContractDetails, AmountPaid, BrandingOpportunities } = req.body;
  
  if (!SponsorID || !SponsorshipType || !ContractDetails || !AmountPaid) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const query = `
    INSERT INTO Sponsorship 
    (SponsorID, SponsorshipType, ContractDetails, AmountPaid, BrandingOpportunities) 
    VALUES (?, ?, ?, ?, ?)
  `;
  
  db.query(query, [SponsorID, SponsorshipType, ContractDetails, AmountPaid, BrandingOpportunities], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Create payment record
    const paymentQuery = `
      INSERT INTO Payment 
      (UserID, SponsorshipID, AmountPaid, PaymentMethod) 
      VALUES (?, ?, ?, 'Online')
    `;
    
    db.query(paymentQuery, [SponsorID, result.insertId, AmountPaid], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.status(201).json({ 
        message: 'Sponsorship contract created successfully',
        contractId: result.insertId
      });
    });
  });
});

// Get all sponsorship contracts
app.get('/api/sponsorship/contracts', (req, res) => {
  const query = `
    SELECT s.*, u.FullName as SponsorName, u.Email as SponsorEmail
    FROM Sponsorship s
    JOIN User u ON s.SponsorID = u.UserID
    ORDER BY s.SponsorshipID DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Get sponsorship contracts for a specific sponsor
app.get('/api/sponsorship/contracts/:sponsorId', (req, res) => {
  const query = `
    SELECT s.*, u.FullName as SponsorName, u.Email as SponsorEmail
    FROM Sponsorship s
    JOIN User u ON s.SponsorID = u.UserID
    WHERE s.SponsorID = ?
    ORDER BY s.SponsorshipID DESC
  `;
  
  db.query(query, [req.params.sponsorId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Update branding opportunities
app.put('/api/sponsorship/contracts/:contractId/branding', (req, res) => {
  const { BrandingOpportunities } = req.body;
  
  const query = `
    UPDATE Sponsorship 
    SET BrandingOpportunities = ?
    WHERE SponsorshipID = ?
  `;
  
  db.query(query, [BrandingOpportunities, req.params.contractId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    res.json({ message: 'Branding opportunities updated successfully' });
  });
});

// Get sponsorship statistics
app.get('/api/sponsorship/statistics', (req, res) => {
  const query = `
    SELECT 
      SponsorshipType,
      COUNT(*) as totalContracts,
      SUM(AmountPaid) as totalAmount,
      AVG(AmountPaid) as averageAmount
    FROM Sponsorship
    GROUP BY SponsorshipType
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const totalStats = {
      totalContracts: results.reduce((sum, row) => sum + row.totalContracts, 0),
      totalAmount: results.reduce((sum, row) => sum + parseFloat(row.totalAmount), 0),
      byType: results
    };
    
    res.json(totalStats);
  });
});

// Get sponsorship trends over time
app.get('/api/sponsorship/reports/trends', (req, res) => {
  const { period = 'monthly' } = req.query;
  
  let dateFormat, groupBy;
  switch(period) {
    case 'weekly':
      dateFormat = '%Y-%u';
      groupBy = 'WEEK(p.PaymentDate)';
      break;
    case 'monthly':
      dateFormat = '%Y-%m';
      groupBy = 'MONTH(p.PaymentDate)';
      break;
    case 'yearly':
      dateFormat = '%Y';
      groupBy = 'YEAR(p.PaymentDate)';
      break;
    default:
      dateFormat = '%Y-%m';
      groupBy = 'MONTH(p.PaymentDate)';
  }

  const query = `
    SELECT 
      DATE_FORMAT(p.PaymentDate, ?) as period,
      COUNT(DISTINCT s.SponsorshipID) as totalContracts,
      SUM(p.AmountPaid) as totalAmount,
      COUNT(DISTINCT s.SponsorID) as uniqueSponsors
    FROM Payment p
    JOIN Sponsorship s ON p.SponsorshipID = s.SponsorshipID
    GROUP BY ${groupBy}
    ORDER BY p.PaymentDate DESC
  `;

  db.query(query, [dateFormat], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Get sponsorship package distribution
app.get('/api/sponsorship/reports/packages', (req, res) => {
  const query = `
    SELECT 
      s.SponsorshipType,
      COUNT(*) as totalContracts,
      SUM(s.AmountPaid) as totalAmount,
      AVG(s.AmountPaid) as averageAmount,
      COUNT(DISTINCT s.SponsorID) as uniqueSponsors,
      MIN(s.AmountPaid) as minAmount,
      MAX(s.AmountPaid) as maxAmount
    FROM Sponsorship s
    GROUP BY s.SponsorshipType
    ORDER BY totalAmount DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Get payment status report
app.get('/api/sponsorship/reports/payments', (req, res) => {
  const query = `
    SELECT 
      s.SponsorshipID,
      u.FullName as SponsorName,
      s.SponsorshipType,
      s.AmountPaid as ContractAmount,
      COALESCE(SUM(p.AmountPaid), 0) as AmountPaid,
      s.AmountPaid - COALESCE(SUM(p.AmountPaid), 0) as RemainingAmount,
      CASE 
        WHEN COALESCE(SUM(p.AmountPaid), 0) >= s.AmountPaid THEN 'Paid'
        WHEN COALESCE(SUM(p.AmountPaid), 0) > 0 THEN 'Partial'
        ELSE 'Unpaid'
      END as PaymentStatus
    FROM Sponsorship s
    JOIN User u ON s.SponsorID = u.UserID
    LEFT JOIN Payment p ON s.SponsorshipID = p.SponsorshipID
    GROUP BY s.SponsorshipID, u.FullName, s.SponsorshipType, s.AmountPaid
    ORDER BY PaymentStatus, s.SponsorshipID DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Get branding opportunities utilization
app.get('/api/sponsorship/reports/branding', (req, res) => {
  const query = `
    SELECT 
      s.SponsorshipType,
      COUNT(*) as totalContracts,
      COUNT(CASE WHEN s.BrandingOpportunities IS NOT NULL AND s.BrandingOpportunities != '' THEN 1 END) as contractsWithBranding,
      COUNT(CASE WHEN s.BrandingOpportunities IS NULL OR s.BrandingOpportunities = '' THEN 1 END) as contractsWithoutBranding,
      ROUND(COUNT(CASE WHEN s.BrandingOpportunities IS NOT NULL AND s.BrandingOpportunities != '' THEN 1 END) * 100.0 / COUNT(*), 2) as brandingUtilizationPercentage
    FROM Sponsorship s
    GROUP BY s.SponsorshipType
    ORDER BY s.SponsorshipType
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Get sponsor engagement metrics
app.get('/api/sponsorship/reports/engagement', (req, res) => {
  const query = `
    SELECT 
      u.UserID,
      u.FullName as SponsorName,
      COUNT(s.SponsorshipID) as totalContracts,
      SUM(s.AmountPaid) as totalInvestment,
      COUNT(DISTINCT s.SponsorshipType) as differentPackageTypes,
      MIN(s.AmountPaid) as smallestContract,
      MAX(s.AmountPaid) as largestContract,
      AVG(s.AmountPaid) as averageContractValue
    FROM User u
    JOIN Sponsorship s ON u.UserID = s.SponsorID
    GROUP BY u.UserID, u.FullName
    ORDER BY totalInvestment DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});