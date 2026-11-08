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

export const SPOTIFY_COMMAND_EVENT = "dnd-spotify-command-event";
const SPOTIFY_COMMAND_CHANNEL = "dnd-spotify-command-channel";

/**
 * Dispatch an instantaneous playback command to the Spotify Embed Controller
 */
export function sendSpotifyCommand(command: SpotifyCommand, uri?: string): void {
  if (typeof window === "undefined") return;

  try {
    window.dispatchEvent(
      new CustomEvent(SPOTIFY_COMMAND_EVENT, { detail: { command, uri } })
    );

    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(SPOTIFY_COMMAND_CHANNEL);
      bc.postMessage({ type: "SPOTIFY_COMMAND", command, uri });
      bc.close();
    }
  } catch (err) {
    console.warn("Failed to dispatch Spotify command", err);
  }
}

/**
 * Listen for playback commands directed to Spotify
 */
export function subscribeToSpotifyCommands(
  callback: (command: SpotifyCommand, uri?: string) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustom = (e: Event) => {
    const detail = (e as CustomEvent<{ command: SpotifyCommand; uri?: string }>).detail;
    if (detail?.command) {
      callback(detail.command, detail.uri);
    }
  };

  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      bc = new BroadcastChannel(SPOTIFY_COMMAND_CHANNEL);
      bc.onmessage = (ev) => {
        if (ev.data?.type === "SPOTIFY_COMMAND" && ev.data.command) {
          callback(ev.data.command, ev.data.uri);
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
    try {
      sendSpotifyCommand("pause");
    } catch {}

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

  // Ensure the non-selected audio engine is stopped
  if (!shouldUseAmbient) {
    try {
      getSoundSynth().stop();
    } catch {}
  }
  if (!shouldUseSpotify) {
    try {
      sendSpotifyCommand("pause");
    } catch {}
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

  const shouldPauseSpotify = options?.isBreakTransition
    ? prefs.pauseOnBreak !== false
    : true;

  if (shouldPauseSpotify) {
    try {
      sendSpotifyCommand("pause");
    } catch {}

    try {
      const current = getCurrentPlayingTrack();
      setCurrentPlayingTrack({
        ...current,
        isPlaying: false,
      });
    } catch {}
  } else if (prefs.audioSource === "ambient") {
    try {
      const current = getCurrentPlayingTrack();
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

  // Stop ambient synthesizer immediately
  try {
    const synth = getSoundSynth();
    synth.stop();
  } catch {}

  // Pause Spotify immediately
  try {
    sendSpotifyCommand("pause");
  } catch {}

  // Mark track state as stopped
  try {
    const current = getCurrentPlayingTrack();
    setCurrentPlayingTrack({
      ...current,
      isPlaying: false,
    });
  } catch {}
}
