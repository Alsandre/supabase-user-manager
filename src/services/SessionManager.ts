import type {SupabaseClient} from "@supabase/supabase-js";
import type {UserSession, SupabaseUser} from "../types/User";
import {ErrorHandler, UserManagerError, UserManagerErrorType, type OperationResult} from "../utils/ErrorHandler";
import {EventEmitter} from "../core/EventEmitter";

/**
 * Session storage configuration
 */
export interface SessionStorageConfig {
  storageKey?: string;
  autoRefresh?: boolean;
  refreshThreshold?: number; // Minutes before expiry to refresh
  enableMultiTabSync?: boolean;
  enableLogging?: boolean;
}

/**
 * Session state for internal tracking
 */
interface SessionState {
  session: UserSession | null;
  refreshTimer: NodeJS.Timeout | null;
  isRefreshing: boolean;
  lastRefresh: number;
}

/**
 * SessionManager - Handles session storage, refresh, and multi-tab sync
 * Provides comprehensive session management with localStorage persistence
 */
export class SessionManager {
  private supabase: SupabaseClient;
  private eventEmitter: EventEmitter;
  private config: Required<SessionStorageConfig>;
  private state: SessionState;
  private storageEventListener: ((event: StorageEvent) => void) | null = null;

  constructor(supabase: SupabaseClient, eventEmitter: EventEmitter, config?: SessionStorageConfig) {
    this.supabase = supabase;
    this.eventEmitter = eventEmitter;

    // Set default configuration
    this.config = {
      storageKey: "user_manager_session",
      autoRefresh: true,
      refreshThreshold: 5, // 5 minutes before expiry
      enableMultiTabSync: true,
      enableLogging: false,
      ...config,
    };

    // Initialize state
    this.state = {
      session: null,
      refreshTimer: null,
      isRefreshing: false,
      lastRefresh: 0,
    };

    if (this.config.enableLogging) {
      console.log("[SessionManager] Initialized with config:", this.config);
    }

    // Set up multi-tab sync if enabled
    if (this.config.enableMultiTabSync && typeof window !== "undefined") {
      this.setupMultiTabSync();
    }
  }

  /**
   * Initialize session manager and restore session from storage
   */
  async initialize(): Promise<OperationResult<UserSession | null>> {
    return await ErrorHandler.wrapOperation(
      async () => {
        if (this.config.enableLogging) {
          console.log("[SessionManager] Initializing...");
        }

        // Try to restore session from localStorage
        const storedSession = this.getStoredSession();

        if (storedSession) {
          // Validate stored session
          const isValid = await this.validateSession(storedSession);

          if (isValid) {
            this.state.session = storedSession;

            // Set up auto-refresh if enabled
            if (this.config.autoRefresh) {
              this.scheduleRefresh(storedSession);
            }

            if (this.config.enableLogging) {
              console.log("[SessionManager] Session restored from storage");
            }

            return storedSession;
          } else {
            // Invalid session, clear it
            await this.clearSession();
            if (this.config.enableLogging) {
              console.log("[SessionManager] Stored session invalid, cleared");
            }
          }
        }

        if (this.config.enableLogging) {
          console.log("[SessionManager] No valid session found");
        }

        return null;
      },
      UserManagerErrorType.SESSION_ERROR,
      "initialize"
    );
  }

  /**
   * Set current session and store it
   */
  async setSession(session: UserSession): Promise<OperationResult<void>> {
    return await ErrorHandler.wrapOperation(
      async () => {
        if (this.config.enableLogging) {
          console.log("[SessionManager] Setting session for user:", session.user.email);
        }

        // Update internal state
        this.state.session = session;
        this.state.lastRefresh = Date.now();

        // Store in localStorage
        this.storeSession(session);

        // Set up auto-refresh
        if (this.config.autoRefresh) {
          this.scheduleRefresh(session);
        }

        // Emit session events
        this.emitSessionEvent("session:stored", {session});

        // Broadcast to other tabs
        if (this.config.enableMultiTabSync) {
          this.broadcastSessionChange("session_set", session);
        }

        if (this.config.enableLogging) {
          console.log("[SessionManager] Session set successfully");
        }
      },
      UserManagerErrorType.SESSION_ERROR,
      "setSession"
    );
  }

  /**
   * Get current session
   */
  async getSession(): Promise<OperationResult<UserSession | null>> {
    return await ErrorHandler.wrapOperation(
      async () => {
        // Return cached session if available
        if (this.state.session) {
          // Check if session is still valid
          const isValid = await this.validateSession(this.state.session);
          if (isValid) {
            return this.state.session;
          } else {
            // Session expired, clear it
            await this.clearSession();
            return null;
          }
        }

        // Try to restore from storage
        const storedSession = this.getStoredSession();
        if (storedSession) {
          const isValid = await this.validateSession(storedSession);
          if (isValid) {
            this.state.session = storedSession;
            return storedSession;
          } else {
            await this.clearSession();
          }
        }

        return null;
      },
      UserManagerErrorType.SESSION_ERROR,
      "getSession"
    );
  }

  /**
   * Clear current session
   */
  async clearSession(): Promise<OperationResult<void>> {
    return await ErrorHandler.wrapOperation(
      async () => {
        if (this.config.enableLogging) {
          console.log("[SessionManager] Clearing session");
        }

        const previousSession = this.state.session;

        // Clear internal state
        this.state.session = null;
        this.state.isRefreshing = false;
        this.state.lastRefresh = 0;

        // Clear refresh timer
        if (this.state.refreshTimer) {
          clearTimeout(this.state.refreshTimer);
          this.state.refreshTimer = null;
        }

        // Clear from localStorage
        this.removeStoredSession();

        // Emit session events
        this.emitSessionEvent("session:cleared", {previousSession});

        // Broadcast to other tabs
        if (this.config.enableMultiTabSync) {
          this.broadcastSessionChange("session_cleared", null);
        }

        if (this.config.enableLogging) {
          console.log("[SessionManager] Session cleared successfully");
        }
      },
      UserManagerErrorType.SESSION_ERROR,
      "clearSession"
    );
  }

  /**
   * Refresh current session
   */
  async refreshSession(): Promise<OperationResult<UserSession>> {
    return await ErrorHandler.wrapOperation(
      async () => {
        if (this.state.isRefreshing) {
          throw ErrorHandler.createError(UserManagerErrorType.SESSION_ERROR, "Session refresh already in progress");
        }

        if (!this.state.session) {
          throw ErrorHandler.createError(UserManagerErrorType.SESSION_ERROR, "No session to refresh");
        }

        if (this.config.enableLogging) {
          console.log("[SessionManager] Refreshing session");
        }

        this.state.isRefreshing = true;

        try {
          // Use Supabase to refresh the session
          const {data, error} = await this.supabase.auth.refreshSession({
            refresh_token: this.state.session.refresh_token,
          });

          if (error) {
            throw ErrorHandler.handleAuthError(error, "refreshSession");
          }

          if (!data.session || !data.user) {
            throw ErrorHandler.createError(UserManagerErrorType.SESSION_ERROR, "Session refresh failed - no session returned");
          }

          const newSession: UserSession = data.session;

          // Update session
          await this.setSession(newSession);

          // Emit refresh event
          this.emitSessionEvent("session:refreshed", {session: newSession});

          if (this.config.enableLogging) {
            console.log("[SessionManager] Session refreshed successfully");
          }

          return newSession;
        } finally {
          this.state.isRefreshing = false;
        }
      },
      UserManagerErrorType.SESSION_ERROR,
      "refreshSession"
    );
  }

  /**
   * Check if session is valid and not expired
   */
  async validateSession(session: UserSession): Promise<boolean> {
    try {
      // Check if session has expiry information
      if (session.expires_at) {
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = session.expires_at;

        if (now >= expiresAt) {
          if (this.config.enableLogging) {
            console.log("[SessionManager] Session expired");
          }
          return false;
        }
      }

      // Additional validation could be added here
      // For now, we trust Supabase's session structure
      return true;
    } catch (error) {
      if (this.config.enableLogging) {
        console.error("[SessionManager] Session validation error:", error);
      }
      return false;
    }
  }

  /**
   * Check if session needs refresh
   */
  private shouldRefreshSession(session: UserSession): boolean {
    if (!session.expires_at) return false;

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;
    const refreshThresholdSeconds = this.config.refreshThreshold * 60;

    return expiresAt - now <= refreshThresholdSeconds;
  }

  /**
   * Schedule automatic session refresh
   */
  private scheduleRefresh(session: UserSession): void {
    // Clear existing timer
    if (this.state.refreshTimer) {
      clearTimeout(this.state.refreshTimer);
    }

    if (!session.expires_at) return;

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;
    const refreshThresholdSeconds = this.config.refreshThreshold * 60;
    const refreshAt = expiresAt - refreshThresholdSeconds;
    const msUntilRefresh = (refreshAt - now) * 1000;

    if (msUntilRefresh > 0) {
      this.state.refreshTimer = setTimeout(async () => {
        try {
          await this.refreshSession();
        } catch (error) {
          if (this.config.enableLogging) {
            console.error("[SessionManager] Auto-refresh failed:", error);
          }
          this.emitSessionEvent("session:refreshError", {error});
        }
      }, msUntilRefresh);

      if (this.config.enableLogging) {
        console.log(`[SessionManager] Auto-refresh scheduled in ${Math.round(msUntilRefresh / 1000)}s`);
      }
    }
  }

  /**
   * Store session in localStorage
   */
  private storeSession(session: UserSession): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const sessionData = {
          session,
          timestamp: Date.now(),
        };
        localStorage.setItem(this.config.storageKey, JSON.stringify(sessionData));
      }
    } catch (error) {
      if (this.config.enableLogging) {
        console.error("[SessionManager] Failed to store session:", error);
      }
    }
  }

  /**
   * Get session from localStorage
   */
  private getStoredSession(): UserSession | null {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const stored = localStorage.getItem(this.config.storageKey);
        if (stored) {
          const sessionData = JSON.parse(stored);
          return sessionData.session;
        }
      }
    } catch (error) {
      if (this.config.enableLogging) {
        console.error("[SessionManager] Failed to get stored session:", error);
      }
    }
    return null;
  }

  /**
   * Remove session from localStorage
   */
  private removeStoredSession(): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem(this.config.storageKey);
      }
    } catch (error) {
      if (this.config.enableLogging) {
        console.error("[SessionManager] Failed to remove stored session:", error);
      }
    }
  }

  /**
   * Set up multi-tab synchronization
   */
  private setupMultiTabSync(): void {
    if (typeof window === "undefined") return;

    this.storageEventListener = (event: StorageEvent) => {
      if (event.key === `${this.config.storageKey}_sync`) {
        try {
          const syncData = JSON.parse(event.newValue || "{}");
          this.handleMultiTabSync(syncData);
        } catch (error) {
          if (this.config.enableLogging) {
            console.error("[SessionManager] Multi-tab sync error:", error);
          }
        }
      }
    };

    window.addEventListener("storage", this.storageEventListener);

    if (this.config.enableLogging) {
      console.log("[SessionManager] Multi-tab sync enabled");
    }
  }

  /**
   * Handle multi-tab sync events
   */
  private handleMultiTabSync(syncData: any): void {
    if (this.config.enableLogging) {
      console.log("[SessionManager] Received multi-tab sync:", syncData);
    }

    switch (syncData.type) {
      case "session_set":
        if (syncData.session) {
          this.state.session = syncData.session;
          this.emitSessionEvent("session:syncedFromTab", {session: syncData.session});
        }
        break;
      case "session_cleared":
        this.state.session = null;
        if (this.state.refreshTimer) {
          clearTimeout(this.state.refreshTimer);
          this.state.refreshTimer = null;
        }
        this.emitSessionEvent("session:syncedFromTab", {session: null});
        break;
    }
  }

  /**
   * Broadcast session changes to other tabs
   */
  private broadcastSessionChange(type: string, session: UserSession | null): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const syncData = {
          type,
          session,
          timestamp: Date.now(),
        };

        // Use a separate key for sync to avoid infinite loops
        localStorage.setItem(`${this.config.storageKey}_sync`, JSON.stringify(syncData));

        // Remove immediately to trigger storage event
        setTimeout(() => {
          localStorage.removeItem(`${this.config.storageKey}_sync`);
        }, 100);
      }
    } catch (error) {
      if (this.config.enableLogging) {
        console.error("[SessionManager] Failed to broadcast session change:", error);
      }
    }
  }

  /**
   * Emit session events through the event emitter
   */
  private emitSessionEvent(event: string, data: any): void {
    try {
      this.eventEmitter.emit(event, data);
    } catch (error) {
      if (this.config.enableLogging) {
        console.error("[SessionManager] Failed to emit session event:", error);
      }
    }
  }

  /**
   * Get current session state
   */
  getSessionState(): {
    hasSession: boolean;
    isRefreshing: boolean;
    lastRefresh: number;
    autoRefreshEnabled: boolean;
  } {
    return {
      hasSession: !!this.state.session,
      isRefreshing: this.state.isRefreshing,
      lastRefresh: this.state.lastRefresh,
      autoRefreshEnabled: this.config.autoRefresh,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SessionStorageConfig>): void {
    this.config = {...this.config, ...newConfig};

    if (this.config.enableLogging) {
      console.log("[SessionManager] Configuration updated:", this.config);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear refresh timer
    if (this.state.refreshTimer) {
      clearTimeout(this.state.refreshTimer);
      this.state.refreshTimer = null;
    }

    // Remove storage event listener
    if (this.storageEventListener && typeof window !== "undefined") {
      window.removeEventListener("storage", this.storageEventListener);
      this.storageEventListener = null;
    }

    if (this.config.enableLogging) {
      console.log("[SessionManager] Destroyed");
    }
  }
}
