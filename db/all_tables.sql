-- ============================================
-- Aether Airlines - Complete Database Schema
-- ============================================
-- Database: airline
-- ============================================

CREATE DATABASE IF NOT EXISTS airline;
USE airline;

-- ============================================
-- 1. Admin Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS admin_users (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL
);

CREATE INDEX idx_admin_users_username ON admin_users(username);
ALTER TABLE admin_users COMMENT = 'Stores administrator accounts with authentication credentials for admin panel access';

-- ============================================
-- 2. Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
ALTER TABLE users COMMENT = 'Stores registered user accounts with authentication credentials';

-- ============================================
-- 3. Flights Table
-- ============================================
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

CREATE INDEX idx_flights_departure_time ON flights(departure_time);
CREATE INDEX idx_flights_source_destination ON flights(source, destination);
CREATE INDEX idx_flights_airline ON flights(airline);
ALTER TABLE flights COMMENT = 'Stores flight schedules, routes, pricing, and seat availability';

-- ============================================
-- 4. Bookings Table
-- ============================================
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

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_flight_id ON bookings(flight_id);
CREATE INDEX idx_bookings_booking_time ON bookings(booking_time);
ALTER TABLE bookings COMMENT = 'Stores flight reservations with passenger details, pricing, and seat assignments';

-- ============================================
-- 5. Schedules Table
-- ============================================
CREATE TABLE IF NOT EXISTS schedules (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    flight_id INT NOT NULL,
    departure_time DATETIME NOT NULL,
    arrival_time DATETIME NOT NULL,
    status VARCHAR(50) DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flight_id) REFERENCES flights(flight_id) ON DELETE CASCADE
);

CREATE INDEX idx_schedules_flight_id ON schedules(flight_id);
CREATE INDEX idx_schedules_departure_time ON schedules(departure_time);
CREATE INDEX idx_schedules_status ON schedules(status);
ALTER TABLE schedules COMMENT = 'Stores detailed flight schedules with status tracking, linked to flights table';

-- ============================================
-- 6. Operations Table
-- ============================================
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

CREATE INDEX idx_operations_flight_id ON operations(flight_id);
CREATE INDEX idx_operations_status ON operations(status);
CREATE INDEX idx_operations_scheduled_at ON operations(scheduled_at);
ALTER TABLE operations COMMENT = 'Tracks flight operations such as maintenance, catering, and ground services with status management';

-- ============================================
-- 7. Crew Table
-- ============================================
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

CREATE INDEX idx_crew_flight_id ON crew(flight_id);
CREATE INDEX idx_crew_role ON crew(role);
CREATE INDEX idx_crew_name ON crew(name);
ALTER TABLE crew COMMENT = 'Stores crew member information including roles, contact details, and flight assignments';

-- ============================================
-- 8. Reports Table
-- ============================================
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

CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_date ON reports(date);
CREATE INDEX idx_reports_created_at ON reports(created_at);
ALTER TABLE reports COMMENT = 'Stores operational reports including performance metrics, compliance records, and maintenance logs';

-- ============================================
-- 9. Payments Table
-- ============================================
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

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
ALTER TABLE payments COMMENT = 'Stores payment transaction records with card information and transaction tracking';

-- ============================================
-- 10. Passengers Table
-- ============================================
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

CREATE INDEX idx_passengers_user_id ON passengers(user_id);
CREATE INDEX idx_passengers_name ON passengers(name);
ALTER TABLE passengers COMMENT = 'Stores passenger profile information including personal details and travel documents';

-- ============================================
-- Schema Creation Complete
-- ============================================
-- Total Tables: 10
-- 1. admin_users
-- 2. users
-- 3. flights
-- 4. bookings
-- 5. schedules
-- 6. operations
-- 7. crew
-- 8. reports
-- 9. payments
-- 10. passengers
-- ============================================
