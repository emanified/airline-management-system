-- ============================================
-- Users Table Schema
-- ============================================
-- Description: Stores user account information for the airline booking system
-- Created: Initial schema
-- Last Updated: Includes phone field and timestamps

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Comments
ALTER TABLE users COMMENT = 'Stores registered user accounts with authentication credentials';
