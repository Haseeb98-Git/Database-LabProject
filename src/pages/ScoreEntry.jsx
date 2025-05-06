import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { toast } from '../utils/notifications';
import Navbar from '../components/navbar';

const ScoreEntry = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [round, setRound] = useState('Prelims');
  const [scores, setScores] = useState({});
  const [submittedScores, setSubmittedScores] = useState([]);
  
  // Get user data from local storage
  const user = JSON.parse(localStorage.getItem('nasconUser'));
  
  useEffect(() => {
    // Check if user is logged in and is a judge
    if (!user || user.userType !== 'Judge') {
      navigate('/login');
      return;
    }
    
    fetchJudgeAssignments();
  }, [navigate]);
  
  const fetchJudgeAssignments = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/api/judges/${user.UserID}/assignments`);
      setAssignments(data);
    } catch (error) {
      console.error('Error fetching judge assignments:', error);
      toast.error('Failed to load your event assignments');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchParticipants = async (eventId) => {
    try {
      setLoading(true);
      // Get all registrations for the selected event
      const response = await api.get(`/api/events/${eventId}/registrations`);
      
      // Transform registration data to include just participant information
      const participantsData = response.map(reg => ({
        UserID: reg.UserID,
        FullName: reg.FullName || reg.UserName || 'Unknown Participant',
        Email: reg.Email || 'No email'
      }));
      
      setParticipants(participantsData);
      
      // Fetch previously submitted scores for this event
      fetchSubmittedScores(eventId);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast.error('Failed to load participants');
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchSubmittedScores = async (eventId) => {
    try {
      const data = await api.get(`/api/judges/${user.UserID}/events/${eventId}/scores`);
      setSubmittedScores(data);
      
      // Initialize scores state with previously submitted scores
      const scoreMap = {};
      data.forEach(score => {
        if (score.Round === round) {
          scoreMap[score.ParticipantID] = score.Score;
        }
      });
      
      setScores(scoreMap);
    } catch (error) {
      console.error('Error fetching submitted scores:', error);
      toast.error('Failed to load previously submitted scores');
    }
  };
  
  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    setRound('Prelims'); // Reset to default round
    setScores({}); // Reset scores
    fetchParticipants(event.EventID);
  };
  
  const handleRoundChange = (e) => {
    const newRound = e.target.value;
    setRound(newRound);
    
    // Update scores for the selected round
    const scoreMap = {};
    submittedScores.forEach(score => {
      if (score.Round === newRound) {
        scoreMap[score.ParticipantID] = score.Score;
      }
    });
    
    setScores(scoreMap);
  };
  
  const handleScoreChange = (participantId, score) => {
    // Validate score (0-100)
    const numScore = parseFloat(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      return; // Invalid score, do not update
    }
    
    setScores(prevScores => ({
      ...prevScores,
      [participantId]: numScore
    }));
  };
  
  const handleSubmitScore = async (participantId) => {
    if (scores[participantId] === undefined) {
      toast.error('Please enter a valid score');
      return;
    }
    
    try {
      setLoading(true);
      await api.post('/api/scores', {
        JudgeID: user.UserID,
        ParticipantID: participantId,
        EventID: selectedEvent.EventID,
        Round: round,
        Score: scores[participantId]
      });
      
      toast.success('Score submitted successfully');
      
      // Refresh the submitted scores
      fetchSubmittedScores(selectedEvent.EventID);
    } catch (error) {
      console.error('Error submitting score:', error);
      toast.error('Failed to submit score');
    } finally {
      setLoading(false);
    }
  };
  
  const isScoreSubmitted = (participantId) => {
    return submittedScores.some(score => 
      score.ParticipantID === participantId && score.Round === round
    );
  };
  
  if (loading && assignments.length === 0) {
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
        <h1 className="text-2xl font-bold mb-6">Score Entry</h1>
        
        {assignments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600 mb-2">You are not assigned to judge any events.</p>
            <p className="text-gray-500">Please contact an administrator if you believe this is an error.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Events List */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-4">Your Assigned Events</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {assignments.map(assignment => (
                  <div 
                    key={assignment.JudgeAssignmentID}
                    className={`p-3 rounded cursor-pointer ${selectedEvent?.EventID === assignment.EventID ? 'bg-blue-100 border-l-4 border-blue-500' : 'hover:bg-gray-100'}`}
                    onClick={() => handleEventSelect(assignment)}
                  >
                    <div className="font-medium">{assignment.EventName}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(assignment.EventDateTime).toLocaleString()} - {assignment.EventType}
                    </div>
                    <div className="text-sm text-gray-500">
                      {assignment.VenueName || 'No venue specified'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Score Entry */}
            <div className="md:col-span-2">
              {selectedEvent ? (
                <div className="bg-white rounded-lg shadow-md p-4">
                  <h2 className="text-xl font-semibold mb-2">{selectedEvent.EventName}</h2>
                  <p className="text-gray-600 mb-4">
                    {new Date(selectedEvent.EventDateTime).toLocaleString()} - {selectedEvent.EventType}
                  </p>
                  
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <label className="block text-gray-700 font-medium mb-2" htmlFor="round">
                        Competition Round
                      </label>
                      <select
                        id="round"
                        className="w-full md:w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={round}
                        onChange={handleRoundChange}
                      >
                        <option value="Prelims">Preliminaries</option>
                        <option value="Semi-Finals">Semi-Finals</option>
                        <option value="Finals">Finals</option>
                      </select>
                    </div>
                    
                    <Link
                      to={`/events/${selectedEvent.EventID}/participants`}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                    >
                      View All Participants
                    </Link>
                  </div>
                  
                  {participants.length === 0 ? (
                    <p className="text-gray-500">No participants registered for this event yet.</p>
                  ) : (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Participants</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Participant
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Score (0-100)
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
                            {participants.map(participant => (
                              <tr key={participant.UserID}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{participant.FullName}</div>
                                  <div className="text-sm text-gray-500">{participant.Email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <input
                                    type="number"
                                    className="w-20 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={scores[participant.UserID] || ''}
                                    onChange={(e) => handleScoreChange(participant.UserID, e.target.value)}
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {isScoreSubmitted(participant.UserID) ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                      Submitted
                                    </span>
                                  ) : (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                      Pending
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <button
                                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition text-sm"
                                    onClick={() => handleSubmitScore(participant.UserID)}
                                    disabled={loading}
                                  >
                                    {isScoreSubmitted(participant.UserID) ? 'Update' : 'Submit'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <p className="text-gray-500">Select an event from the list to enter scores</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoreEntry; 