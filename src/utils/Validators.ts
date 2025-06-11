import {ErrorHandler, UserManagerErrorType} from "./ErrorHandler.js";

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Email validation options
 */
export interface EmailValidationOptions {
  allowEmpty?: boolean;
  maxLength?: number;
}

/**
 * Password validation options
 */
export interface PasswordValidationOptions {
  minLength?: number;
  maxLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  allowEmpty?: boolean;
}

/**
 * Validation utilities for UserManager
 */
export class Validators {
  // Default password requirements
  private static readonly DEFAULT_PASSWORD_OPTIONS: Required<PasswordValidationOptions> = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    allowEmpty: false,
  };

  // Email regex pattern (RFC 5322 compliant)
  private static readonly EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  /**
   * Validate email address
   */
  static validateEmail(email: string, options: EmailValidationOptions = {}): ValidationResult {
    const errors: string[] = [];
    const {allowEmpty = false, maxLength = 254} = options;

    // Check if empty
    if (!email || email.trim().length === 0) {
      if (!allowEmpty) {
        errors.push("Email is required");
      }
      return {isValid: errors.length === 0, errors};
    }

    const trimmedEmail = email.trim();

    // Check length
    if (trimmedEmail.length > maxLength) {
      errors.push(`Email must be no more than ${maxLength} characters`);
    }

    // Check format
    if (!this.EMAIL_REGEX.test(trimmedEmail)) {
      errors.push("Email format is invalid");
    }

    // Check for common issues
    if (trimmedEmail.includes("..")) {
      errors.push("Email cannot contain consecutive dots");
    }

    if (trimmedEmail.startsWith(".") || trimmedEmail.endsWith(".")) {
      errors.push("Email cannot start or end with a dot");
    }

    return {isValid: errors.length === 0, errors};
  }

  /**
   * Validate password
   */
  static validatePassword(password: string, options: PasswordValidationOptions = {}): ValidationResult {
    const errors: string[] = [];
    const opts = {...this.DEFAULT_PASSWORD_OPTIONS, ...options};

    // Check if empty
    if (!password || password.length === 0) {
      if (!opts.allowEmpty) {
        errors.push("Password is required");
      }
      return {isValid: errors.length === 0, errors};
    }

    // Check length
    if (password.length < opts.minLength) {
      errors.push(`Password must be at least ${opts.minLength} characters long`);
    }

    if (password.length > opts.maxLength) {
      errors.push(`Password must be no more than ${opts.maxLength} characters long`);
    }

    // Check character requirements
    if (opts.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (opts.requireLowercase && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (opts.requireNumbers && !/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (opts.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    // Check for common weak patterns
    if (password.toLowerCase().includes("password")) {
      errors.push("Password cannot contain the word 'password'");
    }

    if (/^(.)\1+$/.test(password)) {
      errors.push("Password cannot be all the same character");
    }

    if (/^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/.test(password.toLowerCase())) {
      errors.push("Password cannot contain common sequential patterns");
    }

    return {isValid: errors.length === 0, errors};
  }

  /**
   * Validate sign up credentials
   */
  static validateSignUpCredentials(email: string, password: string, emailOptions?: EmailValidationOptions, passwordOptions?: PasswordValidationOptions): ValidationResult {
    const errors: string[] = [];

    // Validate email
    const emailResult = this.validateEmail(email, emailOptions);
    if (!emailResult.isValid) {
      errors.push(...emailResult.errors);
    }

    // Validate password
    const passwordResult = this.validatePassword(password, passwordOptions);
    if (!passwordResult.isValid) {
      errors.push(...passwordResult.errors);
    }

    return {isValid: errors.length === 0, errors};
  }

  /**
   * Validate sign in credentials
   */
  static validateSignInCredentials(email: string, password: string): ValidationResult {
    const errors: string[] = [];

    // For sign in, we just check if fields are provided
    if (!email || email.trim().length === 0) {
      errors.push("Email is required");
    }

    if (!password || password.length === 0) {
      errors.push("Password is required");
    }

    return {isValid: errors.length === 0, errors};
  }

  /**
   * Validate URL (for redirects, etc.)
   */
  static validateUrl(url: string, allowEmpty: boolean = false): ValidationResult {
    const errors: string[] = [];

    if (!url || url.trim().length === 0) {
      if (!allowEmpty) {
        errors.push("URL is required");
      }
      return {isValid: errors.length === 0, errors};
    }

    try {
      const urlObj = new URL(url);

      // Only allow http and https protocols
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        errors.push("URL must use http or https protocol");
      }
    } catch {
      errors.push("URL format is invalid");
    }

    return {isValid: errors.length === 0, errors};
  }

  /**
   * Validate user metadata object
   */
  static validateUserMetadata(metadata: Record<string, any>): ValidationResult {
    const errors: string[] = [];

    if (!metadata || typeof metadata !== "object") {
      errors.push("Metadata must be an object");
      return {isValid: false, errors};
    }

    // Check for reserved keys
    const reservedKeys = ["id", "email", "created_at", "updated_at", "email_confirmed_at"];
    for (const key of reservedKeys) {
      if (key in metadata) {
        errors.push(`Metadata cannot contain reserved key: ${key}`);
      }
    }

    // Check for valid JSON serialization
    try {
      JSON.stringify(metadata);
    } catch {
      errors.push("Metadata must be JSON serializable");
    }

    return {isValid: errors.length === 0, errors};
  }

  /**
   * Validate and throw error if validation fails
   */
  static validateAndThrow(validationResult: ValidationResult, field: string): void {
    if (!validationResult.isValid) {
      throw ErrorHandler.handleValidationError(field, validationResult.errors.join(", "));
    }
  }

  /**
   * Sanitize email (trim and lowercase)
   */
  static sanitizeEmail(email: string): string {
    if (!email) return "";
    return email.trim().toLowerCase();
  }

  /**
   * Check password strength (returns score 0-4)
   */
  static getPasswordStrength(password: string): {
    score: number;
    feedback: string[];
  } {
    if (!password) {
      return {score: 0, feedback: ["Password is required"]};
    }

    let score = 0;
    const feedback: string[] = [];

    // Length check
    if (password.length >= 8) {
      score++;
    } else {
      feedback.push("Use at least 8 characters");
    }

    // Character variety checks
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
      score++;
    } else {
      feedback.push("Mix uppercase and lowercase letters");
    }

    if (/\d/.test(password)) {
      score++;
    } else {
      feedback.push("Include numbers");
    }

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score++;
    } else {
      feedback.push("Include special characters");
    }

    // Bonus points for longer passwords
    if (password.length >= 12) {
      score = Math.min(4, score + 1);
    }

    // Penalty for common patterns
    if (password.toLowerCase().includes("password") || /^(.)\1+$/.test(password) || /^(012|123|234|345|456|567|678|789|890)/.test(password)) {
      score = Math.max(0, score - 1);
      feedback.push("Avoid common patterns");
    }

    if (score === 4 && feedback.length === 0) {
      feedback.push("Strong password!");
    }

    return {score, feedback};
  }

  /**
   * Validate configuration object
   */
  static validateConfig(config: any): ValidationResult {
    const errors: string[] = [];

    if (!config || typeof config !== "object") {
      errors.push("Configuration must be an object");
      return {isValid: false, errors};
    }

    // Check required supabase configuration
    if (!config.supabase || typeof config.supabase !== "object") {
      errors.push("supabase configuration is required and must be an object");
      return {isValid: false, errors};
    }

    // Check required supabase fields
    if (!config.supabase.url || typeof config.supabase.url !== "string") {
      errors.push("supabase.url is required and must be a string");
    } else {
      const urlResult = this.validateUrl(config.supabase.url);
      if (!urlResult.isValid) {
        errors.push("supabase.url must be a valid URL");
      }
    }

    if (!config.supabase.anonKey || typeof config.supabase.anonKey !== "string") {
      errors.push("supabase.anonKey is required and must be a string");
    }

    // Validate optional supabase options
    if (config.supabase.options && typeof config.supabase.options !== "object") {
      errors.push("supabase.options must be an object");
    }

    // Validate optional fields
    if (config.events && typeof config.events !== "object") {
      errors.push("events configuration must be an object");
    }

    if (config.session && typeof config.session !== "object") {
      errors.push("session configuration must be an object");
    }

    if (config.status && typeof config.status !== "object") {
      errors.push("status configuration must be an object");
    }

    return {isValid: errors.length === 0, errors};
  }
}
