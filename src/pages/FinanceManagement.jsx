import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";

const FinanceManagement = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportType, setReportType] = useState("revenue");
  const [dateRange, setDateRange] = useState("all");
  const [customDateRange, setCustomDateRange] = useState({
    startDate: "",
    endDate: ""
  });
  const [reportData, setReportData] = useState(null);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalSponsorships: 0,
    totalRegistrationFees: 0,
    totalAccommodation: 0,
    totalPayments: 0
  });

  useEffect(() => {
    // Check if user is logged in and is admin
    const user = JSON.parse(localStorage.getItem("nasconUser"));
    
    if (!user) {
      navigate("/login");
      return;
    }
    
    if (user.userType !== "Admin" && user.userType !== "Organizer") {
      navigate("/dashboard");
      return;
    }
    
    setUserData(user);
    loadFinancialData();
  }, [navigate]);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      // Fetch financial summary data
      const summaryResponse = await fetch("http://localhost:5000/api/finance/summary");
      
      if (!summaryResponse.ok) {
        throw new Error("Failed to load financial summary");
      }
      
      const summaryData = await summaryResponse.json();
      setSummary(summaryData);
      
      // Load default report
      await generateReport();
      
    } catch (error) {
      console.error("Error loading financial data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    setError("");
    
    try {
      let url = `http://localhost:5000/api/finance/reports/${reportType}`;
      
      // Add date range parameters if needed
      if (dateRange === "custom" && customDateRange.startDate && customDateRange.endDate) {
        url += `?startDate=${customDateRange.startDate}&endDate=${customDateRange.endDate}`;
      } else if (dateRange !== "all") {
        url += `?period=${dateRange}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to generate ${reportType} report`);
      }
      
      const data = await response.json();
      setReportData(data);
      
    } catch (error) {
      console.error("Error generating report:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReportTypeChange = (type) => {
    setReportType(type);
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  const handleCustomDateChange = (e) => {
    const { name, value } = e.target;
    setCustomDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGenerateReport = (e) => {
    e.preventDefault();
    generateReport();
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `PKR ${parseFloat(amount).toLocaleString()}`;
  };

  const renderReportContent = () => {
    if (!reportData || reportData.length === 0) {
      return (
        <div className="text-center p-8 bg-gray-50 rounded">
          <p>No data available for the selected report type and date range.</p>
        </div>
      );
    }

    switch (reportType) {
      case "revenue":
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="py-2 px-4 text-left">Category</th>
                  <th className="py-2 px-4 text-right">Amount (PKR)</th>
                  <th className="py-2 px-4 text-right">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{item.category}</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(item.amount)}</td>
                    <td className="py-2 px-4 text-right">{item.percentage}%</td>
                  </tr>
                ))}
                <tr className="font-bold bg-gray-100">
                  <td className="py-2 px-4">Total</td>
                  <td className="py-2 px-4 text-right">
                    {formatCurrency(reportData.reduce((sum, item) => sum + parseFloat(item.amount), 0))}
                  </td>
                  <td className="py-2 px-4 text-right">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
        
      case "events":
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="py-2 px-4 text-left">Event Name</th>
                  <th className="py-2 px-4 text-left">Type</th>
                  <th className="py-2 px-4 text-right">Registration Fee</th>
                  <th className="py-2 px-4 text-right">Participants</th>
                  <th className="py-2 px-4 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((event, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{event.EventName}</td>
                    <td className="py-2 px-4">{event.EventType}</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(event.RegistrationFee)}</td>
                    <td className="py-2 px-4 text-right">{event.ParticipantCount}</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(event.TotalRevenue)}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-gray-100">
                  <td colSpan="4" className="py-2 px-4">Total</td>
                  <td className="py-2 px-4 text-right">
                    {formatCurrency(reportData.reduce((sum, event) => sum + parseFloat(event.TotalRevenue), 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
        
      case "sponsorships":
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="py-2 px-4 text-left">Sponsor Name</th>
                  <th className="py-2 px-4 text-left">Sponsorship Type</th>
                  <th className="py-2 px-4 text-right">Amount Paid</th>
                  <th className="py-2 px-4 text-left">Payment Date</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((sponsor, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{sponsor.SponsorName}</td>
                    <td className="py-2 px-4">{sponsor.SponsorshipType}</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(sponsor.AmountPaid)}</td>
                    <td className="py-2 px-4">{new Date(sponsor.PaymentDate).toLocaleDateString()}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-gray-100">
                  <td colSpan="2" className="py-2 px-4">Total</td>
                  <td className="py-2 px-4 text-right">
                    {formatCurrency(reportData.reduce((sum, sponsor) => sum + parseFloat(sponsor.AmountPaid), 0))}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        );
        
      case "payments":
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="py-2 px-4 text-left">Payment ID</th>
                  <th className="py-2 px-4 text-left">User</th>
                  <th className="py-2 px-4 text-left">Type</th>
                  <th className="py-2 px-4 text-left">Event/Sponsorship</th>
                  <th className="py-2 px-4 text-right">Amount</th>
                  <th className="py-2 px-4 text-left">Method</th>
                  <th className="py-2 px-4 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((payment, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{payment.PaymentID}</td>
                    <td className="py-2 px-4">{payment.UserName}</td>
                    <td className="py-2 px-4">{payment.PaymentType}</td>
                    <td className="py-2 px-4">{payment.EventName || payment.SponsorshipType || "-"}</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(payment.AmountPaid)}</td>
                    <td className="py-2 px-4">{payment.PaymentMethod}</td>
                    <td className="py-2 px-4">{new Date(payment.PaymentDate).toLocaleDateString()}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-gray-100">
                  <td colSpan="4" className="py-2 px-4">Total</td>
                  <td className="py-2 px-4 text-right">
                    {formatCurrency(reportData.reduce((sum, payment) => sum + parseFloat(payment.AmountPaid), 0))}
                  </td>
                  <td colSpan="2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        );
        
      default:
        return <div>Select a report type to generate.</div>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="bg-blue-600 text-white p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold">Finance Management</h1>
          <p className="mt-2">Generate financial reports and analyze financial data.</p>
        </div>
      </div>
      
      <section className="flex-1 bg-gray-100 p-6">
        <div className="container mx-auto">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500">Total Revenue</p>
                  <h3 className="text-2xl font-bold mt-1">{formatCurrency(summary.totalRevenue)}</h3>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500">Registration Fees</p>
                  <h3 className="text-2xl font-bold mt-1">{formatCurrency(summary.totalRegistrationFees)}</h3>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500">Sponsorships</p>
                  <h3 className="text-2xl font-bold mt-1">{formatCurrency(summary.totalSponsorships)}</h3>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 11V9a2 2 0 00-2-2m2 4v4a2 2 0 104 0v-1m-4-3H9m2 0h4m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500">Total Payments</p>
                  <h3 className="text-2xl font-bold mt-1">{summary.totalPayments}</h3>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Report Generator */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Generate Financial Report</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleGenerateReport} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleReportTypeChange("revenue")}
                      className={`px-4 py-2 rounded-lg border ${
                        reportType === "revenue"
                          ? "bg-blue-50 border-blue-500 text-blue-700"
                          : "border-gray-300"
                      }`}
                    >
                      Revenue Summary
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReportTypeChange("events")}
                      className={`px-4 py-2 rounded-lg border ${
                        reportType === "events"
                          ? "bg-blue-50 border-blue-500 text-blue-700"
                          : "border-gray-300"
                      }`}
                    >
                      Event Revenue
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReportTypeChange("sponsorships")}
                      className={`px-4 py-2 rounded-lg border ${
                        reportType === "sponsorships"
                          ? "bg-blue-50 border-blue-500 text-blue-700"
                          : "border-gray-300"
                      }`}
                    >
                      Sponsorship Funds
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReportTypeChange("payments")}
                      className={`px-4 py-2 rounded-lg border ${
                        reportType === "payments"
                          ? "bg-blue-50 border-blue-500 text-blue-700"
                          : "border-gray-300"
                      }`}
                    >
                      Payment Transactions
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <div className="flex flex-wrap gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => handleDateRangeChange("all")}
                      className={`px-4 py-2 rounded-lg border ${
                        dateRange === "all"
                          ? "bg-blue-50 border-blue-500 text-blue-700"
                          : "border-gray-300"
                      }`}
                    >
                      All Time
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDateRangeChange("this_month")}
                      className={`px-4 py-2 rounded-lg border ${
                        dateRange === "this_month"
                          ? "bg-blue-50 border-blue-500 text-blue-700"
                          : "border-gray-300"
                      }`}
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDateRangeChange("this_year")}
                      className={`px-4 py-2 rounded-lg border ${
                        dateRange === "this_year"
                          ? "bg-blue-50 border-blue-500 text-blue-700"
                          : "border-gray-300"
                      }`}
                    >
                      This Year
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDateRangeChange("custom")}
                      className={`px-4 py-2 rounded-lg border ${
                        dateRange === "custom"
                          ? "bg-blue-50 border-blue-500 text-blue-700"
                          : "border-gray-300"
                      }`}
                    >
                      Custom Range
                    </button>
                  </div>
                  
                  {dateRange === "custom" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          name="startDate"
                          value={customDateRange.startDate}
                          onChange={handleCustomDateChange}
                          className="w-full p-2 border rounded"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          name="endDate"
                          value={customDateRange.endDate}
                          onChange={handleCustomDateChange}
                          className="w-full p-2 border rounded"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? "Generating..." : "Generate Report"}
                  </button>
                </div>
              </form>
            </div>
          </div>
          
          {/* Report Results */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">Report Results</h2>
              <button
                onClick={() => {
                  // In a real app, you would implement proper export functionality
                  alert("Export functionality would be implemented here");
                }}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
              >
                Export Report
              </button>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="text-center p-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                  <p>Loading report data...</p>
                </div>
              ) : error ? (
                <div className="p-4 bg-red-50 text-red-600 rounded">
                  {error}
                </div>
              ) : (
                renderReportContent()
              )}
            </div>
          </div>
        </div>
      </section>
      
      <footer className="bg-blue-500 text-white text-center py-4">
        &copy; {new Date().getFullYear()} NASCON. All rights reserved.
      </footer>
    </div>
  );
};

export default FinanceManagement; 