/**
 * Google Identity Services Client Helper
 * Handles Google OAuth2 and GIS token/credential flow in the browser.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: { type: string; message: string }) => void;
            prompt?: string;
          }) => GoogleTokenClient;
        };
        id: {
          initialize: (config: any) => void;
          prompt: (notification?: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
        };
      };
    };
  }
}

export interface GoogleTokenResponse {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

export interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

const GSI_SCRIPT_URL = "https://accounts.google.com/gsi/client";
let scriptLoadingPromise: Promise<void> | null = null;

/**
 * Ensures Google Identity Services script is loaded.
 */
export function loadGoogleGsiScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Cannot load Google SDK in non-browser environment."));
  }

  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise<void>((resolve, reject) => {
    // Check if script tag already exists
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google SDK.")), { once: true });
      if (window.google?.accounts?.oauth2) {
        resolve();
      }
      return;
    }

    const script = document.createElement("script");
    script.src = GSI_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadingPromise = null;
      reject(new Error("Failed to load Google Identity Services. Please check your internet connection or ad-blocker."));
    };
    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

/**
 * Retrieves the Google Client ID from environment variables or API fallback.
 */
let cachedClientId: string | null = null;

export async function getGoogleClientId(): Promise<string | null> {
  if (cachedClientId) return cachedClientId;

  // 1. Client-side public env variable if defined
  const envId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (envId && envId.trim()) {
    cachedClientId = envId.trim();
    return cachedClientId;
  }

  // 2. Fetch configured client ID from backend
  try {
    const res = await fetch("/api/auth/google?format=json");
    if (res.ok) {
      const data = await res.json();
      if (data.clientId) {
        cachedClientId = data.clientId;
        return cachedClientId;
      }
    }
  } catch (err) {
    console.warn("Could not retrieve Google client ID from API:", err);
  }

  return null;
}

/**
 * Prompts Google OAuth2 popup to sign the user in and resolves with their access token.
 */
export async function promptGoogleSignIn(): Promise<{ accessToken: string }> {
  await loadGoogleGsiScript();
  const clientId = await getGoogleClientId();

  if (!clientId) {
    throw new Error("Google Client ID is not configured. Please check your GOOGLE_CLIENT_ID setting.");
  }

  if (!window.google?.accounts?.oauth2) {
    throw new Error("Google Identity Services failed to initialize.");
  }

  return new Promise<{ accessToken: string }>((resolve, reject) => {
    let settled = false;

    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "openid email profile",
      prompt: "select_account",
      callback: (response: GoogleTokenResponse) => {
        if (settled) return;
        settled = true;

        if (response.error) {
          if (
            response.error === "popup_closed_by_user" ||
            response.error === "access_denied" ||
            response.error === "user_logged_out"
          ) {
            reject(new Error("Google sign-in was canceled."));
          } else {
            reject(new Error(response.error_description || `Google error: ${response.error}`));
          }
          return;
        }

        if (!response.access_token) {
          reject(new Error("Google did not return an access token."));
          return;
        }

        resolve({ accessToken: response.access_token });
      },
      error_callback: (err: { type: string; message: string }) => {
        if (settled) return;
        settled = true;
        if (err.type === "popup_closed") {
          reject(new Error("Google sign-in window was closed."));
        } else if (err.type === "popup_blocked") {
          reject(
            new Error(
              "Google sign-in popup was blocked by your browser. Please allow popups for this site or try again."
            )
          );
        } else {
          reject(new Error(err.message || "An error occurred during Google sign-in."));
        }
      },
    });

    try {
      tokenClient.requestAccessToken();
    } catch (err: any) {
      reject(new Error(err?.message || "Failed to trigger Google sign-in popup."));
    }
  });
}
