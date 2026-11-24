-- ============================================
-- Payments Table Schema
-- ============================================
-- Description: Stores payment transaction records for flight bookings
-- Created: Initial schema
-- Last Updated: booking_id changed to VARCHAR to support large/string booking IDs

CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    booking_id VARCHAR(255) NULL,
    amount DECIMAL(10,2) NOT NULL,
    card_type VARCHAR(50) NULL,
    card_last4 VARCHAR(4) NULL,
    status VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255) UNIQUE,
    created_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- Comments
ALTER TABLE payments COMMENT = 'Stores payment transaction records with card information and transaction tracking';

-- Note: booking_id is VARCHAR(255) to support both integer and string-based booking IDs
-- from various payment processing systems (including Stripe).
