import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// Layout
import Header from "./components/Header";
import Footer from "./components/Footer";
import LoadingAnimation from "./components/LoadingAnimation";

// Public Pages
import Home from "./pages/Home";
import AdminFlights from "./pages/admin/flights/Flights";
import UserFlights from "./pages/user/userFlights";
import Login from "./pages/Auth";
import Signup from "./pages/user/Signup";
import Auth from "./pages/Auth";

// Dashboards
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserDashboard from "./pages/user/UserDashboard";

// User Nested Pages
import Profile from "./pages/user/Profile";
import BookTicket from "./pages/user/BookTicket";
import BookingOptions from "./pages/user/BookingOptions";
import PassengerDetails from "./pages/user/PassengerDetails";
import PaymentPage from "./pages/user/PaymentPage";
import PaymentSuccess from "./pages/user/PaymentSuccess";
import PaymentFailed from "./pages/user/PaymentFailed";
import TicketConfirmation from "./pages/user/TicketConfirmation";
import FlightStatus from "./pages/user/FlightStatus";

function AppContent({ userToken, adminToken, setUserToken, setAdminToken }) {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith("/admin") || location.pathname.startsWith("/user");
  const [isLoading, setIsLoading] = useState(false);
  const [prevPath, setPrevPath] = useState(location.pathname);

  // Add/remove class to body for dashboard pages
  useEffect(() => {
    if (isDashboard) {
      document.body.classList.add('dashboard-active');
    } else {
      document.body.classList.remove('dashboard-active');
    }
    return () => {
      document.body.classList.remove('dashboard-active');
    };
  }, [isDashboard]);

  // Show loading animation when navigating between homepage and dashboard
  useEffect(() => {
    const isPrevDashboard = prevPath.startsWith("/admin") || prevPath.startsWith("/user");
    const isCurrentDashboard = location.pathname.startsWith("/admin") || location.pathname.startsWith("/user");
    const isPrevHomepage = prevPath === "/";
    const isCurrentHomepage = location.pathname === "/";
    
    // Show loading if switching between homepage and dashboard (both directions)
    if ((isPrevHomepage && isCurrentDashboard) || (isPrevDashboard && isCurrentHomepage)) {
      setIsLoading(true);
      // Set flag for dashboard to show loading animation
      if (isCurrentDashboard) {
        localStorage.setItem("dashboardLoading", "true");
      }
      // Hide loading after navigation completes
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500); // Brief delay to ensure smooth transition
      setPrevPath(location.pathname);
      return () => clearTimeout(timer);
    }
    
    setPrevPath(location.pathname);
  }, [location.pathname]);

  return (
    <div className="page-container">
      {isLoading && <LoadingAnimation />}
      <Header setUserToken={setUserToken} setAdminToken={setAdminToken} />

      <div className={`content-wrap ${isDashboard ? "" : "container"}`}>
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* PAYMENT CALLBACK ROUTES (Public - Stripe redirects here) */}
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-failed" element={<PaymentFailed />} />
          
          {/* PAYMENT CALLBACK ROUTES (Public - Stripe redirects here) */}
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-failed" element={<PaymentFailed />} />

          {/* AUTH REDIRECT HANDLER */}
          <Route
            path="/auth"
            element={
              userToken ? (
                <Navigate to="/user" />
              ) : adminToken ? (
                <Navigate to="/admin" />
              ) : (
                <Auth setUserToken={setUserToken} setAdminToken={setAdminToken} />
              )
            }
          />

          {/* ADMIN DASHBOARD & FLIGHTS */}
          <Route
            path="/admin/*"
            element={adminToken ? <AdminDashboard /> : <Navigate to="/auth" />}
          >
            <Route path="flights" element={<AdminFlights />} />
            {/* Add other admin nested routes here */}
          </Route>

          {/* USER DASHBOARD & FLIGHTS */}
          <Route
            path="/user/*"
            element={userToken ? <UserDashboard /> : <Navigate to="/auth" />}
          >
            <Route path="flights" element={<UserFlights />} />
            <Route path="profile" element={<Profile />} />
            <Route path="book-ticket" element={<BookTicket />} />
            <Route path="booking-options" element={<BookingOptions />} />
            <Route path="passenger-details" element={<PassengerDetails />} />
            <Route path="payment" element={<PaymentPage />} />
            <Route path="ticket-confirmation" element={<TicketConfirmation />} />
            <Route path="flight-status" element={<FlightStatus />} />
          </Route>

          {/* CATCH-ALL */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>

      {!isDashboard && <Footer />}
    </div>
  );
}

function App() {
  // Authentication States
  const [userToken, setUserToken] = useState(localStorage.getItem("userToken"));
  const [adminToken, setAdminToken] = useState(localStorage.getItem("adminToken"));

  // Sync tokens across browser tabs
  useEffect(() => {
    const handleStorageChange = () => {
      setUserToken(localStorage.getItem("userToken"));
      setAdminToken(localStorage.getItem("adminToken"));
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return <AppContent userToken={userToken} adminToken={adminToken} setUserToken={setUserToken} setAdminToken={setAdminToken} />;
}

export default App;
