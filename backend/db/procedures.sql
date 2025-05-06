-- Stored procedures for the Judge & Evaluation System module

DELIMITER //

-- Calculate winners for an event based on average scores
CREATE PROCEDURE CalculateEventWinners(IN eventId INT, IN round VARCHAR(20))
BEGIN
    -- Create a temporary table to store winners
    CREATE TEMPORARY TABLE IF NOT EXISTS EventWinners (
        UserID INT,
        FullName VARCHAR(100),
        AverageScore DECIMAL(5,2),
        Rank INT
    );
    
    -- Clear any existing data
    DELETE FROM EventWinners;
    
    -- Insert data with calculated ranks
    INSERT INTO EventWinners
    SELECT 
        u.UserID,
        u.FullName,
        AVG(s.Score) as AverageScore,
        0 as Rank
    FROM Score s
    JOIN User u ON s.ParticipantID = u.UserID
    WHERE s.EventID = eventId AND s.Round = round
    GROUP BY s.ParticipantID
    ORDER BY AverageScore DESC;
    
    -- Set the rank values
    SET @rank = 0;
    UPDATE EventWinners
    SET Rank = (@rank := @rank + 1);
    
    -- Return the winners
    SELECT * FROM EventWinners;
    
    -- Clean up
    DROP TEMPORARY TABLE IF EXISTS EventWinners;
END //

-- Check if all judges assigned to an event have submitted scores for a specific round
CREATE PROCEDURE CheckAllJudgesScored(IN eventId INT, IN round VARCHAR(20))
BEGIN
    -- Calculate how many judges are assigned to this event
    SET @totalJudges = (
        SELECT COUNT(*)
        FROM Judge_Assignment
        WHERE EventID = eventId
    );
    
    -- Calculate how many judges have submitted scores for this round
    SET @judgesScored = (
        SELECT COUNT(DISTINCT JudgeID)
        FROM Score
        WHERE EventID = eventId AND Round = round
    );
    
    -- Calculate how many participants are registered for this event
    SET @totalParticipants = (
        SELECT COUNT(*)
        FROM Registration
        WHERE EventID = eventId
    );
    
    -- Calculate how many participants have been scored in this round
    SET @participantsScored = (
        SELECT COUNT(DISTINCT ParticipantID)
        FROM Score
        WHERE EventID = eventId AND Round = round
    );
    
    -- Return the results
    SELECT 
        @totalJudges as TotalJudges,
        @judgesScored as JudgesScored,
        @totalParticipants as TotalParticipants,
        @participantsScored as ParticipantsScored,
        (@judgesScored = @totalJudges AND @participantsScored = @totalParticipants) as AllScoresSubmitted;
END //

-- Get participant scores with judge info
CREATE PROCEDURE GetParticipantScores(IN participantId INT, IN eventId INT)
BEGIN
    SELECT 
        s.ScoreID,
        s.JudgeID,
        u.FullName as JudgeName,
        s.Round,
        s.Score,
        s.EventID
    FROM Score s
    JOIN User u ON s.JudgeID = u.UserID
    WHERE s.ParticipantID = participantId AND s.EventID = eventId
    ORDER BY s.Round, s.JudgeID;
END //

DELIMITER ;

-- Create indexes for better query performance
CREATE INDEX idx_judge_assignment_judge ON Judge_Assignment(JudgeID);
CREATE INDEX idx_judge_assignment_event ON Judge_Assignment(EventID);
CREATE INDEX idx_score_judge ON Score(JudgeID);
CREATE INDEX idx_score_participant ON Score(ParticipantID);
CREATE INDEX idx_score_event ON Score(EventID);
CREATE INDEX idx_score_round ON Score(Round); 