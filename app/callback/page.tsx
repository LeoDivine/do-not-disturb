"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useTheme } from "../../context/theme-context";
import { useTimer } from "../../context/timer-context";
import { SPOTIFY_AUTH_UPDATED_EVENT } from "../../lib/spotify/spotify-store";

type CallbackStatus = "loading" | "success" | "error";
type ErrorKind = "canceled" | "general";

function getFriendlyError(
	errorCode: string | null,
	rawMessage: string | null,
	providerTitle: string,
): { kind: ErrorKind; message: string } {
	if (errorCode === "access_denied") {
		return {
			kind: "canceled",
			message: `No worries — the ${providerTitle} sign-in was canceled. You can connect your account whenever you're ready.`,
		};
	}

	if (errorCode === "missing_code") {
		return {
			kind: "general",
			message: `We didn't receive a sign-in confirmation from ${providerTitle}. Please try connecting again.`,
		};
	}

	if (errorCode === "csrf_state_mismatch") {
		return {
			kind: "general",
			message: "That sign-in session expired. Please try connecting again.",
		};
	}

	if (errorCode === "missing_credentials") {
		return {
			kind: "general",
			message: `${providerTitle} isn't configured right now. Please check your app settings and try again.`,
		};
	}

	if (errorCode === "token_exchange_failed" || errorCode === "exchange_failed") {
		return {
			kind: "general",
			message: `We couldn't finish linking your ${providerTitle} account. Please try again in a moment.`,
		};
	}

	if (rawMessage && !/token|oauth|csrf|redirect_uri|parameter/i.test(rawMessage)) {
		return {
			kind: "general",
			message: rawMessage,
		};
	}

	return {
		kind: "general",
		message: `Something went wrong while connecting to ${providerTitle}. Please try again.`,
	};
}

interface ExchangeResult {
	code: string;
	status: "success" | "error";
	accountName?: string;
	errorKind?: ErrorKind;
	errorMessage?: string;
}

// Deduplicate single-use OAuth code exchange requests across React Strict Mode double-mounts
const inflightCodeExchanges = new Map<
	string,
	Promise<{ httpOk: boolean; data: Record<string, any> }>
>();

function notifyOpenerAndBroadcast(
	success: boolean,
	prov: string,
	account?: string,
) {
	if (typeof window === "undefined") return;
	try {
		window.dispatchEvent(
			new CustomEvent(SPOTIFY_AUTH_UPDATED_EVENT, {
				detail: { connected: success, provider: prov, account },
			}),
		);

		if (typeof BroadcastChannel !== "undefined") {
			const bc = new BroadcastChannel("dnd-spotify-channel");
			bc.postMessage({
				type: "SPOTIFY_AUTH_SYNC",
				connected: success,
				provider: prov,
				account,
			});
			bc.close();
		}

		if (window.opener && !window.opener.closed) {
			window.opener.postMessage(
				{
					type: "DND_OAUTH_CALLBACK",
					success,
					provider: prov,
					account,
				},
				window.location.origin,
			);
			if (success) {
				setTimeout(() => {
					try {
						window.close();
					} catch {}
				}, 1200);
			}
		}
	} catch {}
}

function CallbackContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const { isDark } = useTheme();
	const { activeColor } = useTimer();

	const [exchangeResult, setExchangeResult] =
		useState<ExchangeResult | null>(null);
	const [countdown, setCountdown] = useState<number>(3);

	const incomingStatus = searchParams.get("status");
	const incomingProvider = searchParams.get("provider") || "spotify";
	const incomingAccount = searchParams.get("account");
	const incomingError = searchParams.get("error");
	const incomingMessage = searchParams.get("message");
	const code = searchParams.get("code");
	const state = searchParams.get("state");

	const providerTitle =
		incomingProvider.charAt(0).toUpperCase() +
		incomingProvider.slice(1).toLowerCase();

	const isDirectVisit = !incomingStatus && !incomingError && !code;

	// Derive current status, accountName, and error details synchronously during render
	let status: CallbackStatus = "loading";
	let accountName = incomingAccount || "Spotify Account";
	let errorKind: ErrorKind = "general";
	let errorMessage = "";

	if (incomingStatus === "error" || Boolean(incomingError)) {
		status = "error";
		const friendly = getFriendlyError(
			incomingError,
			incomingMessage,
			providerTitle,
		);
		errorKind = friendly.kind;
		errorMessage = friendly.message;
	} else if (incomingStatus === "success") {
		status = "success";
		accountName = incomingAccount || "Spotify Listener";
	} else if (code) {
		if (exchangeResult && exchangeResult.code === code) {
			status = exchangeResult.status;
			if (exchangeResult.accountName) {
				accountName = exchangeResult.accountName;
			}
			if (exchangeResult.errorKind) {
				errorKind = exchangeResult.errorKind;
			}
			if (exchangeResult.errorMessage) {
				errorMessage = exchangeResult.errorMessage;
			}
		} else {
			status = "loading";
		}
	}

	// Side effects: redirect on direct visit, broadcast status, or exchange code
	useEffect(() => {
		if (isDirectVisit) {
			router.replace("/");
			return;
		}

		if (incomingStatus === "error" || Boolean(incomingError)) {
			notifyOpenerAndBroadcast(false, incomingProvider);
			return;
		}

		if (incomingStatus === "success") {
			notifyOpenerAndBroadcast(
				true,
				incomingProvider,
				incomingAccount || "Spotify Listener",
			);
			return;
		}

		if (code) {
			let cancelled = false;
			const redirectUri = `${window.location.origin}${window.location.pathname}`;

			let exchangePromise = inflightCodeExchanges.get(code);
			if (!exchangePromise) {
				exchangePromise = fetch("/api/spotify/callback", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ code, state, redirectUri }),
				}).then(async (res) => {
					const data = await res.json().catch(() => ({}));
					return { httpOk: res.ok, data };
				});
				inflightCodeExchanges.set(code, exchangePromise);
			}

			exchangePromise
				.then(({ httpOk, data }) => {
					if (cancelled) return;
					if (httpOk && data.ok) {
						const name =
							data.user?.displayName || "Spotify Listener";
						setExchangeResult({
							code,
							status: "success",
							accountName: name,
						});
						notifyOpenerAndBroadcast(true, "spotify", name);
						window.history.replaceState(
							{},
							"",
							`/callback?status=success&provider=spotify&account=${encodeURIComponent(name)}`,
						);
					} else {
						const friendly = getFriendlyError(
							data.error || "exchange_failed",
							data.message || null,
							providerTitle,
						);
						setExchangeResult({
							code,
							status: "error",
							errorKind: friendly.kind,
							errorMessage: friendly.message,
						});
						notifyOpenerAndBroadcast(false, "spotify");
					}
				})
				.catch(() => {
					if (cancelled) return;
					inflightCodeExchanges.delete(code);
					setExchangeResult({
						code,
						status: "error",
						errorKind: "general",
						errorMessage: `We couldn't reach ${providerTitle} right now. Please check your internet connection and try again.`,
					});
					notifyOpenerAndBroadcast(false, "spotify");
				});

			return () => {
				cancelled = true;
			};
		}
	}, [
		isDirectVisit,
		incomingStatus,
		incomingError,
		incomingProvider,
		incomingAccount,
		code,
		state,
		providerTitle,
		router,
	]);

	// Auto-redirect countdown on success
	useEffect(() => {
		if (status !== "success") return;

		const timer = setInterval(() => {
			setCountdown((prev) => {
				if (prev <= 1) {
					clearInterval(timer);
					router.push("/connected-apps");
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(timer);
	}, [status, router]);

	if (isDirectVisit) {
		return <main className="flex-1" />;
	}

	const errorHeading =
		errorKind === "canceled" ? "Sign-in canceled" : (
			`Couldn't connect ${providerTitle}`
		);

	return (
		<main className="max-w-md w-full mx-auto px-6 py-16 sm:py-24 flex-1 flex flex-col items-center justify-center text-center">
			{status === "loading" && (
				<div className="flex flex-col items-center">
					<svg
						className="w-6 h-6 animate-spin mb-6 text-[#64748b] dark:text-[#7e8c9f]"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.75"
						aria-hidden="true"
					>
						<path d="M21 12a9 9 0 1 1-6.219-8.56" />
					</svg>
					<h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#0f172a] dark:text-[#f1f5f9]">
						Connecting {providerTitle}...
					</h1>
					<p className="text-sm mt-2.5 text-[#64748b] dark:text-[#7e8c9f] leading-relaxed">
						Just a moment while we get your music ready for focus
						sessions.
					</p>
				</div>
			)}

			{status === "success" && (
				<div className="flex flex-col items-center">
					<svg
						className="w-6 h-6 mb-6"
						style={{ color: activeColor }}
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<polyline points="20 6 9 17 4 12" />
					</svg>

					<h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#0f172a] dark:text-[#f1f5f9]">
						{providerTitle} is connected
					</h1>
					<p className="text-sm mt-2.5 text-[#64748b] dark:text-[#7e8c9f] leading-relaxed">
						Signed in as{" "}
						<span className="font-medium text-[#0f172a] dark:text-[#f1f5f9]">
							{accountName}
						</span>
						. Your playlists are ready whenever you start a focus
						session.
					</p>

					<div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
						<Link
							href="/connected-apps"
							className="px-5 py-2.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-90"
							style={{
								backgroundColor: activeColor,
								color: isDark ? "#00201d" : "#ffffff",
							}}
						>
							Continue to Connected Apps
						</Link>
						<Link
							href="/"
							className="text-xs font-medium text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-[#f1f5f9] transition-colors py-2 px-3"
						>
							Back to timer
						</Link>
					</div>

					<p className="text-xs mt-8 text-[#94a3b8] dark:text-[#64748b]">
						Taking you back in {countdown}s...
					</p>
				</div>
			)}

			{status === "error" && (
				<div className="flex flex-col items-center">
					<h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#0f172a] dark:text-[#f1f5f9]">
						{errorHeading}
					</h1>
					<p className="text-sm mt-2.5 text-[#64748b] dark:text-[#7e8c9f] leading-relaxed">
						{errorMessage ||
							"Something went wrong while connecting your account."}
					</p>

					<div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
						<a
							href="/api/spotify/auth"
							className="px-5 py-2.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-90"
							style={{
								backgroundColor: activeColor,
								color: isDark ? "#00201d" : "#ffffff",
							}}
						>
							Try again
						</a>
						<Link
							href="/connected-apps"
							className="text-xs font-medium text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-[#f1f5f9] transition-colors py-2 px-3"
						>
							Back to Connected Apps
						</Link>
					</div>
				</div>
			)}
		</main>
	);
}

export default function CallbackPage() {
	return (
		<Suspense
			fallback={
				<main className="max-w-md w-full mx-auto px-6 py-24 flex-1 flex items-center justify-center">
					<p className="text-sm text-[#64748b] dark:text-[#7e8c9f]">
						Just a moment...
					</p>
				</main>
			}
		>
			<CallbackContent />
		</Suspense>
	);
}
