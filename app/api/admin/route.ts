import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getSuperAdminUser, isSuperAdminEmail } from "../../../lib/auth";

const CURATED_PUBLIC_DOMAINS = new Set([
	"youtube.com",
	"reddit.com",
	"x.com",
	"twitter.com",
	"instagram.com",
	"tiktok.com",
	"facebook.com",
	"netflix.com",
	"twitch.tv",
	"linkedin.com",
	"discord.com",
	"news.ycombinator.com",
	"pinterest.com",
	"threads.net",
]);

export async function GET() {
	try {
		const adminUser = await getSuperAdminUser();
		if (!adminUser) {
			return NextResponse.json(
				{ error: "Unauthorized. Superadmin access required." },
				{ status: 403 }
			);
		}

		const now = new Date();
		const nowMs = now.getTime();

		// Time boundaries
		const startOfToday = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate()
		);
		const sevenDaysAgo = new Date(nowMs - 7 * 24 * 60 * 60 * 1000);
		const thirtyDaysAgo = new Date(nowMs - 30 * 24 * 60 * 60 * 1000);
		const twentyFourHoursAgo = new Date(nowMs - 24 * 60 * 60 * 1000);

		// Clean up expired RUNNING sessions (> 2 mins past endsAt) and abandoned PAUSED sessions (> 2 hours)
		const twoMinsAgo = new Date(nowMs - 2 * 60 * 1000);
		const twoHoursAgo = new Date(nowMs - 2 * 60 * 60 * 1000);
		await prisma.focusSession
			.deleteMany({
				where: {
					OR: [
						{
							status: "RUNNING",
							endsAt: { lt: twoMinsAgo },
						},
						{
							status: "PAUSED",
							updatedAt: { lt: twoHoursAgo },
						},
					],
				},
			})
			.catch(() => {});

		// Fetch all required datasets in parallel
		const [
			users,
			allSessions,
			blockedWebsites,
			deflectionEventsToday,
			totalDeflectionEvents,
			orphanedDeflectionsCount,
			visualModeShortcuts,
			customPresetUserGroups,
		] = await Promise.all([
			prisma.user.findMany({
				include: {
					settings: true,
					streak: true,
					gamification: true,
					_count: {
						select: {
							blockedWebsites: true,
							achievements: true,
							presets: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
			}),
			prisma.focusSession.findMany({
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							avatarUrl: true,
						},
					},
				},
				orderBy: { startedAt: "desc" },
			}),
			prisma.blockedWebsite.findMany({
				select: {
					userId: true,
					url: true,
					active: true,
					deflections: true,
				},
			}),
			prisma.deflectionEvent
				.count({
					where: { attemptedAt: { gte: startOfToday } },
				})
				.catch(() => 0),
			prisma.deflectionEvent.count().catch(() => 0),
			prisma.deflectionEvent
				.count({
					where: { userId: null },
				})
				.catch(() => 0),
			prisma.userShortcut
				.findMany({
					where: { actionType: "__visual_mode__" },
					select: { keys: true },
				})
				.catch(() => []),
			prisma.timerPreset
				.groupBy({
					by: ["userId"],
				})
				.catch(() => []),
		]);

		// Separate active live sessions (RUNNING / PAUSED) from historical finished sessions
		const rawActiveSessions = allSessions.filter(
			(s) => s.status === "RUNNING" || s.status === "PAUSED"
		);
		const finishedSessions = allSessions.filter(
			(s) =>
				s.status === "COMPLETED" ||
				s.status === "STOPPED" ||
				s.status === "CANCELLED"
		);

		// Deduplicate active sessions per user or guest sessionCode
		const activeByKeyMap = new Map<string, (typeof rawActiveSessions)[0]>();
		for (const s of rawActiveSessions) {
			const key = s.userId || s.sessionCode || s.id;
			const existing = activeByKeyMap.get(key);
			if (!existing || s.updatedAt > existing.updatedAt) {
				activeByKeyMap.set(key, s);
			}
		}

		const activeSessionsList = Array.from(activeByKeyMap.values()).map((s) => {
			let computedRemaining = s.remainingDuration ?? s.plannedDuration;
			if (s.status === "RUNNING" && s.endsAt) {
				computedRemaining = Math.max(
					0,
					Math.ceil((s.endsAt.getTime() - nowMs) / 1000)
				);
			}

			const isGuest = !s.userId;
			const hasAnchor = Boolean(
				s.goal || s.intent || s.notes === "__HAS_ANCHOR__"
			);

			return {
				id: s.id,
				sessionCode:
					s.sessionCode || `#LIVE-${s.id.slice(-4).toUpperCase()}`,
				userId: s.userId,
				isGuest,
				userName: isGuest
					? `Local Guest (${(s.sessionCode || s.id).slice(-4)})`
					: s.user?.name ||
					  (s.user?.email ? s.user.email.split("@")[0] : "Signed-in User"),
				userEmail: isGuest ? null : s.user?.email || null,
				userAvatar: isGuest ? null : s.user?.avatarUrl || null,
				mode: s.mode, // FOCUS | SHORT_BREAK | LONG_BREAK
				status: s.status, // RUNNING | PAUSED
				protocol: s.protocol || "Deep Focus (25m)",
				hasAnchor, // Privacy-redacted boolean instead of raw personal goal/intent strings
				cycle: s.cycle || 1,
				totalCycles: s.totalCycles || 4,
				plannedDuration: s.plannedDuration || 1500,
				remainingDuration: computedRemaining,
				endsAt: s.endsAt ? s.endsAt.toISOString() : null,
				deflectionsCount: s.deflectionsCount || 0,
				startedAt: s.startedAt.toISOString(),
				updatedAt: s.updatedAt.toISOString(),
			};
		});

		const signedInActiveCount = activeSessionsList.filter(
			(s) => !s.isGuest
		).length;
		const guestActiveCount = activeSessionsList.filter(
			(s) => s.isGuest
		).length;

		const runningTimersCount = activeSessionsList.filter(
			(s) => s.status === "RUNNING"
		).length;
		const pausedTimersCount = activeSessionsList.filter(
			(s) => s.status === "PAUSED"
		).length;

		const modeBreakdown = {
			focus: activeSessionsList.filter((s) => s.mode === "FOCUS").length,
			shortBreak: activeSessionsList.filter((s) => s.mode === "SHORT_BREAK")
				.length,
			longBreak: activeSessionsList.filter((s) => s.mode === "LONG_BREAK")
				.length,
		};

		// Per-user session aggregates
		const userSessionStats = new Map<
			string,
			{
				completedCount: number;
				stoppedCount: number;
				totalSeconds: number;
				lastSessionAt: Date | null;
				deflectionsInSessions: number;
			}
		>();

		let totalFocusSecondsFromSessions = 0;
		let focusSecondsToday = 0;
		let focusSecondsThisWeek = 0;
		let completedSessionsCount = 0;
		let stoppedSessionsCount = 0;
		let sessionDeflectionsSum = 0;
		let sessionsWithAnchorCount = 0;
		let orphanedFinishedSessionsCount = 0;

		const protocolCounts = new Map<string, number>();
		const hourlyCounts = new Array(24).fill(0);

		const dauUserIds = new Set<string>();
		const wauUserIds = new Set<string>();
		const mauUserIds = new Set<string>();

		for (const s of finishedSessions) {
			if (!s.userId) {
				orphanedFinishedSessionsCount++;
			}

			const dur = Math.max(0, s.actualDuration || 0);
			const isFocus = s.mode === "FOCUS";
			const isCompleted = s.status === "COMPLETED";

			if (isFocus) {
				totalFocusSecondsFromSessions += dur;
				if (s.startedAt >= startOfToday) {
					focusSecondsToday += dur;
				}
				if (s.startedAt >= sevenDaysAgo) {
					focusSecondsThisWeek += dur;
				}
				if (isCompleted) {
					completedSessionsCount++;
				} else {
					stoppedSessionsCount++;
				}

				if (s.goal || s.intent) {
					sessionsWithAnchorCount++;
				}

				const proto = (s.protocol || "Deep Focus (25m)").trim();
				protocolCounts.set(proto, (protocolCounts.get(proto) || 0) + 1);

				const startHour = s.startedAt.getHours();
				hourlyCounts[startHour] = (hourlyCounts[startHour] || 0) + 1;
			}

			sessionDeflectionsSum += s.deflectionsCount || 0;

			if (s.userId) {
				if (s.startedAt >= twentyFourHoursAgo) dauUserIds.add(s.userId);
				if (s.startedAt >= sevenDaysAgo) wauUserIds.add(s.userId);
				if (s.startedAt >= thirtyDaysAgo) mauUserIds.add(s.userId);

				const cur = userSessionStats.get(s.userId) || {
					completedCount: 0,
					stoppedCount: 0,
					totalSeconds: 0,
					lastSessionAt: null,
					deflectionsInSessions: 0,
				};

				if (isFocus) {
					cur.totalSeconds += dur;
					if (isCompleted) cur.completedCount++;
					else cur.stoppedCount++;
				}
				cur.deflectionsInSessions += s.deflectionsCount || 0;
				if (!cur.lastSessionAt || s.startedAt > cur.lastSessionAt) {
					cur.lastSessionAt = s.startedAt;
				}
				userSessionStats.set(s.userId, cur);
			}
		}

		for (const active of activeSessionsList) {
			if (active.userId) {
				dauUserIds.add(active.userId);
				wauUserIds.add(active.userId);
				mauUserIds.add(active.userId);
			}
		}

		// Privacy-safe feature & sensory adoption counters
		let strictModeUsers = 0;
		let suspendModeUsers = 0;
		let autoStartBreaksUsers = 0;
		let autoStartFocusUsers = 0;
		let activatedUsers = 0;
		let totalFocusHoursAllUsers = 0;
		let totalShieldsFromGamification = 0;

		const acousticCounts = new Map<string, number>();
		const themeCounts = new Map<string, number>();

		const userDirectory = users.map((u) => {
			const uStats = userSessionStats.get(u.id);
			const activeTimer = activeByKeyMap.get(u.id);

			const sessionFocusHours = uStats ? uStats.totalSeconds / 3600 : 0;
			const streakFocusHours = u.streak?.totalFocusHours ?? 0;
			const resolvedFocusHours = Number(
				Math.max(sessionFocusHours, streakFocusHours).toFixed(1)
			);
			totalFocusHoursAllUsers += resolvedFocusHours;

			const completedCount = uStats?.completedCount ?? 0;
			const stoppedCount = uStats?.stoppedCount ?? 0;
			if (completedCount > 0 || resolvedFocusHours > 0) {
				activatedUsers++;
			}

			if (u.settings?.strictBlocking === "SUSPEND") {
				suspendModeUsers++;
			} else {
				strictModeUsers++;
			}

			if (u.settings?.autoStartBreaks !== false) {
				autoStartBreaksUsers++;
			}
			if (u.settings?.autoStartFocus === true) {
				autoStartFocusUsers++;
			}

			const presetSound = (u.settings?.acousticPreset || "rain").toLowerCase();
			acousticCounts.set(presetSound, (acousticCounts.get(presetSound) || 0) + 1);

			const prefTheme = u.settings?.theme || "SYSTEM";
			themeCounts.set(prefTheme, (themeCounts.get(prefTheme) || 0) + 1);

			totalShieldsFromGamification +=
				u.gamification?.totalShieldsRepelled ?? 0;

			const candidateDates: number[] = [u.updatedAt.getTime()];
			if (uStats?.lastSessionAt)
				candidateDates.push(uStats.lastSessionAt.getTime());
			if (u.streak?.lastActiveDate)
				candidateDates.push(u.streak.lastActiveDate.getTime());
			if (activeTimer) candidateDates.push(activeTimer.updatedAt.getTime());
			const lastActiveMs = Math.max(...candidateDates);
			const lastActiveDate = new Date(lastActiveMs);

			if (lastActiveDate >= twentyFourHoursAgo) dauUserIds.add(u.id);
			if (lastActiveDate >= sevenDaysAgo) wauUserIds.add(u.id);
			if (lastActiveDate >= thirtyDaysAgo) mauUserIds.add(u.id);

			let formattedActiveTimer = null;
			if (activeTimer) {
				let rem =
					activeTimer.remainingDuration ?? activeTimer.plannedDuration;
				if (activeTimer.status === "RUNNING" && activeTimer.endsAt) {
					rem = Math.max(
						0,
						Math.ceil((activeTimer.endsAt.getTime() - nowMs) / 1000)
					);
				}
				formattedActiveTimer = {
					id: activeTimer.id,
					mode: activeTimer.mode,
					status: activeTimer.status,
					protocol: activeTimer.protocol || "Deep Focus (25m)",
					remainingDuration: rem,
					plannedDuration: activeTimer.plannedDuration || 1500,
					endsAt: activeTimer.endsAt
						? activeTimer.endsAt.toISOString()
						: null,
					cycle: activeTimer.cycle || 1,
					totalCycles: activeTimer.totalCycles || 4,
				};
			}

			return {
				id: u.id,
				name:
					u.name ||
					(u.email ? u.email.split("@")[0] : "Anonymous User"),
				email: u.email,
				avatarUrl: u.avatarUrl,
				isSuperAdmin: isSuperAdminEmail(u.email),
				createdAt: u.createdAt.toISOString(),
				lastActiveAt: lastActiveDate.toISOString(),
				currentStreak: u.streak?.currentStreak ?? 0,
				longestStreak: u.streak?.longestStreak ?? 0,
				totalFocusHours: resolvedFocusHours,
				level: u.gamification?.level ?? 1,
				totalXp: u.gamification?.totalXp ?? 0,
				totalShieldsRepelled: Math.max(
					u.gamification?.totalShieldsRepelled ?? 0,
					uStats?.deflectionsInSessions ?? 0
				),
				achievementsCount: u._count.achievements,
				blockedSitesCount: u._count.blockedWebsites,
				completedSessionsCount: completedCount,
				stoppedSessionsCount: stoppedCount,
				strictBlocking: u.settings?.strictBlocking ?? "STRICT",
				acousticPreset: u.settings?.acousticPreset ?? "rain",
				theme: u.settings?.theme ?? "SYSTEM",
				activeTimer: formattedActiveTimer,
			};
		});

		// k-Anonymized Global Blocked Domains Aggregation
		const domainAggMap = new Map<
			string,
			{
				domain: string;
				userIds: Set<string>;
				activeCount: number;
				totalDeflections: number;
			}
		>();

		let blocklistDeflectionsSum = 0;
		let orphanedBlockedSitesCount = 0;
		for (const bw of blockedWebsites) {
			if (!bw.userId) orphanedBlockedSitesCount++;
			const cleanDomain = bw.url.toLowerCase().trim();
			if (!cleanDomain) continue;
			const cur = domainAggMap.get(cleanDomain) || {
				domain: cleanDomain,
				userIds: new Set<string>(),
				activeCount: 0,
				totalDeflections: 0,
			};
			if (bw.userId) cur.userIds.add(bw.userId);
			if (bw.active) cur.activeCount += 1;
			cur.totalDeflections += bw.deflections || 0;
			blocklistDeflectionsSum += bw.deflections || 0;
			domainAggMap.set(cleanDomain, cur);
		}

		// Apply k-anonymity: only show domains blocked by >= 2 users OR in CURATED_PUBLIC_DOMAINS.
		// Group single-user custom domains under a redacted summary row.
		const publicDomainsList: Array<{
			domain: string;
			usersCount: number;
			activeCount: number;
			totalDeflections: number;
			isRedactedSummary?: boolean;
		}> = [];

		let privateCustomDomainsCount = 0;
		let privateCustomActiveCount = 0;
		let privateCustomDeflections = 0;

		for (const item of domainAggMap.values()) {
			const usersCount = Math.max(1, item.userIds.size);
			if (usersCount >= 2 || CURATED_PUBLIC_DOMAINS.has(item.domain)) {
				publicDomainsList.push({
					domain: item.domain,
					usersCount,
					activeCount: item.activeCount,
					totalDeflections: item.totalDeflections,
				});
			} else {
				privateCustomDomainsCount += 1;
				privateCustomActiveCount += item.activeCount;
				privateCustomDeflections += item.totalDeflections;
			}
		}

		publicDomainsList.sort((a, b) => {
			if (b.totalDeflections !== a.totalDeflections) {
				return b.totalDeflections - a.totalDeflections;
			}
			return b.usersCount - a.usersCount;
		});

		const topBlockedDomains = publicDomainsList.slice(0, 10);
		if (privateCustomDomainsCount > 0) {
			topBlockedDomains.push({
				domain: `Private / Single-User Custom URLs (${privateCustomDomainsCount} redacted)`,
				usersCount: 1,
				activeCount: privateCustomActiveCount,
				totalDeflections: privateCustomDeflections,
				isRedactedSummary: true,
			});
		}

		const totalDeflectionsAllTime = Math.max(
			blocklistDeflectionsSum,
			sessionDeflectionsSum,
			totalShieldsFromGamification,
			totalDeflectionEvents
		);

		// Popular protocols breakdown
		const totalProtocolSessions = Math.max(
			1,
			completedSessionsCount + stoppedSessionsCount
		);
		const popularProtocols = Array.from(protocolCounts.entries())
			.map(([protocol, count]) => ({
				protocol,
				count,
				sharePercent: Number(
					((count / totalProtocolSessions) * 100).toFixed(1)
				),
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 6);

		// 14-day daily trend (signups, focus hours, completed sessions)
		const dailyTrend: Array<{
			dateStr: string;
			label: string;
			newSignups: number;
			focusHours: number;
			completedSessions: number;
		}> = [];

		for (let i = 13; i >= 0; i--) {
			const d = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate() - i
			);
			const nextD = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate() - i + 1
			);
			const dateStr = `${d.getFullYear()}-${String(
				d.getMonth() + 1
			).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
			const label = d.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			});

			const newSignups = users.filter(
				(u) => u.createdAt >= d && u.createdAt < nextD
			).length;

			let daySeconds = 0;
			let dayCompleted = 0;
			for (const s of finishedSessions) {
				if (
					s.mode === "FOCUS" &&
					s.startedAt >= d &&
					s.startedAt < nextD
				) {
					daySeconds += Math.max(0, s.actualDuration || 0);
					if (s.status === "COMPLETED") dayCompleted++;
				}
			}

			dailyTrend.push({
				dateStr,
				label,
				newSignups,
				focusHours: Number((daySeconds / 3600).toFixed(1)),
				completedSessions: dayCompleted,
			});
		}

		// Peak 3-hour window across the platform
		let bestStartHour = 9;
		let bestWindowSessions = 0;
		for (let h = 0; h < 24; h++) {
			const sum =
				hourlyCounts[h] +
				hourlyCounts[(h + 1) % 24] +
				hourlyCounts[(h + 2) % 24];
			if (sum > bestWindowSessions) {
				bestWindowSessions = sum;
				bestStartHour = h;
			}
		}

		const formatHourLabel = (h: number) => {
			const ampm = h >= 12 ? "PM" : "AM";
			const h12 = h % 12 === 0 ? 12 : h % 12;
			return `${h12}:00 ${ampm}`;
		};

		const totalUsers = users.length;
		const safeUserDenom = Math.max(1, totalUsers);
		const newUsersToday = users.filter(
			(u) => u.createdAt >= startOfToday
		).length;
		const newUsersThisWeek = users.filter(
			(u) => u.createdAt >= sevenDaysAgo
		).length;
		const newUsersThisMonth = users.filter(
			(u) => u.createdAt >= thirtyDaysAgo
		).length;

		const totalFinishedFocusSessions =
			completedSessionsCount + stoppedSessionsCount;
		const completionRate =
			totalFinishedFocusSessions > 0
				? Number(
						(
							(completedSessionsCount /
								totalFinishedFocusSessions) *
							100
						).toFixed(1)
				  )
				: 100;

		const resolvedTotalFocusHours = Number(
			Math.max(
				totalFocusSecondsFromSessions / 3600,
				totalFocusHoursAllUsers
			).toFixed(1)
		);

		// Visualizer breakdown from UserShortcut("__visual_mode__")
		const visualCounts = new Map<string, number>();
		for (const vm of visualModeShortcuts) {
			const modeVal = (vm.keys?.[0] || "timer").toLowerCase();
			const label =
				modeVal === "timer" || modeVal === "classic"
					? "Classic Arc Timer"
					: modeVal === "garden"
					? "Blooming Zen Garden"
					: "Seasonal / Auto Theme";
			visualCounts.set(label, (visualCounts.get(label) || 0) + 1);
		}
		if (visualCounts.size === 0 && totalUsers > 0) {
			visualCounts.set("Classic Arc Timer", totalUsers);
		}

		const acousticBreakdown = Array.from(acousticCounts.entries())
			.map(([preset, count]) => ({
				preset: preset.charAt(0).toUpperCase() + preset.slice(1),
				count,
				sharePercent: Number(((count / safeUserDenom) * 100).toFixed(1)),
			}))
			.sort((a, b) => b.count - a.count);

		const themeBreakdown = Array.from(themeCounts.entries())
			.map(([theme, count]) => ({
				theme,
				count,
				sharePercent: Number(((count / safeUserDenom) * 100).toFixed(1)),
			}))
			.sort((a, b) => b.count - a.count);

		const visualizerDenom = Math.max(
			1,
			Array.from(visualCounts.values()).reduce((a, b) => a + b, 0)
		);
		const visualizerBreakdown = Array.from(visualCounts.entries())
			.map(([visualizer, count]) => ({
				visualizer,
				count,
				sharePercent: Number(
					((count / visualizerDenom) * 100).toFixed(1)
				),
			}))
			.sort((a, b) => b.count - a.count);

		const orphanedTotal =
			orphanedFinishedSessionsCount +
			orphanedDeflectionsCount +
			orphanedBlockedSitesCount;

		return NextResponse.json({
			success: true,
			generatedAt: now.toISOString(),
			admin: {
				id: adminUser.id,
				email: adminUser.email,
				name: adminUser.name,
			},
			overview: {
				totalUsers,
				activeTimerUsers: activeSessionsList.length,
				signedInActiveCount,
				guestActiveCount,
				runningTimersCount,
				pausedTimersCount,
				modeBreakdown,
				newUsersToday,
				newUsersThisWeek,
				newUsersThisMonth,
				dau: dauUserIds.size,
				wau: wauUserIds.size,
				mau: mauUserIds.size,
				activatedUsers,
				activationRate:
					totalUsers > 0
						? Number(
								((activatedUsers / totalUsers) * 100).toFixed(1)
						  )
						: 0,
				totalFocusHoursAllTime: resolvedTotalFocusHours,
				focusHoursToday: Number((focusSecondsToday / 3600).toFixed(1)),
				focusHoursThisWeek: Number(
					(focusSecondsThisWeek / 3600).toFixed(1)
				),
				completedSessionsCount,
				stoppedSessionsCount,
				totalFinishedFocusSessions,
				completionRate,
				totalDeflectionsAllTime,
				deflectionsToday: deflectionEventsToday,
				totalBlockedRules: blockedWebsites.length,
				strictModeUsers,
				suspendModeUsers,
				peakWindowLabel:
					bestWindowSessions > 0
						? `${formatHourLabel(bestStartHour)} – ${formatHourLabel(
								(bestStartHour + 3) % 24
						  )}`
						: "No sessions yet",
			},
			privacySafeAdoption: {
				acousticBreakdown,
				themeBreakdown,
				visualizerBreakdown,
				autoStartBreaksPct: Number(
					((autoStartBreaksUsers / safeUserDenom) * 100).toFixed(1)
				),
				autoStartFocusPct: Number(
					((autoStartFocusUsers / safeUserDenom) * 100).toFixed(1)
				),
				customPresetsUsersCount: customPresetUserGroups.length,
				anchorAdoptionPct:
					totalFinishedFocusSessions > 0
						? Number(
								(
									(sessionsWithAnchorCount /
										totalFinishedFocusSessions) *
									100
								).toFixed(1)
						  )
						: 0,
				privateCustomDomainsRedacted: privateCustomDomainsCount,
			},
			storageHygiene: {
				sessionsRows: allSessions.length,
				deflectionRows: totalDeflectionEvents,
				blockedWebsiteRows: blockedWebsites.length,
				orphanedRecordsCount: orphanedTotal,
			},
			activeSessions: activeSessionsList,
			dailyTrend,
			hourlyDistribution: hourlyCounts.map((count, hour) => ({
				hour,
				label: formatHourLabel(hour),
				count,
			})),
			popularProtocols,
			topBlockedDomains,
			users: userDirectory,
		});
	} catch (error) {
		console.error("Failed to load superadmin overview:", error);
		return NextResponse.json(
			{ error: "Failed to load superadmin telemetry." },
			{ status: 500 }
		);
	}
}

export async function POST(req: NextRequest) {
	try {
		const adminUser = await getSuperAdminUser();
		if (!adminUser) {
			return NextResponse.json(
				{ error: "Unauthorized. Superadmin access required." },
				{ status: 403 }
			);
		}

		const body = await req.json().catch(() => ({}));
		if (body?.action === "prune_orphaned") {
			const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000);
			const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

			const [deletedSessions, deletedDeflections, deletedWebsites] =
				await prisma.$transaction([
					prisma.focusSession.deleteMany({
						where: {
							OR: [
								{
									userId: null,
									status: {
										in: [
											"COMPLETED",
											"STOPPED",
											"CANCELLED",
										],
									},
								},
								{
									status: "RUNNING",
									endsAt: { lt: twoMinsAgo },
								},
								{
									status: "PAUSED",
									updatedAt: { lt: oneHourAgo },
								},
							],
						},
					}),
					prisma.deflectionEvent.deleteMany({
						where: { userId: null },
					}),
					prisma.blockedWebsite.deleteMany({
						where: { userId: null },
					}),
				]);

			return NextResponse.json({
				success: true,
				prunedCount:
					deletedSessions.count +
					deletedDeflections.count +
					deletedWebsites.count,
			});
		}

		return NextResponse.json(
			{ error: "Unsupported admin action" },
			{ status: 400 }
		);
	} catch (error) {
		console.error("Admin maintenance error:", error);
		return NextResponse.json(
			{ error: "Failed to execute maintenance action" },
			{ status: 500 }
		);
	}
}
