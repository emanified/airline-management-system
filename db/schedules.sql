-- ============================================
-- Schedules Table Schema
-- ============================================
-- Description: Stores detailed flight schedules linked to flights
-- Created: Initial schema
-- Last Updated: Includes status tracking and timestamps

CREATE TABLE IF NOT EXISTS schedules (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    flight_id INT NOT NULL,
    departure_time DATETIME NOT NULL,
    arrival_time DATETIME NOT NULL,
    status VARCHAR(50) DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flight_id) REFERENCES flights(flight_id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX idx_schedules_flight_id ON schedules(flight_id);
CREATE INDEX idx_schedules_departure_time ON schedules(departure_time);
CREATE INDEX idx_schedules_status ON schedules(status);

-- Comments
ALTER TABLE schedules COMMENT = 'Stores detailed flight schedules with status tracking, linked to flights table';
