// Supabase configuration
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  options?: {
    auth?: {
      autoRefreshToken?: boolean;
      persistSession?: boolean;
      detectSessionInUrl?: boolean;
      flowType?: "implicit" | "pkce";
    };
    global?: {
      headers?: Record<string, string>;
    };
  };
}

// User Manager configuration
export interface UserManagerConfig {
  supabase: SupabaseConfig;
  session?: SessionConfig;
  status?: StatusConfig;
  events?: EventConfig;
}

// Session management configuration
export interface SessionConfig {
  storage?: "localStorage" | "sessionStorage" | "memory";
  autoRefresh?: boolean;
  refreshThreshold?: number; // minutes before expiry to refresh
  multiTabSync?: boolean;
}

// User status configuration
export interface StatusConfig {
  enabled?: boolean;
  tableName?: string;
  pointsThresholds?: {
    silver: number;
    gold: number;
    platinum: number;
  };
}

// Event system configuration
export interface EventConfig {
  maxListeners?: number;
  enableLogging?: boolean;
}

// Default configurations
export const DEFAULT_SESSION_CONFIG: Required<SessionConfig> = {
  storage: "localStorage",
  autoRefresh: true,
  refreshThreshold: 5,
  multiTabSync: true,
};

export const DEFAULT_STATUS_CONFIG: Required<StatusConfig> = {
  enabled: true,
  tableName: "user_status",
  pointsThresholds: {
    silver: 1000,
    gold: 5000,
    platinum: 10000,
  },
};

export const DEFAULT_EVENT_CONFIG: Required<EventConfig> = {
  maxListeners: 10,
  enableLogging: false,
};
