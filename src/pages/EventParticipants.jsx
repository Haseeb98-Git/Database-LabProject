import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from '../utils/notifications';
import Navbar from '../components/navbar';

const EventParticipants = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  
  // Get user data from local storage
  const user = JSON.parse(localStorage.getItem('nasconUser'));
  
  useEffect(() => {
    // Check if user is logged in and authorized
    if (!user || (user.userType !== 'Admin' && user.userType !== 'Organizer' && user.userType !== 'Judge')) {
      navigate('/login');
      return;
    }
    
    fetchData();
  }, [navigate, eventId]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch event details
      const eventData = await api.get(`/api/events/${eventId}`);
      setEvent(eventData);
      
      // Fetch participants
      const participantsData = await api.get(`/api/events/${eventId}/registrations`);
      setParticipants(participantsData);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {event ? (
          <>
            <div className="mb-6">
              <Link 
                to={user.userType === 'Judge' ? '/judge/score-entry' : 
                   (user.userType === 'Admin' ? '/admin/events' : '/organizer/events')} 
                className="text-blue-600 hover:underline inline-block mb-4"
              >
                &larr; Back
              </Link>
              
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{event.EventName} - Participants</h1>
                  <p className="text-gray-600">
                    {new Date(event.EventDateTime).toLocaleString()} - {event.EventType}
                  </p>
                </div>
                
                {user.userType === 'Judge' && (
                  <Link 
                    to="/judge/score-entry" 
                    className="mt-4 md:mt-0 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Enter Scores
                  </Link>
                )}
                
                <Link 
                  to={`/events/${eventId}/leaderboard`}
                  className="mt-4 md:mt-0 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 ml-2"
                >
                  View Leaderboard
                </Link>
              </div>
            </div>
            
            {participants.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <p className="text-gray-600 mb-2">No participants have registered for this event yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 bg-blue-600 text-white">
                  <h2 className="text-xl font-semibold">Registered Participants ({participants.length})</h2>
                </div>
                
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registration Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team
                      </th>
                      {user.userType === 'Judge' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {participants.map(participant => (
                      <tr key={participant.RegistrationID}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{participant.FullName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{participant.Email}</div>
                          <div className="text-sm text-gray-500">{participant.PhoneNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(participant.RegistrationDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {participant.TeamID ? `Team ${participant.TeamID}` : 'Individual'}
                          </div>
                        </td>
                        {user.userType === 'Judge' && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => {
                                // Store participant ID in session storage for use in score entry
                                sessionStorage.setItem('selectedParticipant', JSON.stringify({
                                  id: participant.UserID,
                                  name: participant.FullName,
                                  eventId: eventId
                                }));
                                navigate('/judge/score-entry');
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Score
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600 mb-2">Event not found</p>
            <button
              onClick={() => navigate(-1)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition mt-2"
            >
              Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventParticipants; 