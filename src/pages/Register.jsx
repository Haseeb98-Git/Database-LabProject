// Register.jsx
import React, { useState } from "react";
import { Link } from 'react-router-dom'; // Import Link from react-router-dom
import Navbar from "../components/navbar";

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
    userType: 'Participant', // Default type
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch("http://localhost:5000/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();
    if (data.error) {
      alert(data.error);
    } else {
      alert('User registered successfully!');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
        <Navbar/>
      {/* Registration Form */}
      <section className="bg-gray-100 py-8">
        <div className="container mx-auto text-center">
          <h3 className="text-2xl font-bold mb-4">Register for NASCON</h3>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="Full Name"
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Email"
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Password"
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="text"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              placeholder="Phone Number"
              className="w-full p-2 border rounded"
            />
            <select
              name="userType"
              value={formData.userType}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="Participant">Participant</option>
              <option value="Organizer">Organizer</option>
              <option value="Sponsor">Sponsor</option>
              <option value="Judge">Judge</option>
            </select>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded"
            >
              Register
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-500 text-white text-center py-4">
        &copy; {new Date().getFullYear()} NASCON. All rights reserved.
      </footer>
    </div>
  );
};

export default Register;
