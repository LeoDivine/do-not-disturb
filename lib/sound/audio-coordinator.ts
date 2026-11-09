"use client";

import {
  getSoundSynth,
  ACOUSTIC_PRESETS,
  AcousticPreset,
} from "./sound-synth";
import {
  AudioSourceMode,
  CURATED_FOCUS_TRACKS,
  getStoredSpotifyPreferences,
  saveStoredSpotifyPreferences,
} from "../spotify/spotify-store";
import {
  getCurrentPlayingTrack,
  setCurrentPlayingTrack,
} from "./current-track-store";
import { getStoredSettings } from "../settings/settings-store";

export type SpotifyCommand = "play" | "pause" | "resume" | "toggle" | "next" | "prev";

export interface SpotifyCommandOptions {
  /**
   * Playlist/album URI that is known to contain `uri` (e.g. the track was picked from that
   * playlist's loaded track list). Only pass this when membership is certain — Spotify rejects
   * `context_uri` + `offset` requests where the track is not part of the context.
   */
  contextUri?: string | null;
}

export const SPOTIFY_COMMAND_EVENT = "dnd-spotify-command-event";
const SPOTIFY_COMMAND_CHANNEL = "dnd-spotify-command-channel";

// Unique per JS realm (tab / window). Used to ignore BroadcastChannel echoes of our own commands,
// which would otherwise execute every command twice in the sending tab.
const COMMAND_ORIGIN_ID =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Dispatch a playback command to the Spotify player.
 * - Same tab: delivered via a DOM CustomEvent.
 * - Other tabs/windows: delivered via BroadcastChannel (only used for UI-less relays;
 *   each tab's player ignores commands that originated from its own realm).
 */
export function sendSpotifyCommand(
  command: SpotifyCommand,
  uri?: string,
  options?: SpotifyCommandOptions
): void {
  if (typeof window === "undefined") return;

  const contextUri = options?.contextUri || undefined;

  try {
    window.dispatchEvent(
      new CustomEvent(SPOTIFY_COMMAND_EVENT, {
        detail: { command, uri, contextUri, originId: COMMAND_ORIGIN_ID },
      })
    );

    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(SPOTIFY_COMMAND_CHANNEL);
      bc.postMessage({
        type: "SPOTIFY_COMMAND",
        command,
        uri,
        contextUri,
        originId: COMMAND_ORIGIN_ID,
      });
      bc.close();
    }
  } catch (err) {
    console.warn("Failed to dispatch Spotify command", err);
  }
}

/**
 * Listen for playback commands directed to Spotify.
 *
 * Commands broadcast from *other* tabs are only delivered when `acceptRemote` is true.
 * The audio player in every tab should leave it false: otherwise N open tabs would each
 * execute the same command (e.g. `next` skipping N tracks on the user's Spotify account).
 */
export function subscribeToSpotifyCommands(
  callback: (command: SpotifyCommand, uri?: string, contextUri?: string) => void,
  { acceptRemote = false }: { acceptRemote?: boolean } = {}
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustom = (e: Event) => {
    const detail = (
      e as CustomEvent<{ command: SpotifyCommand; uri?: string; contextUri?: string }>
    ).detail;
    if (detail?.command) {
      callback(detail.command, detail.uri, detail.contextUri);
    }
  };

  let bc: BroadcastChannel | null = null;
  if (acceptRemote && typeof BroadcastChannel !== "undefined") {
    try {
      bc = new BroadcastChannel(SPOTIFY_COMMAND_CHANNEL);
      bc.onmessage = (ev) => {
        if (
          ev.data?.type === "SPOTIFY_COMMAND" &&
          ev.data.command &&
          ev.data.originId !== COMMAND_ORIGIN_ID
        ) {
          callback(ev.data.command, ev.data.uri, ev.data.contextUri);
        }
      };
    } catch {}
  }

  window.addEventListener(SPOTIFY_COMMAND_EVENT, handleCustom);

  return () => {
    window.removeEventListener(SPOTIFY_COMMAND_EVENT, handleCustom);
    bc?.close();
  };
}

/**
 * Cleanly transitions the active audio source between "ambient", "spotify", and "both",
 * stopping the outgoing audio engine so ambient synthesizer and Spotify do not overlap unintentionally.
 */
export function switchAudioSource(newSource: AudioSourceMode): void {
  if (typeof window === "undefined") return;

  const prefs = saveStoredSpotifyPreferences({ audioSource: newSource });
  const userSettings = getStoredSettings();

  if (newSource === "spotify") {
    try {
      getSoundSynth().stop();
    } catch {}

    const current = getCurrentPlayingTrack();
    const matchedCuratedTrack = prefs.lastPlayedTrackUri
      ? CURATED_FOCUS_TRACKS.find((t) => t.uri === prefs.lastPlayedTrackUri)
      : null;

    setCurrentPlayingTrack({
      title:
        matchedCuratedTrack?.title ||
        (current.source === "spotify" && current.title ? current.title : prefs.selectedPlaylistName) ||
        "Deep Focus",
      artist:
        matchedCuratedTrack?.artist ||
        (current.source === "spotify" && current.artist ? current.artist : prefs.selectedPlaylistOwner) ||
        "Spotify Focus",
      source: "spotify",
      isPlaying: current.source === "spotify" ? Boolean(current.isPlaying) : false,
      uri: prefs.lastPlayedTrackUri || prefs.selectedPlaylistUri,
      artworkUrl:
        matchedCuratedTrack?.imageUrl ||
        (current.source === "spotify" && current.artworkUrl
          ? current.artworkUrl
          : prefs.selectedPlaylistImage),
    });
  } else if (newSource === "ambient") {
    const current = getCurrentPlayingTrack();
    if (current.source === "spotify" && current.isPlaying) {
      try {
        sendSpotifyCommand("pause");
      } catch {}
    }

    let preset: AcousticPreset = "rain";
    if (userSettings.acousticPreset && userSettings.acousticPreset in ACOUSTIC_PRESETS) {
      preset = userSettings.acousticPreset as AcousticPreset;
    }
    const presetName = ACOUSTIC_PRESETS[preset]?.name || "Gentle Rain";
    const synthPlaying = getSoundSynth().isPlaying();

    setCurrentPlayingTrack({
      title: presetName,
      artist: "Ambient Soundscape",
      source: "ambient",
      isPlaying: synthPlaying,
      uri: null,
      artworkUrl: null,
    });
  }
}

/**
 * Immediately starts focus audio (ambient synth, Spotify, or both)
 * according to user settings with zero artificial delay.
 */
export function playFocusAudio(): boolean {
  if (typeof window === "undefined") return false;

  const prefs = getStoredSpotifyPreferences();
  const userSettings = getStoredSettings();

  // If enabled in user settings or spotify preferences, start audio immediately
  const isAutoPlay =
    typeof userSettings.autoPlayAudio === "boolean"
      ? userSettings.autoPlayAudio
      : typeof prefs.autoPlayOnFocus === "boolean"
      ? prefs.autoPlayOnFocus
      : true;

  if (!isAutoPlay) {
    return false;
  }

  let startedAny = false;

  const shouldUseSpotify = prefs.audioSource === "spotify" || prefs.audioSource === "both";
  const shouldUseAmbient = prefs.audioSource === "ambient" || prefs.audioSource === "both" || !prefs.audioSource;

  // Ensure the non-selected audio engine is stopped (only pause Spotify if DND was playing Spotify)
  if (!shouldUseAmbient) {
    try {
      getSoundSynth().stop();
    } catch {}
  }
  if (!shouldUseSpotify) {
    const current = getCurrentPlayingTrack();
    if (current.source === "spotify" && current.isPlaying) {
      try {
        sendSpotifyCommand("pause");
      } catch {}
    }
  }

  // 1. Ambient Sounds
  if (shouldUseAmbient) {
    try {
      let preset: AcousticPreset = "rain";
      if (userSettings.acousticPreset && userSettings.acousticPreset in ACOUSTIC_PRESETS) {
        preset = userSettings.acousticPreset as AcousticPreset;
      }
      const volume = typeof userSettings.bgAmbienceVolume === "number" ? userSettings.bgAmbienceVolume : 65;

      const synth = getSoundSynth();
      const ok = synth.playPreset(preset, volume);
      if (ok) {
        startedAny = true;
        if (!shouldUseSpotify) {
          const presetName = ACOUSTIC_PRESETS[preset]?.name || "Gentle Rain";
          setCurrentPlayingTrack({
            title: presetName,
            artist: "Ambient Soundscape",
            source: "ambient",
            isPlaying: true,
            uri: null,
            artworkUrl: null,
          });
        }
      }
    } catch (err) {
      console.warn("Could not start ambient sound", err);
    }
  }

  // 2. Spotify Track / Playlist
  if (shouldUseSpotify) {
    try {
      const current = getCurrentPlayingTrack();
      const activeUri =
        (current.uri && current.uri.startsWith("spotify:track:") ? current.uri : null) ||
        prefs.lastPlayedTrackUri ||
        prefs.selectedPlaylistUri;

      sendSpotifyCommand("play", activeUri);
      startedAny = true;

      const matchedCuratedTrack = activeUri?.startsWith("spotify:track:")
        ? CURATED_FOCUS_TRACKS.find((t) => t.uri === activeUri)
        : null;

      setCurrentPlayingTrack({
        ...current,
        title:
          matchedCuratedTrack?.title ||
          (current.source === "spotify" && current.title ? current.title : prefs.selectedPlaylistName) ||
          "Deep Focus",
        artist:
          matchedCuratedTrack?.artist ||
          (current.source === "spotify" && current.artist ? current.artist : prefs.selectedPlaylistOwner) ||
          "Spotify Focus",
        source: "spotify",
        isPlaying: true,
        uri: activeUri,
        artworkUrl:
          matchedCuratedTrack?.imageUrl ||
          (current.source === "spotify" && current.artworkUrl
            ? current.artworkUrl
            : prefs.selectedPlaylistImage),
      });
    } catch (err) {
      console.warn("Could not start Spotify playback", err);
    }
  }

  return startedAny;
}

/**
 * Pauses active focus audio when the timer is paused or enters a break,
 * respecting the user's `pauseOnBreak` Spotify preference on break transitions.
 */
export function pauseFocusAudio(options?: { isBreakTransition?: boolean }): void {
  if (typeof window === "undefined") return;

  const prefs = getStoredSpotifyPreferences();

  // Always stop ambient synthesizer on pause or break
  try {
    getSoundSynth().stop();
  } catch {}

  const current = getCurrentPlayingTrack();
  const isSpotifyActiveInDnd =
    prefs.audioSource === "spotify" ||
    prefs.audioSource === "both" ||
    (current.source === "spotify" && current.isPlaying);

  const shouldPauseSpotify =
    isSpotifyActiveInDnd &&
    (options?.isBreakTransition ? prefs.pauseOnBreak !== false : true);

  if (shouldPauseSpotify) {
    try {
      sendSpotifyCommand("pause");
    } catch {}

    try {
      setCurrentPlayingTrack({
        ...current,
        isPlaying: false,
      });
    } catch {}
  } else if (prefs.audioSource === "ambient") {
    try {
      setCurrentPlayingTrack({
        ...current,
        isPlaying: false,
      });
    } catch {}
  }
}

/**
 * Immediately stops all active focus audio (ambient synth and Spotify).
 */
export function stopFocusAudio(): void {
  if (typeof window === "undefined") return;

  const prefs = getStoredSpotifyPreferences();
  const current = getCurrentPlayingTrack();

  // Stop ambient synthesizer immediately
  try {
    const synth = getSoundSynth();
    synth.stop();
  } catch {}

  // Pause Spotify only if Spotify was active in DND
  if (
    prefs.audioSource === "spotify" ||
    prefs.audioSource === "both" ||
    (current.source === "spotify" && current.isPlaying)
  ) {
    try {
      sendSpotifyCommand("pause");
    } catch {}
  }

  // Mark track state as stopped
  try {
    setCurrentPlayingTrack({
      ...current,
      isPlaying: false,
    });
  } catch {}
}
