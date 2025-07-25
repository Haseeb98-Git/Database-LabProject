import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [venue, setVenue] = useState(null);
  const [judges, setJudges] = useState([]);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  
  const userData = JSON.parse(localStorage.getItem("nasconUser"));

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        // Fetch event details
        const eventResponse = await fetch(`http://localhost:5000/api/events/${eventId}`);
        if (!eventResponse.ok) {
          throw new Error("Event not found");
        }
        const eventData = await eventResponse.json();
        setEvent(eventData);
        
        // Fetch venue details if available
        if (eventData.VenueID) {
          const venueResponse = await fetch(`http://localhost:5000/api/venues/${eventData.VenueID}`);
          const venueData = await venueResponse.json();
          setVenue(venueData);
        }
        
        // Fetch judges assigned to this event
        const judgesResponse = await fetch(`http://localhost:5000/api/events/${eventId}/judges`);
        if (judgesResponse.ok) {
          const judgesData = await judgesResponse.json();
          setJudges(judgesData);
        }
        
        // Fetch registration count
        const countResponse = await fetch(`http://localhost:5000/api/events/${eventId}/registrations/count`);
        if (countResponse.ok) {
          const countData = await countResponse.json();
          setRegistrationCount(countData.count);
        }
        
        // Check if the user is already registered for this event
        if (userData && userData.userType === "Participant") {
          const registrationCheckResponse = await fetch(`http://localhost:5000/api/events/${eventId}/registrations/${userData.UserID}`);
          if (registrationCheckResponse.ok) {
            const registrationData = await registrationCheckResponse.json();
            setIsRegistered(registrationData && !registrationData.error);
          }
        }
      } catch (error) {
        console.error("Error fetching event details:", error);
        setError("Event not found or could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchEventDetails();
  }, [eventId, userData]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <section className="flex-1 bg-gray-100 p-6 flex items-center justify-center">
          <p className="text-xl">Loading event details...</p>
        </section>
        <footer className="bg-blue-500 text-white text-center py-4">
          &copy; {new Date().getFullYear()} NASCON. All rights reserved.
        </footer>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <section className="flex-1 bg-gray-100 p-6 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
            <p className="mb-4">{error || "Event not found."}</p>
            <Link to="/events" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Back to Events
            </Link>
          </div>
        </section>
        <footer className="bg-blue-500 text-white text-center py-4">
          &copy; {new Date().getFullYear()} NASCON. All rights reserved.
        </footer>
      </div>
    );
  }

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

  const handleRegisterClick = () => {
    if (!userData) {
      navigate("/login", { state: { returnPath: `/event-registration/${eventId}` } });
    } else if (userData.userType !== "Participant") {
      alert("Only participants can register for events.");
    } else {
      navigate(`/event-registration/${eventId}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <section className="flex-1 bg-gray-100 p-6">
        <div className="container mx-auto">
          <div className="mb-4">
            <Link to="/events" className="text-blue-600 hover:underline">
              &larr; Back to Events
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">{event.EventName}</h2>
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getEventTypeColor(event.EventType)}`}>
                    {event.EventType}
                  </span>
                </div>
                
                <div className="mt-4 md:mt-0">
                  {userData?.userType === "Participant" && !isRegistered ? (
                    <button
                      onClick={handleRegisterClick}
                      className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                    >
                      Register Now
                    </button>
                  ) : userData?.userType === "Participant" && isRegistered ? (
                    <span className="bg-green-100 text-green-800 px-6 py-2 rounded font-medium">
                      Already Registered
                    </span>
                  ) : !userData ? (
                    <button
                      onClick={handleRegisterClick}
                      className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
                    >
                      Login to Register
                    </button>
                  ) : null}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="col-span-2">
                  <h3 className="text-xl font-semibold mb-3">Description</h3>
                  <p className="text-gray-700 mb-6">{event.Description || "No description available."}</p>
                  
                  <h3 className="text-xl font-semibold mb-3">Rules</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-line">{event.Rules || "No rules specified."}</p>
                  </div>
                  
                  <div className="mt-6 space-x-4">
                    <Link 
                      to={`/events/${event.EventID}/leaderboard`}
                      className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      View Leaderboard
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </Link>
                    
                    {userData && (userData.userType === 'Admin' || userData.userType === 'Organizer' || userData.userType === 'Judge') && (
                      <Link 
                        to={`/events/${event.EventID}/participants`}
                        className="inline-flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                      >
                        View Participants
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4 border-b pb-2">Event Details</h3>
                  
                  <div className="space-y-3">
                    <p>
                      <span className="font-medium">Date & Time:</span><br />
                      {event.EventDateTime 
                        ? new Date(event.EventDateTime).toLocaleString() 
                        : "To be announced"}
                    </p>
                    
                    <p>
                      <span className="font-medium">Venue:</span><br />
                      {venue ? venue.VenueName : "To be announced"}
                      {venue && venue.Location && <span className="block text-sm text-gray-600">{venue.Location}</span>}
                    </p>
                    
                    <p>
                      <span className="font-medium">Registration Fee:</span><br />
                      {event.RegistrationFee > 0 ? `PKR ${event.RegistrationFee}` : "Free"}
                    </p>
                    
                    <p>
                      <span className="font-medium">Max Participants:</span><br />
                      {event.MaxParticipants || "Unlimited"}
                    </p>
                    
                    <p>
                      <span className="font-medium">Current Registrations:</span><br />
                      {registrationCount} {event.MaxParticipants ? `/ ${event.MaxParticipants}` : ""}
                    </p>
                    
                    {judges.length > 0 && (
                      <div>
                        <span className="font-medium">Judges:</span>
                        <ul className="list-disc list-inside mt-1">
                          {judges.map((judge, index) => (
                            <li key={index} className="text-gray-700">{judge.FullName}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {(userData?.userType === "Admin" || userData?.userType === "Organizer") && (
                <div className="flex justify-end space-x-4 mt-4 pt-4 border-t">
                  <Link
                    to={userData.userType === "Admin" ? `/admin/events?edit=${eventId}` : `/organizer/events?edit=${eventId}`}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                  >
                    Edit Event
                  </Link>
                  <Link
                    to={`/event-participants/${eventId}`}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    View Participants
                  </Link>
                </div>
              )}
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

export default EventDetails; 