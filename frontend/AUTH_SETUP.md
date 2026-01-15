# Authentication Setup Guide

## Overview

The authentication system is now fully integrated with the backend API using JWT tokens. The system uses React Context for state management and automatically handles token storage and API requests.

## Architecture

### 1. **AuthContext** (`contexts/AuthContext.jsx`)
- Manages authentication state globally
- Provides `login()`, `logout()`, `isAuthenticated()`, `hasRole()` functions
- Stores JWT token in `localStorage`
- Stores user data in `localStorage`

### 2. **ProtectedRoute** (`components/ProtectedRoute.jsx`)
- Wraps protected pages/components
- Redirects to login if not authenticated
- Supports role-based access control

### 3. **API Client** (`lib/api.js`)
- Automatically adds Bearer token to all requests
- Handles 401 errors and redirects to login
- Token is read from localStorage on each request

## Usage

### Login
```jsx
import { useAuth } from '../contexts/AuthContext';

const { login } = useAuth();
const result = await login(email, password);
if (result.success) {
  // User is logged in, token stored automatically
}
```

### Check Authentication
```jsx
import { useAuth } from '../contexts/AuthContext';

const { isAuthenticated, user } = useAuth();
if (isAuthenticated()) {
  // User is logged in
  console.log(user.username);
}
```

### Protected Routes
```jsx
import ProtectedRoute from '../components/ProtectedRoute';

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div>Admin Content</div>
    </ProtectedRoute>
  );
}
```

### Logout
```jsx
import { useAuth } from '../contexts/AuthContext';

const { logout } = useAuth();
logout(); // Clears token and redirects to login
```

## Token Storage

- **Token**: Stored in `localStorage` as `pcea-token`
- **User Data**: Stored in `localStorage` as `pcea-user`
- **Remember Email**: Stored in `localStorage` as `pcea-remembered-email`

## API Integration

All API calls automatically include the Bearer token:
```javascript
// Token is automatically added by axios interceptor
const response = await apiClient.districts.getAll();
```

## Backend Credentials

Default admin user (created by seed):
- **Email/Username**: `admin@church360.org` or `admin`
- **Password**: `admin123`

## Security Features

1. **Automatic Token Injection**: All API requests include the token
2. **401 Handling**: Automatically redirects to login on unauthorized
3. **Protected Routes**: Prevents access to protected pages without auth
4. **Role-Based Access**: Can restrict routes by user role



