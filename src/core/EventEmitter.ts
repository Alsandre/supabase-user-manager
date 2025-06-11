import type {EventListener, EventEmitterConfig} from "@/types";

/**
 * Custom EventEmitter class
 * This is a placeholder that will be fully implemented in Phase 2
 */
export class EventEmitter {
  private listeners: Map<string, EventListener[]> = new Map();
  private config: EventEmitterConfig;

  constructor(config: EventEmitterConfig = {}) {
    this.config = {
      maxListeners: 10,
      enableLogging: false,
      logPrefix: "[UserManager]",
      ...config,
    };
  }

  /**
   * Add event listener
   */
  on<T>(event: string, listener: EventListener<T>): void {
    // TODO: Implement in Phase 2
    console.log(`${this.config.logPrefix} Adding listener for event: ${event}`);
  }

  /**
   * Remove event listener
   */
  off<T>(event: string, listener: EventListener<T>): void {
    // TODO: Implement in Phase 2
    console.log(`${this.config.logPrefix} Removing listener for event: ${event}`);
  }

  /**
   * Emit event
   */
  emit<T>(event: string, data: T): void {
    // TODO: Implement in Phase 2
    console.log(`${this.config.logPrefix} Emitting event: ${event}`, data);
  }

  /**
   * Remove all listeners for an event or all events
   */
  removeAllListeners(event?: string): void {
    // TODO: Implement in Phase 2
    console.log(`${this.config.logPrefix} Removing all listeners${event ? ` for ${event}` : ""}`);
  }
}
