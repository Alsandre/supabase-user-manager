# User Manager Library

> Complete TypeScript library for Supabase user management with authentication, sessions, and status system

[![CI](https://github.com/[username]/user-manager/workflows/CI/badge.svg)](https://github.com/[username]/user-manager/actions)
[![npm version](https://badge.fury.io/js/%40user%2Fuser-manager.svg)](https://badge.fury.io/js/%40user%2Fuser-manager)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🔐 **Complete Authentication System** - Sign up, sign in, password reset, email verification
- 🔄 **Advanced Session Management** - Auto-refresh, multi-tab sync, persistent sessions
- 🏆 **User Status Progression** - Points-based level system (Basic → Silver → Gold → Platinum)
- 📊 **Real Database Integration** - Supabase database functions and RLS policies
- 🎯 **Event-Driven Architecture** - Real-time updates and state synchronization
- 🛡️ **Comprehensive Error Handling** - User-friendly error messages and recovery
- 📝 **Full TypeScript Support** - Complete type definitions and IntelliSense
- 🧪 **Production Ready** - Thoroughly tested with comprehensive test suite

## 🚀 Quick Start

### Installation

```bash
npm install @user/user-manager @supabase/supabase-js
```

### Basic Usage

```typescript
import {UserManager} from "@user/user-manager";

// Initialize with your Supabase config
const userManager = UserManager.getInstance({
  supabase: {
    url: "your-supabase-url",
    anonKey: "your-supabase-anon-key",
  },
  events: {
    enableLogging: true,
  },
});

// Initialize the manager
await userManager.initialize();

// Sign up a new user
const result = await userManager.signUp({
  email: "user@example.com",
  password: "securePassword123",
});

if (result.success) {
  console.log("User signed up successfully!");
}
```

## 📚 Core Components

### Authentication System

```typescript
// Sign up with email verification
await userManager.signUp({
  email: "user@example.com",
  password: "password123",
});

// Sign in
await userManager.signIn({
  email: "user@example.com",
  password: "password123",
});

// Password reset
await userManager.resetPassword({
  email: "user@example.com",
});

// Sign out
await userManager.signOut();
```

### Session Management

```typescript
// Get current session
const session = userManager.getCurrentSession();

// Refresh session manually
await userManager.refreshSession();

// Session automatically refreshes and syncs across tabs
userManager.on("session:refreshed", (data) => {
  console.log("Session refreshed:", data.session);
});
```

### User Status System

```typescript
// Get user status
const status = await userManager.getUserStatus();
console.log(`Level: ${status.data.status}, Points: ${status.data.points}`);

// Add points
await userManager.addUserPoints(500);

// Update total points
await userManager.updateUserPoints(2500);

// Get progress to next level
const progress = userManager.getStatusProgress();
console.log(`${progress.pointsToNext} points to ${progress.nextLevel}`);
```

### Event System

```typescript
// Listen to authentication events
userManager.on("auth:signedIn", (data) => {
  console.log("User signed in:", data.user.email);
});

userManager.on("auth:signedOut", (data) => {
  console.log("User signed out");
});

// Listen to status changes
userManager.on("status:levelChanged", (data) => {
  console.log(`Level up! ${data.previousStatus} → ${data.newStatus}`);
});

// Listen to session events
userManager.on("session:started", (data) => {
  console.log("Session started");
});
```

## 🗄️ Database Setup

The library requires specific database functions and tables. Run this SQL in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of supabase-setup.sql
-- This creates the user_status table, RLS policies, and database functions
```

The setup includes:

- `user_status` table with RLS policies
- Status calculation functions
- Points management functions
- Automatic status level progression

## 🎯 Status Level System

| Level        | Points Required | Benefits                                        |
| ------------ | --------------- | ----------------------------------------------- |
| **Basic**    | 0 - 999         | Basic access, Community support                 |
| **Silver**   | 1,000 - 4,999   | Priority support, Advanced features             |
| **Gold**     | 5,000 - 9,999   | Premium support, Beta access, Exclusive content |
| **Platinum** | 10,000+         | VIP support, Early access, Custom integrations  |

## 🔧 Configuration

```typescript
interface UserManagerConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  events?: {
    enableLogging?: boolean;
    maxListeners?: number;
  };
}
```

## 📖 API Reference

### Core Methods

- `UserManager.getInstance(config)` - Get singleton instance
- `initialize()` - Initialize the manager
- `signUp(credentials)` - Register new user
- `signIn(credentials)` - Authenticate user
- `signOut()` - Sign out current user
- `resetPassword(request)` - Send password reset email

### Session Methods

- `getCurrentSession()` - Get current session
- `refreshSession()` - Manually refresh session
- `getSessionState()` - Get session information

### Status Methods

- `getUserStatus()` - Get current user status
- `updateUserPoints(points)` - Set total points
- `addUserPoints(points)` - Add points to current total
- `getStatusProgress()` - Get progress to next level
- `getStatusLevelInfo(level)` - Get level information

### Utility Methods

- `getCurrentUser()` - Get current user
- `isAuthenticated()` - Check authentication status
- `getUserState()` - Get complete user state

## 🎪 Events

### Authentication Events

- `auth:signedIn` - User signed in
- `auth:signedOut` - User signed out
- `auth:signUpComplete` - Sign up completed
- `auth:passwordResetSent` - Password reset email sent

### Session Events

- `session:started` - Session started
- `session:ended` - Session ended
- `session:refreshed` - Session refreshed
- `session:restored` - Session restored from storage

### Status Events

- `status:updated` - Status data updated
- `status:levelChanged` - User level changed
- `status:pointsAdded` - Points added to user

### Error Events

- `error:general` - General error occurred
- `error:network` - Network error
- `error:validation` - Validation error

## 🧪 Testing

The library includes a comprehensive test app with interactive test suites:

```bash
npm run dev
```

Navigate to the test suites to validate:

- Event Emitter functionality
- User Manager core features
- Email authentication flows
- Session management
- User status system
- Error handling

## 🏗️ Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type check
npm run type-check

# Build library
npm run build

# Clean build artifacts
npm run clean
```

## 📦 Bundle Size

- **Raw**: ~55KB
- **Gzipped**: ~11KB
- **Dependencies**: Only @supabase/supabase-js (peer dependency)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Supabase](https://supabase.com/) for backend services
- Powered by [TypeScript](https://www.typescriptlang.org/) and [Vite](https://vitejs.dev/)
- Inspired by modern authentication and user management needs

---

**Made with ❤️ for the developer community**
