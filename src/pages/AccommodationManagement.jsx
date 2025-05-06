import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from '../utils/notifications';

const AccommodationManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accommodations, setAccommodations] = useState([]);
  const [selectedAccommodation, setSelectedAccommodation] = useState(null);
  const [statistics, setStatistics] = useState({
    totalRequests: 0,
    assignedRooms: 0,
    pendingRequests: 0,
    occupancyRate: 0
  });
  const [filters, setFilters] = useState({
    name: '',
    roomNumber: '',
    checkInDate: '',
    status: ''
  });
  
  // Edit form data
  const [formData, setFormData] = useState({
    RoomNumber: '',
    Budget: '',
    CheckInDate: '',
    CheckOutDate: ''
  });
  
  // Get user data from local storage
  const user = JSON.parse(localStorage.getItem('nasconUser'));
  
  useEffect(() => {
    if (!user || (user.userType !== 'Admin' && user.userType !== 'Organizer')) {
      navigate('/login');
      return;
    }
    
    fetchAccommodations();
  }, []);
  
  const fetchAccommodations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/reports/accommodations');
      setAccommodations(response.accommodations || []);
      setStatistics(response.statistics || {
        totalRequests: 0,
        assignedRooms: 0,
        pendingRequests: 0,
        occupancyRate: 0
      });
    } catch (error) {
      console.error('Error fetching accommodations:', error);
      toast.error('Failed to load accommodation data');
    } finally {
      setLoading(false);
    }
  };
  
  const searchAccommodations = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      let url = '/api/accommodations/search';
      const params = [];
      if (filters.name) params.push(`name=${filters.name}`);
      if (filters.roomNumber) params.push(`roomNumber=${filters.roomNumber}`);
      if (filters.checkInDate) params.push(`checkInDate=${filters.checkInDate}`);
      if (filters.status) params.push(`status=${filters.status}`);
      
      if (params.length > 0) {
        url += '?' + params.join('&');
      }
      
      const response = await api.get(url);
      setAccommodations(response || []);
    } catch (error) {
      console.error('Error searching accommodations:', error);
      toast.error('Failed to search accommodations');
    } finally {
      setLoading(false);
    }
  };
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };
  
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSelectAccommodation = (accommodation) => {
    setSelectedAccommodation(accommodation);
    setFormData({
      RoomNumber: accommodation.RoomNumber || '',
      Budget: accommodation.Budget || '',
      CheckInDate: accommodation.CheckInDate ? new Date(accommodation.CheckInDate).toISOString().split('T')[0] : '',
      CheckOutDate: accommodation.CheckOutDate ? new Date(accommodation.CheckOutDate).toISOString().split('T')[0] : ''
    });
  };
  
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    
    if (!selectedAccommodation) return;
    
    // Validate dates
    const checkInDate = new Date(formData.CheckInDate);
    const checkOutDate = new Date(formData.CheckOutDate);
    
    if (checkOutDate <= checkInDate) {
      toast.error('Check-out date must be after check-in date');
      return;
    }
    
    try {
      setLoading(true);
      await api.put(`/api/accommodations/${selectedAccommodation.AccommodationID}`, formData);
      toast.success('Accommodation updated successfully');
      setSelectedAccommodation(null);
      fetchAccommodations();
    } catch (error) {
      console.error('Error updating accommodation:', error);
      toast.error('Failed to update accommodation');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteAccommodation = async (accommodationId) => {
    if (!window.confirm('Are you sure you want to delete this accommodation request?')) {
      return;
    }
    
    try {
      setLoading(true);
      await api.delete(`/api/accommodations/${accommodationId}`);
      toast.success('Accommodation request deleted successfully');
      if (selectedAccommodation?.AccommodationID === accommodationId) {
        setSelectedAccommodation(null);
      }
      fetchAccommodations();
    } catch (error) {
      console.error('Error deleting accommodation:', error);
      toast.error('Failed to delete accommodation request');
    } finally {
      setLoading(false);
    }
  };
  
  const resetFilters = () => {
    setFilters({
      name: '',
      roomNumber: '',
      checkInDate: '',
      status: ''
    });
    fetchAccommodations();
  };
  
  if (loading && accommodations.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Accommodation Management</h1>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-700">Total Requests</h3>
          <p className="text-3xl font-bold text-blue-600">{statistics.totalRequests}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-700">Assigned Rooms</h3>
          <p className="text-3xl font-bold text-green-600">{statistics.assignedRooms}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-700">Pending Requests</h3>
          <p className="text-3xl font-bold text-yellow-600">{statistics.pendingRequests}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-700">Occupancy Rate</h3>
          <p className="text-3xl font-bold text-purple-600">{statistics.occupancyRate}%</p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-xl font-semibold mb-4">Search & Filter</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="name">
              Participant Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={filters.name}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search by name"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="roomNumber">
              Room Number
            </label>
            <input
              type="text"
              id="roomNumber"
              name="roomNumber"
              value={filters.roomNumber}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter room number"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="checkInDate">
              Check-in Date
            </label>
            <input
              type="date"
              id="checkInDate"
              name="checkInDate"
              value={filters.checkInDate}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="assigned">Assigned</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={resetFilters}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded transition duration-200"
          >
            Reset
          </button>
          <button
            onClick={searchAccommodations}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition duration-200"
            disabled={loading}
          >
            Search
          </button>
        </div>
      </div>
      
      {/* Two-column layout: List and Edit form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accommodations List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Accommodation Requests</h2>
            </div>
            
            {accommodations.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No accommodation requests found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Room
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check-in
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check-out
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accommodations.map((accommodation) => (
                      <tr 
                        key={accommodation.AccommodationID}
                        className={`${selectedAccommodation?.AccommodationID === accommodation.AccommodationID ? 'bg-blue-50' : ''} hover:bg-gray-50 cursor-pointer`}
                        onClick={() => handleSelectAccommodation(accommodation)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{accommodation.FullName}</div>
                          <div className="text-sm text-gray-500">{accommodation.Email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {accommodation.RoomNumber ? (
                            <span className="text-sm text-gray-900">{accommodation.RoomNumber}</span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Not Assigned
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(accommodation.CheckInDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(accommodation.CheckOutDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {accommodation.RoomNumber ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Assigned
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAccommodation(accommodation.AccommodationID);
                            }}
                            className="text-red-600 hover:text-red-900 ml-2"
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
        </div>
        
        {/* Edit Form */}
        <div className="lg:col-span-1">
          {selectedAccommodation ? (
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-4">Edit Accommodation</h2>
              <form onSubmit={handleSubmitEdit}>
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2" htmlFor="FullName">
                    Participant
                  </label>
                  <input
                    type="text"
                    id="FullName"
                    value={selectedAccommodation.FullName}
                    className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2"
                    disabled
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2" htmlFor="RoomNumber">
                    Room Number
                  </label>
                  <input
                    type="text"
                    id="RoomNumber"
                    name="RoomNumber"
                    value={formData.RoomNumber}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Assign room number"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2" htmlFor="Budget">
                    Budget
                  </label>
                  <input
                    type="number"
                    id="Budget"
                    name="Budget"
                    value={formData.Budget}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2" htmlFor="CheckInDate">
                    Check-in Date
                  </label>
                  <input
                    type="date"
                    id="CheckInDate"
                    name="CheckInDate"
                    value={formData.CheckInDate}
                    onChange={handleFormChange}
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2" htmlFor="CheckOutDate">
                    Check-out Date
                  </label>
                  <input
                    type="date"
                    id="CheckOutDate"
                    name="CheckOutDate"
                    value={formData.CheckOutDate}
                    onChange={handleFormChange}
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAccommodation(null)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded transition duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition duration-200"
                    disabled={loading}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-gray-500 mb-4">
                Select an accommodation request to edit
              </p>
              <div className="bg-blue-50 p-4 rounded-lg text-left">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Tips</h3>
                <ul className="list-disc pl-5 space-y-1 text-blue-700 text-sm">
                  <li>Click on any row to edit accommodation details</li>
                  <li>Use the search function to filter requests</li>
                  <li>Assign room numbers to pending requests</li>
                  <li>Update dates if participants need to change their stay</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccommodationManagement; 