import { createContext, useContext, useState } from "react";

// Create the context
const BookingContext = createContext();

// Provider component to wrap your app
export const BookingProvider = ({ children }) => {
  const [booking, setBooking] = useState(null); // store booking data

  return (
    <BookingContext.Provider value={{ booking, setBooking }}>
      {children}
    </BookingContext.Provider>
  );
};

// Custom hook to use booking context easily
export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
};

