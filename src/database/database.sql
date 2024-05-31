-- Create Database
CREATE DATABASE cliente_db;

-- Use Database
USE cliente_db;

-- Create Tenant Table
CREATE TABLE tenants (
    tenant_id SERIAL PRIMARY KEY,
    tenant_name VARCHAR(255) NOT NULL,
    membership VARCHAR(50) NOT NULL CHECK (membership IN ('Basic', 'Premium')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('Active', 'Inactive')),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Users Table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(tenant_id),
    user_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('SuperAdmin', 'Admin', 'Employee')),
    phone_number VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    preferences JSONB,
    password VARCHAR(255) NOT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Guests Table
CREATE TABLE guests (
    guest_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(tenant_id),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    nationality VARCHAR(255) NOT NULL,
    address JSONB,
    identification_number VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone_number VARCHAR(50),
    emergency_contact JSONB,
    room_number INT NOT NULL,
    check_in TIMESTAMP NOT NULL,
    check_out TIMESTAMP NOT NULL,
    license_plate_number VARCHAR(255),
    payment_method VARCHAR(255) NOT NULL CHECK (payment_method IN ('Cash', 'Credit', 'Transfer')),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Reservations Table
CREATE TABLE reservations (
    reservation_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(tenant_id),
    primary_guest_id INT NOT NULL REFERENCES guests(guest_id),
    guests INT[] REFERENCES guests(guest_id),
    check_in TIMESTAMP NOT NULL,
    check_out TIMESTAMP NOT NULL,
    rooms INT[],
    status VARCHAR(50) NOT NULL CHECK (status IN ('Active', 'Completed', 'Canceled')) DEFAULT 'Active',
    payment_status VARCHAR(50) NOT NULL CHECK (payment_status IN ('Pending', 'Completed', 'Failed')) DEFAULT 'Pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Reservation Guests Table
CREATE TABLE reservation_guests (
    reservation_id INT NOT NULL,
    guest_id INT NOT NULL,
    PRIMARY KEY (reservation_id, guest_id),
    FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id),
    FOREIGN KEY (guest_id) REFERENCES guests(guest_id)
);


-- {
--     "language": "en",
--     "ui_mode": "dark",
--     "notifications": {
--         "email": true,
--         "sms": false
--     }
-- }        