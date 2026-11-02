"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTheme } from "../../context/theme-context";
import { useTimer } from "../../context/timer-context";
import { useCloseOnEscape } from "../../lib/overlays/use-close-on-escape";

interface ActiveSessionItem {
	id: string;
	sessionCode: string;
	userId: string | null;
	isGuest: boolean;
	userName: string;
	userEmail: string | null;
	userAvatar: string | null;
	mode: "FOCUS" | "SHORT_BREAK" | "LONG_BREAK";
	status: "RUNNING" | "PAUSED";
	protocol: string;
	hasAnchor: boolean;
	cycle: number;
	totalCycles: number;
	plannedDuration: number;
	remainingDuration: number;
	endsAt: string | null;
	deflectionsCount: number;
	startedAt: string;
	updatedAt: string;
}

interface UserDirectoryItem {
	id: string;
	name: string;
	email: string | null;
	avatarUrl: string | null;
	isSuperAdmin: boolean;
	createdAt: string;
	lastActiveAt: string;
	currentStreak: number;
	longestStreak: number;
	totalFocusHours: number;
	level: number;
	totalXp: number;
	totalShieldsRepelled: number;
	achievementsCount: number;
	blockedSitesCount: number;
	completedSessionsCount: number;
	stoppedSessionsCount: number;
	strictBlocking: "STRICT" | "SUSPEND";
	acousticPreset: string;
	theme: string;
	activeTimer: {
		id: string;
		mode: "FOCUS" | "SHORT_BREAK" | "LONG_BREAK";
		status: "RUNNING" | "PAUSED";
		protocol: string;
		remainingDuration: number;
		plannedDuration: number;
		endsAt: string | null;
		cycle: number;
		totalCycles: number;
	} | null;
}

interface AdminPayload {
	generatedAt: string;
	admin: {
		id: string;
		email: string | null;
		name: string | null;
	};
	overview: {
		totalUsers: number;
		activeTimerUsers: number;
		signedInActiveCount: number;
		guestActiveCount: number;
		runningTimersCount: number;
		pausedTimersCount: number;
		modeBreakdown: {
			focus: number;
			shortBreak: number;
			longBreak: number;
		};
		newUsersToday: number;
		newUsersThisWeek: number;
		newUsersThisMonth: number;
		dau: number;
		wau: number;
		mau: number;
		activatedUsers: number;
		activationRate: number;
		totalFocusHoursAllTime: number;
		focusHoursToday: number;
		focusHoursThisWeek: number;
		completedSessionsCount: number;
		stoppedSessionsCount: number;
		totalFinishedFocusSessions: number;
		completionRate: number;
		totalDeflectionsAllTime: number;
		deflectionsToday: number;
		totalBlockedRules: number;
		strictModeUsers: number;
		suspendModeUsers: number;
		peakWindowLabel: string;
	};
	privacySafeAdoption: {
		acousticBreakdown: Array<{
			preset: string;
			count: number;
			sharePercent: number;
		}>;
		themeBreakdown: Array<{
			theme: string;
			count: number;
			sharePercent: number;
		}>;
		visualizerBreakdown: Array<{
			visualizer: string;
			count: number;
			sharePercent: number;
		}>;
		autoStartBreaksPct: number;
		autoStartFocusPct: number;
		customPresetsUsersCount: number;
		anchorAdoptionPct: number;
		privateCustomDomainsRedacted: number;
	};
	storageHygiene: {
		sessionsRows: number;
		deflectionRows: number;
		blockedWebsiteRows: number;
		orphanedRecordsCount: number;
	};
	activeSessions: ActiveSessionItem[];
	dailyTrend: Array<{
		dateStr: string;
		label: string;
		newSignups: number;
		focusHours: number;
		completedSessions: number;
	}>;
	hourlyDistribution: Array<{
		hour: number;
		label: string;
		count: number;
	}>;
	popularProtocols: Array<{
		protocol: string;
		count: number;
		sharePercent: number;
	}>;
	topBlockedDomains: Array<{
		domain: string;
		usersCount: number;
		activeCount: number;
		totalDeflections: number;
		isRedactedSummary?: boolean;
	}>;
	users: UserDirectoryItem[];
}

function formatDurationMMSS(seconds: number): string {
	const safe = Math.max(0, Math.round(seconds));
	const m = Math.floor(safe / 60);
	const s = safe % 60;
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatRelativeTime(isoDate: string, nowMs: number): string {
	const targetMs = new Date(isoDate).getTime();
	if (isNaN(targetMs)) return "—";
	const diffSecs = Math.max(0, Math.floor((nowMs - targetMs) / 1000));
	if (diffSecs < 45) return "Just now";
	const mins = Math.floor(diffSecs / 60);
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	return new Date(isoDate).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function maskEmailAddress(email: string | null): string {
	if (!email) return "No email";
	const parts = email.split("@");
	if (parts.length !== 2) return email;
	const [local, domain] = parts;
	if (local.length <= 2) {
		return `${local[0] || "*"}***@${domain}`;
	}
	return `${local.slice(0, 2)}***@${domain}`;
}

export default function SuperadminDashboard({
	adminEmail,
	adminName,
}: {
	adminEmail: string;
	adminName: string;
}) {
	const router = useRouter();
	const { isDark } = useTheme();
	const { activeColor, isRunning: localTimerRunning, mode: localTimerMode, totalCycles: localTotalCycles } = useTimer();

	const [data, setData] = useState<AdminPayload | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
	const [isPruning, setIsPruning] = useState<boolean>(false);
	const [pruneNotice, setPruneNotice] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [nowMs, setNowMs] = useState<number>(() => Date.now());
	const [mounted, setMounted] = useState<boolean>(false);

	// Privacy-first PII redaction toggle (masked by default)
	const [revealEmails, setRevealEmails] = useState<boolean>(false);

	// Filters & controls
	const [liveFilter, setLiveFilter] = useState<
		"ALL" | "SIGNED_IN" | "GUESTS" | "RUNNING" | "PAUSED" | "FOCUS" | "BREAKS"
	>("ALL");
	const [trendMetric, setTrendMetric] = useState<"focusHours" | "newSignups">(
		"focusHours"
	);
	const [userSearch, setUserSearch] = useState<string>("");
	const [userFilter, setUserFilter] = useState<
		"ALL" | "ACTIVE_TIMER" | "STREAK" | "SUPERADMIN"
	>("ALL");
	const [userSort, setUserSort] = useState<
		"recent" | "joined" | "hours" | "xp" | "streak"
	>("recent");

	// Delete user confirmation state
	const [userToDelete, setUserToDelete] = useState<UserDirectoryItem | null>(
		null
	);
	const [isDeleting, setIsDeleting] = useState<boolean>(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	useCloseOnEscape(Boolean(userToDelete), () => {
		if (!isDeleting) {
			setUserToDelete(null);
			setDeleteError(null);
		}
	});

	useEffect(() => {
		setMounted(true);
	}, []);

	const fetchDashboardData = useCallback(
		async (silent = false) => {
			if (!silent) setIsRefreshing(true);
			try {
				// Ensure any ongoing timer in this browser is flushed to the server before reading telemetry
				if (typeof window !== "undefined") {
					try {
						const rawTimer = localStorage.getItem("dnd-active-timer-state");
						if (rawTimer) {
							const parsed = JSON.parse(rawTimer);
							const now = Date.now();
							const isRunningNow = Boolean(parsed?.isRunning && parsed?.endsAt && parsed.endsAt > now);
							const planned = Number(parsed?.totalSeconds) || 1500;
							const remaining = isRunningNow
								? Math.max(0, Math.ceil((parsed.endsAt - now) / 1000))
								: Number(parsed?.secondsLeft) || planned;
							const isPausedMid = !isRunningNow && remaining < planned && remaining > 0;

							if (isRunningNow || isPausedMid) {
								const anchor = localStorage.getItem("dnd_primary_anchor") || "";
								const intent = localStorage.getItem("dnd_session_intent") || "";
								let ephemeralGuestId =
									localStorage.getItem("dnd_ephemeral_pulse_id") ||
									sessionStorage.getItem("dnd_ephemeral_pulse_id") ||
									"";
								if (!ephemeralGuestId) {
									ephemeralGuestId = `anon_${Math.random().toString(36).slice(2, 10)}`;
									localStorage.setItem("dnd_ephemeral_pulse_id", ephemeralGuestId);
									sessionStorage.setItem("dnd_ephemeral_pulse_id", ephemeralGuestId);
								}
								await fetch("/api/timer/status", {
									method: "POST",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({
										action: isRunningNow ? "heartbeat" : "pause",
										mode: parsed.mode || "focus",
										isRunning: isRunningNow,
										plannedSeconds: planned,
										remainingSeconds: remaining,
										endsAt: isRunningNow ? parsed.endsAt : null,
										cycle: parsed.cycle || 1,
										totalCycles: localTotalCycles || 4,
										hasAnchor: Boolean(anchor.trim() || intent.trim()),
										ephemeralGuestId,
									}),
								}).catch(() => {});
							}
						}
					} catch {}
				}

				const res = await fetch("/api/admin", {
					method: "GET",
					cache: "no-store",
				});
				if (res.status === 401 || res.status === 403) {
					router.replace("/");
					return;
				}
				if (!res.ok) {
					throw new Error("Failed to load superadmin telemetry");
				}
				const json = await res.json();
				if (json?.overview) {
					setData(json);
					setError(null);
				}
			} catch (err: any) {
				setError(err?.message || "Could not load dashboard metrics.");
			} finally {
				setLoading(false);
				setIsRefreshing(false);
			}
		},
		[router, localTotalCycles]
	);

	// Initial fetch + 15-second auto-polling
	useEffect(() => {
		fetchDashboardData(false);
		const pollInterval = setInterval(() => {
			fetchDashboardData(true);
		}, 15000);
		return () => clearInterval(pollInterval);
	}, [fetchDashboardData]);

	// Immediate silent refresh when local timer starts, pauses, or switches mode in another tab
	useEffect(() => {
		if (!mounted) return;
		const timer = setTimeout(() => {
			fetchDashboardData(true);
		}, 150);
		return () => clearTimeout(timer);
	}, [localTimerRunning, localTimerMode, mounted, fetchDashboardData]);

	// 1-second client clock for live running timer countdown interpolation
	useEffect(() => {
		const tick = setInterval(() => {
			setNowMs(Date.now());
		}, 1000);
		return () => clearInterval(tick);
	}, []);

	// Helper to compute live remaining seconds for a session
	const getLiveRemainingSeconds = useCallback(
		(
			status: "RUNNING" | "PAUSED",
			remainingDuration: number,
			endsAt: string | null
		) => {
			if (status === "RUNNING" && endsAt) {
				const endMs = new Date(endsAt).getTime();
				if (!isNaN(endMs)) {
					return Math.max(0, Math.ceil((endMs - nowMs) / 1000));
				}
			}
			return Math.max(0, remainingDuration);
		},
		[nowMs]
	);

	const filteredActiveSessions = useMemo(() => {
		if (!data) return [];
		return data.activeSessions.filter((s) => {
			if (liveFilter === "SIGNED_IN") return !s.isGuest;
			if (liveFilter === "GUESTS") return s.isGuest;
			if (liveFilter === "RUNNING") return s.status === "RUNNING";
			if (liveFilter === "PAUSED") return s.status === "PAUSED";
			if (liveFilter === "FOCUS") return s.mode === "FOCUS";
			if (liveFilter === "BREAKS")
				return s.mode === "SHORT_BREAK" || s.mode === "LONG_BREAK";
			return true;
		});
	}, [data, liveFilter]);

	const filteredAndSortedUsers = useMemo(() => {
		if (!data) return [];
		const q = userSearch.trim().toLowerCase();

		const filtered = data.users.filter((u) => {
			if (q) {
				const matchName = u.name?.toLowerCase().includes(q);
				const matchEmail = u.email?.toLowerCase().includes(q);
				if (!matchName && !matchEmail) return false;
			}
			if (userFilter === "ACTIVE_TIMER") return Boolean(u.activeTimer);
			if (userFilter === "STREAK") return u.currentStreak > 0;
			if (userFilter === "SUPERADMIN") return u.isSuperAdmin;
			return true;
		});

		return filtered.sort((a, b) => {
			if (userSort === "hours") return b.totalFocusHours - a.totalFocusHours;
			if (userSort === "xp") return b.totalXp - a.totalXp;
			if (userSort === "streak") return b.currentStreak - a.currentStreak;
			if (userSort === "joined")
				return (
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);
			if (a.activeTimer && !b.activeTimer) return -1;
			if (!a.activeTimer && b.activeTimer) return 1;
			return (
				new Date(b.lastActiveAt).getTime() -
				new Date(a.lastActiveAt).getTime()
			);
		});
	}, [data, userSearch, userFilter, userSort]);

	const handleConfirmDeleteUser = async () => {
		if (!userToDelete) return;
		setIsDeleting(true);
		setDeleteError(null);
		try {
			const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
				method: "DELETE",
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(json.error || "Failed to delete user account");
			}
			setUserToDelete(null);
			await fetchDashboardData(false);
		} catch (err: any) {
			setDeleteError(err?.message || "Could not delete user account.");
		} finally {
			setIsDeleting(false);
		}
	};

	const handlePruneOrphaned = async () => {
		setIsPruning(true);
		setPruneNotice(null);
		try {
			const res = await fetch("/api/admin", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "prune_orphaned" }),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(json.error || "Failed to prune orphaned records");
			}
			setPruneNotice(
				`Pruned ${json.prunedCount || 0} orphaned or stale records.`
			);
			await fetchDashboardData(false);
		} catch (err: any) {
			setPruneNotice(err?.message || "Could not prune records.");
		} finally {
			setIsPruning(false);
		}
	};

	const cardClass = `rounded-2xl border transition-colors ${
		isDark
			? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]"
			: "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
	}`;

	const mutedText = isDark ? "text-[#7e8c9f]" : "text-[#64748b]";

	if (loading && !data) {
		return (
			<main className="max-w-[1360px] w-full mx-auto px-4 py-6 sm:p-6 md:p-8 flex flex-col gap-6">
				<div className="flex items-center justify-between">
					<div className="flex flex-col gap-2">
						<div className="h-4 w-32 rounded bg-slate-200 dark:bg-[#1c2432] animate-pulse" />
						<div className="h-7 w-64 rounded bg-slate-200 dark:bg-[#1c2432] animate-pulse" />
					</div>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					{[1, 2, 3, 4].map((n) => (
						<div
							key={n}
							className={`${cardClass} p-6 h-36 animate-pulse`}
						/>
					))}
				</div>
				<div className={`${cardClass} p-6 h-72 animate-pulse`} />
			</main>
		);
	}

	const ov = data?.overview;

	return (
		<main className="max-w-[1360px] w-full mx-auto px-4 py-5 sm:p-6 md:p-8 flex flex-col gap-5 sm:gap-6">
			{/* Top Superadmin Header — plain typography, no pills or badges */}
			<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
				<div className="flex flex-col gap-1">
					<div
						className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}
					>
						PRIVACY-FIRST SUPERADMIN TELEMETRY • {adminEmail || adminName}
					</div>
					<h1 className="text-xl sm:text-2xl font-bold tracking-tight">
						Platform Command Center
					</h1>
				</div>

				<div className="flex items-center gap-4 self-start sm:self-auto text-xs">
					<span className={mutedText}>
						Auto-sync 15s
						{data?.generatedAt
							? ` • Updated ${formatRelativeTime(data.generatedAt, nowMs)}`
							: ""}
					</span>
					<button
						type="button"
						onClick={() => fetchDashboardData(false)}
						disabled={isRefreshing}
						className={`font-semibold flex items-center gap-1.5 transition-colors cursor-pointer hover:underline ${
							isDark
								? "text-slate-200 hover:text-white"
								: "text-slate-700 hover:text-slate-900"
						}`}
						style={{ color: isRefreshing ? activeColor : undefined }}
					>
						<svg
							className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
							<path d="M3 3v5h5" />
							<path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
							<path d="M16 16h5v5" />
						</svg>
						{isRefreshing ? "Refreshing..." : "Refresh"}
					</button>
				</div>
			</div>

			{error && (
				<div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs flex items-center justify-between">
					<span>{error}</span>
					<button
						type="button"
						onClick={() => fetchDashboardData(false)}
						className="underline font-semibold cursor-pointer"
					>
						Retry
					</button>
				</div>
			)}

			{/* Top 4 Hero KPI Cards */}
			{ov && (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
					{/* KPI 1: Total Registered Cloud Sync Users */}
					<div className={`${cardClass} p-4 sm:p-6 micro-card`}>
						<div className="flex items-center justify-between mb-3">
							<span
								className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}
							>
								CLOUD SYNC USERS
							</span>
							<svg
								className="w-4 h-4"
								style={{ color: activeColor }}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
								<circle cx="9" cy="7" r="4" />
								<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
								<path d="M16 3.13a4 4 0 0 1 0 7.75" />
							</svg>
						</div>
						<div className="flex items-baseline gap-2 mb-3">
							<span className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">
								{ov.totalUsers}
							</span>
							<span className="text-xs font-medium text-emerald-500">
								+{ov.newUsersThisWeek} this wk
							</span>
						</div>
						<div
							className={`flex items-center justify-between text-[11px] mb-1.5 ${mutedText}`}
						>
							<span>Activated ({ov.activatedUsers} users)</span>
							<span className="font-semibold" style={{ color: activeColor }}>
								{ov.activationRate}%
							</span>
						</div>
						<div
							className={`w-full h-1.5 rounded-sm overflow-hidden ${
								isDark ? "bg-[#1c2432]" : "bg-[#e2e8f0]"
							}`}
						>
							<div
								className="h-full rounded-sm transition-all duration-500"
								style={{
									width: `${Math.min(100, ov.activationRate)}%`,
									backgroundColor: activeColor,
								}}
							/>
						</div>
					</div>

					{/* KPI 2: Active Timers Right Now (Signed-in + Ephemeral Guests) */}
					<div className={`${cardClass} p-4 sm:p-6 micro-card`}>
						<div className="flex items-center justify-between mb-3">
							<span
								className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}
							>
								ACTIVE TIMERS (LIVE)
							</span>
							<svg
								className="w-4 h-4"
								style={{ color: activeColor }}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<polygon points="5 3 19 12 5 21 5 3" />
							</svg>
						</div>
						<div className="flex items-baseline gap-2 mb-3">
							<span className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">
								{ov.activeTimerUsers}
							</span>
							<span className={`text-xs font-medium ${mutedText}`}>
								{ov.signedInActiveCount} signed-in • {ov.guestActiveCount} local
								guests
							</span>
						</div>
						<div
							className={`flex items-center justify-between text-[11px] pt-1 ${mutedText}`}
						>
							<span>
								{ov.runningTimersCount} running / {ov.pausedTimersCount} paused
							</span>
							<span>
								F:{ov.modeBreakdown.focus} • S:{ov.modeBreakdown.shortBreak} • L:
								{ov.modeBreakdown.longBreak}
							</span>
						</div>
					</div>

					{/* KPI 3: Platform Focus Hours & Completion Health */}
					<div className={`${cardClass} p-4 sm:p-6 micro-card`}>
						<div className="flex items-center justify-between mb-3">
							<span
								className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}
							>
								PLATFORM FOCUS HOURS
							</span>
							<svg
								className="w-4 h-4"
								style={{ color: activeColor }}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<circle cx="12" cy="12" r="10" />
								<polyline points="12 6 12 12 16 14" />
							</svg>
						</div>
						<div className="flex items-baseline gap-1.5 mb-3">
							<span className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">
								{ov.totalFocusHoursAllTime}
							</span>
							<span className={`text-xs font-medium ${mutedText}`}>
								hrs ({ov.focusHoursToday}h today)
							</span>
						</div>
						<div
							className={`flex items-center justify-between text-[11px] mb-1.5 ${mutedText}`}
						>
							<span>
								Completion ({ov.completedSessionsCount}/
								{ov.totalFinishedFocusSessions})
							</span>
							<span className="font-semibold" style={{ color: activeColor }}>
								{ov.completionRate}%
							</span>
						</div>
						<div
							className={`w-full h-1.5 rounded-sm overflow-hidden ${
								isDark ? "bg-[#1c2432]" : "bg-[#e2e8f0]"
							}`}
						>
							<div
								className="h-full rounded-sm transition-all duration-500"
								style={{
									width: `${Math.min(100, ov.completionRate)}%`,
									backgroundColor: activeColor,
								}}
							/>
						</div>
					</div>

					{/* KPI 4: Distractions Deflected & Blocker Shield */}
					<div className={`${cardClass} p-4 sm:p-6 micro-card`}>
						<div className="flex items-center justify-between mb-3">
							<span
								className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}
							>
								DISTRACTIONS DEFLECTED
							</span>
							<svg
								className="w-4 h-4"
								style={{ color: activeColor }}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
							</svg>
						</div>
						<div className="flex items-baseline gap-2 mb-3">
							<span className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">
								{ov.totalDeflectionsAllTime}
							</span>
							<span className={`text-xs font-medium ${mutedText}`}>
								+{ov.deflectionsToday} today
							</span>
						</div>
						<div
							className={`flex items-center justify-between text-[11px] mb-1.5 ${mutedText}`}
						>
							<span>{ov.totalBlockedRules} active block rules</span>
							<span className="font-semibold" style={{ color: activeColor }}>
								{ov.strictModeUsers} Strict / {ov.suspendModeUsers} Suspend
							</span>
						</div>
						<div
							className={`w-full h-1.5 rounded-sm overflow-hidden ${
								isDark ? "bg-[#1c2432]" : "bg-[#e2e8f0]"
							}`}
						>
							<div
								className="h-full rounded-sm transition-all duration-500"
								style={{
									width: `${
										ov.strictModeUsers + ov.suspendModeUsers > 0
											? Math.round(
													(ov.strictModeUsers /
														(ov.strictModeUsers + ov.suspendModeUsers)) *
														100
											  )
											: 100
									}%`,
									backgroundColor: activeColor,
								}}
							/>
						</div>
					</div>
				</div>
			)}

			{/* SECTION 1: LIVE ACTIVE SESSIONS FEED (PRIVACY-REDACTED) */}
			<section className={`${cardClass} p-4 sm:p-6 flex flex-col gap-4`}>
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div>
						<span
							className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}
						>
							LIVE PULSE • {data?.activeSessions.length || 0} ACTIVE (
							{ov?.signedInActiveCount || 0} SIGNED-IN •{" "}
							{ov?.guestActiveCount || 0} LOCAL GUESTS)
						</span>
						<h2 className="text-base font-bold">
							Live Active Timer Sessions
						</h2>
						<p className={`text-xs ${mutedText} mt-0.5`}>
							Real-time timer activity across signed-in accounts and ephemeral
							local-only guests. Personal task goals are redacted.
						</p>
					</div>

					{/* Plain Typography Filter Links */}
					<div className="flex items-center gap-4 text-xs flex-wrap">
						{(
							[
								{ id: "ALL", label: "All" },
								{ id: "SIGNED_IN", label: "Signed-In" },
								{ id: "GUESTS", label: "Local Guests" },
								{ id: "RUNNING", label: "Running" },
								{ id: "PAUSED", label: "Paused" },
								{ id: "FOCUS", label: "Focus" },
								{ id: "BREAKS", label: "Breaks" },
							] as const
						).map((tab) => {
							const active = liveFilter === tab.id;
							return (
								<button
									key={tab.id}
									type="button"
									onClick={() => setLiveFilter(tab.id)}
									className={`py-1 transition-colors cursor-pointer ${
										active
											? "font-semibold"
											: `${mutedText} hover:text-slate-900 dark:hover:text-white`
									}`}
									style={active ? { color: activeColor } : undefined}
								>
									{tab.label}
								</button>
							);
						})}
					</div>
				</div>

				{filteredActiveSessions.length === 0 ? (
					<div
						className={`py-10 px-4 rounded-xl border border-dashed text-center flex flex-col items-center gap-2 ${
							isDark
								? "border-[#1d2634] bg-[#0c1017]/50"
								: "border-slate-200 bg-slate-50/50"
						}`}
					>
						<span className="text-xs font-semibold">
							No active timers match this filter right now
						</span>
						<span className={`text-xs ${mutedText} max-w-md`}>
							Whenever a signed-in user or local guest starts or pauses a Focus
							or Break timer, their live countdown appears here automatically
							and vanishes when stopped.
						</span>
					</div>
				) : (
					<div className="overflow-x-auto -mx-4 sm:mx-0">
						<table className="w-full text-left border-collapse min-w-[720px]">
							<thead>
								<tr
									className={`border-b text-[10px] font-bold uppercase tracking-wider ${mutedText} ${
										isDark ? "border-[#1d2634]" : "border-slate-200"
									}`}
								>
									<th className="py-2.5 px-4 sm:px-3">Participant</th>
									<th className="py-2.5 px-3">State &amp; Mode</th>
									<th className="py-2.5 px-3">Protocol &amp; Anchor</th>
									<th className="py-2.5 px-3">Cycle</th>
									<th className="py-2.5 px-3">Live Countdown</th>
									<th className="py-2.5 px-3 text-right">Deflections</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 dark:divide-[#1a2332] text-xs">
								{filteredActiveSessions.map((session) => {
									const liveRem = getLiveRemainingSeconds(
										session.status,
										session.remainingDuration,
										session.endsAt
									);
									const progress =
										session.plannedDuration > 0
											? Math.min(
													100,
													Math.max(
														0,
														Math.round(
															((session.plannedDuration - liveRem) /
																session.plannedDuration) *
																100
														)
													)
											  )
											: 0;

									const modeLabel =
										session.mode === "SHORT_BREAK"
											? "Short Break"
											: session.mode === "LONG_BREAK"
											? "Long Break"
											: "Deep Focus";

									return (
										<tr
											key={session.id}
											className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors"
										>
											<td className="py-3 px-4 sm:px-3">
												<div className="min-w-0">
													<div className="font-semibold truncate">
														{session.userName}
													</div>
													<div
														className={`text-[11px] truncate ${mutedText}`}
													>
														{session.isGuest
															? "Zero-PII Ephemeral Session"
															: revealEmails
															? session.userEmail
															: maskEmailAddress(session.userEmail)}
													</div>
												</div>
											</td>

											<td className="py-3 px-3">
												<div className="font-semibold">
													<span
														className={
															session.status === "RUNNING"
																? "text-emerald-500"
																: "text-amber-500"
														}
													>
														{session.status === "RUNNING"
															? "Running"
															: "Paused"}
													</span>
													<span className={`font-normal ${mutedText}`}>
														{" "}
														• {modeLabel}
													</span>
												</div>
											</td>

											<td className="py-3 px-3">
												<div className="font-medium">{session.protocol}</div>
												<div className={`text-[11px] ${mutedText}`}>
													{session.hasAnchor
														? "Focus anchor set (text private)"
														: "Standard sprint"}
												</div>
											</td>

											<td className="py-3 px-3 tabular-nums">
												<span className={mutedText}>
													Cycle {session.cycle}/{session.totalCycles}
												</span>
											</td>

											<td className="py-3 px-3 w-48">
												<div className="flex items-center justify-between text-xs font-mono mb-1 tabular-nums">
													<span
														className="font-bold"
														style={{
															color:
																session.status === "RUNNING"
																	? activeColor
																	: undefined,
														}}
													>
														{formatDurationMMSS(liveRem)}
													</span>
													<span className={`text-[11px] ${mutedText}`}>
														/ {formatDurationMMSS(session.plannedDuration)} (
														{progress}%)
													</span>
												</div>
												<div
													className={`w-full h-1.5 rounded-sm overflow-hidden ${
														isDark ? "bg-[#1c2432]" : "bg-[#e2e8f0]"
													}`}
												>
													<div
														className="h-full rounded-sm transition-all duration-500"
														style={{
															width: `${progress}%`,
															backgroundColor:
																session.status === "RUNNING"
																	? activeColor
																	: "#f59e0b",
														}}
													/>
												</div>
											</td>

											<td className="py-3 px-3 text-right font-mono tabular-nums">
												{session.deflectionsCount > 0 ? (
													<span className="text-amber-500 font-semibold">
														{session.deflectionsCount} blocked
													</span>
												) : (
													<span className="text-emerald-500">0 (Zen)</span>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</section>

			{/* SECTION 2: USER GROWTH & RETENTION + 14-DAY ACTIVITY TREND */}
			{ov && data && (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
					{/* Left 1/3: User Growth & Retention Funnel */}
					<div className={`${cardClass} p-4 sm:p-6 flex flex-col justify-between gap-4`}>
						<div>
							<span
								className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}
							>
								COHORT RETENTION
							</span>
							<h2 className="text-base font-bold">
								User Growth &amp; Retention
							</h2>
							<p className={`text-xs ${mutedText} mt-0.5`}>
								Active user cohorts and registration velocity.
							</p>
						</div>

						<div className="grid grid-cols-3 gap-2.5">
							<div
								className={`p-3 rounded-xl border ${
									isDark
										? "bg-[#0c1017] border-[#1d2634]"
										: "bg-slate-50 border-slate-200/80"
								}`}
							>
								<div className={`text-[10px] font-bold uppercase ${mutedText}`}>
									DAU (24h)
								</div>
								<div className="text-xl font-bold mt-1 tabular-nums">
									{ov.dau}
								</div>
								<div className={`text-[10px] mt-0.5 ${mutedText}`}>
									{ov.totalUsers > 0
										? `${Math.round((ov.dau / ov.totalUsers) * 100)}% of base`
										: "0%"}
								</div>
							</div>

							<div
								className={`p-3 rounded-xl border ${
									isDark
										? "bg-[#0c1017] border-[#1d2634]"
										: "bg-slate-50 border-slate-200/80"
								}`}
							>
								<div className={`text-[10px] font-bold uppercase ${mutedText}`}>
									WAU (7d)
								</div>
								<div className="text-xl font-bold mt-1 tabular-nums">
									{ov.wau}
								</div>
								<div className={`text-[10px] mt-0.5 ${mutedText}`}>
									{ov.totalUsers > 0
										? `${Math.round((ov.wau / ov.totalUsers) * 100)}% of base`
										: "0%"}
								</div>
							</div>

							<div
								className={`p-3 rounded-xl border ${
									isDark
										? "bg-[#0c1017] border-[#1d2634]"
										: "bg-slate-50 border-slate-200/80"
								}`}
							>
								<div className={`text-[10px] font-bold uppercase ${mutedText}`}>
									MAU (30d)
								</div>
								<div className="text-xl font-bold mt-1 tabular-nums">
									{ov.mau}
								</div>
								<div className={`text-[10px] mt-0.5 ${mutedText}`}>
									{ov.totalUsers > 0
										? `${Math.round((ov.mau / ov.totalUsers) * 100)}% of base`
										: "0%"}
								</div>
							</div>
						</div>

						<div className="flex flex-col gap-2.5 pt-2 border-t border-slate-100 dark:border-[#1d2634] text-xs">
							<div className="flex items-center justify-between">
								<span className={mutedText}>Joined Today</span>
								<span className="font-semibold tabular-nums">
									+{ov.newUsersToday}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className={mutedText}>Joined Last 7 Days</span>
								<span className="font-semibold tabular-nums">
									+{ov.newUsersThisWeek}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className={mutedText}>Joined Last 30 Days</span>
								<span className="font-semibold tabular-nums">
									+{ov.newUsersThisMonth}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className={mutedText}>DAU / MAU Stickiness</span>
								<span className="font-semibold" style={{ color: activeColor }}>
									{ov.mau > 0 ? `${Math.round((ov.dau / ov.mau) * 100)}%` : "0%"}
								</span>
							</div>
						</div>
					</div>

					{/* Right 2/3: 14-Day Trend Chart */}
					<div className={`${cardClass} p-4 sm:p-6 lg:col-span-2 flex flex-col justify-between gap-4`}>
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
							<div>
								<span
									className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}
								>
									ACTIVITY VELOCITY
								</span>
								<h2 className="text-base font-bold">
									14-Day Platform Pulse
								</h2>
								<p className={`text-xs ${mutedText} mt-0.5`}>
									Daily focused hours and new user registrations over the past 2
									weeks.
								</p>
							</div>
							<div className="flex items-center gap-4 text-xs">
								<button
									type="button"
									onClick={() => setTrendMetric("focusHours")}
									className={`py-1 cursor-pointer transition-colors ${
										trendMetric === "focusHours"
											? "font-semibold"
											: `${mutedText} hover:text-slate-900 dark:hover:text-white`
									}`}
									style={
										trendMetric === "focusHours"
											? { color: activeColor }
											: undefined
									}
								>
									Focus Hours
								</button>
								<button
									type="button"
									onClick={() => setTrendMetric("newSignups")}
									className={`py-1 cursor-pointer transition-colors ${
										trendMetric === "newSignups"
											? "font-semibold"
											: `${mutedText} hover:text-slate-900 dark:hover:text-white`
									}`}
									style={
										trendMetric === "newSignups"
											? { color: activeColor }
											: undefined
									}
								>
									New Signups
								</button>
							</div>
						</div>

						{(() => {
							const maxVal = Math.max(
								1,
								...data.dailyTrend.map((d) =>
									trendMetric === "focusHours" ? d.focusHours : d.newSignups
								)
							);
							return (
								<div
									className="grid gap-1.5 sm:gap-2 items-end h-44 pt-4"
									style={{
										gridTemplateColumns: "repeat(14, minmax(0, 1fr))",
									}}
								>
									{data.dailyTrend.map((day) => {
										const val =
											trendMetric === "focusHours"
												? day.focusHours
												: day.newSignups;
										const heightPct =
											val > 0 ? Math.max(10, Math.round((val / maxVal) * 100)) : 4;
										return (
											<div
												key={day.dateStr}
												className="flex flex-col items-center gap-1.5 h-full justify-end group"
												title={`${day.label}: ${
													trendMetric === "focusHours"
														? `${day.focusHours}h (${day.completedSessions} sessions)`
														: `${day.newSignups} new users`
												}`}
											>
												<span
													className={`text-[10px] font-mono tabular-nums ${
														val > 0
															? "font-semibold"
															: "opacity-0 group-hover:opacity-60"
													}`}
													style={{ color: val > 0 ? activeColor : undefined }}
												>
													{val > 0
														? trendMetric === "focusHours"
															? `${val}h`
															: `+${val}`
														: "0"}
												</span>
												<div
													className={`w-full rounded-t-md transition-all duration-300 ${
														val === 0
															? isDark
																? "bg-[#1c2432]"
																: "bg-slate-200"
															: ""
													}`}
													style={{
														height: `${heightPct}%`,
														backgroundColor: val > 0 ? activeColor : undefined,
													}}
												/>
												<span
													className={`text-[9px] truncate max-w-full ${mutedText}`}
												>
													{day.label.split(" ")[1]}
												</span>
											</div>
										);
									})}
								</div>
							);
						})()}
					</div>
				</div>
			)}

			{/* SECTION 3: PRODUCTIVITY HEALTH & k-ANONYMIZED BLOCKER INTELLIGENCE */}
			{ov && data && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
					{/* Left: Popular Protocols & Peak Hours */}
					<div className={`${cardClass} p-4 sm:p-6 flex flex-col gap-4`}>
						<div className="flex items-center justify-between">
							<div>
								<span
									className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}
								>
									CHRONOBIOLOGY &amp; CADENCE
								</span>
								<h2 className="text-base font-bold">
									Focus Protocols &amp; Peak Rhythm
								</h2>
								<p className={`text-xs ${mutedText} mt-0.5`}>
									Most popular session lengths and platform-wide peak window.
								</p>
							</div>
							<div className="text-right">
								<div className={`text-[10px] font-bold uppercase ${mutedText}`}>
									PEAK FOCUS WINDOW
								</div>
								<div
									className="text-xs font-bold mt-0.5"
									style={{ color: activeColor }}
								>
									{ov.peakWindowLabel}
								</div>
							</div>
						</div>

						{/* Protocol Bars */}
						<div className="flex flex-col gap-2.5">
							{data.popularProtocols.length === 0 ? (
								<div className={`text-xs py-4 ${mutedText}`}>
									No completed focus sessions recorded yet.
								</div>
							) : (
								data.popularProtocols.map((p) => (
									<div key={p.protocol} className="flex flex-col gap-1">
										<div className="flex items-center justify-between text-xs">
											<span className="font-medium">{p.protocol}</span>
											<span className={`font-mono tabular-nums ${mutedText}`}>
												{p.count} sessions ({p.sharePercent}%)
											</span>
										</div>
										<div
											className={`w-full h-1.5 rounded-sm overflow-hidden ${
												isDark ? "bg-[#1c2432]" : "bg-[#e2e8f0]"
											}`}
										>
											<div
												className="h-full rounded-sm"
												style={{
													width: `${Math.max(4, p.sharePercent)}%`,
													backgroundColor: activeColor,
												}}
											/>
										</div>
									</div>
								))
							)}
						</div>

						{/* 24h Distribution Mini-Heatmap */}
						<div className="pt-3 border-t border-slate-100 dark:border-[#1d2634]">
							<div
								className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${mutedText}`}
							>
								24-HOUR SESSION START RHYTHM
							</div>
							{(() => {
								const maxHr = Math.max(
									1,
									...data.hourlyDistribution.map((h) => h.count)
								);
								return (
									<div
										className="grid gap-1 items-end h-14"
										style={{
											gridTemplateColumns: "repeat(24, minmax(0, 1fr))",
										}}
									>
										{data.hourlyDistribution.map((h) => {
											const pct =
												h.count > 0
													? Math.max(15, Math.round((h.count / maxHr) * 100))
													: 8;
											return (
												<div
													key={h.hour}
													title={`${h.label}: ${h.count} sessions`}
													className="h-full flex flex-col justify-end items-center"
												>
													<div
														className={`w-full rounded-xs ${
															h.count === 0
																? isDark
																	? "bg-[#1c2432]"
																	: "bg-slate-200"
																: ""
														}`}
														style={{
															height: `${pct}%`,
															backgroundColor:
																h.count > 0 ? activeColor : undefined,
														}}
													/>
												</div>
											);
										})}
									</div>
								);
							})()}
							<div
								className={`flex justify-between text-[10px] mt-1 ${mutedText}`}
							>
								<span>12 AM</span>
								<span>6 AM</span>
								<span>12 PM</span>
								<span>6 PM</span>
								<span>11 PM</span>
							</div>
						</div>
					</div>

					{/* Right: k-Anonymized Top Blocked & Deflected Domains */}
					<div className={`${cardClass} p-4 sm:p-6 flex flex-col gap-4`}>
						<div className="flex items-center justify-between">
							<div>
								<span
									className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}
								>
									K-ANONYMIZED SHIELD TELEMETRY •{" "}
									{data.topBlockedDomains.length} ENTRIES
								</span>
								<h2 className="text-base font-bold">
									Global Blocker &amp; Deflection Leaderboard
								</h2>
								<p className={`text-xs ${mutedText} mt-0.5`}>
									Shared distraction domains. Single-user custom URLs are
									automatically grouped to protect personal browsing privacy.
								</p>
							</div>
						</div>

						{data.topBlockedDomains.length === 0 ? (
							<div className={`text-xs py-6 text-center ${mutedText}`}>
								No blocked domains synced yet.
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-left border-collapse text-xs">
									<thead>
										<tr
											className={`border-b text-[10px] font-bold uppercase tracking-wider ${mutedText} ${
												isDark ? "border-[#1d2634]" : "border-slate-200"
											}`}
										>
											<th className="py-2 pr-3">Domain</th>
											<th className="py-2 px-3 text-right">Users Blocking</th>
											<th className="py-2 pl-3 text-right">
												Total Deflections
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100 dark:divide-[#1a2332]">
										{data.topBlockedDomains.map((dom, idx) => (
											<tr key={dom.domain}>
												<td
													className={`py-2.5 pr-3 ${
														dom.isRedactedSummary
															? `italic ${mutedText}`
															: "font-medium"
													}`}
												>
													{!dom.isRedactedSummary && (
														<span className={`mr-2 font-mono ${mutedText}`}>
															#{idx + 1}
														</span>
													)}
													{dom.domain}
												</td>
												<td className="py-2.5 px-3 text-right font-mono tabular-nums">
													{dom.isRedactedSummary
														? "1 user each"
														: `${dom.usersCount} (${dom.activeCount} active)`}
												</td>
												<td
													className="py-2.5 pl-3 text-right font-mono font-semibold tabular-nums"
													style={{
														color:
															dom.totalDeflections > 0 ? activeColor : undefined,
													}}
												>
													{dom.totalDeflections}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</div>
			)}

			{/* SECTION 4: ZERO-PII SENSORY ADOPTION & DATA MINIMIZATION HYGIENE */}
			{data?.privacySafeAdoption && data?.storageHygiene && (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
					{/* Acoustic Soundscapes */}
					<div className={`${cardClass} p-4 sm:p-6 flex flex-col justify-between gap-4`}>
						<div>
							<span
								className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}
							>
								ZERO-PII SENSORY TELEMETRY
							</span>
							<h2 className="text-base font-bold">
								Synthesized Soundscape Split
							</h2>
							<p className={`text-xs ${mutedText} mt-0.5`}>
								Aggregate preference distribution across Web Audio API presets.
							</p>
						</div>

						<div className="flex flex-col gap-2.5">
							{data.privacySafeAdoption.acousticBreakdown.map((item) => (
								<div key={item.preset} className="flex flex-col gap-1">
									<div className="flex items-center justify-between text-xs">
										<span className="font-medium">{item.preset}</span>
										<span className={`font-mono tabular-nums ${mutedText}`}>
											{item.count} ({item.sharePercent}%)
										</span>
									</div>
									<div
										className={`w-full h-1.5 rounded-sm overflow-hidden ${
											isDark ? "bg-[#1c2432]" : "bg-[#e2e8f0]"
										}`}
									>
										<div
											className="h-full rounded-sm"
											style={{
												width: `${Math.max(4, item.sharePercent)}%`,
												backgroundColor: activeColor,
											}}
										/>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Visualizer, Theme & Flow Automation */}
					<div className={`${cardClass} p-4 sm:p-6 flex flex-col justify-between gap-4`}>
						<div>
							<span
								className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}
							>
								ENVIRONMENT &amp; AUTOMATION
							</span>
							<h2 className="text-base font-bold">
								Visualizer &amp; Flow Preferences
							</h2>
							<p className={`text-xs ${mutedText} mt-0.5`}>
								Aggregate adoption of visualizers, themes, and timer automation.
							</p>
						</div>

						<div className="flex flex-col gap-2 text-xs">
							{data.privacySafeAdoption.visualizerBreakdown.map((v) => (
								<div
									key={v.visualizer}
									className="flex items-center justify-between"
								>
									<span className={mutedText}>{v.visualizer}</span>
									<span className="font-semibold tabular-nums">
										{v.sharePercent}% ({v.count})
									</span>
								</div>
							))}
						</div>

						<div className="flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-[#1d2634] text-xs">
							<div className="flex items-center justify-between">
								<span className={mutedText}>Auto-start Breaks Enabled</span>
								<span className="font-semibold tabular-nums">
									{data.privacySafeAdoption.autoStartBreaksPct}%
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className={mutedText}>Auto-start Focus Enabled</span>
								<span className="font-semibold tabular-nums">
									{data.privacySafeAdoption.autoStartFocusPct}%
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className={mutedText}>
									Sessions Using Focus Anchor
								</span>
								<span className="font-semibold" style={{ color: activeColor }}>
									{data.privacySafeAdoption.anchorAdoptionPct}%
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className={mutedText}>Users with Custom Presets</span>
								<span className="font-semibold tabular-nums">
									{data.privacySafeAdoption.customPresetsUsersCount}
								</span>
							</div>
						</div>
					</div>

					{/* Data Minimization & Storage Hygiene */}
					<div className={`${cardClass} p-4 sm:p-6 flex flex-col justify-between gap-4`}>
						<div>
							<span
								className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}
							>
								DATA MINIMIZATION &amp; HYGIENE
							</span>
							<h2 className="text-base font-bold">
								Cloud Sync Footprint
							</h2>
							<p className={`text-xs ${mutedText} mt-0.5`}>
								Verify zero data bloat and prune unlinked or stale records.
							</p>
						</div>

						<div className="flex flex-col gap-2 text-xs">
							<div className="flex items-center justify-between">
								<span className={mutedText}>FocusSession Rows</span>
								<span className="font-mono font-semibold tabular-nums">
									{data.storageHygiene.sessionsRows}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className={mutedText}>BlockedWebsite Rules</span>
								<span className="font-mono font-semibold tabular-nums">
									{data.storageHygiene.blockedWebsiteRows}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className={mutedText}>DeflectionEvent Logs</span>
								<span className="font-mono font-semibold tabular-nums">
									{data.storageHygiene.deflectionRows}
								</span>
							</div>
							<div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#1d2634]">
								<span className={mutedText}>Orphaned / Unlinked Rows</span>
								<span
									className={`font-mono font-semibold tabular-nums ${
										data.storageHygiene.orphanedRecordsCount > 0
											? "text-amber-500"
											: "text-emerald-500"
									}`}
								>
									{data.storageHygiene.orphanedRecordsCount}
								</span>
							</div>
						</div>

						<div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100 dark:border-[#1d2634]">
							<div className="flex items-center justify-between text-xs">
								<span className={mutedText}>Storage Hygiene Action</span>
								<button
									type="button"
									disabled={isPruning}
									onClick={handlePruneOrphaned}
									className="font-semibold hover:underline cursor-pointer disabled:opacity-50"
									style={{ color: activeColor }}
								>
									{isPruning
										? "Pruning..."
										: "Prune orphaned & stale records →"}
								</button>
							</div>
							{pruneNotice && (
								<span className={`text-[11px] ${mutedText}`}>
									{pruneNotice}
								</span>
							)}
						</div>
					</div>
				</div>
			)}

			{/* SECTION 5: SEARCHABLE USER DIRECTORY & ADMIN CONTROLS */}
			<section className={`${cardClass} p-4 sm:p-6 flex flex-col gap-4`}>
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
					<div>
						<span
							className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}
						>
							CLOUD SYNC ROSTER • SHOWING {filteredAndSortedUsers.length} OF{" "}
							{data?.users.length || 0}
						</span>
						<div className="flex items-center gap-4">
							<h2 className="text-base font-bold">
								User Directory &amp; Leaderboard
							</h2>
							<button
								type="button"
								onClick={() => setRevealEmails((prev) => !prev)}
								className="text-xs font-medium hover:underline cursor-pointer"
								style={{ color: activeColor }}
							>
								{revealEmails ? "Mask emails" : "Reveal emails"}
							</button>
						</div>
						<p className={`text-xs ${mutedText} mt-0.5`}>
							Opt-in Cloud Sync accounts. Emails are masked by default for
							privacy.
						</p>
					</div>

					{/* Search, Filter & Sort Controls */}
					<div className="flex flex-wrap items-center gap-2">
						<div className="relative">
							<input
								type="text"
								value={userSearch}
								onChange={(e) => setUserSearch(e.target.value)}
								placeholder="Search name or email..."
								className={`pl-8 pr-3 py-1.5 rounded-xl text-xs border outline-none transition-colors w-48 sm:w-56 ${
									isDark
										? "bg-[#0c1017] border-[#1d2634] text-slate-100 placeholder:text-[#64748b]"
										: "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400"
								}`}
							/>
							<svg
								className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${mutedText}`}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<circle cx="11" cy="11" r="8" />
								<line x1="21" y1="21" x2="16.65" y2="16.65" />
							</svg>
						</div>

						<select
							value={userFilter}
							onChange={(e) => setUserFilter(e.target.value as any)}
							aria-label="Filter users"
							className={`px-2.5 py-1.5 rounded-xl text-xs border outline-none cursor-pointer ${
								isDark
									? "bg-[#0c1017] border-[#1d2634] text-slate-200"
									: "bg-slate-50 border-slate-200 text-slate-700"
							}`}
						>
							<option value="ALL">All Users</option>
							<option value="ACTIVE_TIMER">Using Timer Now</option>
							<option value="STREAK">Active Streak (&gt;0d)</option>
							<option value="SUPERADMIN">Superadmins</option>
						</select>

						<select
							value={userSort}
							onChange={(e) => setUserSort(e.target.value as any)}
							aria-label="Sort users"
							className={`px-2.5 py-1.5 rounded-xl text-xs border outline-none cursor-pointer ${
								isDark
									? "bg-[#0c1017] border-[#1d2634] text-slate-200"
									: "bg-slate-50 border-slate-200 text-slate-700"
							}`}
						>
							<option value="recent">Sort: Recently Active</option>
							<option value="hours">Sort: Most Focus Hours</option>
							<option value="xp">Sort: Highest Flow XP</option>
							<option value="streak">Sort: Highest Streak</option>
							<option value="joined">Sort: Newest Joined</option>
						</select>
					</div>
				</div>

				<div className="overflow-x-auto -mx-4 sm:mx-0">
					<table className="w-full text-left border-collapse min-w-[880px]">
						<thead>
							<tr
								className={`border-b text-[10px] font-bold uppercase tracking-wider ${mutedText} ${
									isDark ? "border-[#1d2634]" : "border-slate-200"
								}`}
							>
								<th className="py-2.5 px-4 sm:px-3">User</th>
								<th className="py-2.5 px-3">Live Timer</th>
								<th className="py-2.5 px-3">Focus Volume</th>
								<th className="py-2.5 px-3">Streak &amp; XP</th>
								<th className="py-2.5 px-3">Shield &amp; Policy</th>
								<th className="py-2.5 px-3">Joined / Last Active</th>
								<th className="py-2.5 px-3 text-right">Action</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 dark:divide-[#1a2332] text-xs">
							{filteredAndSortedUsers.map((u) => {
								const liveTimerRem = u.activeTimer
									? getLiveRemainingSeconds(
											u.activeTimer.status,
											u.activeTimer.remainingDuration,
											u.activeTimer.endsAt
									  )
									: null;

								return (
									<tr
										key={u.id}
										className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors"
									>
										{/* User */}
										<td className="py-3 px-4 sm:px-3">
											<div className="min-w-0">
												<div className="flex items-center gap-1.5">
													<span className="font-semibold truncate">
														{u.name}
													</span>
													{u.isSuperAdmin && (
														<span
															className="text-[10px] font-bold uppercase tracking-wider"
															style={{ color: activeColor }}
														>
															• Admin
														</span>
													)}
												</div>
												<div className={`text-[11px] truncate ${mutedText}`}>
													{revealEmails
														? u.email || "No email"
														: maskEmailAddress(u.email)}
												</div>
											</div>
										</td>

										{/* Live Timer */}
										<td className="py-3 px-3">
											{u.activeTimer && liveTimerRem !== null ? (
												<div className="flex flex-col gap-0.5">
													<div className="flex items-center gap-1.5">
														<span className="font-mono font-bold tabular-nums">
															{formatDurationMMSS(liveTimerRem)}
														</span>
														<span className={`text-[10px] ${mutedText}`}>
															({u.activeTimer.status.toLowerCase()})
														</span>
													</div>
													<span className={`text-[10px] ${mutedText}`}>
														{u.activeTimer.protocol}
													</span>
												</div>
											) : (
												<span className={`text-[11px] ${mutedText}`}>Idle</span>
											)}
										</td>

										{/* Focus Volume */}
										<td className="py-3 px-3 tabular-nums">
											<div className="font-semibold">
												{u.totalFocusHours} hrs
											</div>
											<div className={`text-[11px] ${mutedText}`}>
												{u.completedSessionsCount} done • {u.stoppedSessionsCount}{" "}
												early
											</div>
										</td>

										{/* Streak & XP */}
										<td className="py-3 px-3 tabular-nums">
											<div className="font-semibold">
												{u.currentStreak > 0
													? `${u.currentStreak}d streak`
													: "0d streak"}{" "}
												<span className={`text-[10px] font-normal ${mutedText}`}>
													(best {u.longestStreak}d)
												</span>
											</div>
											<div className={`text-[11px] ${mutedText}`}>
												Lv. {u.level} • {u.totalXp.toLocaleString()} XP
											</div>
										</td>

										{/* Shield & Policy */}
										<td className="py-3 px-3 tabular-nums">
											<div className="font-medium">
												{u.totalShieldsRepelled} deflections
											</div>
											<div className={`text-[11px] ${mutedText}`}>
												{u.blockedSitesCount} sites • {u.strictBlocking}
											</div>
										</td>

										{/* Joined / Last Active */}
										<td className="py-3 px-3 tabular-nums">
											<div className="font-medium">
												{formatRelativeTime(u.lastActiveAt, nowMs)}
											</div>
											<div className={`text-[11px] ${mutedText}`}>
												Joined{" "}
												{new Date(u.createdAt).toLocaleDateString("en-US", {
													month: "short",
													day: "numeric",
													year: "numeric",
												})}
											</div>
										</td>

										{/* Action */}
										<td className="py-3 px-3 text-right">
											{u.isSuperAdmin ? (
												<span className={`text-[11px] ${mutedText}`}>
													Protected
												</span>
											) : (
												<button
													type="button"
													onClick={() => {
														setDeleteError(null);
														setUserToDelete(u);
													}}
													className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline transition-colors cursor-pointer"
												>
													Delete
												</button>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</section>

			{/* Delete User Confirmation Modal */}
			{userToDelete &&
				mounted &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
						onClick={() => {
							if (!isDeleting) {
								setUserToDelete(null);
								setDeleteError(null);
							}
						}}
					>
						<div
							onClick={(e) => e.stopPropagation()}
							className="w-full max-w-[440px] mx-auto rounded-3xl border p-6 shadow-2xl relative bg-white dark:bg-[#0e141e] border-slate-200 dark:border-[#1d2634] text-slate-900 dark:text-slate-100 flex flex-col gap-4"
							role="dialog"
							aria-modal="true"
							aria-labelledby="delete-user-title"
						>
							<div className="min-w-0">
								<h3
									id="delete-user-title"
									className="text-base font-bold text-slate-900 dark:text-white"
								>
									Delete User Account
								</h3>
								<p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
									{userToDelete.email || userToDelete.name}
								</p>
							</div>

							<p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
								Are you sure you want to permanently delete{" "}
								<strong className="text-slate-900 dark:text-white">
									{userToDelete.name}
								</strong>
								? This will remove their cloud account,{" "}
								{userToDelete.completedSessionsCount} recorded sessions,{" "}
								{userToDelete.blockedSitesCount} blocklist rules, streaks, and
								XP. This action cannot be undone.
							</p>

							{deleteError && (
								<div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
									{deleteError}
								</div>
							)}

							<div className="flex items-center justify-end gap-4 pt-2">
								<button
									type="button"
									disabled={isDeleting}
									onClick={() => {
										setUserToDelete(null);
										setDeleteError(null);
									}}
									className="py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:underline transition-colors cursor-pointer"
								>
									Cancel
								</button>
								<button
									type="button"
									disabled={isDeleting}
									onClick={handleConfirmDeleteUser}
									className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-50"
								>
									{isDeleting ? "Deleting..." : "Permanently Delete"}
								</button>
							</div>
						</div>
					</div>,
					document.body
				)}
		</main>
	);
}
