import type {UserManagerConfig} from "@/types";

/**
 * Main UserManager class - Singleton pattern
 * This is a placeholder that will be fully implemented in Phase 2
 */
export class UserManager {
  private static instance: UserManager | null = null;
  private config: UserManagerConfig;

  private constructor(config: UserManagerConfig) {
    this.config = config;
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
   * Placeholder method - will be implemented in Phase 2
   */
  async initialize(): Promise<void> {
    console.log("UserManager initialized with config:", this.config);
    // TODO: Implement initialization logic in Phase 2
  }
}
