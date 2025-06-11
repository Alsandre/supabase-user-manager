// Main library entry point
export * from "./types";
export * from "./core/UserManager";
export {EventEmitter} from "./core/EventEmitter";
export * from "./services/EmailAuthService";
export * from "./services/SessionManager";
export * from "./services/UserStatusService";

// Default export for convenience
export {UserManager as default} from "./core/UserManager";
