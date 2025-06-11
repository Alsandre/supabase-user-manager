import type {AuthError} from "@supabase/supabase-js";

// Re-export Supabase AuthError
export type {AuthError} from "@supabase/supabase-js";

// Sign up credentials
export interface SignUpCredentials {
  email: string;
  password: string;
  options?: {
    data?: Record<string, any>;
    captchaToken?: string;
  };
}

// Sign in credentials
export interface SignInCredentials {
  email: string;
  password: string;
  options?: {
    captchaToken?: string;
  };
}

// Password reset request
export interface PasswordResetRequest {
  email: string;
  options?: {
    captchaToken?: string;
    redirectTo?: string;
  };
}

// Password update request
export interface PasswordUpdateRequest {
  password: string;
}

// Auth operation results
export interface AuthResult<T = any> {
  data: T | null;
  error: AuthError | null;
}

// Auth operation types
export type AuthOperation = "signUp" | "signIn" | "signOut" | "resetPassword" | "updatePassword" | "verifyEmail" | "refreshSession";

// Auth state changes
export type AuthState = "SIGNED_IN" | "SIGNED_OUT" | "PASSWORD_RECOVERY" | "TOKEN_REFRESHED" | "USER_UPDATED";
