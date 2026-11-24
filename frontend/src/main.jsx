import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { BookingProvider } from "./pages/user/BookingContext";
import "./index.css";
import "./styles/animations.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <BookingProvider>
      <App />
    </BookingProvider>
  </BrowserRouter>
);
