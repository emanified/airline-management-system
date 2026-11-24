-- ============================================
-- Passengers Table Schema
-- ============================================
-- Description: Stores passenger information linked to user accounts
-- Created: Initial schema
-- Last Updated: Includes passport and demographic information

CREATE TABLE IF NOT EXISTS passengers (
    passenger_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    age INT NULL,
    gender VARCHAR(20) NULL,
    passport VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX idx_passengers_user_id ON passengers(user_id);
CREATE INDEX idx_passengers_name ON passengers(name);

-- Comments
ALTER TABLE passengers COMMENT = 'Stores passenger profile information including personal details and travel documents';
