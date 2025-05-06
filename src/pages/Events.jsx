import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/navbar";

const Events = () => {
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    eventType: "all",
    searchQuery: ""
  });
  const userData = JSON.parse(localStorage.getItem("nasconUser"));

  useEffect(() => {
    // Fetch events and venues
    const fetchData = async () => {
      try {
        const eventsResponse = await fetch("http://localhost:5000/api/events");
        const eventsData = await eventsResponse.json();
        setEvents(eventsData);
        
        const venuesResponse = await fetch("http://localhost:5000/api/venues");
        const venuesData = await venuesResponse.json();
        setVenues(venuesData);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Filter events based on type and search query
  const filteredEvents = events.filter(event => {
    // Filter by event type
    if (filter.eventType !== "all" && event.EventType !== filter.eventType) {
      return false;
    }
    
    // Filter by search query
    if (filter.searchQuery.trim() !== "") {
      const query = filter.searchQuery.toLowerCase();
      return (
        event.EventName.toLowerCase().includes(query) ||
        (event.Description && event.Description.toLowerCase().includes(query))
      );
    }
    
    return true;
  });

  const getVenueName = (venueId) => {
    const venue = venues.find(v => v.VenueID === venueId);
    return venue ? venue.VenueName : "TBA";
  };

  const getEventTypeColor = (type) => {
    switch (type) {
      case "Tech":
        return "bg-blue-100 text-blue-800";
      case "Business":
        return "bg-green-100 text-green-800";
      case "Gaming":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <section className="flex-1 bg-gray-100 p-6">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold mb-6">Events</h2>
          
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-grow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Events
                </label>
                <input
                  type="text"
                  name="searchQuery"
                  value={filter.searchQuery}
                  onChange={handleFilterChange}
                  placeholder="Search by event name or description"
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div className="md:w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type
                </label>
                <select
                  name="eventType"
                  value={filter.eventType}
                  onChange={handleFilterChange}
                  className="w-full p-2 border rounded"
                >
                  <option value="all">All Types</option>
                  <option value="Tech">Tech</option>
                  <option value="Business">Business</option>
                  <option value="Gaming">Gaming</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-xl">Loading events...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
              <p className="text-lg">No events found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map(event => (
                <div key={event.EventID} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold">{event.EventName}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEventTypeColor(event.EventType)}`}>
                        {event.EventType}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {event.Description || "No description available."}
                    </p>
                    
                    <div className="space-y-2 mb-4">
                      <p className="text-sm">
                        <span className="font-medium">Date & Time:</span>{" "}
                        {event.EventDateTime ? new Date(event.EventDateTime).toLocaleString() : "TBA"}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Venue:</span>{" "}
                        {getVenueName(event.VenueID)}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Registration Fee:</span>{" "}
                        {event.RegistrationFee ? `PKR ${event.RegistrationFee}` : "Free"}
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <Link 
                        to={`/event-details/${event.EventID}`}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View Details
                      </Link>
                      
                      {userData?.userType === "Participant" && (
                        <Link
                          to={`/event-registration/${event.EventID}`}
                          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                        >
                          Register Now
                        </Link>
                      )}
                      
                      {!userData && (
                        <Link
                          to="/login"
                          className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700"
                        >
                          Login to Register
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <footer className="bg-blue-500 text-white text-center py-4">
        &copy; {new Date().getFullYear()} NASCON. All rights reserved.
      </footer>
    </div>
  );
};

export default Events; 