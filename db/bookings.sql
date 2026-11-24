-- ============================================
-- Bookings Table Schema
-- ============================================
-- Description: Stores flight booking reservations made by users or guests
-- Created: Initial schema
-- Last Updated: Added user_id, class_type, and seat_number columns

CREATE TABLE IF NOT EXISTS bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    flight_id INT NOT NULL,
    passenger_name VARCHAR(255) NOT NULL,
    cnic VARCHAR(50) NULL,
    email VARCHAR(150) NULL,
    phone VARCHAR(50) NULL,
    seats_booked INT NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    class_type VARCHAR(50) NULL,
    seat_number VARCHAR(10) NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (flight_id) REFERENCES flights(flight_id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_flight_id ON bookings(flight_id);
CREATE INDEX idx_bookings_booking_time ON bookings(booking_time);

-- Comments
ALTER TABLE bookings COMMENT = 'Stores flight reservations with passenger details, pricing, and seat assignments';
