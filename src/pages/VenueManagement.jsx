import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";

const VenueManagement = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [formData, setFormData] = useState({
    VenueName: "",
    Capacity: "",
    Location: "",
    AvailabilityStatus: true
  });
  const [scheduleData, setScheduleData] = useState([]);
  const [utilizationData, setUtilizationData] = useState(null);

  useEffect(() => {
    // Check if user is logged in and authorized
    try {
      const user = JSON.parse(localStorage.getItem("nasconUser"));
      if (!user) {
        throw new Error("No user data found");
      }
      
      const { userType } = user;
      if (userType !== 'Admin' && userType !== 'Organizer') {
        throw new Error("Unauthorized access");
      }
      
      setUserData(user);
      loadVenueData();
    } catch (error) {
      console.error("Authentication error:", error);
      alert("Unauthorized access. Redirecting to login.");
      navigate("/login");
    }
  }, [navigate]);

  const loadVenueData = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch venues
      const venuesResponse = await fetch("http://localhost:5000/api/venues");
      if (!venuesResponse.ok) {
        throw new Error(`Failed to fetch venues: ${venuesResponse.statusText}`);
      }
      const venuesData = await venuesResponse.json();
      setVenues(venuesData);
      
      // Fetch venue schedules
      const scheduleResponse = await fetch("http://localhost:5000/api/venues/schedules");
      if (!scheduleResponse.ok) {
        throw new Error(`Failed to fetch schedules: ${scheduleResponse.statusText}`);
      }
      const scheduleData = await scheduleResponse.json();
      setScheduleData(scheduleData || []); // Ensure it's always an array
      
      // Fetch venue utilization
      const utilizationResponse = await fetch("http://localhost:5000/api/venues/utilization");
      if (!utilizationResponse.ok) {
        throw new Error(`Failed to fetch utilization: ${utilizationResponse.statusText}`);
      }
      const utilizationData = await utilizationResponse.json();
      setUtilizationData(utilizationData);
    } catch (error) {
      console.error("Error loading venue data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const resetForm = () => {
    setFormData({
      VenueName: "",
      Capacity: "",
      Location: "",
      AvailabilityStatus: true
    });
    setSelectedVenue(null);
  };

  const handleEditVenue = (venue) => {
    setSelectedVenue(venue);
    setFormData({
      VenueName: venue.VenueName,
      Capacity: venue.Capacity || "",
      Location: venue.Location || "",
      AvailabilityStatus: venue.AvailabilityStatus
    });
    setShowForm(true);
  };

  const handleDeleteVenue = async (venueId) => {
    if (!window.confirm("Are you sure you want to delete this venue?")) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/venues/${venueId}`, {
        method: "DELETE"
      });
      
      if (response.ok) {
        alert("Venue deleted successfully");
        setVenues(prev => prev.filter(venue => venue.VenueID !== venueId));
      } else {
        const errorData = await response.json();
        alert(`Failed to delete venue: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error deleting venue:", error);
      alert("An error occurred while deleting the venue.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = selectedVenue 
        ? `http://localhost:5000/api/venues/${selectedVenue.VenueID}` 
        : "http://localhost:5000/api/venues";
      
      const method = selectedVenue ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const responseData = await response.json();
        
        if (selectedVenue) {
          setVenues(prev => prev.map(venue => 
            venue.VenueID === selectedVenue.VenueID ? { ...venue, ...formData } : venue
          ));
          alert("Venue updated successfully");
        } else {
          setVenues(prev => [...prev, responseData]);
          alert("Venue created successfully");
        }
        
        resetForm();
        setShowForm(false);
      } else {
        const errorData = await response.json();
        alert(`Failed to ${selectedVenue ? "update" : "create"} venue: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error saving venue:", error);
      alert("An error occurred while saving the venue.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p>Loading venue data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="bg-blue-600 text-white p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold">Venue Management</h1>
          <p className="mt-2">Manage venues and view scheduling information.</p>
        </div>
      </div>
      
      <section className="flex-1 bg-gray-100 p-6">
        <div className="container mx-auto">
          {/* Venue Utilization Summary */}
          {utilizationData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500">Total Venues</p>
                    <h3 className="text-2xl font-bold mt-1">{utilizationData.totalVenues}</h3>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500">Average Utilization</p>
                    <h3 className="text-2xl font-bold mt-1">{utilizationData.averageUtilization}%</h3>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500">Total Events Scheduled</p>
                    <h3 className="text-2xl font-bold mt-1">{utilizationData.totalEvents}</h3>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Venue Management Form */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {showForm ? (selectedVenue ? "Edit Venue" : "Add New Venue") : "Venue Management"}
              </h2>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Add New Venue
                </button>
              )}
            </div>
            
            {showForm ? (
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Venue Name
                      </label>
                      <input
                        type="text"
                        name="VenueName"
                        value={formData.VenueName}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Capacity
                      </label>
                      <input
                        type="number"
                        name="Capacity"
                        value={formData.Capacity}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        min="0"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        name="Location"
                        value={formData.Location}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="AvailabilityStatus"
                        checked={formData.AvailabilityStatus}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <label className="ml-2 text-sm text-gray-700">
                        Available for Booking
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
                      }}
                      className="px-4 py-2 border rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      {selectedVenue ? "Update Venue" : "Create Venue"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Venue Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Capacity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {venues.map(venue => (
                      <tr key={venue.VenueID}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{venue.VenueName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{venue.Capacity || "N/A"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{venue.Location || "N/A"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            venue.AvailabilityStatus 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }`}>
                            {venue.AvailabilityStatus ? "Available" : "Unavailable"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditVenue(venue)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteVenue(venue.VenueID)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Venue Schedule */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Venue Schedule</h2>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Venue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scheduleData.map(schedule => (
                      <tr key={schedule.EventID}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{schedule.VenueName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{schedule.EventName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(schedule.EventDateTime).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            schedule.EventType === 'Tech' ? 'bg-blue-100 text-blue-800' :
                            schedule.EventType === 'Business' ? 'bg-green-100 text-green-800' :
                            schedule.EventType === 'Gaming' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {schedule.EventType}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <footer className="bg-blue-500 text-white text-center py-4">
        &copy; {new Date().getFullYear()} NASCON. All rights reserved.
      </footer>
    </div>
  );
};

export default VenueManagement; 