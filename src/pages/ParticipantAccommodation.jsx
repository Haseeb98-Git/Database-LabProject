import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from '../utils/notifications';

const ParticipantAccommodation = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userAccommodation, setUserAccommodation] = useState(null);
  const [formData, setFormData] = useState({
    Budget: '',
    CheckInDate: '',
    CheckOutDate: ''
  });

  // Get user data from local storage
  const user = JSON.parse(localStorage.getItem('nasconUser'));
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchUserAccommodation();
  }, []);
  
  const fetchUserAccommodation = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/users/${user.UserID}/accommodation`);
      if (response && response.length > 0) {
        setUserAccommodation(response[0]);
      }
    } catch (error) {
      console.error('Error fetching accommodation:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate dates
    const checkInDate = new Date(formData.CheckInDate);
    const checkOutDate = new Date(formData.CheckOutDate);
    
    if (checkOutDate <= checkInDate) {
      toast.error('Check-out date must be after check-in date');
      return;
    }
    
    try {
      setLoading(true);
      const requestData = {
        UserID: user.UserID,
        Budget: parseFloat(formData.Budget) || 0,
        CheckInDate: formData.CheckInDate,
        CheckOutDate: formData.CheckOutDate
      };
      
      await api.post('/api/accommodations', requestData);
      toast.success('Accommodation request submitted successfully');
      fetchUserAccommodation();
    } catch (error) {
      console.error('Error submitting accommodation request:', error);
      toast.error('Failed to submit accommodation request');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancel = async () => {
    if (!userAccommodation) return;
    
    try {
      setLoading(true);
      await api.delete(`/api/accommodations/${userAccommodation.AccommodationID}`);
      toast.success('Accommodation request cancelled successfully');
      setUserAccommodation(null);
    } catch (error) {
      console.error('Error cancelling accommodation request:', error);
      toast.error('Failed to cancel accommodation request');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Accommodation Request</h1>
      
      {userAccommodation ? (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Your Accommodation Request</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-gray-600">Budget:</p>
              <p className="font-medium">${userAccommodation.Budget || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-gray-600">Room Number:</p>
              <p className="font-medium">
                {userAccommodation.RoomNumber ? 
                  userAccommodation.RoomNumber : 
                  <span className="text-yellow-600">Pending Assignment</span>
                }
              </p>
            </div>
            <div>
              <p className="text-gray-600">Check-in Date:</p>
              <p className="font-medium">{new Date(userAccommodation.CheckInDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Check-out Date:</p>
              <p className="font-medium">{new Date(userAccommodation.CheckOutDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Status:</p>
              <p className={`font-medium ${userAccommodation.RoomNumber ? 'text-green-600' : 'text-yellow-600'}`}>
                {userAccommodation.RoomNumber ? 'Assigned' : 'Pending'}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Duration:</p>
              <p className="font-medium">
                {Math.ceil((new Date(userAccommodation.CheckOutDate) - new Date(userAccommodation.CheckInDate)) / (1000 * 60 * 60 * 24))} days
              </p>
            </div>
          </div>
          
          <button
            onClick={handleCancel}
            className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition duration-200"
            disabled={loading}
          >
            Cancel Request
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="Budget">
              Budget ($ per night)
            </label>
            <input
              type="number"
              id="Budget"
              name="Budget"
              value={formData.Budget}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your budget"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="CheckInDate">
              Check-in Date *
            </label>
            <input
              type="date"
              id="CheckInDate"
              name="CheckInDate"
              value={formData.CheckInDate}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="CheckOutDate">
              Check-out Date *
            </label>
            <input
              type="date"
              id="CheckOutDate"
              name="CheckOutDate"
              value={formData.CheckOutDate}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition duration-200"
            disabled={loading}
          >
            Submit Request
          </button>
        </form>
      )}
      
      <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Important Information</h3>
        <ul className="list-disc pl-5 space-y-1 text-blue-700">
          <li>Accommodation is subject to availability</li>
          <li>Room assignments are handled by the event organizers</li>
          <li>You'll be notified when your room is assigned</li>
          <li>Bring your ID for check-in verification</li>
          <li>Any questions about accommodation can be directed to the event support team</li>
        </ul>
      </div>
    </div>
  );
};

export default ParticipantAccommodation; 