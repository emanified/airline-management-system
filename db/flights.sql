-- ============================================
-- Flights Table Schema
-- ============================================
-- Description: Stores flight information including routes, schedules, pricing, and availability
-- Created: Initial schema
-- Last Updated: Core flight data structure

CREATE TABLE IF NOT EXISTS flights (
    flight_id INT AUTO_INCREMENT PRIMARY KEY,
    airline VARCHAR(100) NOT NULL,
    flight_no VARCHAR(50) NOT NULL,
    source VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    departure_time DATETIME NOT NULL,
    arrival_time DATETIME NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    seats_available INT NOT NULL DEFAULT 0
);

-- Indexes for performance optimization
CREATE INDEX idx_flights_departure_time ON flights(departure_time);
CREATE INDEX idx_flights_source_destination ON flights(source, destination);
CREATE INDEX idx_flights_airline ON flights(airline);

-- Comments
ALTER TABLE flights COMMENT = 'Stores flight schedules, routes, pricing, and seat availability';
