import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";

const SponsorshipPackages = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showContractForm, setShowContractForm] = useState(false);
  const [contractDetails, setContractDetails] = useState({
    SponsorshipType: "",
    ContractDetails: "",
    AmountPaid: "",
    BrandingOpportunities: ""
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("nasconUser"));
    if (!user) {
      navigate("/login");
      return;
    }

    fetchPackages();
  }, [navigate]);

  const fetchPackages = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/sponsorship/packages");
      if (!response.ok) {
        throw new Error("Failed to fetch sponsorship packages");
      }
      const data = await response.json();
      setPackages(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePackageSelect = (pkg) => {
    setSelectedPackage(pkg);
    setContractDetails({
      ...contractDetails,
      SponsorshipType: pkg.type,
      AmountPaid: pkg.minAmount
    });
    setShowContractForm(true);
  };

  const handleContractSubmit = async (e) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem("nasconUser"));

    try {
      const response = await fetch("http://localhost:5000/api/sponsorship/contracts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...contractDetails,
          SponsorID: user.UserID
        })
      });

      if (!response.ok) {
        throw new Error("Failed to create sponsorship contract");
      }

      const result = await response.json();
      alert("Sponsorship contract created successfully!");
      navigate("/sponsor/contracts");
    } catch (error) {
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Loading sponsorship packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Sponsorship Packages</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!showContractForm ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.type}
                className="bg-white rounded-lg shadow-lg overflow-hidden"
              >
                <div className="bg-blue-600 text-white px-6 py-4">
                  <h2 className="text-2xl font-bold">{pkg.type} Sponsor</h2>
                  <p className="text-xl mt-2">${pkg.minAmount.toLocaleString()}</p>
                </div>
                <div className="p-6">
                  <h3 className="font-semibold mb-4">Benefits Include:</h3>
                  <ul className="space-y-2">
                    {pkg.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start">
                        <svg
                          className="h-5 w-5 text-green-500 mr-2 mt-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handlePackageSelect(pkg)}
                    className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                  >
                    Select Package
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Create Sponsorship Contract</h2>
            <form onSubmit={handleContractSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Sponsorship Type
                </label>
                <input
                  type="text"
                  value={contractDetails.SponsorshipType}
                  disabled
                  className="w-full px-3 py-2 border rounded bg-gray-100"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Amount Paid ($)
                </label>
                <input
                  type="number"
                  value={contractDetails.AmountPaid}
                  onChange={(e) =>
                    setContractDetails({
                      ...contractDetails,
                      AmountPaid: e.target.value
                    })
                  }
                  min={selectedPackage.minAmount}
                  required
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Contract Details
                </label>
                <textarea
                  value={contractDetails.ContractDetails}
                  onChange={(e) =>
                    setContractDetails({
                      ...contractDetails,
                      ContractDetails: e.target.value
                    })
                  }
                  required
                  className="w-full px-3 py-2 border rounded"
                  rows="4"
                  placeholder="Enter contract details..."
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  Branding Opportunities
                </label>
                <textarea
                  value={contractDetails.BrandingOpportunities}
                  onChange={(e) =>
                    setContractDetails({
                      ...contractDetails,
                      BrandingOpportunities: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 border rounded"
                  rows="4"
                  placeholder="Describe your branding requirements..."
                />
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowContractForm(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Submit Contract
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SponsorshipPackages; 