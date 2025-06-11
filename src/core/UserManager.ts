import type {UserManagerConfig} from "../types/Config";
import type {SupabaseUser, UserSession, UserStatus, UserStatusType} from "../types/User";
import type {UserManagerEvents, UserManagerEventName, EventData} from "../types/Events";
import type {SignUpCredentials, SignInCredentials, PasswordResetRequest} from "../types/Auth";
import {EventEmitter} from "./EventEmitter";
import {createClient, type SupabaseClient} from "@supabase/supabase-js";
import {ErrorHandler, UserManagerError, UserManagerErrorType, type OperationResult} from "../utils/ErrorHandler";
import {Validators} from "../utils/Validators";
import {EmailAuthService} from "../services/EmailAuthService";

/**
 * Main UserManager class - Singleton pattern
 * Orchestrates all user management functionality
 */
export class UserManager {
  private static instance: UserManager | null = null;
  private config: UserManagerConfig;
  private eventEmitter: EventEmitter;
  private supabase: SupabaseClient;
  private emailAuthService: EmailAuthService;
  private isInitialized: boolean = false;
  private currentUser: SupabaseUser | null = null;
  private currentSession: UserSession | null = null;
  private currentStatus: UserStatus | null = null;

  private constructor(config: UserManagerConfig) {
    // Validate configuration before proceeding
    const configValidation = Validators.validateConfig(config);
    if (!configValidation.isValid) {
      throw ErrorHandler.createError(UserManagerErrorType.CONFIGURATION_ERROR, `Invalid UserManager configuration: ${configValidation.errors.join(", ")}`, {details: {errors: configValidation.errors}});
    }

    this.config = config;

    // Configure error handler
    ErrorHandler.configure({
      enableLogging: config.events?.enableLogging || false,
      logPrefix: "[UserManager]",
    });

    this.eventEmitter = new EventEmitter({
      maxListeners: config.events?.maxListeners || 50,
      enableLogging: config.events?.enableLogging || false,
      logPrefix: "[UserManager]",
    });

    // Initialize Supabase client with error handling
    try {
      this.supabase = createClient(config.supabase.url, config.supabase.anonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      });

      // Initialize EmailAuthService
      this.emailAuthService = new EmailAuthService(this.supabase, {
        enableLogging: config.events?.enableLogging || false,
      });
    } catch (error) {
      throw ErrorHandler.createError(UserManagerErrorType.INITIALIZATION_ERROR, "Failed to initialize Supabase client", {
        originalError: error as Error,
        details: {
          supabaseUrl: config.supabase.url,
          hasAnonKey: !!config.supabase.anonKey,
        },
      });
    }
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
  async initialize(): Promise<OperationResult<void>> {
    if (this.isInitialized) {
      if (this.config.events?.enableLogging) {
        console.warn("[UserManager] Already initialized");
      }
      return {success: true};
    }

    return await ErrorHandler.wrapOperation(
      async () => {
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
          const userManagerError = ErrorHandler.handleAuthError(error, "getInitialSession");
          this.emit("error:general", {
            message: userManagerError.getUserMessage(),
            error: userManagerError,
          });
          throw userManagerError;
        }

        if (session) {
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
      },
      UserManagerErrorType.INITIALIZATION_ERROR,
      "initialize"
    );
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

  // Authentication Methods
  /**
   * Sign up a new user with email and password
   */
  async signUp(credentials: SignUpCredentials): Promise<OperationResult<{user: SupabaseUser | null; session: UserSession | null}>> {
    this.validateReady();

    return await ErrorHandler.wrapOperation(
      async () => {
        this.emit("user:loading", {isLoading: true});

        const result = await this.emailAuthService.signUp(credentials);

        if (result.success && result.data) {
          // Update internal state
          if (result.data.session) {
            this.currentSession = result.data.session;
            this.currentUser = result.data.user;
            this.emit("auth:signedIn", {user: result.data.user, session: result.data.session});
            this.emit("session:started", {session: result.data.session});
          } else if (result.data.user) {
            // User created but needs email verification
            this.emit("auth:signUpComplete", {user: result.data.user, needsVerification: true});
          }

          this.emit("user:loading", {isLoading: false});
          return result.data;
        }

        throw result.error || ErrorHandler.createError(UserManagerErrorType.AUTH_ERROR, "Sign up failed");
      },
      UserManagerErrorType.AUTH_ERROR,
      "signUp"
    );
  }

  /**
   * Sign in an existing user with email and password
   */
  async signIn(credentials: SignInCredentials): Promise<OperationResult<{user: SupabaseUser; session: UserSession}>> {
    this.validateReady();

    return await ErrorHandler.wrapOperation(
      async () => {
        this.emit("user:loading", {isLoading: true});

        const result = await this.emailAuthService.signIn(credentials);

        if (result.success && result.data) {
          // Update internal state
          this.currentSession = result.data.session;
          this.currentUser = result.data.user;

          this.emit("auth:signedIn", {user: result.data.user, session: result.data.session});
          this.emit("session:started", {session: result.data.session});
          this.emit("user:loading", {isLoading: false});

          return result.data;
        }

        this.emit("user:loading", {isLoading: false});
        throw result.error || ErrorHandler.createError(UserManagerErrorType.AUTH_ERROR, "Sign in failed");
      },
      UserManagerErrorType.AUTH_ERROR,
      "signIn"
    );
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<OperationResult<void>> {
    this.validateReady();

    return await ErrorHandler.wrapOperation(
      async () => {
        const previousUser = this.currentUser;

        const result = await this.emailAuthService.signOut();

        if (result.success) {
          // Clear internal state
          this.currentSession = null;
          this.currentUser = null;
          this.currentStatus = null;

          this.emit("auth:signedOut", {user: previousUser});
          this.emit("session:ended", {reason: "logout"});

          return;
        }

        throw result.error || ErrorHandler.createError(UserManagerErrorType.AUTH_ERROR, "Sign out failed");
      },
      UserManagerErrorType.AUTH_ERROR,
      "signOut"
    );
  }

  /**
   * Send password reset email
   */
  async resetPassword(request: PasswordResetRequest): Promise<OperationResult<void>> {
    this.validateReady();

    return await ErrorHandler.wrapOperation(
      async () => {
        const result = await this.emailAuthService.resetPassword(request);

        if (result.success) {
          this.emit("auth:passwordResetSent", {email: request.email});
          return;
        }

        throw result.error || ErrorHandler.createError(UserManagerErrorType.AUTH_ERROR, "Password reset failed");
      },
      UserManagerErrorType.AUTH_ERROR,
      "resetPassword"
    );
  }

  /**
   * Update user password (requires active session)
   */
  async updatePassword(newPassword: string): Promise<OperationResult<SupabaseUser>> {
    this.validateReady();

    if (!this.isAuthenticated()) {
      throw ErrorHandler.createError(UserManagerErrorType.AUTH_ERROR, "User must be authenticated to update password");
    }

    return await ErrorHandler.wrapOperation(
      async () => {
        const result = await this.emailAuthService.updatePassword(newPassword);

        if (result.success && result.data) {
          this.currentUser = result.data;
          this.emit("auth:passwordUpdated", {user: result.data});
          return result.data;
        }

        throw result.error || ErrorHandler.createError(UserManagerErrorType.AUTH_ERROR, "Password update failed");
      },
      UserManagerErrorType.AUTH_ERROR,
      "updatePassword"
    );
  }

  /**
   * Resend email verification
   */
  async resendVerification(email: string): Promise<OperationResult<void>> {
    this.validateReady();

    return await ErrorHandler.wrapOperation(
      async () => {
        const result = await this.emailAuthService.resendVerification(email);

        if (result.success) {
          this.emit("auth:verificationResent", {email});
          return;
        }

        throw result.error || ErrorHandler.createError(UserManagerErrorType.VERIFICATION_ERROR, "Failed to resend verification email");
      },
      UserManagerErrorType.VERIFICATION_ERROR,
      "resendVerification"
    );
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<OperationResult<{user: SupabaseUser; session: UserSession}>> {
    this.validateReady();

    return await ErrorHandler.wrapOperation(
      async () => {
        const result = await this.emailAuthService.refreshSession();

        if (result.success && result.data) {
          this.currentSession = result.data.session;
          this.currentUser = result.data.user;

          this.emit("auth:sessionRefreshed", {session: result.data.session});
          this.emit("session:refreshed", {session: result.data.session});

          return result.data;
        }

        throw result.error || ErrorHandler.createError(UserManagerErrorType.SESSION_ERROR, "Session refresh failed");
      },
      UserManagerErrorType.SESSION_ERROR,
      "refreshSession"
    );
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
   * Validate and update configuration
   */
  updateConfig(newConfig: Partial<UserManagerConfig>): OperationResult<UserManagerConfig> {
    try {
      const mergedConfig = {...this.config, ...newConfig};
      const validation = Validators.validateConfig(mergedConfig);

      if (!validation.isValid) {
        throw ErrorHandler.createError(UserManagerErrorType.CONFIGURATION_ERROR, `Invalid configuration update: ${validation.errors.join(", ")}`, {details: {errors: validation.errors}});
      }

      this.config = mergedConfig;

      // Reconfigure error handler if logging settings changed
      if (newConfig.events?.enableLogging !== undefined) {
        ErrorHandler.configure({
          enableLogging: this.config.events?.enableLogging || false,
          logPrefix: "[UserManager]",
        });
      }

      if (this.config.events?.enableLogging) {
        console.log("[UserManager] Configuration updated successfully");
      }

      return {success: true, data: this.config};
    } catch (error) {
      if (error instanceof UserManagerError) {
        return {success: false, error};
      }

      const userManagerError = ErrorHandler.createError(UserManagerErrorType.CONFIGURATION_ERROR, "Failed to update configuration", {originalError: error as Error});

      return {success: false, error: userManagerError};
    }
  }

  /**
   * Get comprehensive user state with error handling
   */
  getUserState(): OperationResult<{
    user: SupabaseUser | null;
    session: UserSession | null;
    status: UserStatus | null;
    isAuthenticated: boolean;
    isReady: boolean;
  }> {
    try {
      const state = {
        user: this.currentUser,
        session: this.currentSession,
        status: this.currentStatus,
        isAuthenticated: this.isAuthenticated(),
        isReady: this.isReady(),
      };

      return {success: true, data: state};
    } catch (error) {
      const userManagerError = ErrorHandler.createError(UserManagerErrorType.OPERATION_FAILED, "Failed to get user state", {originalError: error as Error});

      return {success: false, error: userManagerError};
    }
  }

  /**
   * Safely emit events with error handling
   */
  private safeEmit<T extends UserManagerEventName>(event: T, data: EventData<T>): void {
    try {
      this.eventEmitter.emit(event, data);
    } catch (error) {
      const userManagerError = ErrorHandler.createError(UserManagerErrorType.OPERATION_FAILED, `Failed to emit event: ${event}`, {
        originalError: error as Error,
        details: {event, dataKeys: Object.keys(data || {})},
      });

      ErrorHandler.logError(userManagerError, "safeEmit");

      // Emit error event if it's not already an error event to avoid infinite loops
      if (!event.startsWith("error:")) {
        try {
          this.eventEmitter.emit("error:general", {
            message: userManagerError.getUserMessage(),
            error: userManagerError,
          });
        } catch {
          // If even error emission fails, just log to console
          console.error("[UserManager] Critical error: Failed to emit error event", userManagerError.toJSON());
        }
      }
    }
  }

  /**
   * Enhanced emit method that replaces the private emit
   */
  private emit<T extends UserManagerEventName>(event: T, data: EventData<T>): void {
    this.safeEmit(event, data);
  }

  /**
   * Validate UserManager is ready for operations
   */
  private validateReady(): void {
    if (!this.isInitialized) {
      throw ErrorHandler.createError(UserManagerErrorType.INITIALIZATION_ERROR, "UserManager must be initialized before performing operations", {details: {isInitialized: this.isInitialized}});
    }
  }

  /**
   * Get error handler instance for external use
   */
  getErrorHandler(): typeof ErrorHandler {
    return ErrorHandler;
  }

  /**
   * Get validators instance for external use
   */
  getValidators(): typeof Validators {
    return Validators;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static reset(): void {
    UserManager.instance = null;
  }
}
