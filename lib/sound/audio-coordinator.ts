"use client";

import {
  getSoundSynth,
  ACOUSTIC_PRESETS,
  AcousticPreset,
} from "./sound-synth";
import {
  getStoredSpotifyPreferences,
  SpotifyStoredPreference,
} from "../spotify/spotify-store";
import {
  getCurrentPlayingTrack,
  setCurrentPlayingTrack,
  ActiveTrackInfo,
} from "./current-track-store";
import { getStoredSettings } from "../settings/settings-store";

export type SpotifyCommand = "play" | "pause" | "resume" | "toggle" | "next" | "prev";

export const SPOTIFY_COMMAND_EVENT = "dnd-spotify-command-event";
const SPOTIFY_COMMAND_CHANNEL = "dnd-spotify-command-channel";

/**
 * Dispatch an instantaneous playback command to the Spotify Embed Controller
 */
export function sendSpotifyCommand(command: SpotifyCommand): void {
  if (typeof window === "undefined") return;

  try {
    window.dispatchEvent(
      new CustomEvent(SPOTIFY_COMMAND_EVENT, { detail: { command } })
    );

    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(SPOTIFY_COMMAND_CHANNEL);
      bc.postMessage({ type: "SPOTIFY_COMMAND", command });
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
  callback: (command: SpotifyCommand) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustom = (e: Event) => {
    const detail = (e as CustomEvent<{ command: SpotifyCommand }>).detail;
    if (detail?.command) {
      callback(detail.command);
    }
  };

  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      bc = new BroadcastChannel(SPOTIFY_COMMAND_CHANNEL);
      bc.onmessage = (ev) => {
        if (ev.data?.type === "SPOTIFY_COMMAND" && ev.data.command) {
          callback(ev.data.command);
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
 * Immediately starts focus audio (ambient synth, Spotify, or both)
 * according to user settings with zero artificial delay.
 */
export function playFocusAudio(): boolean {
  if (typeof window === "undefined") return false;

  const prefs = getStoredSpotifyPreferences();
  if (!prefs.autoPlayOnFocus) {
    return false;
  }

  let startedAny = false;

  const shouldUseSpotify = prefs.audioSource === "spotify" || prefs.audioSource === "both";
  const shouldUseAmbient = prefs.audioSource === "ambient" || prefs.audioSource === "both" || !prefs.audioSource;

  // 1. Ambient Sounds
  if (shouldUseAmbient) {
    try {
      const userSettings = getStoredSettings();
      let preset: AcousticPreset = "rain";
      if (userSettings.acousticPreset && userSettings.acousticPreset in ACOUSTIC_PRESETS) {
        preset = userSettings.acousticPreset as AcousticPreset;
      }
      const volume = typeof userSettings.bgAmbienceVolume === "number" ? userSettings.bgAmbienceVolume : 65;

      const synth = getSoundSynth();
      const ok = synth.playPreset(preset, volume);
      if (ok) {
        startedAny = true;
        const presetName = ACOUSTIC_PRESETS[preset]?.name || "Gentle Rain";
        setCurrentPlayingTrack({
          title: presetName,
          artist: "Ambient Soundscape",
          source: "ambient",
          isPlaying: true,
        });
      }
    } catch (err) {
      console.warn("Could not start ambient sound", err);
    }
  }

  // 2. Spotify Track / Playlist
  if (shouldUseSpotify) {
    try {
      sendSpotifyCommand("play");
      startedAny = true;

      const current = getCurrentPlayingTrack();
      const activeUri =
        (current.uri && current.uri.startsWith("spotify:track:") ? current.uri : null) ||
        prefs.lastPlayedTrackUri ||
        prefs.selectedPlaylistUri;

      setCurrentPlayingTrack({
        ...current,
        title: current.title || prefs.selectedPlaylistName || "Deep Focus",
        artist: current.artist || "Spotify Focus",
        source: "spotify",
        isPlaying: true,
        uri: activeUri,
        artworkUrl: current.artworkUrl || prefs.selectedPlaylistImage,
      });
    } catch (err) {
      console.warn("Could not start Spotify playback", err);
    }
  }

  return startedAny;
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
