-- ============================================
-- Admin Users Table Schema
-- ============================================
-- Description: Stores administrator account credentials for the admin panel
-- Created: Initial schema
-- Last Updated: Separate authentication system from regular users

CREATE TABLE IF NOT EXISTS admin_users (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL
);

-- Indexes for performance optimization
CREATE INDEX idx_admin_users_username ON admin_users(username);

-- Comments
ALTER TABLE admin_users COMMENT = 'Stores administrator accounts with authentication credentials for admin panel access';

-- Note: Admin users are separate from regular users and use a different authentication system.
-- Passwords are hashed using werkzeug.security (similar to regular users).
