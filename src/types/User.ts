import type {User as SupabaseUser} from "@supabase/supabase-js";
import type {UserStatus} from "./Status";

// Re-export Supabase User type
export type {User as SupabaseUser} from "@supabase/supabase-js";

// Extended user interface with our custom fields
export interface UserProfile {
  id: string;
  email: string;
  email_confirmed_at?: string;
  phone?: string;
  phone_confirmed_at?: string;
  created_at: string;
  updated_at: string;
  user_metadata: Record<string, any>;
  app_metadata: Record<string, any>;
}

// User status type (re-exported from Status.ts)
export type UserStatusType = "basic" | "silver" | "gold" | "platinum";

// User session information
export interface UserSession {
  user: SupabaseUser;
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in: number;
  token_type: string;
}

// User state for the library
export interface UserState {
  user: SupabaseUser | null;
  session: UserSession | null;
  status: UserStatus | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
