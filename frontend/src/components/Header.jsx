import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./Header.css";

export default function Header({ setUserToken, setAdminToken }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  const userToken = localStorage.getItem("userToken");
  const adminToken = localStorage.getItem("adminToken");
  const isLoggedIn = !!userToken || !!adminToken;

  const isActive = (path) => (location.pathname === path ? "active" : "");

  const handleLogout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("username");
    setUserToken(null);
    setAdminToken(null);
    navigate("/");
  };

  // Detect scroll only on home page
  const isHome = location.pathname === "/";
  // Determine if logout should be shown
  const showLogout = location.pathname.startsWith("/admin") || location.pathname.startsWith("/user");


  useEffect(() => {
    if (!isHome) {
      setScrolled(false);
      return;
    }

    // Check initial scroll position
    const checkScroll = () => {
      const scrollPosition = window.scrollY;
      const shouldBeScrolled = scrollPosition > 50;
      setScrolled(shouldBeScrolled);
    };

    // Check on mount
    checkScroll();

    const handleScroll = () => {
      checkScroll();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  const headerClassName = isHome 
    ? (scrolled ? "header scrolled" : "header")
    : "header solid";

  return (
    <header
      className={headerClassName}
    >
      {/* LEFT: LOGO */}
      <div className="logo">✈ Aether Airlines</div>

      {/* MIDDLE: NAVIGATION LINKS */}
      <nav className="nav-links">
        <Link className={isActive("/")} to="/">Home</Link>

        {!isLoggedIn && (
          <Link className={isActive("/auth")} to="/auth">Login / Signup</Link>
        )}

        {adminToken && (
          <Link className={isActive("/admin")} to="/admin">Admin Dashboard</Link>
        )}

        {userToken && (
          <Link className={isActive("/user")} to="/user">User Dashboard</Link>
        )}
      </nav>
      
{/* RIGHT: LOGOUT */}
<div className="nav-right">
  {isLoggedIn && showLogout && (
    <button className="logout-btn" onClick={handleLogout}>
      Logout
    </button>
  )}
</div>

    </header>
  );
}
