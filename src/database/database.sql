-- Create Database
CREATE DATABASE cliente_db;

-- Use Database
USE cliente_db;

-- Create Tenant Table
CREATE TABLE tenant (
    tenant_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_name VARCHAR(255) NOT NULL,
    membership_level VARCHAR(255) NOT NULL,
    status ENUM('Active', 'Inactive') NOT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Guest Table
CREATE TABLE guest (
    guest_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    nationality VARCHAR(255) NOT NULL,
    city VARCHAR(255),
    state VARCHAR(255),
    postal_code VARCHAR(50),
    country VARCHAR(255),
    identification_number VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone_number VARCHAR(50),
    emergency_first_name VARCHAR(255),
    emergency_last_name VARCHAR(255),
    emergency_phone_number VARCHAR(50),
    room_number INT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    license_plate_number VARCHAR(50),
    payment_method VARCHAR(255) NOT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id)
);

-- Create Reservation Table
CREATE TABLE reservation (
    reservation_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    primary_guest_id INT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    status ENUM('Active', 'Completed', 'Canceled') NOT NULL DEFAULT 'Active',
    payment_status ENUM('Pending', 'Completed', 'Failed') NOT NULL DEFAULT 'Pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id),
    FOREIGN KEY (primary_guest_id) REFERENCES guest(guest_id)
);

-- Create Reservation Guests Table
CREATE TABLE reservation_guests (
    reservation_id INT NOT NULL,
    guest_id INT NOT NULL,
    PRIMARY KEY (reservation_id, guest_id),
    FOREIGN KEY (reservation_id) REFERENCES reservation(reservation_id),
    FOREIGN KEY (guest_id) REFERENCES guest(guest_id)
);
