// Home.jsx
import React, { useEffect, useState } from "react";
import { Link } from 'react-router-dom'; // Import Link from react-router-dom
import Navbar from "../components/navbar";

const Home = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Fetch events data from the backend
    fetch('http://localhost:5000/api/events')
      .then((response) => response.json())
      .then((data) => setEvents(data))
      .catch((error) => console.error("Error fetching events:", error));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <Navbar/>

      {/* Hero Section */}
      <section className="flex-1 bg-gray-100 flex items-center justify-center text-center p-8">
        <div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Welcome to NASCON</h2>
          <p className="text-gray-700 text-lg mb-6 max-w-xl mx-auto">
            The biggest national student convention featuring tech, business, gaming, and more. Compete, learn, and network with the best minds from across Pakistan.
          </p>
          <div className="space-x-4">
            <Link to="/events">
              <button className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition">
                Explore Events
              </button>
            </Link>
            <Link to="/register">
              <button className="bg-white border border-blue-600 text-blue-600 px-6 py-3 rounded hover:bg-blue-100 transition">
                Register Now
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Events List */}
      <section className="bg-gray-200 py-8">
        <div className="container mx-auto text-center">
          <h3 className="text-2xl font-bold mb-4">Upcoming Events</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {events.length > 0 ? (
              events.map((event) => (
                <div key={event.EventID} className="bg-white p-6 rounded shadow-lg">
                  <h4 className="text-xl font-bold">{event.EventName}</h4>
                  <p className="text-gray-700">{event.Description}</p>
                  <p className="mt-2">Date: {new Date(event.EventDateTime).toLocaleDateString()}</p>
                </div>
              ))
            ) : (
              <p>No upcoming events available.</p>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-500 text-white text-center py-4">
        &copy; {new Date().getFullYear()} NASCON. All rights reserved.
      </footer>
    </div>
  );
};

export default Home;
