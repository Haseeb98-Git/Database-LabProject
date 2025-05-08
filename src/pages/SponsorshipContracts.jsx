import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";

const SponsorshipContracts = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statistics, setStatistics] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("nasconUser"));
    if (!user) {
      navigate("/login");
      return;
    }
    setUserData(user);

    const fetchData = async () => {
      try {
        // Fetch contracts
        const endpoint = user.userType === "Admin" || user.userType === "Organizer"
          ? "http://localhost:5000/api/sponsorship/contracts"
          : `http://localhost:5000/api/sponsorship/contracts/${user.UserID}`;

        const contractsResponse = await fetch(endpoint);
        if (!contractsResponse.ok) {
          throw new Error("Failed to fetch sponsorship contracts");
        }
        const contractsData = await contractsResponse.json();
        setContracts(contractsData);

        // Fetch statistics if user is Admin or Organizer
        if (user.userType === "Admin" || user.userType === "Organizer") {
          const statsResponse = await fetch("http://localhost:5000/api/sponsorship/statistics");
          if (!statsResponse.ok) {
            throw new Error("Failed to fetch sponsorship statistics");
          }
          const statsData = await statsResponse.json();
          setStatistics(statsData);
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleUpdateBranding = async (contractId, newBranding) => {
    try {
      const response = await fetch(`http://localhost:5000/api/sponsorship/contracts/${contractId}/branding`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ BrandingOpportunities: newBranding })
      });

      if (!response.ok) {
        throw new Error("Failed to update branding opportunities");
      }

      // Refresh contracts after update
      const endpoint = userData.userType === "Admin" || userData.userType === "Organizer"
        ? "http://localhost:5000/api/sponsorship/contracts"
        : `http://localhost:5000/api/sponsorship/contracts/${userData.UserID}`;

      const contractsResponse = await fetch(endpoint);
      if (!contractsResponse.ok) {
        throw new Error("Failed to fetch updated contracts");
      }
      const contractsData = await contractsResponse.json();
      setContracts(contractsData);
    } catch (error) {
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Loading sponsorship contracts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Sponsorship Contracts</h1>
          {userData?.userType === "Sponsor" && (
            <button
              onClick={() => navigate("/sponsor/packages")}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              New Sponsorship
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-600">Total Contracts</h3>
              <p className="text-3xl font-bold mt-2">{statistics.totalContracts}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-600">Total Amount</h3>
              <p className="text-3xl font-bold mt-2">
                ${statistics.totalAmount.toLocaleString()}
              </p>
            </div>
            {statistics.byType.map((type) => (
              <div key={type.SponsorshipType} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-600">
                  {type.SponsorshipType}
                </h3>
                <p className="text-3xl font-bold mt-2">
                  ${type.totalAmount.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {type.totalContracts} contracts
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sponsor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contract Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branding Opportunities
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contracts.map((contract) => (
                <tr key={contract.SponsorshipID}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {contract.SponsorName}
                    </div>
                    <div className="text-sm text-gray-500">{contract.SponsorEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {contract.SponsorshipType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${contract.AmountPaid.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {contract.ContractDetails}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {contract.BrandingOpportunities}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        const newBranding = prompt(
                          "Enter new branding opportunities:",
                          contract.BrandingOpportunities
                        );
                        if (newBranding) {
                          handleUpdateBranding(contract.SponsorshipID, newBranding);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Update Branding
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SponsorshipContracts; 