import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth";
import { getLeaderboardData } from "../../../lib/leaderboard/leaderboard-service";
import { LeaderboardMetric, LeaderboardTimeframe } from "../../../lib/leaderboard/types";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser().catch(() => null);
    const searchParams = req.nextUrl.searchParams;

    const metricParam = searchParams.get("metric") as LeaderboardMetric | null;
    const metric: LeaderboardMetric =
      metricParam === "hours" || metricParam === "streak" ? metricParam : "xp";

    const timeframeParam = searchParams.get("timeframe") as LeaderboardTimeframe | null;
    const timeframe: LeaderboardTimeframe =
      timeframeParam === "this_week" || timeframeParam === "this_month"
        ? timeframeParam
        : "all_time";

    const guestXp = Number(searchParams.get("guestXp")) || 0;
    const guestHours = Number(searchParams.get("guestHours")) || 0;
    const guestStreak = Number(searchParams.get("guestStreak")) || 0;
    const guestShields = Number(searchParams.get("guestShields")) || 0;
    const guestLevel = Number(searchParams.get("guestLevel")) || 1;
    const guestName = searchParams.get("guestName") || (user?.name ?? "You");

    const data = await getLeaderboardData({
      metric,
      timeframe,
      currentUserId: user?.id ?? null,
      guestStats: {
        name: guestName,
        totalXp: guestXp,
        level: guestLevel,
        focusHours: guestHours,
        streak: guestStreak,
        shieldsRepelled: guestShields,
      },
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Leaderboard API error:", error);
    return NextResponse.json(
      { error: "Failed to generate leaderboard." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser().catch(() => null);
    const body = await req.json().catch(() => ({}));

    const metric: LeaderboardMetric =
      body.metric === "hours" || body.metric === "streak" ? body.metric : "xp";

    const timeframe: LeaderboardTimeframe =
      body.timeframe === "this_week" || body.timeframe === "this_month"
        ? body.timeframe
        : "all_time";

    const data = await getLeaderboardData({
      metric,
      timeframe,
      currentUserId: user?.id ?? null,
      guestStats: body.guestStats,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Leaderboard POST error:", error);
    return NextResponse.json(
      { error: "Failed to compute leaderboard." },
      { status: 500 }
    );
  }
}
