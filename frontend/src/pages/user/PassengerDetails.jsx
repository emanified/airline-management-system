import React, { useState, useRef, useEffect } from "react";
import { useBooking } from "./BookingContext"; // import context
import { getBookedSeats } from "../../services/user";

const PassengerDetails = ({ onBack, onNext }) => {
  const { booking, setBooking } = useBooking();

  const [passenger, setPassenger] = useState({
    fullName: "",
    email: "",
    phone: "",
    passport: "",
  });

  const [errors, setErrors] = useState({});
  const [selectedSeat, setSelectedSeat] = useState("");
  const [bookedSeats, setBookedSeats] = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(true);

  const emailRef = useRef();
  const phoneRef = useRef();
  const passportRef = useRef();

  const allSeats = ["1A","1B","1C","2A","2B","2C","3A","3B","3C"];

  // Fetch booked seats when component mounts or flight changes
  useEffect(() => {
    const fetchBookedSeats = async () => {
      if (!booking?.flight?.flight_id) {
        setLoadingSeats(false);
        return;
      }

      try {
        setLoadingSeats(true);
        const result = await getBookedSeats(booking.flight.flight_id);
        if (result && result.success) {
          setBookedSeats(result.booked_seats || []);
        }
      } catch (error) {
        console.error("Error fetching booked seats:", error);
        setBookedSeats([]);
      } finally {
        setLoadingSeats(false);
      }
    };

    fetchBookedSeats();
  }, [booking?.flight?.flight_id]);

  // Filter out booked seats
  const availableSeats = allSeats.filter(seat => !bookedSeats.includes(seat));

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newErrors = { ...errors };

    if (name === "phone" && /\D/.test(value)) {
      newErrors.phone = "Phone must contain digits only";
      setErrors(newErrors);
      return;
    } else if (name === "passport" && /[^a-zA-Z0-9]/.test(value)) {
      newErrors.passport = "Passport/CNIC must be alphanumeric";
      setErrors(newErrors);
      return;
    } else {
      newErrors[name] = "";
    }

    setErrors(newErrors);
    setPassenger({ ...passenger, [name]: value });
  };

  const handleKeyPress = (e, nextRef) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextRef?.current) nextRef.current.focus();
    }
  };

  const handleProceed = () => {
    let validationErrors = {};

    if (!passenger.fullName.trim()) validationErrors.fullName = "Full name is required.";
    const emailPattern = /^\S+@\S+\.\S+$/;
    if (!emailPattern.test(passenger.email)) validationErrors.email = "Enter a valid email.";
    if (passenger.phone.length < 10 || passenger.phone.length > 13) validationErrors.phone = "Phone must be 10–13 digits.";
    if (passenger.passport.length < 5 || passenger.passport.length > 15) validationErrors.passport = "Passport/CNIC must be 5–15 characters.";
    if (!selectedSeat) validationErrors.seat = "Please select a seat.";

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Update booking context with passenger info
    const userId = localStorage.getItem("userId") || 1;
    setBooking((prev) => ({
      ...prev,
      passengerDetails: passenger,
      selectedSeat: selectedSeat,
      user_id: parseInt(userId)
    }));

    // Call parent's onNext to proceed to PaymentPage
    if (onNext) onNext();
  };

  return (
    <div className="page-section">
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: "transparent",
              border: "1px solid #8b5cf6",
              color: "#8b5cf6",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 500,
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)";
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(139, 92, 246, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#8b5cf6";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            ← Back
          </button>
        )}
        <h2>Passenger Details</h2>
      </div>
      <div className="form-card">
        <label>Full Name *</label>
        <input
          name="fullName"
          value={passenger.fullName}
          onChange={handleChange}
          onKeyDown={(e) => handleKeyPress(e, emailRef)}
        />
        {errors.fullName && <p className="error-text">{errors.fullName}</p>}

        <label>Email *</label>
        <input
          name="email"
          ref={emailRef}
          value={passenger.email}
          onChange={handleChange}
          onKeyDown={(e) => handleKeyPress(e, phoneRef)}
        />
        {errors.email && <p className="error-text">{errors.email}</p>}

        <label>Phone *</label>
        <input
          name="phone"
          ref={phoneRef}
          value={passenger.phone}
          onChange={handleChange}
          onKeyDown={(e) => handleKeyPress(e, passportRef)}
        />
        {errors.phone && <p className="error-text">{errors.phone}</p>}

        <label>Passport / CNIC *</label>
        <input
          name="passport"
          ref={passportRef}
          value={passenger.passport}
          onChange={handleChange}
          onKeyDown={(e) => handleKeyPress(e, null)}
        />
        {errors.passport && <p className="error-text">{errors.passport}</p>}
      </div>

      <h3>Select Your Seat</h3>
      {loadingSeats ? (
        <p>Loading available seats...</p>
      ) : (
        <>
          <div className="seat-grid">
            {allSeats.map((seat) => {
              const isSelected = selectedSeat === seat;
              const isBooked = bookedSeats.includes(seat);
              const isAvailable = availableSeats.includes(seat);
              
              // Don't render booked seats
              if (isBooked) {
                return null;
              }
              
              return (
                <button
                  key={seat}
                  type="button"
                  className={`seat-box ${isSelected ? "seat-selected" : ""}`}
                  onClick={() => {
                    if (isAvailable) {
                      setSelectedSeat(seat);
                      setErrors((prev) => ({ ...prev, seat: "" }));
                    }
                  }}
                  disabled={!isAvailable}
                  style={{
                    padding: '1rem',
                    textAlign: 'center',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid #10b981' : '2px solid #e2e8f0',
                    background: isSelected ? '#10b981' : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    backgroundColor: isSelected ? '#10b981' : '#ffffff',
                    backgroundImage: isSelected ? 'none' : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    backgroundClip: isSelected ? 'padding-box' : undefined,
                    WebkitBackgroundClip: isSelected ? 'padding-box' : undefined,
                    color: isSelected ? '#fff' : '#64748b',
                    cursor: isAvailable ? 'pointer' : 'not-allowed',
                    fontWeight: isSelected ? 700 : 600,
                    fontSize: '0.875rem',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected 
                      ? '0 4px 12px rgba(16, 185, 129, 0.4)' 
                      : '0 2px 4px rgba(0, 0, 0, 0.05)',
                    minHeight: '3rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: 0,
                    outline: 'none',
                    width: '100%',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    fontFamily: 'Inter, sans-serif',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none',
                    visibility: 'visible',
                    opacity: 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && isAvailable) {
                      e.currentTarget.style.background = '#667eea';
                      e.currentTarget.style.backgroundColor = '#667eea';
                      e.currentTarget.style.backgroundImage = 'none';
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.borderColor = '#667eea';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && isAvailable) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)';
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.color = '#64748b';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                    }
                  }}
                >
                  {seat}
                </button>
              );
            })}
          </div>
          {availableSeats.length === 0 && (
            <p style={{ color: '#ef4444', marginTop: '10px' }}>No seats available for this flight.</p>
          )}
        </>
      )}
      {errors.seat && <p className="error-text">{errors.seat}</p>}

      <button className="primary-btn" onClick={handleProceed}>
        Proceed to Payment
      </button>
    </div>
  );
};

export default PassengerDetails;
