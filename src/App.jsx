// App.jsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'; // Use Routes instead of Switch
import Home from './pages/Home';
import Register from './pages/Register';
import Login from "./pages/Login"; // Add this import
import Dashboard from './pages/Dashboard';
import EventManagement from './pages/EventManagement';
import EventRegistration from './pages/EventRegistration';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import Payment from './pages/Payment';
import FinanceManagement from './pages/FinanceManagement';
import AccommodationManagement from './pages/AccommodationManagement';
import ParticipantAccommodation from './pages/ParticipantAccommodation';
import JudgeAssignment from './pages/JudgeAssignment';
import ScoreEntry from './pages/ScoreEntry';
import EventLeaderboard from './pages/EventLeaderboard';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />  {/* Use element prop */}
        <Route path="/register" element={<Register />} />  {/* Use element prop */}
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Event related routes */}
        <Route path="/events" element={<Events />} />
        <Route path="/event-details/:eventId" element={<EventDetails />} />
        <Route path="/admin/events" element={<EventManagement />} />
        <Route path="/organizer/events" element={<EventManagement />} />
        <Route path="/event-registration/:eventId" element={<EventRegistration />} />
        <Route path="/payment" element={<Payment />} />
        
        {/* Finance Management */}
        <Route path="/admin/finance" element={<FinanceManagement />} />
        <Route path="/organizer/finance" element={<FinanceManagement />} />
        
        {/* Accommodation Management */}
        <Route path="/admin/accommodation" element={<AccommodationManagement />} />
        <Route path="/organizer/accommodation" element={<AccommodationManagement />} />
        <Route path="/participant/accommodation" element={<ParticipantAccommodation />} />
        
        {/* Judge & Evaluation System */}
        <Route path="/admin/judge-assignment" element={<JudgeAssignment />} />
        <Route path="/organizer/judge-assignment" element={<JudgeAssignment />} />
        <Route path="/judge/score-entry" element={<ScoreEntry />} />
        <Route path="/events/:eventId/leaderboard" element={<EventLeaderboard />} />
        
        {/* Add other routes here */}
      </Routes>
    </Router>
  );
};

export default App;
