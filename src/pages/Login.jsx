// Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";

const Login = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch("http://localhost:5000/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    if (data.error) {
      alert(data.error);
    } else {
      alert("Login successful!");
      localStorage.setItem("nasconUser", JSON.stringify(data.user));
      // Optionally store token or user info
      // localStorage.setItem("token", data.token);
      navigate("/"); // Redirect to home or dashboard
    }
  };
  
  

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <section className="bg-gray-100 py-8">
        <div className="container mx-auto text-center">
          <h3 className="text-2xl font-bold mb-4">Login to NASCON</h3>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
            <input
              type="email"
              name="email"
              value={credentials.email}
              onChange={handleChange}
              placeholder="Email"
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              placeholder="Password"
              className="w-full p-2 border rounded"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded"
            >
              Login
            </button>
          </form>
        </div>
      </section>
      <footer className="bg-blue-500 text-white text-center py-4">
        &copy; {new Date().getFullYear()} NASCON. All rights reserved.
      </footer>
    </div>
  );
};

export default Login;
