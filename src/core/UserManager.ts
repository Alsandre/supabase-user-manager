import type {UserManagerConfig, SupabaseUser, UserSession, UserStatus, UserManagerEvents, UserManagerEventName, EventData} from "@/types";
import {EventEmitter} from "./EventEmitter";
import {createClient, type SupabaseClient} from "@supabase/supabase-js";

/**
 * Main UserManager class - Singleton pattern
 * Orchestrates all user management functionality
 */
export class UserManager {
  private static instance: UserManager | null = null;
  private config: UserManagerConfig;
  private eventEmitter: EventEmitter;
  private supabase: SupabaseClient;
  private isInitialized: boolean = false;
  private currentUser: SupabaseUser | null = null;
  private currentSession: UserSession | null = null;
  private currentStatus: UserStatus | null = null;

  private constructor(config: UserManagerConfig) {
    this.config = config;
    this.eventEmitter = new EventEmitter({
      maxListeners: config.events?.maxListeners || 50,
      enableLogging: config.events?.enableLogging || false,
      logPrefix: "[UserManager]",
    });

    // Initialize Supabase client
    this.supabase = createClient(config.supabase.url, config.supabase.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }

  /**
   * Get or create the UserManager singleton instance
   */
  static getInstance(config?: UserManagerConfig): UserManager {
    if (!UserManager.instance) {
      if (!config) {
        throw new Error("UserManager must be initialized with config on first call");
      }
      UserManager.instance = new UserManager(config);
    }
    return UserManager.instance;
  }

  /**
   * Initialize the UserManager (alias for getInstance)
   */
  static init(config: UserManagerConfig): UserManager {
    return UserManager.getInstance(config);
  }

  /**
   * Get the current configuration
   */
  getConfig(): UserManagerConfig {
    return this.config;
  }

  /**
   * Initialize the UserManager and set up auth state listener
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn("[UserManager] Already initialized");
      return;
    }

    try {
      // Set up auth state change listener
      this.supabase.auth.onAuthStateChange((event, session) => {
        this.handleAuthStateChange(event, session);
      });

      // Get initial session
      const {
        data: {session},
        error,
      } = await this.supabase.auth.getSession();
      if (error) {
        console.error("[UserManager] Error getting initial session:", error);
        this.emit("error:general", {message: "Failed to get initial session", error});
      } else if (session) {
        this.currentSession = session;
        this.currentUser = session.user;
        this.emit("session:started", {session});
      }

      this.isInitialized = true;
      this.emit("user:loading", {isLoading: false});

      if (this.config.events?.enableLogging) {
        console.log("[UserManager] Initialized successfully", {
          hasSession: !!session,
          user: session?.user?.email,
        });
      }
    } catch (error) {
      console.error("[UserManager] Initialization failed:", error);
      this.emit("error:general", {message: "UserManager initialization failed", error: error as Error});
      throw error;
    }
  }

  /**
   * Handle Supabase auth state changes
   */
  private handleAuthStateChange(event: string, session: any): void {
    if (this.config.events?.enableLogging) {
      console.log("[UserManager] Auth state change:", event, session?.user?.email);
    }

    switch (event) {
      case "SIGNED_IN":
        this.currentSession = session;
        this.currentUser = session.user;
        this.emit("auth:signedIn", {user: session.user, session});
        this.emit("session:started", {session});
        break;

      case "SIGNED_OUT":
        const previousUser = this.currentUser;
        this.currentSession = null;
        this.currentUser = null;
        this.currentStatus = null;
        this.emit("auth:signedOut", {user: previousUser});
        this.emit("session:ended", {reason: "logout"});
        break;

      case "TOKEN_REFRESHED":
        this.currentSession = session;
        this.emit("auth:sessionRefreshed", {session});
        this.emit("session:refreshed", {session});
        break;

      case "USER_UPDATED":
        this.currentUser = session.user;
        this.emit("user:stateChanged", {
          user: this.currentUser,
          session: this.currentSession,
          status: this.currentStatus,
          isAuthenticated: !!this.currentUser,
        });
        break;
    }

    // Always emit state change
    this.emit("user:stateChanged", {
      user: this.currentUser,
      session: this.currentSession,
      status: this.currentStatus,
      isAuthenticated: !!this.currentUser,
    });
  }

  // Event System Methods
  /**
   * Add event listener
   */
  on<T extends UserManagerEventName>(event: T, listener: (data: EventData<T>) => void): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Remove event listener
   */
  off<T extends UserManagerEventName>(event: T, listener: (data: EventData<T>) => void): void {
    this.eventEmitter.off(event, listener);
  }

  /**
   * Add one-time event listener
   */
  once<T extends UserManagerEventName>(event: T, listener: (data: EventData<T>) => void): void {
    this.eventEmitter.once(event, listener);
  }

  /**
   * Emit event (internal use)
   */
  private emit<T extends UserManagerEventName>(event: T, data: EventData<T>): void {
    this.eventEmitter.emit(event, data);
  }

  // Getters
  /**
   * Get current user
   */
  getCurrentUser(): SupabaseUser | null {
    return this.currentUser;
  }

  /**
   * Get current session
   */
  getCurrentSession(): UserSession | null {
    return this.currentSession;
  }

  /**
   * Get current user status
   */
  getCurrentStatus(): UserStatus | null {
    return this.currentStatus;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentUser && !!this.currentSession;
  }

  /**
   * Check if UserManager is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get Supabase client (for advanced usage)
   */
  getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static reset(): void {
    UserManager.instance = null;
  }
}
