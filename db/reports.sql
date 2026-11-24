-- ============================================
-- Reports Table Schema
-- ============================================
-- Description: Stores various operational reports (performance, compliance, maintenance, etc.)
-- Created: Initial schema
-- Last Updated: Includes JSON data field and flexible date/status fields

CREATE TABLE IF NOT EXISTS reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    content TEXT NULL,
    status VARCHAR(50) DEFAULT 'Draft',
    date DATE NULL,
    generated_by INT NULL,
    report_data JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_date ON reports(date);
CREATE INDEX idx_reports_created_at ON reports(created_at);

-- Comments
ALTER TABLE reports COMMENT = 'Stores operational reports including performance metrics, compliance records, and maintenance logs';

-- Note: The table schema is flexible and may have variations in column names (date vs created_at)
-- depending on schema evolution. The application handles this dynamically.
