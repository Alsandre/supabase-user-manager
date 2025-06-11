import type {SupabaseClient} from "@supabase/supabase-js";
import type {SignUpCredentials, SignInCredentials, PasswordResetRequest, AuthResult} from "../types/Auth";
import type {SupabaseUser, UserSession} from "../types/User";
import {ErrorHandler, UserManagerError, UserManagerErrorType, type OperationResult} from "../utils/ErrorHandler";
import {Validators} from "../utils/Validators";

/**
 * EmailAuthService - Handles email/password authentication with Supabase
 * Provides comprehensive authentication functionality with error handling
 */
export class EmailAuthService {
  private supabase: SupabaseClient;
  private enableLogging: boolean;

  constructor(supabase: SupabaseClient, options?: {enableLogging?: boolean}) {
    this.supabase = supabase;
    this.enableLogging = options?.enableLogging || false;

    if (this.enableLogging) {
      console.log("[EmailAuthService] Initialized");
    }
  }

  /**
   * Sign up a new user with email and password
   * Sends email verification if configured
   */
  async signUp(credentials: SignUpCredentials): Promise<OperationResult<{user: SupabaseUser | null; session: UserSession | null}>> {
    return await ErrorHandler.wrapOperation(
      async () => {
        // Validate input
        const emailValidation = Validators.validateEmail(credentials.email);
        if (!emailValidation.isValid) {
          throw ErrorHandler.createError(UserManagerErrorType.VALIDATION_ERROR, `Invalid email: ${emailValidation.errors.join(", ")}`, {details: {field: "email", errors: emailValidation.errors}});
        }

        const passwordValidation = Validators.validatePassword(credentials.password);
        if (!passwordValidation.isValid) {
          throw ErrorHandler.createError(UserManagerErrorType.VALIDATION_ERROR, `Invalid password: ${passwordValidation.errors.join(", ")}`, {details: {field: "password", errors: passwordValidation.errors}});
        }

        if (this.enableLogging) {
          console.log("[EmailAuthService] Signing up user:", credentials.email);
        }

        // Attempt sign up
        const {data, error} = await this.supabase.auth.signUp({
          email: credentials.email,
          password: credentials.password,
          options: credentials.options,
        });

        if (error) {
          throw ErrorHandler.handleAuthError(error, "signUp");
        }

        if (this.enableLogging) {
          console.log("[EmailAuthService] Sign up successful:", {
            email: credentials.email,
            needsVerification: !data.session && data.user && !data.user.email_confirmed_at,
          });
        }

        return {
          user: data.user,
          session: data.session,
        };
      },
      UserManagerErrorType.AUTH_ERROR,
      "signUp"
    );
  }

  /**
   * Sign in an existing user with email and password
   */
  async signIn(credentials: SignInCredentials): Promise<OperationResult<{user: SupabaseUser; session: UserSession}>> {
    return await ErrorHandler.wrapOperation(
      async () => {
        // Validate input
        const emailValidation = Validators.validateEmail(credentials.email);
        if (!emailValidation.isValid) {
          throw ErrorHandler.createError(UserManagerErrorType.VALIDATION_ERROR, `Invalid email: ${emailValidation.errors.join(", ")}`, {details: {field: "email", errors: emailValidation.errors}});
        }

        if (!credentials.password || credentials.password.length === 0) {
          throw ErrorHandler.createError(UserManagerErrorType.VALIDATION_ERROR, "Password is required", {details: {field: "password"}});
        }

        if (this.enableLogging) {
          console.log("[EmailAuthService] Signing in user:", credentials.email);
        }

        // Attempt sign in
        const {data, error} = await this.supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
          options: credentials.options,
        });

        if (error) {
          throw ErrorHandler.handleAuthError(error, "signIn");
        }

        if (!data.user || !data.session) {
          throw ErrorHandler.createError(UserManagerErrorType.AUTH_ERROR, "Sign in failed - no user or session returned", {details: {email: credentials.email}});
        }

        if (this.enableLogging) {
          console.log("[EmailAuthService] Sign in successful:", credentials.email);
        }

        return {
          user: data.user,
          session: data.session,
        };
      },
      UserManagerErrorType.AUTH_ERROR,
      "signIn"
    );
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<OperationResult<void>> {
    return await ErrorHandler.wrapOperation(
      async () => {
        if (this.enableLogging) {
          console.log("[EmailAuthService] Signing out user");
        }

        const {error} = await this.supabase.auth.signOut();

        if (error) {
          throw ErrorHandler.handleAuthError(error, "signOut");
        }

        if (this.enableLogging) {
          console.log("[EmailAuthService] Sign out successful");
        }
      },
      UserManagerErrorType.AUTH_ERROR,
      "signOut"
    );
  }

  /**
   * Send password reset email
   */
  async resetPassword(request: PasswordResetRequest): Promise<OperationResult<void>> {
    return await ErrorHandler.wrapOperation(
      async () => {
        // Validate email
        const emailValidation = Validators.validateEmail(request.email);
        if (!emailValidation.isValid) {
          throw ErrorHandler.createError(UserManagerErrorType.VALIDATION_ERROR, `Invalid email: ${emailValidation.errors.join(", ")}`, {details: {field: "email", errors: emailValidation.errors}});
        }

        if (this.enableLogging) {
          console.log("[EmailAuthService] Sending password reset email:", request.email);
        }

        const {error} = await this.supabase.auth.resetPasswordForEmail(request.email, {
          redirectTo: request.options?.redirectTo,
          captchaToken: request.options?.captchaToken,
        });

        if (error) {
          throw ErrorHandler.handleAuthError(error, "resetPassword");
        }

        if (this.enableLogging) {
          console.log("[EmailAuthService] Password reset email sent:", request.email);
        }
      },
      UserManagerErrorType.AUTH_ERROR,
      "resetPassword"
    );
  }

  /**
   * Update user password (requires active session)
   */
  async updatePassword(newPassword: string): Promise<OperationResult<SupabaseUser>> {
    return await ErrorHandler.wrapOperation(
      async () => {
        // Validate password
        const passwordValidation = Validators.validatePassword(newPassword);
        if (!passwordValidation.isValid) {
          throw ErrorHandler.createError(UserManagerErrorType.VALIDATION_ERROR, `Invalid password: ${passwordValidation.errors.join(", ")}`, {details: {field: "password", errors: passwordValidation.errors}});
        }

        if (this.enableLogging) {
          console.log("[EmailAuthService] Updating user password");
        }

        const {data, error} = await this.supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          throw ErrorHandler.handleAuthError(error, "updatePassword");
        }

        if (!data.user) {
          throw ErrorHandler.createError(UserManagerErrorType.AUTH_ERROR, "Password update failed - no user returned", {});
        }

        if (this.enableLogging) {
          console.log("[EmailAuthService] Password updated successfully");
        }

        return data.user;
      },
      UserManagerErrorType.AUTH_ERROR,
      "updatePassword"
    );
  }

  /**
   * Resend email verification
   */
  async resendVerification(email: string): Promise<OperationResult<void>> {
    return await ErrorHandler.wrapOperation(
      async () => {
        // Validate email
        const emailValidation = Validators.validateEmail(email);
        if (!emailValidation.isValid) {
          throw ErrorHandler.createError(UserManagerErrorType.VALIDATION_ERROR, `Invalid email: ${emailValidation.errors.join(", ")}`, {details: {field: "email", errors: emailValidation.errors}});
        }

        if (this.enableLogging) {
          console.log("[EmailAuthService] Resending verification email:", email);
        }

        const {error} = await this.supabase.auth.resend({
          type: "signup",
          email: email,
        });

        if (error) {
          throw ErrorHandler.handleAuthError(error, "resendVerification");
        }

        if (this.enableLogging) {
          console.log("[EmailAuthService] Verification email resent:", email);
        }
      },
      UserManagerErrorType.VERIFICATION_ERROR,
      "resendVerification"
    );
  }

  /**
   * Get current session
   */
  async getCurrentSession(): Promise<OperationResult<UserSession | null>> {
    return await ErrorHandler.wrapOperation(
      async () => {
        const {data, error} = await this.supabase.auth.getSession();

        if (error) {
          throw ErrorHandler.handleAuthError(error, "getCurrentSession");
        }

        return data.session;
      },
      UserManagerErrorType.SESSION_ERROR,
      "getCurrentSession"
    );
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<OperationResult<SupabaseUser | null>> {
    return await ErrorHandler.wrapOperation(
      async () => {
        const {data, error} = await this.supabase.auth.getUser();

        if (error) {
          throw ErrorHandler.handleAuthError(error, "getCurrentUser");
        }

        return data.user;
      },
      UserManagerErrorType.AUTH_ERROR,
      "getCurrentUser"
    );
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<OperationResult<{user: SupabaseUser; session: UserSession}>> {
    return await ErrorHandler.wrapOperation(
      async () => {
        if (this.enableLogging) {
          console.log("[EmailAuthService] Refreshing session");
        }

        const {data, error} = await this.supabase.auth.refreshSession();

        if (error) {
          throw ErrorHandler.handleAuthError(error, "refreshSession");
        }

        if (!data.user || !data.session) {
          throw ErrorHandler.createError(UserManagerErrorType.SESSION_ERROR, "Session refresh failed - no user or session returned", {});
        }

        if (this.enableLogging) {
          console.log("[EmailAuthService] Session refreshed successfully");
        }

        return {
          user: data.user,
          session: data.session,
        };
      },
      UserManagerErrorType.SESSION_ERROR,
      "refreshSession"
    );
  }
}
