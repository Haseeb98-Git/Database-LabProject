import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/navbar";

const Dashboard = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    events: [],
    registrations: [],
    venues: [],
    sponsorships: [],
    judgeAssignments: []
  });

  useEffect(() => {
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem("nasconUser"));
    
    if (!user) {
      navigate("/login");
      return;
    }
    
    setUserData(user);
    
    // Fetch dashboard data based on user type
    const fetchDashboardData = async () => {
      try {
        // Different endpoints based on user type
        const endpoints = {
          events: `http://localhost:5000/api/events`,
          registrations: `http://localhost:5000/api/users/${user.UserID}/registrations`,
          venues: `http://localhost:5000/api/venues`,
          sponsorships: `http://localhost:5000/api/sponsorships`,
          judgeAssignments: `http://localhost:5000/api/judges/${user.UserID}/assignments`
        };
        
        // Fetch only the data needed for this user type
        const requests = [];
        const requestKeys = [];
        
        if (user.userType === 'Admin' || user.userType === 'Organizer') {
          requests.push(fetch(endpoints.events));
          requestKeys.push('events');
          requests.push(fetch(endpoints.venues));
          requestKeys.push('venues');
          requests.push(fetch(endpoints.sponsorships));
          requestKeys.push('sponsorships');
        }
        
        if (user.userType === 'Participant') {
          requests.push(fetch(endpoints.events));
          requestKeys.push('events');
          requests.push(fetch(endpoints.registrations));
          requestKeys.push('registrations');
        }
        
        if (user.userType === 'Sponsor') {
          requests.push(fetch(endpoints.sponsorships));
          requestKeys.push('sponsorships');
        }
        
        if (user.userType === 'Judge') {
          requests.push(fetch(endpoints.judgeAssignments));
          requestKeys.push('judgeAssignments');
        }
        
        const responses = await Promise.all(requests);
        const data = await Promise.all(responses.map(res => res.json()));
        
        const newDashboardData = { ...dashboardData };
        requestKeys.forEach((key, index) => {
          newDashboardData[key] = data[index];
        });
        
        setDashboardData(newDashboardData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [navigate]);

  // Render different dashboard components based on user type
  const renderDashboardContent = () => {
    if (!userData) return null;
    
    switch (userData.userType) {
      case 'Admin':
        return <AdminDashboard data={dashboardData} userData={userData} />;
      case 'Organizer':
        return <OrganizerDashboard data={dashboardData} userData={userData} />;
      case 'Participant':
        return <ParticipantDashboard data={dashboardData} userData={userData} />;
      case 'Sponsor':
        return <SponsorDashboard data={dashboardData} userData={userData} />;
      case 'Judge':
        return <JudgeDashboard data={dashboardData} userData={userData} />;
      default:
        return <p>Unknown user type.</p>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <section className="flex-1 bg-gray-100 p-6">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold mb-6">Dashboard</h2>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-xl">Loading...</p>
            </div>
          ) : (
            renderDashboardContent()
          )}
        </div>
      </section>
      <footer className="bg-blue-500 text-white text-center py-4">
        &copy; {new Date().getFullYear()} NASCON. All rights reserved.
      </footer>
    </div>
  );
};

// Dashboard components for different user types
const AdminDashboard = ({ data, userData }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <DashboardCard title="Event Management">
        <p className="mb-2">{data.events?.length || 0} Events Total</p>
        <Link to="/admin/events" className="text-blue-600 hover:underline">
          Manage Events
        </Link>
      </DashboardCard>
      
      <DashboardCard title="Venue Management">
        <p className="mb-2">{data.venues?.length || 0} Venues Available</p>
        <Link to="/admin/venues" className="text-blue-600 hover:underline">
          Manage Venues
        </Link>
      </DashboardCard>
      
      <DashboardCard title="User Management">
        <Link to="/admin/users" className="text-blue-600 hover:underline">
          Manage Users
        </Link>
      </DashboardCard>
      
      <DashboardCard title="Finance">
        <Link to="/admin/finance" className="text-blue-600 hover:underline">
          Financial Dashboard
        </Link>
      </DashboardCard>
      
      <DashboardCard title="Accommodation Management">
        <Link to="/admin/accommodation" className="text-blue-600 hover:underline">
          Manage Accommodations
        </Link>
      </DashboardCard>
      
      <DashboardCard title="Reports">
        <Link to="/admin/reports" className="text-blue-600 hover:underline">
          View Reports
        </Link>
      </DashboardCard>
    </div>
  );
};

const OrganizerDashboard = ({ data, userData }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <DashboardCard title="Event Management">
        <p className="mb-2">{data.events?.length || 0} Events Total</p>
        <Link to="/organizer/events" className="text-blue-600 hover:underline">
          Manage Events
        </Link>
      </DashboardCard>
      
      <DashboardCard title="Venue Management">
        <p className="mb-2">{data.venues?.length || 0} Venues Available</p>
        <Link to="/organizer/venues" className="text-blue-600 hover:underline">
          Manage Venues
        </Link>
      </DashboardCard>
      
      <DashboardCard title="Finance">
        <Link to="/organizer/finance" className="text-blue-600 hover:underline">
          Financial Dashboard
        </Link>
      </DashboardCard>
      
      <DashboardCard title="Accommodation Management">
        <Link to="/organizer/accommodation" className="text-blue-600 hover:underline">
          Manage Accommodations
        </Link>
      </DashboardCard>
    </div>
  );
};

const ParticipantDashboard = ({ data, userData }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <DashboardCard title="My Registrations">
        <p className="mb-2">{data.registrations?.length || 0} Events Registered</p>
        <Link to="/participant/registrations" className="text-blue-600 hover:underline">
          View My Registrations
        </Link>
      </DashboardCard>
      
      <DashboardCard title="Available Events">
        <p className="mb-2">{data.events?.length || 0} Events Available</p>
        <Link to="/events" className="text-blue-600 hover:underline">
          Browse Events
        </Link>
      </DashboardCard>
      
      <DashboardCard title="My Teams">
        <Link to="/participant/teams" className="text-blue-600 hover:underline">
          Manage My Teams
        </Link>
      </DashboardCard>
      
      <DashboardCard title="Accommodation">
        <Link to="/participant/accommodation" className="text-blue-600 hover:underline">
          Request Accommodation
        </Link>
      </DashboardCard>
    </div>
  );
};

const SponsorDashboard = ({ data, userData }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <DashboardCard title="My Sponsorships">
        <p className="mb-2">{data.sponsorships?.length || 0} Active Sponsorships</p>
        <Link to="/sponsor/contracts" className="text-blue-600 hover:underline">
          View My Contracts
        </Link>
      </DashboardCard>
      
      <DashboardCard title="Sponsorship Packages">
        <Link to="/sponsor/packages" className="text-blue-600 hover:underline">
          Browse Packages
        </Link>
      </DashboardCard>
      
      <DashboardCard title="Payment History">
        <Link to="/sponsor/payments" className="text-blue-600 hover:underline">
          View Payment History
        </Link>
      </DashboardCard>
      
      <DashboardCard title="Branding Opportunities">
        <Link to="/sponsor/branding" className="text-blue-600 hover:underline">
          View Branding Opportunities
        </Link>
      </DashboardCard>
    </div>
  );
};

const JudgeDashboard = ({ data, userData }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <DashboardCard title="My Assignments">
        <p className="mb-2">{data.judgeAssignments?.length || 0} Events Assigned</p>
        <Link to="/judge/assignments" className="text-blue-600 hover:underline">
          View My Assignments
        </Link>
      </DashboardCard>
      
      <DashboardCard title="Score Management">
        <Link to="/judge/scores" className="text-blue-600 hover:underline">
          Manage Scores
        </Link>
      </DashboardCard>
      
      <DashboardCard title="Event Schedule">
        <Link to="/judge/schedule" className="text-blue-600 hover:underline">
          View Schedule
        </Link>
      </DashboardCard>
    </div>
  );
};

// Reusable dashboard card component
const DashboardCard = ({ title, children }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4 border-b pb-2">{title}</h3>
      <div>{children}</div>
    </div>
  );
};

export default Dashboard; 