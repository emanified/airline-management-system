// src/pages/UserDashboard/UserDashboard.jsx
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Profile from "./Profile";
import SelectAirline from "./SelectAirline";
import BookTicket from "./BookTicket";
import FlightStatus from "./FlightStatus";
import BookingOptions from "./BookingOptions";
import PassengerDetails from "./PassengerDetails";
import PaymentPage from "./PaymentPage";
import TicketConfirmation from "./TicketConfirmation";
import { fetchUserProfile, fetchFlights, bookFlight } from "../../services/user";
import { authFetch } from "../../services/api";
import LoadingAnimation from "../../components/LoadingAnimation";
import "../../styles/common-theme.css";
import "./UserDashboard.css";

const UserDashboard = () => {
  const [activePage, setActivePage] = useState("dashboard");
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [selectedAirline, setSelectedAirline] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({});
  const [upcomingFlights, setUpcomingFlights] = useState([]);
  const [totalBookings, setTotalBookings] = useState(0);
  const [flightsCompleted, setFlightsCompleted] = useState(0);
  const [allFlights, setAllFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const userId = localStorage.getItem("userId");
  const location = useLocation();

  // Check if we should show loading animation (from login or homepage)
  useEffect(() => {
    const shouldShowLoading = localStorage.getItem("dashboardLoading") === "true";
    if (shouldShowLoading) {
      setShowLoadingAnimation(true);
      localStorage.removeItem("dashboardLoading");
    }
  }, []);

  // Check if we need to refresh after returning from payment
  useEffect(() => {
    if (location.state?.refreshDashboard) {
      // Clear the state to prevent re-triggering
      window.history.replaceState({}, document.title);
      // Trigger a refresh by setting loading to true and reloading data
      setLoading(true);
      setDataLoaded(false);
      // Force reload dashboard data
      const loadDashboard = async () => {
        try {
          // Fetch user bookings
          const bookingsResponse = await authFetch(`/api/user/bookings/${userId}`);
          const bookings = bookingsResponse.bookings || [];
          const now = new Date();
          const upcoming = bookings.filter(b => {
            const depTime = b.departure_time || (b.date && b.time ? `${b.date} ${b.time}` : b.date) || null;
            if (!depTime) return false;
            try {
              const depDate = new Date(depTime);
              return !isNaN(depDate.getTime()) && depDate > now;
            } catch {
              return false;
            }
          });
          const completed = bookings.filter(b => {
            const depTime = b.departure_time || (b.date && b.time ? `${b.date} ${b.time}` : b.date) || null;
            if (!depTime) return false;
            try {
              const depDate = new Date(depTime);
              return !isNaN(depDate.getTime()) && depDate <= now;
            } catch {
              return false;
            }
          });
          setUpcomingFlights(upcoming);
          setTotalBookings(bookings.length);
          setFlightsCompleted(completed.length);

          // Refresh flights to update seat availability
          const flightsResponse = await fetchFlights();
          const flights = Array.isArray(flightsResponse) 
            ? flightsResponse 
            : (flightsResponse.flights || flightsResponse.data || []);
          setAllFlights(flights);
          setDataLoaded(true);
        } catch (err) {
          console.error("Dashboard refresh error:", err);
          setDataLoaded(true);
        } finally {
          setLoading(false);
        }
      };
      loadDashboard();
    }
  }, [location.state, userId]);

  // --- Fetch dashboard data ---
  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setDataLoaded(false);

        // Fetch user profile
        const profileData = await fetchUserProfile();
        
        // Fetch user bookings separately
        const bookingsResponse = await authFetch(`/api/user/bookings/${userId}`);
        const bookings = bookingsResponse.bookings || [];

        const now = new Date();
        const upcoming = bookings.filter(b => {
          // Try different possible date fields
          const depTime = b.departure_time || (b.date && b.time ? `${b.date} ${b.time}` : b.date) || null;
          if (!depTime) return false;
          try {
            const depDate = new Date(depTime);
            // Check if date is valid and in the future
            return !isNaN(depDate.getTime()) && depDate > now;
          } catch {
            return false;
          }
        });
        const completed = bookings.filter(b => {
          const depTime = b.departure_time || (b.date && b.time ? `${b.date} ${b.time}` : b.date) || null;
          if (!depTime) return false;
          try {
            const depDate = new Date(depTime);
            return !isNaN(depDate.getTime()) && depDate <= now;
          } catch {
            return false;
          }
        });

        setUpcomingFlights(upcoming);
        setTotalBookings(bookings.length);
        setFlightsCompleted(completed.length);

        // Fetch all available flights
        const flightsResponse = await fetchFlights();
        // Handle both array and object responses
        const flights = Array.isArray(flightsResponse) 
          ? flightsResponse 
          : (flightsResponse.flights || flightsResponse.data || []);
        setAllFlights(flights);
        
        // Mark data as loaded
        setDataLoaded(true);
      } catch (err) {
        console.error("Dashboard load error:", err);
        setDataLoaded(true); // Even on error, mark as loaded to hide animation
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [userId]); // Remove showLoadingAnimation dependency to prevent re-fetching

  // Hide loading animation only after data is fully loaded
  useEffect(() => {
    if (showLoadingAnimation && dataLoaded && !loading) {
      // Wait a bit longer to ensure everything is rendered
      const timer = setTimeout(() => {
        setShowLoadingAnimation(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showLoadingAnimation, dataLoaded, loading]);

  // Refresh dashboard when window regains focus (user returns from Stripe)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reload bookings when user returns to the tab
        const refreshBookings = async () => {
          try {
            const bookingsResponse = await authFetch(`/api/user/bookings/${userId}`);
            const bookings = bookingsResponse.bookings || [];
            const now = new Date();
            const upcoming = bookings.filter(b => {
              const depTime = b.departure_time || (b.date && b.time ? `${b.date} ${b.time}` : b.date) || null;
              if (!depTime) return false;
              try {
                const depDate = new Date(depTime);
                return !isNaN(depDate.getTime()) && depDate > now;
              } catch {
                return false;
              }
            });
            const completed = bookings.filter(b => {
              const depTime = b.departure_time || (b.date && b.time ? `${b.date} ${b.time}` : b.date) || null;
              if (!depTime) return false;
              try {
                const depDate = new Date(depTime);
                return !isNaN(depDate.getTime()) && depDate <= now;
              } catch {
                return false;
              }
            });
            setUpcomingFlights(upcoming);
            setTotalBookings(bookings.length);
            setFlightsCompleted(completed.length);
          } catch (err) {
            console.error("Dashboard refresh error:", err);
          }
        };
        // Small delay to ensure backend has processed the booking
        setTimeout(refreshBookings, 1000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [userId]);

  // --- Callback to update flights after booking ---
  const handleBookingUpdate = (bookedFlight) => {
    // Reduce seats locally
    setAllFlights(prev => {
      // Ensure prev is an array
      if (!Array.isArray(prev)) {
        console.warn("allFlights is not an array:", prev);
        return prev;
      }
      return prev.map(f =>
        (f.id || f.flight_id) === (bookedFlight.id || bookedFlight.flight_id)
          ? { ...f, seats: (f.seats || f.seats_available || 0) - 1 }
          : f
    );
    });

    // Add to upcoming flights
    setUpcomingFlights(prev => [
      ...prev,
      {
        booking_id: bookedFlight.booking_id || Math.random(),
        source: bookedFlight.source,
        destination: bookedFlight.destination,
        departure_time: bookedFlight.departure_time,
        booking_ref: bookedFlight.booking_ref || `BK-${bookedFlight.booking_id || Math.floor(Math.random()*10000)}`,
        status: "On Time",
      }
    ]);

    // Update total bookings
    setTotalBookings(prev => prev + 1);
  };

  // --- Render content based on active page ---
  const renderContent = () => {
    if (loading) return <p>Loading...</p>;

    switch (activePage) {
      case "dashboard":
        return (
          <>
            <div className="top-header">
              <h2>Welcome Back</h2>
              <p>Here is your travel overview</p>
            </div>

            <div className="stats-row">
              <div className="stats-card">
                <h4>Upcoming Flights</h4>
                <p className="stat-number">{upcomingFlights.length}</p>
              </div>
              <div className="stats-card">
                <h4>Total Bookings</h4>
                <p className="stat-number">{totalBookings}</p>
              </div>
              <div className="stats-card">
                <h4>Flights Completed</h4>
                <p className="stat-number">{flightsCompleted}</p>
              </div>
            </div>

            <h3 className="section-title">Upcoming Flights</h3>
            <div className="bookings-list">
              {upcomingFlights.length > 0 ? (
                upcomingFlights.map((flight, index) => {
                  try {
                    const depTime = flight.departure_time || (flight.date && flight.time ? `${flight.date} ${flight.time}` : flight.date);
                    const depDate = depTime ? new Date(depTime) : null;
                    const formattedDate = depDate && !isNaN(depDate.getTime()) 
                      ? depDate.toLocaleString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Date TBD';
                    
                    return (
                      <div key={flight.booking_id || index} className="booking-card">
                        <div>
                          <div className="booking-flight-name">{flight.source || flight.departure || 'N/A'} → {flight.destination || flight.arrival || 'N/A'}</div>
                          <div>Departure: {formattedDate}</div>
                          {flight.booking_ref && (
                            <div>Booking Ref: {flight.booking_ref}</div>
                          )}
                          {flight.flight_number && (
                            <div>Flight: {flight.flight_number}</div>
                          )}
                        </div>
                        <div className={`booking-status ${
                          (flight.status?.toLowerCase() || "on-time") === "on time" || (flight.status?.toLowerCase() || "on-time") === "on-time" ? "status-ontime" :
                          (flight.status?.toLowerCase() || "on-time") === "cancelled" ? "status-cancelled" :
                          "status-pending"
                        }`}>
                          {flight.status || "On Time"}
                        </div>
                      </div>
                    );
                  } catch (err) {
                    console.error("Error rendering flight:", err, flight);
                    return null;
                  }
                })
              ) : (
                <div className="empty-state">
                  <p>No upcoming flights. Book your next trip!</p>
                </div>
              )}
            </div>
          </>
        );

      case "profile":
        return <Profile />;

      case "flight-status":
        return <FlightStatus />;

      case "select-airline":
        return (
          <SelectAirline
            onSelectAirline={(airlineName) => {
              setSelectedAirline(airlineName);
              setActivePage("book-ticket");
            }}
          />
        );

      case "book-ticket":
        return (
          <BookTicket
            flights={selectedAirline 
              ? allFlights.filter(f => (f.airline || "Unknown Airline") === selectedAirline)
              : allFlights
            }
            selectedAirline={selectedAirline}
            onBack={() => {
              setSelectedAirline(null);
              setActivePage("select-airline");
            }}
            onProceed={(flight) => {
              setBookingDetails(prev => ({ ...prev, flight }));
              setSelectedFlight(flight);
              handleBookingUpdate(flight); // updates dashboard dynamically
              setActivePage("booking-options");
            }}
          />
        );

      case "booking-options":
        return (
          <BookingOptions
            flight={selectedFlight}
            onBack={() => {
              setActivePage("book-ticket");
            }}
            onSelect={(option) => setBookingDetails(prev => ({ ...prev, classType: option }))}
            onProceed={(option) => {
              setBookingDetails(prev => ({ ...prev, classType: option || prev.classType }));
              setActivePage("passenger-details");
            }}
          />
        );

      case "passenger-details":
        return (
          <PassengerDetails
            flightInfo={bookingDetails.flight}
            bookingOption={bookingDetails.classType}
            onBack={() => {
              setActivePage("booking-options");
            }}
            onNext={(details) => {
              setBookingDetails(prev => ({ ...prev, ...details }));
              setActivePage("payment-page");
            }}
          />
        );

      case "payment-page":
        return (
          <PaymentPage
            bookingDetails={bookingDetails}
            onBack={() => {
              setActivePage("passenger-details");
            }}
          />
        );

      case "ticket-confirmation":
        return <TicketConfirmation bookingId={bookingDetails.booking_id} />;

      default:
        return <Profile />;
    }
  };

  // Handle page switching
  const handlePageChange = (page) => {
    if (page !== activePage) {
      setActivePage(page);
    }
  };

  return (
    <div className="dashboard-container" style={{ position: "relative" }}>
      {showLoadingAnimation && <LoadingAnimation isLoading={!dataLoaded || loading} />}
      <aside className="sidebar">
        <ul className="menu">
          <li className={`menu-item ${activePage === "dashboard" ? "active" : ""}`} onClick={() => handlePageChange("dashboard")}>Dashboard</li>
          <li className={`menu-item ${activePage === "profile" ? "active" : ""}`} onClick={() => handlePageChange("profile")}>Profile</li>
          <li className={`menu-item ${activePage === "select-airline" || activePage === "book-ticket" || activePage === "booking-options" || activePage === "passenger-details" || activePage === "payment-page" ? "active" : ""}`} onClick={() => {
            setSelectedAirline(null);
            handlePageChange("select-airline");
          }}>Book Ticket</li>
          <li className={`menu-item ${activePage === "flight-status" ? "active" : ""}`} onClick={() => handlePageChange("flight-status")}>Flight Status</li>
        </ul>

      </aside>

      <main className="main-content">{renderContent()}</main>
    </div>
  );
};

export default UserDashboard;
