import { useState } from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const userData = JSON.parse(localStorage.getItem("nasconUser"));
  const fullName = userData?.fullName;
  const userType = userData?.userType;

  const handleLogout = () => {
    localStorage.removeItem("nasconUser");
    window.location.href = "/";
  };

  const toggleDropdown = () => {
    setDropdownOpen((prev) => !prev);
  };

  return (
    <header className="bg-blue-500 text-white">
      <div className="container mx-auto flex justify-between items-center py-4 px-6">
        <h1 className="text-2xl font-bold">NASCON</h1>
        <nav className="space-x-6 flex items-center relative">
          <Link to="/" className="text-white hover:underline">Home</Link>
          <Link to="/events" className="text-white hover:underline">Events</Link>

          {fullName ? (
            <div className="relative">
              <span
                onClick={toggleDropdown}
                className="cursor-pointer px-3 py-1 rounded border border-white/30 hover:bg-blue-600"
              >
                {fullName} ({userType})
              </span>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  <Link
                    to="/dashboard"
                    className="block px-4 py-2 text-gray-800 hover:bg-gray-100"
                    onClick={() => setDropdownOpen(false)} // optional: close dropdown on click
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/register" className="text-white hover:underline">Register</Link>
              <Link to="/login" className="text-white hover:underline">Login</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
