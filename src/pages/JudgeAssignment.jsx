import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from '../utils/notifications';
import Navbar from '../components/navbar';

const JudgeAssignment = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [judges, setJudges] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [assignedJudges, setAssignedJudges] = useState([]);
  const [judgeToAssign, setJudgeToAssign] = useState('');
  
  // Get user data from local storage
  const user = JSON.parse(localStorage.getItem('nasconUser'));
  
  useEffect(() => {
    // Check if user is logged in and authorized
    if (!user || (user.userType !== 'Admin' && user.userType !== 'Organizer')) {
      navigate('/login');
      return;
    }
    
    fetchData();
  }, [navigate]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all events
      const eventsData = await api.get('/api/events');
      setEvents(eventsData);
      
      // Fetch all judges
      const judgesData = await api.get('/api/judges');
      setJudges(judgesData);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAssignedJudges = async (eventId) => {
    try {
      setLoading(true);
      const data = await api.get(`/api/events/${eventId}/judges`);
      setAssignedJudges(data);
    } catch (error) {
      console.error('Error fetching assigned judges:', error);
      toast.error('Failed to load assigned judges');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    fetchAssignedJudges(event.EventID);
  };
  
  const handleAssignJudge = async () => {
    if (!selectedEvent || !judgeToAssign) {
      toast.error('Please select an event and a judge');
      return;
    }
    
    try {
      setLoading(true);
      await api.post('/api/judge-assignments', {
        JudgeID: judgeToAssign,
        EventID: selectedEvent.EventID
      });
      
      toast.success('Judge assigned successfully');
      fetchAssignedJudges(selectedEvent.EventID);
      setJudgeToAssign('');
    } catch (error) {
      console.error('Error assigning judge:', error);
      toast.error('Failed to assign judge');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRemoveJudge = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to remove this judge from the event?')) {
      return;
    }
    
    try {
      setLoading(true);
      await api.delete(`/api/judge-assignments/${assignmentId}`);
      toast.success('Judge removed successfully');
      fetchAssignedJudges(selectedEvent.EventID);
    } catch (error) {
      console.error('Error removing judge:', error);
      toast.error('Failed to remove judge');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && events.length === 0) {
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
        <h1 className="text-2xl font-bold mb-6">Judge Assignment</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Events List */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-semibold mb-4">Events</h2>
            {events.length === 0 ? (
              <p className="text-gray-500">No events available</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.map(event => (
                  <div 
                    key={event.EventID}
                    className={`p-3 rounded cursor-pointer ${selectedEvent?.EventID === event.EventID ? 'bg-blue-100 border-l-4 border-blue-500' : 'hover:bg-gray-100'}`}
                    onClick={() => handleEventSelect(event)}
                  >
                    <div className="font-medium">{event.EventName}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(event.EventDateTime).toLocaleString()} - {event.EventType}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Judge Assignment */}
          <div className="md:col-span-2">
            {selectedEvent ? (
              <div className="bg-white rounded-lg shadow-md p-4">
                <h2 className="text-xl font-semibold mb-2">{selectedEvent.EventName}</h2>
                <p className="text-gray-600 mb-4">
                  {new Date(selectedEvent.EventDateTime).toLocaleString()} - {selectedEvent.EventType}
                </p>
                
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Assign a Judge</h3>
                  <div className="flex space-x-2">
                    <select 
                      className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={judgeToAssign}
                      onChange={(e) => setJudgeToAssign(e.target.value)}
                    >
                      <option value="">Select a Judge</option>
                      {judges.map(judge => (
                        <option key={judge.UserID} value={judge.UserID}>
                          {judge.FullName} ({judge.Email})
                        </option>
                      ))}
                    </select>
                    <button
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                      onClick={handleAssignJudge}
                      disabled={loading}
                    >
                      Assign
                    </button>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Assigned Judges</h3>
                  {assignedJudges.length === 0 ? (
                    <p className="text-gray-500">No judges assigned to this event yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Judge Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {assignedJudges.map(judge => (
                            <tr key={judge.JudgeAssignmentID}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {judge.FullName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {judge.Email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <button
                                  className="text-red-600 hover:text-red-900"
                                  onClick={() => handleRemoveJudge(judge.JudgeAssignmentID)}
                                  disabled={loading}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <p className="text-gray-500">Select an event from the list to manage judges</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JudgeAssignment; 