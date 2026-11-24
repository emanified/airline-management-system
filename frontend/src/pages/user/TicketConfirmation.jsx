import React, { useEffect, useState } from "react";
import { useBooking } from "./BookingContext";
import { getTicket } from "../../services/api";
/**
 * TicketConfirmation (unchanged layout - only ensures it works with BookingContext)
 */
const TicketConfirmation = ({ bookingId: propBookingId }) => {
  const { bookingDetails, bookingId: ctxBookingId } = useBooking();
  const booking_id = propBookingId || ctxBookingId || bookingDetails?.booking_id;

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!booking_id) {
      setError("No booking id found. Complete booking first.");
      return;
    }

    const fetchTicket = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getTicket(booking_id);
        if (res?.data?.success) {
          setTicket(res.data.ticket);
        } else {
          setError(res?.data?.message || "Ticket not found");
        }
      } catch (err) {
        setError(
          err?.response?.data?.message || "Unable to load ticket. Try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [booking_id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (typeof window.html2canvas === "undefined" || typeof window.jspdf === "undefined") {
      try {
        const [html2canvas, jsPDFModule] = await Promise.all([
          import("html2canvas"),
          import("jspdf")
        ]);
        await exportPdf(html2canvas.default, jsPDFModule.jsPDF);
      } catch (err) {
        alert("PDF download requires html2canvas and jspdf libraries. Use Print -> Save as PDF, or install html2canvas & jspdf.");
      }
      return;
    }

    await exportPdf(window.html2canvas, window.jspdf.jsPDF);
  };

  const exportPdf = async (html2canvas, jsPDF) => {
    const ticketNode = document.getElementById("ticket-pass");
    if (!ticketNode) {
      alert("Ticket element not found.");
      return;
    }

    try {
      const canvas = await html2canvas(ticketNode, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`ticket_${booking_id}.pdf`);
    } catch (err) {
      console.error("PDF export failed", err);
      alert("PDF export failed. Try Print -> Save as PDF instead.");
    }
  };

  if (loading) {
    return <div className="page-section"><p>Loading ticket…</p></div>;
  }

  if (error) {
    return <div className="page-section"><p style={{ color: "red" }}>{error}</p></div>;
  }

  if (!ticket) {
    return <div className="page-section"><p>No ticket available yet.</p></div>;
  }

  // Normalize data
  const passengerName = ticket.passenger_name || ticket.name || bookingDetails?.passenger?.fullName;
  const passengerEmail = ticket.email || bookingDetails?.passenger?.email;
  const passengerPhone = ticket.phone || bookingDetails?.passenger?.phone;
  const passport = ticket.passport || bookingDetails?.passenger?.passport;
  const flightNumber = ticket.flight_number || ticket.flightNo || ticket.flight || ticket.flight_id;
  const from = ticket.departure || ticket.from || ticket.origin;
  const to = ticket.arrival || ticket.to || ticket.destination;
  const date = ticket.date || ticket.flight_date;
  const time = ticket.time || ticket.flight_time;
  const seat_no = ticket.seat_no || bookingDetails?.selectedSeat;
  const bookingRef = ticket.booking_id || booking_id;
  const amount = ticket.amount || bookingDetails?.amount || ticket.price || null;
  const card_last4 = ticket.card_last4 || ticket.card_last || null;
  const card_type = ticket.card_type || bookingDetails?.payment?.cardType || null;
  const classType = bookingDetails?.classType || ticket.class || ticket.seat_class || null;

  return (
    <div className="page-section">
      <h2 style={{ marginBottom: 12 }}>Boarding Pass</h2>

      <div id="ticket-pass" className="boarding-pass">
        <div className="bp-left">
          <div className="bp-header">
            <div className="airline-name">{ticket.airline_name || "AirlineSys"}</div>
            <div className="flight-num">{flightNumber}</div>
          </div>

          <div className="route-row">
            <div className="airport-block">
              <div className="city">{from}</div>
              <div className="label">FROM</div>
            </div>

            <div className="arrow">→</div>

            <div className="airport-block">
              <div className="city">{to}</div>
              <div className="label">TO</div>
            </div>
          </div>

          <div className="when-seat">
            <div className="when">
              <div className="val">{date}</div>
              <div className="lbl">DATE</div>
            </div>

            <div className="when">
              <div className="val">{time}</div>
              <div className="lbl">TIME</div>
            </div>

            <div className="seat">
              <div className="val">{seat_no}</div>
              <div className="lbl">SEAT</div>
            </div>
          </div>

          <div className="passenger-info">
            <div><strong>{passengerName}</strong></div>
            <div>{passengerEmail}</div>
            {passengerPhone && <div>{passengerPhone}</div>}
            {passport && <div>Passport: {passport}</div>}
          </div>
        </div>

        <div className="bp-right">
          <div className="ticket-meta">
            <div><strong>Booking Ref</strong></div>
            <div className="meta-val">{bookingRef}</div>
          </div>

          <div className="ticket-meta">
            <div><strong>Class</strong></div>
            <div className="meta-val">{classType || "Economy"}</div>
          </div>

          {amount !== null && (
            <div className="ticket-meta">
              <div><strong>Price</strong></div>
              <div className="meta-val">{typeof amount === "number" ? `PKR ${amount.toFixed(2)}` : amount}</div>
            </div>
          )}

          <div className="ticket-meta">
            <div><strong>Payment</strong></div>
            <div className="meta-val">{card_type ? `${card_type} • ****${card_last4 || "0000"}` : "—"}</div>
          </div>

          <div className="barcode">
            <div className="barcode-box">{bookingRef}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <button className="primary-btn" onClick={handlePrint}>Print / Save as PDF</button>
        <button className="primary-btn" onClick={handleDownloadPDF}>Download PDF</button>
      </div>
    </div>
  );
};

export default TicketConfirmation;
