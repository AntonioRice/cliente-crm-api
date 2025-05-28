# Cliente API

**⚠️ Note: This project has been completed and sold (March 2, 2025). This repository showcases the original codebase I developed.**

A comprehensive REST API for Cliente, a hotel guest management SaaS platform. This API provides complete hotel operations management including guest tracking, reservations, room management, and multi-tenant architecture.

## Features

### Guest Management

- **Guest Directory**: Complete guest profile management and search functionality
- **Current Guests**: Real-time tracking of active hotel guests
- **Guest History**: Access to previous stays and guest preferences
- **Advanced Search**: Multi-criteria guest search and filtering

### Reservation System

- **Booking Management**: Create, update, and track reservations
- **Calendar Integration**: Month-view reservation calendar
- **Analytics Dashboard**: Reservation insights and reporting
- **Guest-Reservation Linking**: Seamless connection between guests and bookings

### Room Management

- **Room Inventory**: Complete room catalog with details and availability
- **Room Status**: Real-time room status tracking and updates
- **Occupancy Management**: Track room assignments and availability

### Multi-Tenant Architecture

- **Hotel Chain Support**: Manage multiple hotel properties
- **Tenant Isolation**: Secure data separation between properties
- **Centralized Administration**: Super admin controls for tenant management

### User Management & Security

- **Role-Based Access Control**: SuperAdmin, Admin, and User roles
- **JWT Authentication**: Secure token-based authentication
- **Password Management**: Forgot/reset password functionality
- **Profile Management**: User profiles with image upload support

## Tech Stack

**Backend Framework:**

- Node.js with Express.js
- PostgreSQL for robust relational data management
- AWS SDK for cloud services integration

**Security & Authentication:**

- JWT (JSON Web Tokens) for secure authentication
- bcryptjs for password hashing
- Role-based authorization middleware

**File Management:**

- Multer for file uploads
- AWS S3 integration for profile pictures and documents

**Development Tools:**

- Nodemon for development hot-reloading
- Cross-env for environment variable management
- Moment.js for timezone handling

## API Endpoints

### Authentication

```
POST /api/auth/login              - User login
POST /api/auth/logout             - User logout (authenticated)
POST /api/auth/password/forgot    - Request password reset
PUT  /api/auth/password/reset/:token - Reset password with token
```

### Guest Management

```
GET    /api/guests                - Get all guests
POST   /api/guests                - Create new guest
GET    /api/guests/search         - Search guests
GET    /api/guests/current        - Get current hotel guests
GET    /api/guests/:id            - Get specific guest
DELETE /api/guests/:id            - Delete guest
GET    /api/guests/:id/reservations - Get guest's reservations
```

### Reservations

```
GET  /api/reservations            - Get all reservations
POST /api/reservations            - Create new reservation
GET  /api/reservations/analytics  - Get reservation analytics
GET  /api/reservations/calendar   - Get monthly calendar view
GET  /api/reservations/:id        - Get specific reservation
PUT  /api/reservations/:id        - Update reservation
```

### Room Management

```
GET    /api/rooms                 - Get all rooms
POST   /api/rooms                 - Create new room
GET    /api/rooms/:id             - Get specific room
PUT    /api/rooms/:id             - Update room
DELETE /api/rooms/:id             - Delete room
```

### Tenant Management (SuperAdmin Only)

```
GET    /api/tenants               - Get all tenants
POST   /api/tenants               - Create new tenant
GET    /api/tenants/:id           - Get specific tenant
PUT    /api/tenants/:id           - Update tenant
DELETE /api/tenants/:id           - Delete tenant
```

### User Management

```
GET    /api/users                 - Get all users (Admin+)
POST   /api/users                 - Create new user (Admin+)
GET    /api/users/:id             - Get specific user
PUT    /api/users/:id             - Update user
DELETE /api/users/:id             - Delete user
PUT    /api/users/profile-picture/:id - Update profile picture
PUT    /api/complete-registration/:token - Complete user registration
```

## Role-Based Access Control

**SuperAdmin**

- Full system access
- Tenant management
- User management across all tenants

**Admin**

- Property-level management
- User creation and management within tenant
- Full access to guests, reservations, and rooms

**User**

- Standard hotel operations
- Guest and reservation management
- Room status updates

## Installation & Setup

### Prerequisites

- Node.js (v16+)
- PostgreSQL
- AWS Account (for file storage)

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/cliente-api.git
cd cliente-api

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your PostgreSQL URI, AWS credentials, JWT secret, etc.

# Start development server
npm run dev

# Start production server
npm start
```

## Environment Variables

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=your_s3_bucket_name
```

## Architecture Highlights

- **Multi-tenant SaaS Architecture**: Scalable design supporting multiple hotel properties
- **RESTful API Design**: Clean, intuitive endpoints following REST principles
- **Robust Authentication**: JWT-based auth with role-based access control
- **Database Optimization**: Efficient PostgreSQL queries and indexing
- **File Upload Integration**: Seamless AWS S3 integration for media management
- **Error Handling**: Comprehensive error handling and validation

## Creator & Developer

**Antonio Rice**  
Full-Stack Software Engineer  
_Original developer of the Cliente hotel management system_

---

_This repository serves as a portfolio piece demonstrating expertise in enterprise-level SaaS development, multi-tenant architecture, and hospitality industry solutions._
