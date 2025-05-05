import { Link } from "react-router-dom";

const Navbar = () => {
  const userData = JSON.parse(localStorage.getItem("nasconUser"));
  const fullName = userData?.fullName;

  return (
    <header className="bg-blue-500 text-white">
      <div className="container mx-auto flex justify-between items-center py-4 px-6">
        <h1 className="text-2xl font-bold">NASCON</h1>
        <nav className="space-x-6 flex items-center">
          <Link to="/" className="text-white hover:underline">Home</Link>
          <Link to="/events" className="text-white hover:underline">Events</Link>
          <Link to="/register" className="text-white hover:underline">Register</Link>
          {fullName ? (
            <span className="text-xl bg-blue-700 rounded-2xl">Hello, {fullName}</span>
          ) : (
            <Link to="/login" className="text-white hover:underline">Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
