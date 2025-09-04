# TaskFlow - Backend API

A comprehensive Node.js/Express backend application with advanced task management, authentication, and role-based access control (RBAC) system.

## 🚀 Features

### 🔐 Authentication & Security
- **Session-based authentication** with secure token management
- **Multi-device session management** with configurable session limits
- **Email verification** with token-based system
- **Password reset** with secure verification
- **Rate limiting** for brute force protection
- **Redis integration** for session storage and caching

### 👥 User Management
- **User CRUD operations** with soft delete capability
- **Email verification workflow** with automated emails
- **Profile management** and user preferences
- **Admin-controlled user management**
- **Welcome email automation**

### 🛡️ RBAC (Role-Based Access Control)
- **Granular permission system** with context-aware controls
- **Hierarchical role structure** with multiple access levels
- **Permission scopes** for different access patterns
- **Dynamic role assignment** and management
- **Route-level permission middleware**

### 📋 Task Management
- **Full task lifecycle** management (CRUD operations)
- **Priority levels** with visual indicators
- **Status tracking** throughout task progression
- **Due date management** with automated alerts
- **Comment system** for team collaboration
- **Task statistics** and comprehensive analytics
- **AI-powered description enhancement**
- **Email notifications** for assignments and deadlines

### 🤖 AI Integration
- **AI-powered task enhancement** for intelligent descriptions
- **Task suggestion system** with context awareness
- **Configurable AI features** for different use cases

### 📧 Email System
- **HTML email templates** for professional communication
- **Automated notifications** for various system events
- **SMTP configuration** with multiple provider support
- **Email queue management** for reliable delivery

### ⚡ Performance & Monitoring
- **Scheduled jobs** for automated cleanup and maintenance
- **Multi-level rate limiting** for different endpoint types
- **Database optimization** with efficient indexing
- **Caching layer** for improved performance
- **Health check endpoints** for system monitoring
- **Comprehensive logging** with configurable levels

## 🏗️ Architecture

```
├── config/                 # Configuration management
├── controllers/            # Request handlers
├── middleware/            # Custom middleware functions
├── models/               # Database models and schemas
├── routes/               # API route definitions
├── services/             # Business logic and external integrations
├── utils/                # Utility functions and helpers
├── validators/           # Input validation schemas
└── workers/              # Background job processors
```

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with ODM
- **Cache/Sessions**: Redis
- **Authentication**: Token-based with session management
- **AI Integration**: External AI service integration
- **Email**: SMTP with template system
- **Validation**: Comprehensive input validation
- **Security**: Rate limiting, CORS, sanitization

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (v5.0 or higher)
- **Redis** (v6 or higher)
- **SMTP email service** (Gmail, SendGrid, etc.)
- **AI API access** (optional, for enhanced features)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone [your-repository-url]
   cd taskflow-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   # Server Configuration
   PORT=your_server_port
   NODE_ENV=development
   
   # Database
   MONGODB_URI=your_mongodb_connection_string
   DB_NAME=your_database_name
   
   # Authentication
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=24h
   BCRYPT_SALT_ROUNDS=12
   
   # Redis Configuration
   REDIS_URL=your_redis_connection_string
   REDIS_TTL_SECONDS=86400
   
   # Email Configuration
   SMTP_HOST=your_smtp_host
   SMTP_PORT=587
   SMTP_USER=your_email_username
   SMTP_PASS=your_email_password
   SMTP_SECURE=false
   
   # Frontend URLs
   FRONTEND_URL=your_frontend_domain
   CORS_ORIGIN=your_allowed_origins
   
   # Security
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   
   # AI Integration (Optional)
   AI_API_KEY=your_ai_service_api_key
   AI_MODEL_NAME=your_preferred_model
   
   # Logging
   LOG_LEVEL=info
   ```

4. **Database Setup**
   ```bash
   # Ensure MongoDB is running
   # Run database migrations/setup if needed
   npm run db:setup
   ```

5. **Start the application**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset confirmation

### User Management
- `GET /api/users` - List users (admin only)
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/:id` - Delete user (admin only)
- `GET /api/users/:id` - Get user details (admin only)

### Task Management
- `GET /api/tasks` - Get user tasks with filtering
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get specific task details
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/assign` - Assign task to user
- `POST /api/tasks/:id/comments` - Add task comment
- `POST /api/tasks/:id/enhance` - AI enhance task description

### Role & Permission Management
- `GET /api/roles` - Get available roles
- `POST /api/roles/assign` - Assign role to user
- `GET /api/permissions` - Get user permissions
- `PUT /api/permissions` - Update permissions

### System Monitoring
- `GET /api/health` - System health check
- `GET /api/stats` - System statistics (admin only)

## 🔧 Configuration

### Rate Limiting Configuration
Different rate limits are applied based on endpoint sensitivity:
- **General API**: Standard rate limiting
- **Authentication**: Strict rate limiting
- **Sensitive operations**: Enhanced protection
- **File uploads**: Special handling

### Session Management
- **Configurable session limits** per user
- **Session expiration** with automatic cleanup
- **Cross-device session tracking**
- **Secure session invalidation**

### Email Templates
- **Welcome emails** for new users
- **Task notifications** for assignments
- **Due date reminders** with customizable timing
- **Password reset** with secure tokens

## 🔍 Monitoring & Health Checks

### Health Check Endpoint
The `/api/health` endpoint provides:
- Database connectivity status
- Redis connectivity status
- External service availability
- System resource usage
- API response times

### Logging
- **Structured logging** with JSON format
- **Configurable log levels** (error, warn, info, debug)
- **Request/response logging** for debugging
- **Error tracking** with stack traces

## 🚀 Deployment

### Environment Preparation
1. Set all required environment variables
2. Configure database connections
3. Set up external service integrations
4. Configure SMTP settings
5. Set appropriate security configurations

### Deployment Platforms
- **Railway** - Easy deployment with Git integration
- **Render** - Automated deployments
- **Heroku** - Classic PaaS solution
- **AWS/GCP/Azure** - Cloud platform deployment
- **Docker** - Containerized deployment

### Production Considerations
- Enable production logging
- Configure monitoring and alerts
- Set up database backups
- Configure SSL/TLS certificates
- Implement proper error handling

## 🔒 Security Features

- **Input validation** and sanitization
- **SQL injection prevention**
- **XSS protection**
- **CSRF protection**
- **Rate limiting** with Redis
- **Secure headers** configuration
- **Authentication middleware**
- **Authorization checks**

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow Node.js best practices
- Write comprehensive tests
- Maintain API documentation
- Follow semantic versioning
- Update changelog for releases

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review configuration examples
- Contact the development team

---

**TaskFlow Backend** - Robust, scalable API for comprehensive task management.
