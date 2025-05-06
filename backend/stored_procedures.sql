-- Stored Procedures and Triggers for NASCON Database

-- Create a table to track payment status
CREATE TABLE IF NOT EXISTS PaymentStatus (
    PaymentStatusID INT AUTO_INCREMENT PRIMARY KEY,
    PaymentID INT NOT NULL,
    Status ENUM('Pending', 'Paid', 'Failed', 'Refunded') NOT NULL DEFAULT 'Pending',
    LastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (PaymentID) REFERENCES Payment(PaymentID)
);

-- Trigger to automatically create a payment status entry when a new payment is added
DROP TRIGGER IF EXISTS after_payment_insert;
CREATE TRIGGER after_payment_insert
AFTER INSERT ON Payment
FOR EACH ROW
BEGIN
    INSERT INTO PaymentStatus (PaymentID, Status, LastUpdated)
    VALUES (NEW.PaymentID, 'Paid', NOW());
END;

-- Stored procedure to generate automatic event schedules
DROP PROCEDURE IF EXISTS GenerateEventSchedule;
CREATE PROCEDURE GenerateEventSchedule(IN eventID INT)
BEGIN
    DECLARE venueID INT;
    DECLARE eventDate DATE;
    DECLARE eventStartTime TIME;
    DECLARE eventEndTime TIME;
    
    -- Get event details
    SELECT 
        VenueID, 
        DATE(EventDateTime) AS EventDate, 
        TIME(EventDateTime) AS StartTime,
        ADDTIME(TIME(EventDateTime), '03:00:00') AS EndTime -- Default 3 hour duration
    INTO venueID, eventDate, eventStartTime, eventEndTime
    FROM Event
    WHERE EventID = eventID;
    
    -- Check for venue conflicts
    IF EXISTS (
        SELECT 1 FROM Event e
        WHERE e.VenueID = venueID 
        AND e.EventID != eventID
        AND DATE(e.EventDateTime) = eventDate
        AND (
            (TIME(e.EventDateTime) BETWEEN eventStartTime AND eventEndTime)
            OR (ADDTIME(TIME(e.EventDateTime), '03:00:00') BETWEEN eventStartTime AND eventEndTime)
        )
    ) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Venue scheduling conflict detected. Please choose a different time or venue.';
    END IF;
    
    -- If no conflicts, update the event schedule (in this case, just update the event itself)
    UPDATE Event 
    SET EventDateTime = CONCAT(eventDate, ' ', eventStartTime)
    WHERE EventID = eventID;
    
    -- Here we could insert into a separate EventSchedule table if needed
END;

-- Stored procedure to calculate total sponsorship funds
DROP PROCEDURE IF EXISTS CalculateTotalSponsorshipFunds;
CREATE PROCEDURE CalculateTotalSponsorshipFunds(OUT totalAmount DECIMAL(10, 2))
BEGIN
    SELECT COALESCE(SUM(AmountPaid), 0)
    INTO totalAmount
    FROM Payment
    WHERE SponsorshipID IS NOT NULL;
END;

-- Stored procedure to get average scores for a participant in an event
DROP PROCEDURE IF EXISTS GetParticipantAverageScores;
CREATE PROCEDURE GetParticipantAverageScores(IN participantID INT, IN eventID INT)
BEGIN
    SELECT 
        Round,
        AVG(Score) as AverageScore,
        COUNT(DISTINCT JudgeID) as JudgeCount
    FROM Score
    WHERE ParticipantID = participantID AND EventID = eventID
    GROUP BY Round
    HAVING AVG(Score) > 0 -- Using HAVING clause as per requirements
    ORDER BY 
        CASE Round
            WHEN 'Prelims' THEN 1
            WHEN 'Semi-Finals' THEN 2
            WHEN 'Finals' THEN 3
        END;
END;

-- Create a table to store reminders
CREATE TABLE IF NOT EXISTS EventReminders (
    ReminderID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    EventID INT NOT NULL,
    ReminderDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    Message TEXT,
    FOREIGN KEY (UserID) REFERENCES User(UserID),
    FOREIGN KEY (EventID) REFERENCES Event(EventID)
);

-- Event Scheduler to send reminders for event participation
-- Instead of using CREATE EVENT directly, we'll create a stored procedure that handles the reminder logic
DROP PROCEDURE IF EXISTS GenerateEventReminders;
CREATE PROCEDURE GenerateEventReminders()
BEGIN
    -- Insert reminders for events happening in the next 24 hours
    INSERT INTO EventReminders (UserID, EventID, Message)
    SELECT 
        r.UserID,
        r.EventID,
        CONCAT('Reminder: You are registered for ', e.EventName, ' happening tomorrow at ', 
              TIME_FORMAT(TIME(e.EventDateTime), '%h:%i %p'), '.')
    FROM Registration r
    JOIN Event e ON r.EventID = e.EventID
    WHERE DATE(e.EventDateTime) = DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY);
END;

-- View for participant lists
CREATE OR REPLACE VIEW ParticipantListView AS
SELECT 
    e.EventID,
    e.EventName,
    e.EventType,
    u.UserID,
    u.FullName,
    u.Email,
    t.TeamID,
    t.TeamName,
    r.RegistrationDate
FROM Registration r
JOIN User u ON r.UserID = u.UserID
JOIN Event e ON r.EventID = e.EventID
LEFT JOIN Team t ON r.TeamID = t.TeamID
WHERE u.UserType = 'Participant'
ORDER BY e.EventName, t.TeamName, u.FullName;

-- Create indexes for faster searches using a stored procedure to handle errors
DROP PROCEDURE IF EXISTS CreateIndexIfNotExists;
CREATE PROCEDURE CreateIndexIfNotExists()
BEGIN
    -- Workaround for "IF NOT EXISTS" for indexes
    DECLARE CONTINUE HANDLER FOR 1061 BEGIN END;  -- Error 1061: Duplicate key name
    
    -- Create the indexes, ignoring errors if they already exist
    CREATE INDEX idx_user_email ON User(Email);
    CREATE INDEX idx_event_type ON Event(EventType);
    CREATE INDEX idx_event_date ON Event(EventDateTime);
    CREATE INDEX idx_payment_method ON Payment(PaymentMethod);
    CREATE INDEX idx_payment_date ON Payment(PaymentDate);
    CREATE INDEX idx_registration_event ON Registration(EventID);
    CREATE INDEX idx_registration_user ON Registration(UserID);
END;

-- Execute the procedure to create indexes
CALL CreateIndexIfNotExists();

-- Clean up by dropping the helper procedure
DROP PROCEDURE IF EXISTS CreateIndexIfNotExists; 