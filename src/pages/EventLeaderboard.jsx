import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from '../utils/notifications';
import Navbar from '../components/navbar';

const EventLeaderboard = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [round, setRound] = useState('Finals');
  
  useEffect(() => {
    if (!eventId) {
      navigate('/events');
      return;
    }
    
    fetchEventDetails();
    fetchLeaderboard();
  }, [eventId, navigate]);
  
  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/api/events/${eventId}`);
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event details:', error);
      toast.error('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/api/events/${eventId}/leaderboard?round=${round}`);
      setLeaderboard(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast.error('Failed to load leaderboard');
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRoundChange = (e) => {
    const newRound = e.target.value;
    setRound(newRound);
    fetchLeaderboard();
  };
  
  if (loading && !event) {
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">{event.EventName} - Leaderboard</h1>
                <p className="text-gray-600">
                  {new Date(event.EventDateTime).toLocaleString()} - {event.EventType}
                </p>
              </div>
              
              <div className="mt-4 md:mt-0">
                <select
                  className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={round}
                  onChange={handleRoundChange}
                >
                  <option value="Prelims">Preliminaries</option>
                  <option value="Semi-Finals">Semi-Finals</option>
                  <option value="Finals">Finals</option>
                </select>
              </div>
            </div>
            
            {leaderboard.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <p className="text-gray-600 mb-2">No scores available for this round yet.</p>
                <p className="text-gray-500">Check back later when judges have submitted their scores.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 bg-blue-600 text-white">
                  <h2 className="text-xl font-semibold">{round} Results</h2>
                </div>
                
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Average Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        # of Judges
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leaderboard.map((entry, index) => (
                      <tr key={entry.UserID} className={index < 3 ? 'bg-blue-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold">
                            {index === 0 ? (
                              <span className="text-yellow-500">🥇 1st</span>
                            ) : index === 1 ? (
                              <span className="text-gray-400">🥈 2nd</span>
                            ) : index === 2 ? (
                              <span className="text-amber-600">🥉 3rd</span>
                            ) : (
                              `${index + 1}th`
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{entry.FullName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{parseFloat(entry.AverageScore).toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{entry.JudgesCount}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="mt-8 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">About Scoring</h3>
              <ul className="list-disc pl-5 space-y-1 text-blue-700">
                <li>Scores are calculated as the average of all judges' scores for each participant</li>
                <li>Participants are ranked based on their average score</li>
                <li>Final results are determined by the "Finals" round scores</li>
                <li>In case of a tie, judges may be asked to break the tie with additional evaluation</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600 mb-2">Event not found</p>
            <button
              onClick={() => navigate('/events')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition mt-2"
            >
              Return to Events
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventLeaderboard; 