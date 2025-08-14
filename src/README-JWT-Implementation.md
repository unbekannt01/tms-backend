# JWT + Session Authentication Implementation

This project now supports **hybrid authentication** using both JWT tokens and sessions for enhanced security.

## 🔄 Authentication Flow

### Login Process
1. User provides credentials
2. System validates credentials
3. Creates session in MongoDB
4. Generates JWT access token
5. Returns both `sessionId` and `accessToken`

### Authentication Verification
The middleware now validates **both** session and JWT token:
1. Checks for `x-session-id` header (required)
2. Optionally checks for `Authorization: Bearer <token>` header
3. Validates session exists and is active
4. If JWT provided, verifies token signature and payload
5. Ensures session and token match the same user

## 📡 API Usage

### Login
\`\`\`javascript
POST /api/users/login
{
  "emailOrUserName": "user@example.com",
  "password": "password123"
}

Response:
{
  "message": "Login successful!",
  "user": { ... },
  "sessionId": "uuid-session-id",
  "accessToken": "jwt.token.here"
}
\`\`\`

### Protected Routes
\`\`\`javascript
// Session only (backward compatible)
GET /api/auth/me
Headers: {
  "x-session-id": "uuid-session-id"
}

// Session + JWT (enhanced security)
GET /api/auth/me
Headers: {
  "x-session-id": "uuid-session-id",
  "authorization": "Bearer jwt.token.here"
}
\`\`\`

## 🔒 Security Features

- **Dual Verification**: Both session and JWT must be valid
- **Session Limits**: Max 2 active sessions per user
- **Token Expiry**: JWT tokens expire in 1 hour
- **Session Cleanup**: Expired sessions auto-deleted
- **Mismatch Protection**: Token and session must belong to same user

## 🧪 Testing

Run the test script to verify the implementation:
\`\`\`bash
node scripts/test-auth-flow.js
\`\`\`

## 📋 Environment Variables Required

\`\`\`env
JWT_SECRET_KEY=your-secret-key
JWT_EXPIRES_IN=1h
MONGO_URI=mongodb://localhost:27017/your-db
\`\`\`

## 🔧 Backward Compatibility

The system maintains backward compatibility - existing clients using only session-based auth will continue to work without changes.
