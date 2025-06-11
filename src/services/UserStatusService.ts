import {SupabaseClient} from "@supabase/supabase-js";
import {ErrorHandler, UserManagerError, UserManagerErrorType, OperationResult} from "../utils/ErrorHandler";
import {UserStatus, UserStatusLevel, StatusUpdateRequest} from "../types";

/**
 * UserStatusService handles user status and points management
 * Integrates with Supabase database functions for status calculations
 */
export class UserStatusService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Get current user status from database
   */
  async getUserStatus(): Promise<OperationResult<UserStatus>> {
    return await ErrorHandler.wrapOperation(
      async () => {
        const {data, error} = await this.supabase.rpc("get_user_status");

        if (error) {
          throw ErrorHandler.createError(UserManagerErrorType.DATABASE_ERROR, `Failed to get user status: ${error.message}`);
        }

        if (!data) {
          throw ErrorHandler.createError(UserManagerErrorType.DATABASE_ERROR, "No status data returned from database");
        }

        return this.mapDatabaseStatus(data);
      },
      UserManagerErrorType.DATABASE_ERROR,
      "getUserStatus"
    );
  }

  /**
   * Update user points and recalculate status
   */
  async updateUserPoints(points: number): Promise<OperationResult<UserStatus>> {
    return await ErrorHandler.wrapOperation(
      async () => {
        // Validate points
        if (typeof points !== "number" || points < 0) {
          throw ErrorHandler.createError(UserManagerErrorType.VALIDATION_ERROR, "Points must be a non-negative number");
        }

        const {data, error} = await this.supabase.rpc("update_user_status", {
          new_points: points,
        });

        if (error) {
          throw ErrorHandler.createError(UserManagerErrorType.DATABASE_ERROR, `Failed to update user points: ${error.message}`);
        }

        if (!data) {
          throw ErrorHandler.createError(UserManagerErrorType.DATABASE_ERROR, "No status data returned after update");
        }

        return this.mapDatabaseStatus(data);
      },
      UserManagerErrorType.DATABASE_ERROR,
      "updateUserPoints"
    );
  }

  /**
   * Add points to current user total
   */
  async addPoints(pointsToAdd: number): Promise<OperationResult<UserStatus>> {
    return await ErrorHandler.wrapOperation(
      async () => {
        // Validate points
        if (typeof pointsToAdd !== "number") {
          throw ErrorHandler.createError(UserManagerErrorType.VALIDATION_ERROR, "Points to add must be a number");
        }

        const {data, error} = await this.supabase.rpc("add_user_points", {
          points_to_add: pointsToAdd,
        });

        if (error) {
          throw ErrorHandler.createError(UserManagerErrorType.DATABASE_ERROR, `Failed to add user points: ${error.message}`);
        }

        if (!data) {
          throw ErrorHandler.createError(UserManagerErrorType.DATABASE_ERROR, "No status data returned after adding points");
        }

        return this.mapDatabaseStatus(data);
      },
      UserManagerErrorType.DATABASE_ERROR,
      "addPoints"
    );
  }

  /**
   * Calculate what status level corresponds to given points
   */
  calculateStatusLevel(points: number): UserStatusLevel {
    if (points >= 10000) return "platinum";
    if (points >= 5000) return "gold";
    if (points >= 1000) return "silver";
    return "basic";
  }

  /**
   * Get status level requirements and benefits
   */
  getStatusLevelInfo(level: UserStatusLevel): {
    name: string;
    minPoints: number;
    maxPoints: number;
    nextLevel: UserStatusLevel | null;
    benefits: string[];
    color: string;
  } {
    const statusInfo = {
      basic: {
        name: "Basic",
        minPoints: 0,
        maxPoints: 999,
        nextLevel: "silver" as UserStatusLevel,
        benefits: ["Access to basic features", "Community support"],
        color: "#6c757d",
      },
      silver: {
        name: "Silver",
        minPoints: 1000,
        maxPoints: 4999,
        nextLevel: "gold" as UserStatusLevel,
        benefits: ["Priority support", "Advanced features", "Monthly newsletter"],
        color: "#c0c0c0",
      },
      gold: {
        name: "Gold",
        minPoints: 5000,
        maxPoints: 9999,
        nextLevel: "platinum" as UserStatusLevel,
        benefits: ["Premium support", "Beta access", "Exclusive content", "API rate limit increase"],
        color: "#ffd700",
      },
      platinum: {
        name: "Platinum",
        minPoints: 10000,
        maxPoints: Infinity,
        nextLevel: null,
        benefits: ["VIP support", "Early access", "Custom integrations", "Direct developer contact"],
        color: "#e5e4e2",
      },
    };

    return statusInfo[level];
  }

  /**
   * Get progress to next status level
   */
  getStatusProgress(currentStatus: UserStatus): {
    currentLevel: UserStatusLevel;
    currentPoints: number;
    nextLevel: UserStatusLevel | null;
    pointsToNext: number;
    progressPercentage: number;
  } {
    const currentLevel = currentStatus.status;
    const currentPoints = currentStatus.points;
    const levelInfo = this.getStatusLevelInfo(currentLevel);

    if (!levelInfo.nextLevel) {
      return {
        currentLevel,
        currentPoints,
        nextLevel: null,
        pointsToNext: 0,
        progressPercentage: 100,
      };
    }

    const nextLevelInfo = this.getStatusLevelInfo(levelInfo.nextLevel);
    const pointsToNext = nextLevelInfo.minPoints - currentPoints;
    const progressRange = nextLevelInfo.minPoints - levelInfo.minPoints;
    const currentProgress = currentPoints - levelInfo.minPoints;
    const progressPercentage = Math.min(100, (currentProgress / progressRange) * 100);

    return {
      currentLevel,
      currentPoints,
      nextLevel: levelInfo.nextLevel,
      pointsToNext: Math.max(0, pointsToNext),
      progressPercentage: Math.max(0, progressPercentage),
    };
  }

  /**
   * Initialize user status (create default record if none exists)
   */
  async initializeUserStatus(): Promise<OperationResult<UserStatus>> {
    return await ErrorHandler.wrapOperation(
      async () => {
        // Try to get existing status first
        const existingResult = await this.getUserStatus();

        if (existingResult.success) {
          return existingResult.data;
        }

        // If no status exists, create default
        const {data, error} = await this.supabase.rpc("update_user_status", {
          new_points: 0,
        });

        if (error) {
          throw ErrorHandler.createError(UserManagerErrorType.DATABASE_ERROR, `Failed to initialize user status: ${error.message}`);
        }

        if (!data) {
          throw ErrorHandler.createError(UserManagerErrorType.DATABASE_ERROR, "No status data returned after initialization");
        }

        return this.mapDatabaseStatus(data);
      },
      UserManagerErrorType.DATABASE_ERROR,
      "initializeUserStatus"
    );
  }

  /**
   * Map database status record to UserStatus type
   */
  private mapDatabaseStatus(dbStatus: any): UserStatus {
    return {
      id: dbStatus.id,
      userId: dbStatus.user_id,
      status: dbStatus.status as UserStatusLevel,
      points: dbStatus.points,
      createdAt: dbStatus.created_at,
      updatedAt: dbStatus.updated_at,
    };
  }

  /**
   * Validate status update request
   */
  private validateStatusUpdate(request: StatusUpdateRequest): void {
    if (typeof request.points !== "number" || request.points < 0) {
      throw ErrorHandler.createError(UserManagerErrorType.VALIDATION_ERROR, "Points must be a non-negative number");
    }

    if (request.reason && typeof request.reason !== "string") {
      throw ErrorHandler.createError(UserManagerErrorType.VALIDATION_ERROR, "Reason must be a string");
    }
  }
}
