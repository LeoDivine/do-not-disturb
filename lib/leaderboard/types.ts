export type LeaderboardMetric = "xp" | "hours" | "streak";
export type LeaderboardTimeframe = "all_time" | "this_week" | "this_month";

export interface LeaderboardUser {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  level: number;
  levelTitle: string;
  totalXp: number;
  focusHours: number;
  streak: number;
  shieldsRepelled: number;
}

export interface LeaderboardEntry extends LeaderboardUser {
  rank: number;
  isCurrentUser: boolean;
  score: number;
  scoreDisplay: string;
  percentile?: number;
}

export interface RelativeCompetitorInfo {
  entry: LeaderboardEntry;
  diff: number;
  diffDisplay: string;
}

export interface LeaderboardResponse {
  metric: LeaderboardMetric;
  timeframe: LeaderboardTimeframe;
  totalParticipants: number;
  firstPlace: LeaderboardEntry | null;
  currentUser: LeaderboardEntry | null;
  userAbove: RelativeCompetitorInfo | null;
  userBelow: RelativeCompetitorInfo | null;
  topEntries: LeaderboardEntry[];
  generatedAt: string;
}
