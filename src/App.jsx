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
        
        {/* Add other routes here */}
      </Routes>
    </Router>
  );
};

export default App;
