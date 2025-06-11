import type {SupabaseUser, UserSession, UserStatus, AuthError} from "./index";

// Event listener function type
export type EventListener<T = any> = (data: T) => void;

// Event emitter interface
export interface EventEmitter {
  on<T>(event: string, listener: EventListener<T>): void;
  off<T>(event: string, listener: EventListener<T>): void;
  emit<T>(event: string, data: T): void;
  removeAllListeners(event?: string): void;
}

// User Manager event types
export type UserManagerEvents = {
  // Authentication events
  "auth:signedIn": {user: SupabaseUser; session: UserSession};
  "auth:signedOut": {user: SupabaseUser | null};
  "auth:signUp": {user: SupabaseUser; needsVerification: boolean};
  "auth:signUpComplete": {user: SupabaseUser; needsVerification: boolean};
  "auth:passwordReset": {email: string};
  "auth:passwordResetSent": {email: string};
  "auth:passwordUpdated": {user: SupabaseUser};
  "auth:emailVerified": {user: SupabaseUser};
  "auth:verificationResent": {email: string};
  "auth:sessionRefreshed": {session: UserSession};
  "auth:error": {operation: string; error: AuthError};

  // User status events
  "status:updated": {status: UserStatus; previousStatus?: UserStatus};
  "status:upgraded": {newStatus: UserStatus; oldStatus: UserStatus};
  "status:pointsChanged": {points: number; previousPoints: number; user: SupabaseUser};

  // Session events
  "session:started": {session: UserSession};
  "session:ended": {reason: "logout" | "expired" | "error"};
  "session:refreshed": {session: UserSession};
  "session:syncAcrossTabs": {session: UserSession | null};

  // General events
  "user:loading": {isLoading: boolean};
  "user:stateChanged": {
    user: SupabaseUser | null;
    session: UserSession | null;
    status: UserStatus | null;
    isAuthenticated: boolean;
  };

  // Error events
  "error:network": {operation: string; error: Error};
  "error:validation": {field: string; message: string};
  "error:general": {message: string; error?: Error};
};

// Event names as union type
export type UserManagerEventName = keyof UserManagerEvents;

// Event data type helper
export type EventData<T extends UserManagerEventName> = UserManagerEvents[T];

// Event subscription options
export interface EventSubscriptionOptions {
  once?: boolean;
  priority?: number;
}

// Event emitter configuration
export interface EventEmitterConfig {
  maxListeners?: number;
  enableLogging?: boolean;
  logPrefix?: string;
}
