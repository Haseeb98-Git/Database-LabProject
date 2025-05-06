import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../components/navbar";

const EventRegistration = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [userData, setUserData] = useState(null);
  const [event, setEvent] = useState(null);
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registrationType, setRegistrationType] = useState("individual");
  const [teamName, setTeamName] = useState("");
  const [teammates, setTeammates] = useState([{ email: "" }]);
  const [userTeams, setUserTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    // Check if user is logged in and is a participant
    const user = JSON.parse(localStorage.getItem("nasconUser"));
    
    if (!user) {
      alert("Please log in to register for events.");
      navigate("/login", { state: { returnPath: `/event-registration/${eventId}` } });
      return;
    }
    
    if (user.userType !== "Participant") {
      alert("Only participants can register for events.");
      navigate("/");
      return;
    }
    
    setUserData(user);
    
    // Fetch event details
    const fetchEventData = async () => {
      try {
        const eventResponse = await fetch(`http://localhost:5000/api/events/${eventId}`);
        
        if (!eventResponse.ok) {
          throw new Error("Event not found");
        }
        
        const eventData = await eventResponse.json();
        setEvent(eventData);
        
        // Fetch venue details
        if (eventData.VenueID) {
          const venueResponse = await fetch(`http://localhost:5000/api/venues/${eventData.VenueID}`);
          const venueData = await venueResponse.json();
          setVenue(venueData);
        }
        
        // Fetch user's teams
        const teamsResponse = await fetch(`http://localhost:5000/api/users/${user.UserID}/teams`);
        const teamsData = await teamsResponse.json();
        setUserTeams(teamsData);
        
        // Check if user is already registered
        const registrationResponse = await fetch(`http://localhost:5000/api/events/${eventId}/registrations/${user.UserID}`);
        if (registrationResponse.ok) {
          const registrationData = await registrationResponse.json();
          if (registrationData) {
            setSuccessMsg("You are already registered for this event.");
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setErrorMsg("Event not found or error loading event details.");
        setTimeout(() => navigate("/events"), 3000);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEventData();
  }, [eventId, navigate]);

  const handleTeammateChange = (index, value) => {
    const newTeammates = [...teammates];
    newTeammates[index].email = value;
    setTeammates(newTeammates);
  };

  const addTeammate = () => {
    setTeammates([...teammates, { email: "" }]);
  };

  const removeTeammate = (index) => {
    const newTeammates = [...teammates];
    newTeammates.splice(index, 1);
    setTeammates(newTeammates);
  };

  const handleRegistrationTypeChange = (type) => {
    setRegistrationType(type);
    setErrorMsg("");
  };

  const handleTeamSelectionChange = (e) => {
    setSelectedTeamId(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    
    try {
      let registrationData = {
        UserID: userData.UserID,
        EventID: parseInt(eventId)
      };
      
      if (registrationType === "team") {
        // Check if creating new team or using existing team
        if (selectedTeamId) {
          // Using existing team
          registrationData.TeamID = parseInt(selectedTeamId);
        } else {
          // Create new team first
          if (!teamName.trim()) {
            setErrorMsg("Team name is required.");
            return;
          }
          
          // Validate teammates
          const validTeammates = teammates.filter(t => t.email.trim() !== "");
          if (validTeammates.length === 0) {
            setErrorMsg("At least one teammate email is required.");
            return;
          }
          
          const teamResponse = await fetch("http://localhost:5000/api/teams", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              TeamName: teamName,
              LeaderID: userData.UserID,
              Members: validTeammates.map(t => t.email)
            })
          });
          
          if (!teamResponse.ok) {
            const teamError = await teamResponse.json();
            throw new Error(teamError.error || "Failed to create team");
          }
          
          const teamData = await teamResponse.json();
          registrationData.TeamID = teamData.TeamID;
        }
      }
      
      // Check if the event has a registration fee
      if (event.RegistrationFee > 0) {
        // Redirect to payment page with registration data
        navigate(`/payment`, { 
          state: { 
            registrationData, 
            amount: event.RegistrationFee,
            eventName: event.EventName,
            returnPath: `/events`
          } 
        });
        return;
      }
      
      // For free events, register directly
      const registrationResponse = await fetch("http://localhost:5000/api/registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(registrationData)
      });
      
      if (!registrationResponse.ok) {
        const regError = await registrationResponse.json();
        throw new Error(regError.error || "Registration failed");
      }
      
      setSuccessMsg("Successfully registered for the event!");
      setTimeout(() => navigate("/participant/registrations"), 2000);
      
    } catch (error) {
      console.error("Registration error:", error);
      setErrorMsg(error.message || "Failed to register for the event. Please try again.");
    }
  };

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

  if (errorMsg) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <section className="flex-1 bg-gray-100 p-6 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
            <p className="mb-4">{errorMsg}</p>
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

  if (successMsg) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <section className="flex-1 bg-gray-100 p-6 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h2 className="text-2xl font-bold text-green-600 mb-4">Success</h2>
            <p className="mb-4">{successMsg}</p>
            <Link to="/participant/registrations" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              View My Registrations
            </Link>
          </div>
        </section>
        <footer className="bg-blue-500 text-white text-center py-4">
          &copy; {new Date().getFullYear()} NASCON. All rights reserved.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <section className="flex-1 bg-gray-100 p-6">
        <div className="container mx-auto">
          <div className="mb-6">
            <Link to="/events" className="text-blue-600 hover:underline mb-4 inline-block">
              &larr; Back to Events
            </Link>
            <h2 className="text-3xl font-bold mb-2">Register for {event.EventName}</h2>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4 border-b pb-2">Event Details</h3>
                  <p className="mb-2"><span className="font-medium">Type:</span> {event.EventType}</p>
                  <p className="mb-2"><span className="font-medium">Date & Time:</span> {new Date(event.EventDateTime).toLocaleString()}</p>
                  <p className="mb-2"><span className="font-medium">Venue:</span> {venue ? venue.VenueName : "TBA"}</p>
                  <p className="mb-2">
                    <span className="font-medium">Registration Fee:</span> 
                    {event.RegistrationFee > 0 ? `PKR ${event.RegistrationFee}` : "Free"}
                  </p>
                  <p className="mb-2"><span className="font-medium">Max Participants:</span> {event.MaxParticipants}</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-4 border-b pb-2">Event Description</h3>
                  <p className="mb-4">{event.Description}</p>
                  <h3 className="text-xl font-semibold mb-2">Rules</h3>
                  <p>{event.Rules}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4 border-b pb-2">Registration Form</h3>
            
            <div className="mb-6">
              <div className="flex space-x-4 mb-4">
                <button
                  type="button"
                  onClick={() => handleRegistrationTypeChange("individual")}
                  className={`px-4 py-2 rounded ${
                    registrationType === "individual"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  Individual Registration
                </button>
                <button
                  type="button"
                  onClick={() => handleRegistrationTypeChange("team")}
                  className={`px-4 py-2 rounded ${
                    registrationType === "team"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  Team Registration
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div>
                  <p className="font-medium mb-2">Registering as: {userData.fullName}</p>
                  <p className="text-sm text-gray-600 mb-4">Email: {userData.email}</p>
                </div>
                
                {registrationType === "team" && (
                  <div className="space-y-4">
                    {userTeams.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Use Existing Team
                        </label>
                        <select
                          value={selectedTeamId}
                          onChange={handleTeamSelectionChange}
                          className="w-full p-2 border rounded"
                        >
                          <option value="">-- Create a new team --</option>
                          {userTeams.map(team => (
                            <option key={team.TeamID} value={team.TeamID}>
                              {team.TeamName}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    {!selectedTeamId && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Team Name
                          </label>
                          <input
                            type="text"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder="Enter team name"
                            className="w-full p-2 border rounded"
                            required={registrationType === "team"}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Team Members
                          </label>
                          <p className="text-sm text-gray-600 mb-2">
                            Enter the email addresses of your team members. We will send them invitations.
                          </p>
                          
                          {teammates.map((teammate, index) => (
                            <div key={index} className="flex items-center space-x-2 mb-2">
                              <input
                                type="email"
                                value={teammate.email}
                                onChange={(e) => handleTeammateChange(index, e.target.value)}
                                placeholder="Teammate's email"
                                className="flex-grow p-2 border rounded"
                                required={index === 0}
                              />
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => removeTeammate(index)}
                                  className="p-2 text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                          
                          <button
                            type="button"
                            onClick={addTeammate}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            + Add another teammate
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                  >
                    {event.RegistrationFee > 0 
                      ? `Proceed to Payment (PKR ${event.RegistrationFee})` 
                      : "Complete Registration"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>
      <footer className="bg-blue-500 text-white text-center py-4">
        &copy; {new Date().getFullYear()} NASCON. All rights reserved.
      </footer>
    </div>
  );
};

export default EventRegistration; 