# Job Tracker Backend

Express.js and MongoDB backend for the Job Tracker Chrome Extension.

## Project Structure

```
/backend
├── src/                  # Source code
│   ├── config/           # Configuration files
│   │   └── db.js         # Database connection
│   ├── controllers/      # Route controllers
│   │   ├── companyController.js  # Job application CRUD
│   │   └── userController.js     # Authentication & user management
│   ├── middleware/       # Express middleware
│   │   ├── authMiddleware.js     # JWT authentication
│   │   └── errorMiddleware.js    # Global error handler
│   ├── models/           # Mongoose schemas
│   │   ├── companyModel.js       # Job application schema
│   │   └── userModel.js          # User schema
│   ├── routes/           # Express routes
│   │   ├── companyRoutes.js      # Job application routes
│   │   └── userRoutes.js         # User routes
│   ├── services/         # Business logic and services
│   └── utils/            # Utility functions
├── tests/                # Test files
├── .env.example          # Environment variable template
├── package.json          # Dependencies and scripts
└── server.js             # Entry point
```

## Getting Started

1. Copy `.env.example` to `.env` and configure your environment variables
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login user
- `GET /api/users/profile` - Get user profile (protected)
- `PUT /api/users/profile` - Update user profile (protected)

### Job Applications
- `GET /api/companies` - Get all companies (protected)
- `GET /api/companies/:id` - Get company by ID (protected)
- `POST /api/companies` - Create new company entry (protected)
- `PUT /api/companies/:id` - Update company (protected)
- `DELETE /api/companies/:id` - Delete company (protected)

## Database Schema

### Company
- `name`: String (required) - Company name
- `applicationDate`: Date - When the application was made
- `url`: String - Website or job posting URL
- `status`: String - Status of application (applied, interview, offer, rejected, no_response)
- `notes`: String - Additional notes
- `user`: ObjectId - Reference to User who owns this record

### User
- `name`: String (required) - User's name
- `email`: String (required, unique) - User's email
- `password`: String (required) - Hashed password
