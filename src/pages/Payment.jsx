import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import Navbar from "../components/navbar";

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    nameOnCard: ""
  });
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  // Registration data passed from the registration page
  const { registrationData, amount, eventName, returnPath } = location.state || {};

  useEffect(() => {
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem("nasconUser"));
    
    if (!user) {
      navigate("/login");
      return;
    }
    
    setUserData(user);
    
    // Check if we have the required payment information
    if (!registrationData || !amount) {
      setError("Missing payment information. Please go back and try again.");
    }
  }, [navigate, registrationData, amount]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Basic validation
    if (name === "cardNumber") {
      // Only allow digits and limit to 16 characters
      const sanitizedValue = value.replace(/\D/g, "").slice(0, 16);
      setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
      return;
    }
    
    if (name === "cvv") {
      // Only allow digits and limit to 3-4 characters
      const sanitizedValue = value.replace(/\D/g, "").slice(0, 4);
      setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
      return;
    }
    
    if (name === "expiryDate") {
      // Format as MM/YY
      let sanitizedValue = value.replace(/\D/g, "");
      if (sanitizedValue.length > 2) {
        sanitizedValue = sanitizedValue.slice(0, 2) + "/" + sanitizedValue.slice(2, 4);
      }
      setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMethodChange = (method) => {
    setPaymentMethod(method);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real app, you would call your payment processing API here
      // For this demo, we'll simulate a successful payment
      
      // After successful payment, create the registration
      const registrationResponse = await fetch("http://localhost:5000/api/registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(registrationData)
      });
      
      if (!registrationResponse.ok) {
        const regError = await registrationResponse.json();
        throw new Error(regError.error || "Registration failed after payment");
      }
      
      // Create a payment record
      const paymentResponse = await fetch("http://localhost:5000/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          UserID: userData.UserID,
          EventID: registrationData.EventID,
          AmountPaid: amount,
          PaymentMethod: paymentMethod === "credit_card" ? "Online" : "Manual" 
        })
      });
      
      if (!paymentResponse.ok) {
        const paymentError = await paymentResponse.json();
        console.error("Payment record creation failed:", paymentError);
        // Continue anyway since registration was successful
      }
      
      setSuccess(true);
      
      // Redirect after a delay
      setTimeout(() => {
        navigate(returnPath || "/participant/registrations");
      }, 3000);
      
    } catch (error) {
      console.error("Payment/registration error:", error);
      setError(error.message || "Payment processing failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (error && !registrationData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <section className="flex-1 bg-gray-100 p-6 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
            <p className="mb-4">{error}</p>
            <Link to="/events" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Go to Events
            </Link>
          </div>
        </section>
        <footer className="bg-blue-500 text-white text-center py-4">
          &copy; {new Date().getFullYear()} NASCON. All rights reserved.
        </footer>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <section className="flex-1 bg-gray-100 p-6 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
            <div className="text-green-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-4">Payment Successful</h2>
            <p className="mb-4">
              Your payment of PKR {amount} for {eventName} has been processed successfully.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              You will be redirected to your registrations shortly...
            </p>
            <Link to="/participant/registrations" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              View My Registrations
            </Link>
          </div>
        </section>
        <footer className="bg-blue-500 text-white text-center py-4">
          &copy; {new Date().getFullYear()} NASCON. All rights reserved.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <section className="flex-1 bg-gray-100 p-6">
        <div className="container mx-auto max-w-3xl">
          <div className="mb-4">
            <button 
              onClick={() => navigate(-1)} 
              className="text-blue-600 hover:underline"
            >
              &larr; Back
            </button>
          </div>
          
          <h2 className="text-3xl font-bold mb-6">Payment</h2>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold mb-4">Order Summary</h3>
              <div className="flex justify-between mb-2">
                <span>Event:</span>
                <span className="font-medium">{eventName}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Registration Type:</span>
                <span>{registrationData?.TeamID ? "Team" : "Individual"}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount:</span>
                <span>PKR {amount}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">Payment Method</h3>
              
              <div className="flex flex-wrap gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => handleMethodChange("credit_card")}
                  className={`px-4 py-2 rounded-lg border ${
                    paymentMethod === "credit_card"
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "border-gray-300"
                  }`}
                >
                  Credit/Debit Card
                </button>
                <button
                  type="button"
                  onClick={() => handleMethodChange("bank_transfer")}
                  className={`px-4 py-2 rounded-lg border ${
                    paymentMethod === "bank_transfer"
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "border-gray-300"
                  }`}
                >
                  Bank Transfer
                </button>
              </div>
              
              {paymentMethod === "credit_card" ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      name="cardNumber"
                      value={formData.cardNumber}
                      onChange={handleInputChange}
                      placeholder="1234 5678 9012 3456"
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        name="expiryDate"
                        value={formData.expiryDate}
                        onChange={handleInputChange}
                        placeholder="MM/YY"
                        className="w-full p-2 border rounded"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CVV
                      </label>
                      <input
                        type="password"
                        name="cvv"
                        value={formData.cvv}
                        onChange={handleInputChange}
                        placeholder="123"
                        className="w-full p-2 border rounded"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name on Card
                    </label>
                    <input
                      type="text"
                      name="nameOnCard"
                      value={formData.nameOnCard}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  
                  {error && (
                    <div className="p-3 bg-red-50 text-red-600 rounded">
                      {error}
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 flex items-center justify-center"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      `Pay PKR ${amount}`
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded">
                    <h4 className="font-medium mb-2">Bank Transfer Instructions</h4>
                    <p className="text-sm text-gray-700 mb-2">
                      Please transfer the amount to the following bank account:
                    </p>
                    <div className="text-sm">
                      <p><span className="font-medium">Bank:</span> National Bank of Pakistan</p>
                      <p><span className="font-medium">Account Name:</span> NASCON Event Management</p>
                      <p><span className="font-medium">Account Number:</span> 0123-4567-8901-2345</p>
                      <p><span className="font-medium">Reference:</span> EV-{registrationData?.EventID}-{userData?.UserID}</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    After transferring the amount, our team will verify your payment and confirm your registration within 24 hours.
                  </p>
                  
                  {error && (
                    <div className="p-3 bg-red-50 text-red-600 rounded">
                      {error}
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Confirm Bank Transfer"}
                  </button>
                </div>
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

export default Payment; 