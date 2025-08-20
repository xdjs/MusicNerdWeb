# Authentication System

This document describes the authentication system implemented in MusicNerdNG that provides seamless switching between authenticated and unauthenticated views across all relevant pages.

## Overview

The authentication system is built around a centralized state management approach using React Context and custom hooks. It provides:

- **Global Authentication State**: Centralized authentication state accessible throughout the application
- **Conditional Rendering**: Components that render different content based on authentication status
- **Protected Routes**: Automatic redirection to login pages for unauthenticated users
- **Role-Based Access**: Support for different user roles (admin, whitelisted, etc.)

## Core Components

### 1. useAuthState Hook (`src/hooks/useAuthState.ts`)

A custom hook that provides authentication state information:

```typescript
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: any;
  user: any;
  isAdmin: boolean;
  isWhiteListed: boolean;
  isSuperAdmin: boolean;
  isHidden: boolean;
}
```

### 2. AuthContext (`src/app/_components/AuthContext.tsx`)

Provides authentication state to all components in the application tree.

### 3. AuthGuard Components (`src/app/_components/AuthGuard.tsx`)

A set of components for conditional rendering based on authentication status:

- `AuthGuard`: Main component with configurable requirements
- `AuthenticatedOnly`: Shows content only to authenticated users
- `UnauthenticatedOnly`: Shows content only to unauthenticated users
- `AdminOnly`: Shows content only to admin users
- `WhitelistedOnly`: Shows content only to whitelisted users

## Usage Examples

### Basic Authentication Check

```tsx
import { useAuth } from '@/app/_components/AuthContext';

function MyComponent() {
  const { isAuthenticated, user } = useAuth();
  
  if (isAuthenticated) {
    return <div>Welcome, {user.name}!</div>;
  }
  
  return <div>Please log in</div>;
}
```

### Protected Content

```tsx
import { AuthenticatedOnly } from '@/app/_components/AuthGuard';

function ProtectedPage() {
  return (
    <AuthenticatedOnly fallback={<PleaseLoginPage />}>
      <div>This content is only visible to authenticated users</div>
    </AuthenticatedOnly>
  );
}
```

### Role-Based Access

```tsx
import { AdminOnly } from '@/app/_components/AuthGuard';

function AdminPanel() {
  return (
    <AdminOnly fallback={<div>Admin access required</div>}>
      <div>Admin-only content</div>
    </AdminOnly>
  );
}
```

### Conditional Navigation

```tsx
import { AuthenticatedOnly, UnauthenticatedOnly } from '@/app/_components/AuthGuard';

function Navigation() {
  return (
    <nav>
      <AuthenticatedOnly>
        <Link href="/profile">Profile</Link>
        <Link href="/leaderboard">Leaderboard</Link>
      </AuthenticatedOnly>
      
      <UnauthenticatedOnly>
        <Link href="/about">About</Link>
        <Link href="/help">Help</Link>
      </UnauthenticatedOnly>
    </nav>
  );
}
```

## Page-Level Implementation

### Artist Pages

Artist pages now require authentication and show a login page for unauthenticated users:

```tsx
// src/app/artist/[id]/page.tsx
<ClientWrapper unauthenticatedView={<PleaseLoginPage />}>
  {/* Artist content */}
</ClientWrapper>
```

### Profile and Leaderboard Pages

These pages are protected and automatically redirect unauthenticated users:

```tsx
// src/app/profile/ClientWrapper.tsx
<AuthenticatedOnly fallback={<PleaseLoginPage />}>
  <Dashboard user={currentUser} />
</AuthenticatedOnly>
```

### Homepage

The homepage shows different content based on authentication status:

```tsx
// src/app/_components/HomePageSplash.tsx
<AuthenticatedHomeContent />
```

## Authentication Flow

1. **User visits a protected page**: If not authenticated, they see a login page
2. **User authenticates**: Session is established and stored
3. **UI updates**: All components automatically switch to authenticated view
4. **User logs out**: Session is cleared and UI switches back to unauthenticated view

## Key Features

### Automatic State Synchronization

The authentication state is automatically synchronized across all components. When a user logs in or out, all components using the `useAuth` hook or `AuthGuard` components will automatically update.

### Loading States

The system properly handles loading states while authentication is being determined, preventing flash of incorrect content.

### Fallback Content

All `AuthGuard` components support custom fallback content, allowing for graceful degradation when users don't meet the required authentication criteria.

### Role-Based Permissions

The system supports multiple user roles:
- `isAdmin`: Administrative privileges
- `isWhiteListed`: Whitelisted user privileges
- `isSuperAdmin`: Super administrative privileges
- `isHidden`: Hidden user status

## Testing

The authentication system includes comprehensive tests in `src/__tests__/auth-system.test.tsx` that verify:

- Authentication state management
- Conditional rendering behavior
- Role-based access control
- Loading state handling
- Fallback content display

## Migration Notes

### Existing Components

Components that previously used `useSession` directly should be updated to use `useAuth`:

```tsx
// Before
import { useSession } from 'next-auth/react';
const { data: session } = useSession();

// After
import { useAuth } from '@/app/_components/AuthContext';
const { session } = useAuth();
```

### Protected Routes

Pages that should require authentication should be wrapped with `AuthenticatedOnly` or use the `ClientWrapper` pattern.

### Navigation

Navigation components should use `AuthenticatedNav` or similar conditional rendering to show appropriate links based on authentication status.

## Future Enhancements

- **Persistent Authentication**: Remember user preferences across sessions
- **Advanced Role Management**: More granular permission system
- **Authentication Analytics**: Track authentication patterns and user behavior
- **Multi-Factor Authentication**: Support for additional authentication methods
