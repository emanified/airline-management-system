// backend/app.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// simple in-memory tickets store (dev only)
const tickets = {};

// Payment endpoint (simulated)
app.post("/api/payments", (req, res) => {
  const { booking, amount, card_type } = req.body;
  // simulate success and create ticket/booking record
  const booking_id = `BK-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 900 + 100)}`;

  // create a simple ticket object from booking data
  const ticket = {
    booking_id,
    airline_name: booking?.flight?.name || "AirlineSys",
    flight_number: booking?.flight?.id || "PK-000",
    departure: booking?.flight?.route?.split("→")?.[0]?.trim() || booking?.flight?.from || "Unknown",
    arrival: booking?.flight?.route?.split("→")?.[1]?.trim() || booking?.flight?.to || "Unknown",
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    seat_no: booking?.selectedSeat || booking?.seat || "1A",
    passenger_name: booking?.passenger?.fullName || "Passenger",
    email: booking?.passenger?.email || "",
    phone: booking?.passenger?.phone || "",
    passport: booking?.passenger?.passport || "",
    amount: amount || 0,
    card_last4: (req.body.card_number || "").slice(-4) || null,
    card_type: card_type || null,
    class: booking?.classType || "Economy",
  };

  tickets[booking_id] = ticket;

  res.json({ success: true, booking_id, ticket });
});

// Get ticket
app.get("/api/tickets/:id", (req, res) => {
  const id = req.params.id;
  const ticket = tickets[id];
  if (!ticket) {
    return res.status(404).json({ success: false, message: "Ticket not found" });
  }
  res.json({ success: true, ticket });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend listening on ${PORT}`));
