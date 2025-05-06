# NASCON Event Management System API Documentation

## Judge & Evaluation System APIs

### Judge Assignment

#### Get events assigned to a judge
- **URL**: `/api/judges/:id/assignments`
- **Method**: `GET`
- **Auth Required**: Yes
- **Description**: Retrieves all events assigned to a specific judge
- **Parameters**:
  - `id`: Judge's user ID

#### Assign a judge to an event
- **URL**: `/api/judge-assignments`
- **Method**: `POST`
- **Auth Required**: Yes (Admin/Organizer)
- **Description**: Assigns a judge to an event
- **Request Body**:
  ```json
  {
    "JudgeID": 5,
    "EventID": 10
  }
  ```

#### Remove a judge assignment
- **URL**: `/api/judge-assignments/:id`
- **Method**: `DELETE`
- **Auth Required**: Yes (Admin/Organizer)
- **Description**: Removes a judge's assignment from an event
- **Parameters**:
  - `id`: Judge assignment ID

#### Get judges assigned to an event
- **URL**: `/api/events/:id/judges`
- **Method**: `GET`
- **Auth Required**: No
- **Description**: Retrieves all judges assigned to a specific event
- **Parameters**:
  - `id`: Event ID

#### Get all judges
- **URL**: `/api/judges`
- **Method**: `GET`
- **Auth Required**: Yes (Admin/Organizer)
- **Description**: Retrieves all users with the "Judge" role

### Score Management

#### Submit scores for participants
- **URL**: `/api/scores`
- **Method**: `POST`
- **Auth Required**: Yes (Judge)
- **Description**: Submits a score for a participant in an event
- **Request Body**:
  ```json
  {
    "JudgeID": 5,
    "ParticipantID": 8,
    "EventID": 10,
    "Round": "Finals",
    "Score": 92.5
  }
  ```

#### Get scores for a participant in an event
- **URL**: `/api/events/:eventId/participants/:participantId/scores`
- **Method**: `GET`
- **Auth Required**: Yes
- **Description**: Retrieves all scores submitted for a participant in an event
- **Parameters**:
  - `eventId`: Event ID
  - `participantId`: Participant's user ID

#### Get all scores submitted by a judge for an event
- **URL**: `/api/judges/:judgeId/events/:eventId/scores`
- **Method**: `GET`
- **Auth Required**: Yes (Judge or Admin/Organizer)
- **Description**: Retrieves all scores submitted by a judge for a specific event
- **Parameters**:
  - `judgeId`: Judge's user ID
  - `eventId`: Event ID

#### Get leaderboard for an event
- **URL**: `/api/events/:eventId/leaderboard`
- **Method**: `GET`
- **Auth Required**: No
- **Description**: Retrieves the leaderboard for an event based on average scores
- **Parameters**:
  - `eventId`: Event ID
- **Query Parameters**:
  - `round`: Competition round (default: "Finals")

#### Check score submission status
- **URL**: `/api/events/:eventId/scores/status`
- **Method**: `GET`
- **Auth Required**: Yes (Admin/Organizer)
- **Description**: Checks if all judges have submitted scores for all participants
- **Parameters**:
  - `eventId`: Event ID
- **Query Parameters**:
  - `round`: Competition round (default: "Finals")

#### Get detailed participant scores
- **URL**: `/api/participants/:participantId/events/:eventId/scores`
- **Method**: `GET`
- **Auth Required**: Yes
- **Description**: Retrieves detailed scores with judge information for a participant
- **Parameters**:
  - `participantId`: Participant's user ID
  - `eventId`: Event ID

## Stored Procedures

### CalculateEventWinners
Calculates and ranks participants based on their average scores for a specific event and round.

### CheckAllJudgesScored
Checks if all judges assigned to an event have submitted scores for all participants in a specific round.

### GetParticipantScores
Retrieves all scores for a participant in an event with detailed judge information. 