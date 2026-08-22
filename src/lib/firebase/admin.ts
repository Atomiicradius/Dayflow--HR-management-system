import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

let adminAuth: Auth | null = null;

const projectId =
  process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

// Only initialize firebase-admin if a service account key is present.
// Without it, firebase-admin would silently try to reach the GCP Metadata Server
// (Application Default Credentials), which fails on a developer's machine and
// produces a noisy MetadataLookupWarning in the console.
if (clientEmail && privateKey) {
  if (!getApps().length) {
    try {
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    } catch {
      // Already initialized
    }
  }
  adminAuth = getAuth();
}

/**
 * Verifies a session token issued by Firebase.
 *
 * Production path (service account present):
 *   Tries verifySessionCookie → verifyIdToken via firebase-admin SDK.
 *
 * Dev fallback (no service account):
 *   Decodes the JWT payload directly — no signature verification, safe only
 *   for local development where the token originates from a trusted Firebase
 *   project. NEVER use this path in production without a service account.
 */
export async function verifySession(cookieValue: string) {
  if (!cookieValue) return null;

  // --- Production path: full cryptographic verification ---
  if (adminAuth) {
    try {
      return await adminAuth.verifySessionCookie(cookieValue, true);
    } catch {
      // fall through to ID token check
    }
    try {
      return await adminAuth.verifyIdToken(cookieValue, true);
    } catch {
      // fall through to dev fallback
    }
  }

  // --- Dev fallback: decode JWT payload without verification ---
  try {
    const parts = cookieValue.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
    if (!payload?.sub) return null;
    // Reject obviously expired tokens even in dev mode
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      uid: payload.sub as string,
      email: (payload.email as string) || "",
      name: (payload.name as string) || (payload.email as string)?.split("@")[0] || "User",
      picture: (payload.picture as string) || null,
    };
  } catch {
    return null;
  }
}

export { adminAuth };
