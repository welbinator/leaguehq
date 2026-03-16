// ─────────────────────────────────────────────
// Enums (mirrored from Prisma for client use)
// ─────────────────────────────────────────────

export type UserRole =
  | 'SUPER_ADMIN'
  | 'LEAGUE_ADMIN'
  | 'COACH'
  | 'CAPTAIN'
  | 'PLAYER'
  | 'REFEREE';

export type SubscriptionTier = 'FREE' | 'STARTER' | 'GROWTH' | 'PRO';

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'TRIALING'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'UNPAID';

export type SeasonStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED';

export type GameStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';

export type RegistrationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'WAITLISTED';

export type TeamMemberRole = 'COACH' | 'CAPTAIN' | 'PLAYER';
export type TeamMemberStatus = 'ACTIVE' | 'INACTIVE';
export type ChatRoomType = 'TEAM' | 'LEAGUE' | 'CUSTOM';

// ─────────────────────────────────────────────
// League Settings (embedded JSON)
// ─────────────────────────────────────────────

export interface LeagueSettings {
  rosterManagedBy: 'COACH' | 'CAPTAIN' | 'BOTH';
  minRosterSize: number;
  maxRosterSize: number;
  allowMultipleTeams: boolean;
  refereesInApp: boolean;
  pricingType: 'PER_PLAYER' | 'PER_TEAM';
}

// ─────────────────────────────────────────────
// Core types
// ─────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
  createdAt: Date;
}

export interface League {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  logoUrl?: string | null;
  sport: string;
  description?: string | null;
  settings: LeagueSettings;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  createdAt: Date;
  // Computed fields
  _count?: {
    teams?: number;
    members?: number;
  };
}

export interface Team {
  id: string;
  leagueId: string;
  divisionId?: string | null;
  seasonId?: string | null;
  name: string;
  logoUrl?: string | null;
  coachId?: string | null;
  captainId?: string | null;
  createdAt: Date;
  // Relations
  coach?: Pick<User, 'id' | 'name' | 'avatarUrl'> | null;
  captain?: Pick<User, 'id' | 'name' | 'avatarUrl'> | null;
  _count?: { members?: number };
}

export interface Game {
  id: string;
  leagueId: string;
  seasonId: string;
  divisionId?: string | null;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: Date;
  location?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  status: GameStatus;
  refereeId?: string | null;
  // Relations
  homeTeam?: Pick<Team, 'id' | 'name' | 'logoUrl'>;
  awayTeam?: Pick<Team, 'id' | 'name' | 'logoUrl'>;
}

export interface Registration {
  id: string;
  leagueId: string;
  seasonId: string;
  userId: string;
  teamId?: string | null;
  divisionId?: string | null;
  status: RegistrationStatus;
  paidAt?: Date | null;
  amount: number;
  stripePaymentIntentId?: string | null;
  createdAt: Date;
}

// ─────────────────────────────────────────────
// API Response types
// ─────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─────────────────────────────────────────────
// Form / Input types
// ─────────────────────────────────────────────

export interface CreateLeagueInput {
  name: string;
  sport: string;
  description?: string;
  settings?: Partial<LeagueSettings>;
}

export interface CreateTeamInput {
  name: string;
  leagueId: string;
  divisionId?: string;
  seasonId?: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// ─────────────────────────────────────────────
// Pricing tiers
// ─────────────────────────────────────────────

export interface PricingTier {
  id: SubscriptionTier;
  name: string;
  price: number;
  maxPlayers: number | null;
  features: string[];
  highlighted?: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'STARTER',
    name: 'Starter',
    price: 29,
    maxPlayers: 100,
    features: [
      'Up to 100 players',
      'Unlimited teams',
      'Schedule management',
      'Basic standings',
      'Email support',
    ],
  },
  {
    id: 'GROWTH',
    name: 'Growth',
    price: 79,
    maxPlayers: 500,
    highlighted: true,
    features: [
      'Up to 500 players',
      'Unlimited teams & divisions',
      'Online payments',
      'In-app messaging',
      'Referee management',
      'Priority support',
    ],
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 149,
    maxPlayers: null,
    features: [
      'Unlimited players',
      'Multiple leagues',
      'Custom branding',
      'Advanced analytics',
      'API access',
      'Dedicated support',
    ],
  },
];
