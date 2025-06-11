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
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const eventListeners = this.listeners.get(event)!;

    // Check max listeners limit
    if (eventListeners.length >= this.config.maxListeners!) {
      console.warn(`${this.config.logPrefix} Max listeners (${this.config.maxListeners}) exceeded for event: ${event}`);
    }

    eventListeners.push(listener);

    if (this.config.enableLogging) {
      console.log(`${this.config.logPrefix} Added listener for event: ${event} (total: ${eventListeners.length})`);
    }
  }

  /**
   * Remove event listener
   */
  off<T>(event: string, listener: EventListener<T>): void {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) {
      return;
    }

    const index = eventListeners.indexOf(listener);
    if (index > -1) {
      eventListeners.splice(index, 1);

      if (this.config.enableLogging) {
        console.log(`${this.config.logPrefix} Removed listener for event: ${event} (remaining: ${eventListeners.length})`);
      }

      // Clean up empty listener arrays
      if (eventListeners.length === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit event
   */
  emit<T>(event: string, data: T): void {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners || eventListeners.length === 0) {
      if (this.config.enableLogging) {
        console.log(`${this.config.logPrefix} No listeners for event: ${event}`);
      }
      return;
    }

    if (this.config.enableLogging) {
      console.log(`${this.config.logPrefix} Emitting event: ${event} to ${eventListeners.length} listeners`);
    }

    // Call all listeners with error handling
    eventListeners.forEach((listener, index) => {
      try {
        listener(data);
      } catch (error) {
        console.error(`${this.config.logPrefix} Error in listener ${index} for event ${event}:`, error);
      }
    });
  }

  /**
   * Remove all listeners for an event or all events
   */
  removeAllListeners(event?: string): void {
    if (event) {
      const count = this.listeners.get(event)?.length || 0;
      this.listeners.delete(event);

      if (this.config.enableLogging) {
        console.log(`${this.config.logPrefix} Removed ${count} listeners for event: ${event}`);
      }
    } else {
      const totalCount = Array.from(this.listeners.values()).reduce((sum, listeners) => sum + listeners.length, 0);
      this.listeners.clear();

      if (this.config.enableLogging) {
        console.log(`${this.config.logPrefix} Removed all ${totalCount} listeners`);
      }
    }
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.length || 0;
  }

  /**
   * Get all event names that have listeners
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Add a one-time listener that removes itself after being called
   */
  once<T>(event: string, listener: EventListener<T>): void {
    const onceListener: EventListener<T> = (data: T) => {
      this.off(event, onceListener);
      listener(data);
    };

    this.on(event, onceListener);
  }
}
