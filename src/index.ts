// Main library entry point
export * from "./types";
export * from "./core/UserManager";
export {EventEmitter} from "./core/EventEmitter";

// Export utilities
export {ErrorHandler, UserManagerError, UserManagerErrorType} from "./utils/ErrorHandler";
export {Validators} from "./utils/Validators";
export type {OperationResult} from "./utils/ErrorHandler";
export type {ValidationResult, EmailValidationOptions, PasswordValidationOptions} from "./utils/Validators";

export * from "./services/EmailAuthService";
export * from "./services/SessionManager";
export * from "./services/UserStatusService";

// Default export for convenience
export {UserManager as default} from "./core/UserManager";
