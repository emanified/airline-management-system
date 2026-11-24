-- ============================================
-- Crew Table Schema
-- ============================================
-- Description: Stores crew member information and flight assignments
-- Created: Initial schema
-- Last Updated: Supports both name and first_name/last_name, includes hire_date

CREATE TABLE IF NOT EXISTS crew (
    crew_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NULL,
    phone VARCHAR(50) NULL,
    email VARCHAR(150) NULL,
    flight_id INT NULL,
    hire_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flight_id) REFERENCES flights(flight_id) ON DELETE SET NULL
);

-- Note: The application codebase may create this table without the foreign key initially,
-- then add flight_id and hire_date columns dynamically. This SQL file represents the
-- complete schema with all columns and relationships for documentation purposes.

-- Indexes for performance optimization
CREATE INDEX idx_crew_flight_id ON crew(flight_id);
CREATE INDEX idx_crew_role ON crew(role);
CREATE INDEX idx_crew_name ON crew(name);

-- Comments
ALTER TABLE crew COMMENT = 'Stores crew member information including roles, contact details, and flight assignments';

-- Note: The table may also support first_name and last_name columns instead of name
-- depending on schema evolution. The application handles both cases dynamically.
