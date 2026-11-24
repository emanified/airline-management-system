-- ============================================
-- Operations Table Schema
-- ============================================
-- Description: Tracks flight-related operations (maintenance, catering, ground services, etc.)
-- Created: Initial schema
-- Last Updated: Includes status enum and completion tracking

CREATE TABLE IF NOT EXISTS operations (
    operation_id INT AUTO_INCREMENT PRIMARY KEY,
    flight_id INT NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    scheduled_at DATETIME NOT NULL,
    status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Pending',
    completed_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (flight_id) REFERENCES flights(flight_id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX idx_operations_flight_id ON operations(flight_id);
CREATE INDEX idx_operations_status ON operations(status);
CREATE INDEX idx_operations_scheduled_at ON operations(scheduled_at);

-- Comments
ALTER TABLE operations COMMENT = 'Tracks flight operations such as maintenance, catering, and ground services with status management';
