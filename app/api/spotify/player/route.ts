import { NextRequest, NextResponse } from "next/server";
import {
  getValidSpotifySession,
  refreshSpotifySession,
  StoredSpotifySession,
} from "@/lib/spotify/spotify-server";

export interface SpotifyConnectDevice {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  volumePercent: number | null;
}

function normalizeDevices(rawDevices: any[]): SpotifyConnectDevice[] {
  if (!Array.isArray(rawDevices)) return [];
  return rawDevices
    .filter((d) => d && typeof d.id === "string")
    .map((d) => ({
      id: d.id,
      name: d.name || "Spotify Device",
      type: d.type || "Computer",
      isActive: Boolean(d.is_active),
      volumePercent:
        typeof d.volume_percent === "number" ? d.volume_percent : null,
    }));
}

async function fetchWithSpotifyAuth(
  url: string,
  init: RequestInit,
  session: StoredSpotifySession
): Promise<{ res: Response; session: StoredSpotifySession }> {
  let activeSession = session;
  let res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${activeSession.accessToken}`,
    },
    cache: "no-store",
  });

  if (res.status === 401 && activeSession.refreshToken) {
    const refreshed = await refreshSpotifySession(activeSession);
    if (refreshed) {
      activeSession = refreshed;
      res = await fetch(url, {
        ...init,
        headers: {
          ...(init.headers || {}),
          Authorization: `Bearer ${activeSession.accessToken}`,
        },
        cache: "no-store",
      });
    }
  }

  return { res, session: activeSession };
}

async function parseSpotifyError(res: Response): Promise<{
  message: string;
  reason: string;
  errorCode:
    | "premium_required"
    | "insufficient_scope"
    | "spotify_dev_mode_restricted"
    | "no_active_device"
    | "spotify_api_error";
}> {
  const raw = await res.text().catch(() => "");
  let message = raw;
  let reason = "";
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.error?.message === "string") {
      message = parsed.error.message;
    }
    if (typeof parsed?.error?.reason === "string") {
      reason = parsed.error.reason;
    }
  } catch {}

  const upperMsg = message.toUpperCase();
  const upperReason = reason.toUpperCase();

  if (
    upperReason === "PREMIUM_REQUIRED" ||
    upperMsg.includes("PREMIUM_REQUIRED") ||
    upperMsg.includes("PREMIUM REQUIRED")
  ) {
    return { message, reason, errorCode: "premium_required" };
  }

  if (
    upperReason === "NO_ACTIVE_DEVICE" ||
    upperMsg.includes("NO ACTIVE DEVICE") ||
    upperMsg.includes("NO_ACTIVE_DEVICE")
  ) {
    return { message, reason, errorCode: "no_active_device" };
  }

  if (
    upperMsg.includes("INSUFFICIENT CLIENT SCOPE") ||
    upperMsg.includes("PERMISSION MISSING") ||
    upperMsg.includes("INSUFFICIENT_SCOPE")
  ) {
    return { message, reason, errorCode: "insufficient_scope" };
  }

  if (res.status === 403) {
    return { message, reason, errorCode: "spotify_dev_mode_restricted" };
  }

  return { message, reason, errorCode: "spotify_api_error" };
}

/**
 * GET /api/spotify/player
 * - `?token=1`: Returns a fresh OAuth accessToken for the browser Spotify Web Playback SDK
 *   (`window.Spotify.Player`) so the website registers as a live Spotify Connect device.
 * - Default: Returns the user's real-time Spotify Connect playback state (`/v1/me/player`)
 *   including the current song, artist, album art, playback progress, and active device.
 */
export async function GET(req: NextRequest) {
  const wantsToken = req.nextUrl.searchParams.get("token") === "1";
  const includeDevices = req.nextUrl.searchParams.get("devices") === "1";

  const { session } = await getValidSpotifySession();
  if (!session?.accessToken) {
    return NextResponse.json({
      connected: false,
      isPlaying: false,
      track: null,
      device: null,
      devices: [],
    });
  }

  const scopeStr = session.scope || "";
  // If scope wasn't stored on an older session cookie, we assume true until proven otherwise by 403/401
  const hasPlaybackControlScope =
    !scopeStr || scopeStr.includes("user-modify-playback-state");
  const canStream = !scopeStr || scopeStr.includes("streaming");
  const userProduct = session.user?.product || "unknown";
  const isFreeTier = userProduct === "free" || userProduct === "open";

  if (wantsToken) {
    if (isFreeTier) {
      return NextResponse.json({
        connected: true,
        accessToken: null,
        expiresAt: session.expiresAt,
        scope: session.scope || null,
        hasPlaybackControlScope,
        canStream: false,
        product: userProduct,
        errorCode: "premium_required",
      });
    }
    if (!canStream) {
      return NextResponse.json({
        connected: true,
        accessToken: null,
        expiresAt: session.expiresAt,
        scope: session.scope || null,
        hasPlaybackControlScope,
        canStream: false,
        product: userProduct,
        errorCode: "insufficient_scope",
      });
    }
    return NextResponse.json({
      connected: true,
      accessToken: session.accessToken,
      expiresAt: session.expiresAt,
      scope: session.scope || null,
      hasPlaybackControlScope,
      canStream,
      product: userProduct,
    });
  }

  try {
    const { res, session: currentSession } = await fetchWithSpotifyAuth(
      "https://api.spotify.com/v1/me/player",
      { method: "GET" },
      session
    );

    if (res.status === 429) {
      const retryAfterSec = Number(res.headers.get("Retry-After")) || 10;
      return NextResponse.json({
        connected: true,
        isPlaying: false,
        track: null,
        device: null,
        devices: [],
        hasPlaybackControlScope,
        canStream,
        rateLimited: true,
        retryAfterMs: Math.min(Math.max(retryAfterSec * 1000, 5_000), 60_000),
      });
    }

    let devices: SpotifyConnectDevice[] = [];
    if (includeDevices) {
      try {
        const devResp = await fetchWithSpotifyAuth(
          "https://api.spotify.com/v1/me/player/devices",
          { method: "GET" },
          currentSession
        );
        if (devResp.res.ok) {
          const devData = await devResp.res.json();
          devices = normalizeDevices(devData.devices);
        }
      } catch {}
    }

    if (res.status === 204 || res.status === 404) {
      return NextResponse.json({
        connected: true,
        isPlaying: false,
        track: null,
        device: devices.find((d) => d.isActive) || null,
        devices,
        hasPlaybackControlScope,
        canStream,
      });
    }

    if (res.status === 403) {
      const parsedErr = await parseSpotifyError(res);
      const isScopeError = parsedErr.errorCode === "insufficient_scope";
      return NextResponse.json({
        connected: true,
        isPlaying: false,
        track: null,
        device: null,
        devices,
        hasPlaybackControlScope: isScopeError ? false : hasPlaybackControlScope,
        canStream: isScopeError ? false : canStream,
        errorCode: parsedErr.errorCode,
      });
    }

    if (!res.ok) {
      return NextResponse.json({
        connected: true,
        isPlaying: false,
        track: null,
        device: null,
        devices,
        hasPlaybackControlScope,
        canStream,
      });
    }

    const data = await res.json();
    const item = data?.item;
    const rawDevice = data?.device;

    const activeDevice: SpotifyConnectDevice | null = rawDevice?.id
      ? {
          id: rawDevice.id,
          name: rawDevice.name || "Spotify App",
          type: rawDevice.type || "Computer",
          isActive: Boolean(rawDevice.is_active ?? true),
          volumePercent:
            typeof rawDevice.volume_percent === "number"
              ? rawDevice.volume_percent
              : null,
        }
      : null;

    const track = item
      ? {
          id: item.id || "",
          uri: item.uri || "",
          title: item.name || "Spotify Track",
          artist: Array.isArray(item.artists)
            ? item.artists
                .map((a: any) => a?.name)
                .filter(Boolean)
                .join(", ")
            : "Spotify",
          album: item.album?.name || "",
          artworkUrl: item.album?.images?.[0]?.url || null,
          durationMs:
            typeof item.duration_ms === "number" ? item.duration_ms : 0,
        }
      : null;

    return NextResponse.json({
      connected: true,
      isPlaying: Boolean(data?.is_playing),
      progressMs: typeof data?.progress_ms === "number" ? data.progress_ms : 0,
      contextUri: data?.context?.uri || null,
      track,
      device: activeDevice,
      devices,
      hasPlaybackControlScope,
      canStream,
    });
  } catch {
    return NextResponse.json({
      connected: true,
      isPlaying: false,
      track: null,
      device: null,
      devices: [],
    });
  }
}

/**
 * POST / PUT /api/spotify/player
 * Sends playback control commands (`play`, `pause`, `next`, `prev`, `transfer`)
 * to Spotify Connect so changes on the website immediately reflect in the user's
 * Spotify desktop/mobile app and vice versa.
 */
export async function POST(req: NextRequest) {
  const { session } = await getValidSpotifySession();
  if (!session?.accessToken) {
    return NextResponse.json(
      { ok: false, error: "not_connected" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      action,
      uri,
      contextUri,
      deviceId,
      play = true,
    } = body as {
      action?: "play" | "pause" | "resume" | "next" | "prev" | "transfer";
      uri?: string;
      contextUri?: string;
      deviceId?: string;
      play?: boolean;
    };

    if (!action) {
      return NextResponse.json(
        { ok: false, error: "missing_action" },
        { status: 400 }
      );
    }

    const deviceQuery = deviceId
      ? `?device_id=${encodeURIComponent(deviceId)}`
      : "";

    const buildControlResponse = async (res: Response) => {
      if (res.status === 429) {
        const retryAfterSec = Number(res.headers.get("Retry-After")) || 10;
        return NextResponse.json({
          ok: false,
          status: 429,
          rateLimited: true,
          retryAfterMs: Math.min(Math.max(retryAfterSec * 1000, 5_000), 60_000),
        });
      }
      if (res.status === 403) {
        const parsedErr = await parseSpotifyError(res);
        return NextResponse.json({
          ok: false,
          status: 403,
          errorCode: parsedErr.errorCode,
        });
      }
      return NextResponse.json({
        ok: res.ok || res.status === 204,
        status: res.status,
      });
    };

    if (action === "transfer") {
      if (!deviceId) {
        return NextResponse.json(
          { ok: false, error: "missing_device_id" },
          { status: 400 }
        );
      }
      const { res } = await fetchWithSpotifyAuth(
        "https://api.spotify.com/v1/me/player",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            device_ids: [deviceId],
            play: Boolean(play),
          }),
        },
        session
      );
      return buildControlResponse(res);
    }

    if (action === "pause") {
      const { res } = await fetchWithSpotifyAuth(
        `https://api.spotify.com/v1/me/player/pause${deviceQuery}`,
        { method: "PUT" },
        session
      );
      return buildControlResponse(res);
    }

    if (action === "next") {
      const { res } = await fetchWithSpotifyAuth(
        `https://api.spotify.com/v1/me/player/next${deviceQuery}`,
        { method: "POST" },
        session
      );
      return buildControlResponse(res);
    }

    if (action === "prev") {
      const { res } = await fetchWithSpotifyAuth(
        `https://api.spotify.com/v1/me/player/previous${deviceQuery}`,
        { method: "POST" },
        session
      );
      return buildControlResponse(res);
    }

    if (action === "play" || action === "resume") {
      let playPayload: Record<string, any> = {};
      let usedContextOffset = false;

      if (action === "play" && uri) {
        if (uri.startsWith("spotify:track:")) {
          if (
            contextUri &&
            (contextUri.startsWith("spotify:playlist:") ||
              contextUri.startsWith("spotify:album:"))
          ) {
            playPayload.context_uri = contextUri;
            playPayload.offset = { uri };
            usedContextOffset = true;
          } else {
            playPayload.uris = [uri];
          }
        } else if (
          uri.startsWith("spotify:playlist:") ||
          uri.startsWith("spotify:album:")
        ) {
          playPayload.context_uri = uri;
        }
      }

      const executePlayRequest = (
        targetDeviceQuery: string,
        payload: Record<string, any>,
        activeSession: StoredSpotifySession
      ) => {
        const hasBody = Object.keys(payload).length > 0;
        return fetchWithSpotifyAuth(
          `https://api.spotify.com/v1/me/player/play${targetDeviceQuery}`,
          {
            method: "PUT",
            headers: hasBody ? { "Content-Type": "application/json" } : undefined,
            body: hasBody ? JSON.stringify(payload) : undefined,
          },
          activeSession
        );
      };

      let { res, session: currentSession } = await executePlayRequest(
        deviceQuery,
        playPayload,
        session
      );

      // If playing a track with context_uri + offset failed with 400 or 404 (e.g., curated track not in selected playlist),
      // inspect the error and immediately retry playing the standalone track URI (`{ uris: [uri] }`).
      if (
        usedContextOffset &&
        uri &&
        (res.status === 400 || res.status === 404 || res.status === 403)
      ) {
        const parsedErr = await parseSpotifyError(res.clone());
        if (parsedErr.errorCode !== "no_active_device" && res.status !== 403) {
          playPayload = { uris: [uri] };
          usedContextOffset = false;
          const retryStandalone = await executePlayRequest(
            deviceQuery,
            playPayload,
            currentSession
          );
          res = retryStandalone.res;
          currentSession = retryStandalone.session;
        }
      }

      // If no active device was found (404), check available devices and target the first available one
      if (res.status === 404) {
        const devResp = await fetchWithSpotifyAuth(
          "https://api.spotify.com/v1/me/player/devices",
          { method: "GET" },
          currentSession
        );
        if (devResp.res.ok) {
          const devData = await devResp.res.json();
          const availableDevices = normalizeDevices(devData.devices);
          const fallbackDevice =
            availableDevices.find((d) => d.id === deviceId) ||
            availableDevices.find((d) => d.isActive) ||
            availableDevices[0];

          if (fallbackDevice) {
            const fallbackQuery = `?device_id=${encodeURIComponent(
              fallbackDevice.id
            )}`;
            let retryRes = await executePlayRequest(
              fallbackQuery,
              playPayload,
              currentSession
            );
            res = retryRes.res;
            currentSession = retryRes.session;

            // If the fallback device was found, but the track wasn't in `context_uri`, retry standalone track URI on the fallback device
            if (
              usedContextOffset &&
              uri &&
              (res.status === 400 || res.status === 404)
            ) {
              playPayload = { uris: [uri] };
              retryRes = await executePlayRequest(
                fallbackQuery,
                playPayload,
                currentSession
              );
              res = retryRes.res;
            }
          }
        }
      }

      return buildControlResponse(res);
    }

    return NextResponse.json(
      { ok: false, error: "unsupported_action" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "request_failed" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}
