import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/auth";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json().catch(() => null);
		if (!body || typeof body !== "object") {
			return NextResponse.json(
				{ error: "Invalid timer status payload" },
				{ status: 400 }
			);
		}

		const user = await getCurrentUser();
		const {
			action,
			mode = "focus",
			isRunning = false,
			plannedSeconds = 1500,
			remainingSeconds = 1500,
			endsAt = null,
			cycle = 1,
			totalCycles = 4,
			hasAnchor = false,
			deflectionsCount = 0,
			ephemeralGuestId = "",
		} = body;

		const sanitizedGuestCode =
			!user && typeof ephemeralGuestId === "string" && ephemeralGuestId.trim()
				? `#GUEST-${ephemeralGuestId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`
				: null;

		if (!user && !sanitizedGuestCode) {
			return NextResponse.json({ ok: true, synced: false });
		}

		const whereFilter = user
			? {
					userId: user.id,
					status: { in: ["RUNNING", "PAUSED"] as any },
			  }
			: {
					userId: null,
					sessionCode: sanitizedGuestCode!,
					status: { in: ["RUNNING", "PAUSED"] as any },
			  };

		// If the timer was reset, skipped, completed, or hasn't started ticking yet, delete the ephemeral live row
		if (
			action === "stop" ||
			(!isRunning && remainingSeconds >= plannedSeconds && action !== "pause")
		) {
			await prisma.focusSession.deleteMany({
				where: whereFilter,
			});
			return NextResponse.json({ ok: true, synced: true, active: false });
		}

		const prismaMode =
			mode === "shortBreak"
				? "SHORT_BREAK"
				: mode === "longBreak"
				? "LONG_BREAK"
				: "FOCUS";

		const prismaStatus = isRunning ? "RUNNING" : "PAUSED";
		const plannedMins = Math.max(1, Math.round(plannedSeconds / 60));
		const protocolLabel =
			prismaMode === "SHORT_BREAK"
				? `Short Break (${plannedMins}m)`
				: prismaMode === "LONG_BREAK"
				? `Long Break (${plannedMins}m)`
				: `Deep Focus (${plannedMins}m)`;

		const clampedRemaining = Math.max(
			0,
			Math.min(plannedSeconds, Math.round(remainingSeconds))
		);
		const actualElapsed = Math.max(
			0,
			Math.round(plannedSeconds - clampedRemaining)
		);
		const endsAtDate =
			isRunning && typeof endsAt === "number" && endsAt > 0
				? new Date(endsAt)
				: isRunning
				? new Date(Date.now() + clampedRemaining * 1000)
				: null;

		const existingActive = await prisma.focusSession.findMany({
			where: whereFilter,
			orderBy: { updatedAt: "desc" },
		});

		if (existingActive.length > 0) {
			const primary = existingActive[0];
			if (existingActive.length > 1) {
				await prisma.focusSession.deleteMany({
					where: {
						id: { in: existingActive.slice(1).map((s) => s.id) },
					},
				});
			}

			await prisma.focusSession.update({
				where: { id: primary.id },
				data: {
					mode: prismaMode,
					status: prismaStatus,
					protocol: protocolLabel,
					plannedDuration: Math.round(plannedSeconds),
					actualDuration: actualElapsed,
					remainingDuration: clampedRemaining,
					endsAt: endsAtDate,
					pausedAt: !isRunning ? new Date() : null,
					cycle: Number(cycle) || 1,
					totalCycles: Number(totalCycles) || 4,
					notes: hasAnchor ? "__HAS_ANCHOR__" : null,
					deflectionsCount: Math.max(
						primary.deflectionsCount || 0,
						Number(deflectionsCount) || 0
					),
				},
			});
		} else {
			await prisma.focusSession.create({
				data: {
					userId: user ? user.id : null,
					sessionCode: user
						? `#LIVE-${user.id.slice(-4).toUpperCase()}`
						: sanitizedGuestCode,
					mode: prismaMode,
					status: prismaStatus,
					protocol: protocolLabel,
					plannedDuration: Math.round(plannedSeconds),
					actualDuration: actualElapsed,
					remainingDuration: clampedRemaining,
					startedAt: new Date(Date.now() - actualElapsed * 1000),
					endsAt: endsAtDate,
					pausedAt: !isRunning ? new Date() : null,
					cycle: Number(cycle) || 1,
					totalCycles: Number(totalCycles) || 4,
					notes: hasAnchor ? "__HAS_ANCHOR__" : null,
					deflectionsCount: Number(deflectionsCount) || 0,
				},
			});
		}

		return NextResponse.json({ ok: true, synced: true, active: true });
	} catch (error) {
		console.error("Failed to update live timer status:", error);
		return NextResponse.json(
			{ error: "Failed to update timer status" },
			{ status: 500 }
		);
	}
}
