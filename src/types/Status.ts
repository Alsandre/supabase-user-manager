import type {UserStatusType} from "./User";

// User status levels
export type UserStatusLevel = "basic" | "silver" | "gold" | "platinum";

// Complete user status record from database
export interface UserStatus {
  id: string;
  userId: string;
  status: UserStatusLevel;
  points: number;
  createdAt: string;
  updatedAt: string;
}

// Status benefits configuration
export interface StatusBenefits {
  status: UserStatusType;
  name: string;
  description: string;
  features: string[];
  pointsRequired: number;
  color?: string;
  icon?: string;
}

// Status calculation result
export interface StatusCalculationResult {
  currentStatus: UserStatusType;
  nextStatus?: UserStatusType;
  pointsToNext?: number;
  progressPercentage: number;
}

// Status update request
export interface StatusUpdateRequest {
  userId: string;
  points: number;
  reason?: string;
  metadata?: Record<string, any>;
}

// Status update result
export interface StatusUpdateResult {
  success: boolean;
  previousStatus: UserStatusType;
  newStatus: UserStatusType;
  statusChanged: boolean;
  points: number;
  error?: string;
}

// Status history entry
export interface StatusHistoryEntry {
  id: string;
  user_id: string;
  previous_status: UserStatusType;
  new_status: UserStatusType;
  points_before: number;
  points_after: number;
  reason?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// Default status benefits
export const DEFAULT_STATUS_BENEFITS: StatusBenefits[] = [
  {
    status: "basic",
    name: "Basic",
    description: "Welcome to the community!",
    features: ["Basic access", "Community support"],
    pointsRequired: 0,
    color: "#6B7280",
    icon: "👤",
  },
  {
    status: "silver",
    name: "Silver",
    description: "You're making progress!",
    features: ["Priority support", "Early access to features", "Silver badge"],
    pointsRequired: 1000,
    color: "#9CA3AF",
    icon: "🥈",
  },
  {
    status: "gold",
    name: "Gold",
    description: "You're a valued member!",
    features: ["Premium support", "Beta features", "Gold badge", "Monthly rewards"],
    pointsRequired: 5000,
    color: "#F59E0B",
    icon: "🥇",
  },
  {
    status: "platinum",
    name: "Platinum",
    description: "You're a VIP member!",
    features: ["VIP support", "Exclusive features", "Platinum badge", "Special perks", "Direct contact"],
    pointsRequired: 10000,
    color: "#8B5CF6",
    icon: "💎",
  },
];

// Status service interface
export interface StatusService {
  calculateStatus(points: number): StatusCalculationResult;
  updateUserStatus(request: StatusUpdateRequest): Promise<StatusUpdateResult>;
  getUserStatus(userId: string): Promise<UserStatusType | null>;
  getStatusBenefits(status: UserStatusType): StatusBenefits;
  getAllStatusBenefits(): StatusBenefits[];
}
