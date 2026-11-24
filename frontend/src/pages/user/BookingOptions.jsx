import { useEffect, useState } from "react";
import { useBooking } from "./BookingContext"; // import context

function BookingOptions({ flight, onBack, onProceed }) {
  const { booking, setBooking } = useBooking();
  const [selected, setSelected] = useState("");
  const [popup, setPopup] = useState("");

  const options = ["Economy Class", "Business Class", "First Class", "Round Trip", "One Way"];

  const handleSelect = (option) => {
    setSelected(option);
    setPopup(`You selected: ${option}`);

    // Set flight class and amount in booking context
    let amount = 0;
    switch(option) {
      case "Economy Class": amount = 1000; break;
      case "Business Class": amount = 2000; break;
      case "First Class": amount = 3000; break;
      case "Round Trip": amount = 1500; break;
      case "One Way": amount = 1000; break;
      default: amount = 1000;
    }

    setBooking((prev) => ({
      ...prev,
      flightClass: option,
      amount: amount,
      bookingId: `BK-${Date.now()}` // generate temporary booking ID
    }));

    // Automatically proceed to PassengerDetails after popup
    setTimeout(() => {
      setPopup("");
      if (onProceed) onProceed(option);
    }, 1500);
  };

  useEffect(() => {
    if (popup) {
      const timer = setTimeout(() => setPopup(""), 1500);
      return () => clearTimeout(timer);
    }
  }, [popup]);

  return (
    <div className="page-section" style={{ position: "relative" }}>
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
        <h3>Booking Options</h3>
      </div>

      {popup && (
        <div style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "#8b5cf6",
          color: "#fff",
          padding: "14px 25px",
          borderRadius: "10px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          fontWeight: 600,
          textAlign: "center",
          zIndex: 1000,
          animation: "fadeInOut 1.5s ease"
        }}>{popup}</div>
      )}

      <div className="options-card" style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {options.map((opt) => (
          <div
            key={opt}
            className={`option-item ${selected === opt ? "active" : ""}`}
            onClick={() => handleSelect(opt)}
            style={{
              padding: "16px",
              borderRadius: "10px",
              backgroundColor: selected === opt ? "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)" : "#f1f3f6",
              color: selected === opt ? "#fff" : "#222",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
              marginBottom: "0"
            }}
          >{opt}</div>
        ))}
      </div>
    </div>
  );
}

export default BookingOptions;
