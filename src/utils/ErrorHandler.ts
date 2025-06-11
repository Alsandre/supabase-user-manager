import type {AuthError} from "@supabase/supabase-js";

/**
 * Custom error types for UserManager
 */
export enum UserManagerErrorType {
  // Configuration errors
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  INITIALIZATION_ERROR = "INITIALIZATION_ERROR",

  // Authentication errors
  AUTH_ERROR = "AUTH_ERROR",
  SESSION_ERROR = "SESSION_ERROR",
  VERIFICATION_ERROR = "VERIFICATION_ERROR",

  // Network errors
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",

  // Validation errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",

  // Database errors
  DATABASE_ERROR = "DATABASE_ERROR",

  // Status errors
  STATUS_ERROR = "STATUS_ERROR",
  PERMISSION_ERROR = "PERMISSION_ERROR",

  // General errors
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  OPERATION_FAILED = "OPERATION_FAILED",
}

/**
 * UserManager specific error class
 */
export class UserManagerError extends Error {
  public readonly type: UserManagerErrorType;
  public readonly code?: string;
  public readonly details?: Record<string, any>;
  public readonly originalError?: Error;
  public readonly timestamp: Date;

  constructor(
    type: UserManagerErrorType,
    message: string,
    options?: {
      code?: string;
      details?: Record<string, any>;
      originalError?: Error;
    }
  ) {
    super(message);
    this.name = "UserManagerError";
    this.type = type;
    this.code = options?.code;
    this.details = options?.details;
    this.originalError = options?.originalError;
    this.timestamp = new Date();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UserManagerError);
    }
  }

  /**
   * Convert to JSON for logging/serialization
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      originalError: this.originalError
        ? {
            name: this.originalError.name,
            message: this.originalError.message,
            stack: this.originalError.stack,
          }
        : undefined,
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.type) {
      case UserManagerErrorType.CONFIGURATION_ERROR:
        return "Configuration error. Please check your setup.";
      case UserManagerErrorType.AUTH_ERROR:
        return "Authentication failed. Please check your credentials.";
      case UserManagerErrorType.NETWORK_ERROR:
        return "Network error. Please check your connection.";
      case UserManagerErrorType.VALIDATION_ERROR:
        return "Invalid input. Please check your data.";
      case UserManagerErrorType.PERMISSION_ERROR:
        return "Permission denied. You don't have access to this resource.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  }
}

/**
 * Result wrapper for operations that can fail
 */
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: UserManagerError;
}

/**
 * Error handler utility class
 */
export class ErrorHandler {
  private static enableLogging: boolean = false;
  private static logPrefix: string = "[UserManager]";

  /**
   * Configure error handler
   */
  static configure(options: {enableLogging?: boolean; logPrefix?: string}) {
    this.enableLogging = options.enableLogging ?? false;
    this.logPrefix = options.logPrefix ?? "[UserManager]";
  }

  /**
   * Create a UserManagerError from various error sources
   */
  static createError(
    type: UserManagerErrorType,
    message: string,
    options?: {
      code?: string;
      details?: Record<string, any>;
      originalError?: Error | AuthError;
    }
  ): UserManagerError {
    const error = new UserManagerError(type, message, options);

    if (this.enableLogging) {
      console.error(`${this.logPrefix} Error created:`, error.toJSON());
    }

    return error;
  }

  /**
   * Handle Supabase AuthError
   */
  static handleAuthError(authError: AuthError, operation?: string): UserManagerError {
    const details = {
      operation: operation || "unknown",
      supabaseError: {
        message: authError.message,
        status: authError.status,
      },
    };

    // Map common Supabase errors to our error types
    let type = UserManagerErrorType.AUTH_ERROR;
    let message = authError.message;

    if (authError.message.includes("Invalid login credentials")) {
      message = "Invalid email or password";
    } else if (authError.message.includes("Email not confirmed")) {
      type = UserManagerErrorType.VERIFICATION_ERROR;
      message = "Please verify your email address";
    } else if (authError.message.includes("User already registered")) {
      message = "An account with this email already exists";
    } else if (authError.message.includes("Password should be")) {
      type = UserManagerErrorType.VALIDATION_ERROR;
      message = "Password does not meet requirements";
    }

    return this.createError(type, message, {
      code: authError.status?.toString(),
      details,
      originalError: authError,
    });
  }

  /**
   * Handle network errors
   */
  static handleNetworkError(error: Error, operation?: string): UserManagerError {
    return this.createError(UserManagerErrorType.NETWORK_ERROR, "Network request failed", {
      details: {operation: operation || "unknown"},
      originalError: error,
    });
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(field: string, message: string): UserManagerError {
    return this.createError(UserManagerErrorType.VALIDATION_ERROR, `Validation failed for ${field}: ${message}`, {
      details: {field, validationMessage: message},
    });
  }

  /**
   * Wrap operation in try-catch and return OperationResult
   */
  static async wrapOperation<T>(operation: () => Promise<T>, errorType: UserManagerErrorType = UserManagerErrorType.OPERATION_FAILED, operationName?: string): Promise<OperationResult<T>> {
    try {
      const data = await operation();
      return {success: true, data};
    } catch (error) {
      let userManagerError: UserManagerError;

      if (error instanceof UserManagerError) {
        userManagerError = error;
      } else if (error && typeof error === "object" && "message" in error) {
        // Handle Supabase AuthError
        if ("status" in error) {
          userManagerError = this.handleAuthError(error as AuthError, operationName);
        } else {
          userManagerError = this.createError(errorType, (error as Error).message, {
            details: {operation: operationName},
            originalError: error as Error,
          });
        }
      } else {
        userManagerError = this.createError(errorType, "Unknown error occurred", {
          details: {operation: operationName, error: String(error)},
        });
      }

      return {success: false, error: userManagerError};
    }
  }

  /**
   * Log error (if logging is enabled)
   */
  static logError(error: UserManagerError, context?: string): void {
    if (this.enableLogging) {
      console.error(`${this.logPrefix} ${context ? `[${context}] ` : ""}Error:`, error.toJSON());
    }
  }

  /**
   * Check if error is of specific type
   */
  static isErrorType(error: any, type: UserManagerErrorType): boolean {
    return error instanceof UserManagerError && error.type === type;
  }

  /**
   * Get error summary for user display
   */
  static getErrorSummary(error: UserManagerError): {
    type: string;
    message: string;
    userMessage: string;
    code?: string;
  } {
    return {
      type: error.type,
      message: error.message,
      userMessage: error.getUserMessage(),
      code: error.code,
    };
  }
}
