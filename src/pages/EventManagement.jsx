import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";

const EventManagement = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState({
    EventName: "",
    EventType: "Tech",
    Description: "",
    Rules: "",
    MaxParticipants: 0,
    RegistrationFee: 0,
    EventDateTime: "",
    VenueID: ""
  });

  useEffect(() => {
    // Check if user is logged in and authorized
    const user = JSON.parse(localStorage.getItem("nasconUser"));
    
    if (!user || (user.userType !== 'Admin' && user.userType !== 'Organizer')) {
      alert("Unauthorized access. Redirecting to login.");
      navigate("/login");
      return;
    }
    
    setUserData(user);
    
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
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEventTypeChange = (e) => {
    setFormData(prev => ({
      ...prev,
      EventType: e.target.value
    }));
  };

  const handleVenueChange = (e) => {
    setFormData(prev => ({
      ...prev,
      VenueID: e.target.value
    }));
  };

  const resetForm = () => {
    setFormData({
      EventName: "",
      EventType: "Tech",
      Description: "",
      Rules: "",
      MaxParticipants: 0,
      RegistrationFee: 0,
      EventDateTime: "",
      VenueID: ""
    });
    setSelectedEvent(null);
  };

  const handleEditEvent = (event) => {
    setSelectedEvent(event);
    setFormData({
      EventName: event.EventName,
      EventType: event.EventType,
      Description: event.Description || "",
      Rules: event.Rules || "",
      MaxParticipants: event.MaxParticipants || 0,
      RegistrationFee: event.RegistrationFee || 0,
      EventDateTime: event.EventDateTime ? new Date(event.EventDateTime).toISOString().slice(0, 16) : "",
      VenueID: event.VenueID || ""
    });
    setShowForm(true);
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/events/${eventId}`, {
        method: "DELETE"
      });
      
      if (response.ok) {
        alert("Event deleted successfully");
        // Remove the event from the state
        setEvents(prev => prev.filter(event => event.EventID !== eventId));
      } else {
        const errorData = await response.json();
        alert(`Failed to delete event: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("An error occurred while deleting the event.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Check for venue scheduling conflicts
      const venueCheckResponse = await fetch(`http://localhost:5000/api/venues/${formData.VenueID}/availability?datetime=${formData.EventDateTime}`);
      const venueAvailability = await venueCheckResponse.json();
      
      // If editing an event, exclude the current event from conflict check
      if (selectedEvent && venueAvailability.conflictingEventId === selectedEvent.EventID) {
        // No conflict with itself
      } else if (venueAvailability.isAvailable === false) {
        alert("Venue is already booked at this time. Please select another venue or time.");
        return;
      }
      
      const url = selectedEvent 
        ? `http://localhost:5000/api/events/${selectedEvent.EventID}` 
        : "http://localhost:5000/api/events";
      
      const method = selectedEvent ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const responseData = await response.json();
        
        if (selectedEvent) {
          // Update existing event in the state
          setEvents(prev => prev.map(event => 
            event.EventID === selectedEvent.EventID ? { ...event, ...formData } : event
          ));
          alert("Event updated successfully");
        } else {
          // Add new event to the state
          setEvents(prev => [...prev, responseData]);
          alert("Event created successfully");
        }
        
        resetForm();
        setShowForm(false);
      } else {
        const errorData = await response.json();
        alert(`Failed to ${selectedEvent ? "update" : "create"} event: ${errorData.error}`);
      }
    } catch (error) {
      console.error(`Error ${selectedEvent ? "updating" : "creating"} event:`, error);
      alert(`An error occurred while ${selectedEvent ? "updating" : "creating"} the event.`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <section className="flex-1 bg-gray-100 p-6">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">Event Management</h2>
            <button 
              onClick={() => {
                resetForm();
                setShowForm(!showForm);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {showForm ? "Cancel" : "Create New Event"}
            </button>
          </div>
          
          {showForm && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h3 className="text-xl font-semibold mb-4 border-b pb-2">
                {selectedEvent ? "Edit Event" : "Create New Event"}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Name
                    </label>
                    <input
                      type="text"
                      name="EventName"
                      value={formData.EventName}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Type
                    </label>
                    <select
                      value={formData.EventType}
                      onChange={handleEventTypeChange}
                      className="w-full p-2 border rounded"
                      required
                    >
                      <option value="Tech">Tech</option>
                      <option value="Business">Business</option>
                      <option value="Gaming">Gaming</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Participants
                    </label>
                    <input
                      type="number"
                      name="MaxParticipants"
                      value={formData.MaxParticipants}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Registration Fee (PKR)
                    </label>
                    <input
                      type="number"
                      name="RegistrationFee"
                      value={formData.RegistrationFee}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      name="EventDateTime"
                      value={formData.EventDateTime}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Venue
                    </label>
                    <select
                      value={formData.VenueID}
                      onChange={handleVenueChange}
                      className="w-full p-2 border rounded"
                      required
                    >
                      <option value="">Select a venue</option>
                      {venues.map(venue => (
                        <option key={venue.VenueID} value={venue.VenueID}>
                          {venue.VenueName} (Capacity: {venue.Capacity})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="Description"
                    value={formData.Description}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    rows="3"
                  ></textarea>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rules
                  </label>
                  <textarea
                    name="Rules"
                    value={formData.Rules}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    rows="3"
                  ></textarea>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setShowForm(false);
                    }}
                    className="bg-gray-300 text-gray-800 px-4 py-2 rounded mr-2 hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    {selectedEvent ? "Update Event" : "Create Event"}
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-xl">Loading...</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Venue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fee (PKR)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.length > 0 ? (
                    events.map(event => {
                      const venue = venues.find(v => v.VenueID === event.VenueID);
                      return (
                        <tr key={event.EventID}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{event.EventName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                              ${event.EventType === 'Tech' ? 'bg-blue-100 text-blue-800' : 
                                event.EventType === 'Business' ? 'bg-green-100 text-green-800' :
                                event.EventType === 'Gaming' ? 'bg-purple-100 text-purple-800' : 
                                'bg-gray-100 text-gray-800'}`}>
                              {event.EventType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {event.EventDateTime 
                                ? new Date(event.EventDateTime).toLocaleString() 
                                : "Not scheduled"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {venue ? venue.VenueName : "No venue assigned"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {event.RegistrationFee ? `${event.RegistrationFee}` : "Free"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleEditEvent(event)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(event.EventID)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                        No events found. Create your first event!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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

export default EventManagement; 