# Cliente API

**⚠️ Note: This project has since been revised, completed, and sold (March 2, 2025). This repository showcases the original backend api I developed.**

A REST API for hotel guest management SaaS platform. Provides complete hotel operations including guest tracking, reservations, room management, and multi-tenant architecture.

## Key Features

- **Guest Management**: Complete profiles, search, and history tracking
- **Reservation System**: Booking management, calendar integration, and analytics
- **Room Management**: Inventory, status tracking, and occupancy management
- **Multi-tenant Architecture**: Support for hotel chains with data isolation
- **Role-Based Access**: SuperAdmin, Admin, and User roles with JWT authentication
- **File Management**: AWS S3 integration for profile pictures and documents

## Tech Stack

**Backend:** Node.js, Express, PostgreSQL  
**Security:** JWT authentication, bcryptjs, role-based authorization  
**Cloud:** AWS SDK, S3 integration  
**Tools:** Multer, Moment.js, Nodemon

## API Overview

### Authentication

```
POST /api/auth/login              - User login
POST /api/auth/logout             - User logout
POST /api/auth/password/forgot    - Password reset request
PUT  /api/auth/password/reset/:token - Reset password
```

### Core Resources

```
/api/guests                       - Guest management
/api/reservations                 - Booking operations
/api/rooms                        - Room inventory
/api/users                        - User management
/api/tenants                      - Multi-tenant admin
```

## Quick Start

```bash
git clone https://github.com/yourusername/cliente-api.git
cd cliente-api
npm install
# Configure .env with PostgreSQL, AWS, and JWT settings
npm run dev
```

## Creator

**Antonio Rice** - Full-Stack Software Engineer  
[Portfolio](https://www.antoniorice.com)

---

_Multi-tenant SaaS API that successfully served hotel chains across South America._
