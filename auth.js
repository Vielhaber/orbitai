/**
 * Supabase Auth wiring. Loads the Supabase JS client from the CDN script
 * tag in index.html (exposes a global `supabase.createClient`) rather than
 * bundling it, to keep this a dependency-free static site like the rest of
 * the app.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

if (!window.supabase) {
  throw new Error(
    "Supabase-JS wurde nicht geladen. Prüfe, dass der CDN-<script>-Tag in index.html vor app.js steht."
  );
}

export const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let cachedTenantId = null;

export async function signUp(email, password) {
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut() {
  cachedTenantId = null;
  await supabaseClient.auth.signOut();
}

export async function getSession() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session || null;
}

export async function getAccessToken() {
  const session = await getSession();
  return session ? session.access_token : null;
}

export async function getCurrentUserEmail() {
  const session = await getSession();
  return session && session.user ? session.user.email : null;
}

/**
 * Resolves and caches the current user's tenant id. Reads from
 * tenant_members, which only grants a user access to their own membership
 * row (see db/schema.sql) - so this never leaks another tenant's id.
 */
export async function getTenantId() {
  if (cachedTenantId) return cachedTenantId;

  const session = await getSession();
  if (!session) throw new Error("Nicht angemeldet.");

  const { data, error } = await supabaseClient
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", session.user.id)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Kein Mandant für diesen Account gefunden.");
  }

  cachedTenantId = data.tenant_id;
  return cachedTenantId;
}

export function onAuthStateChange(callback) {
  // Passes the event too (e.g. "PASSWORD_RECOVERY") as an optional second
  // argument - existing callers that only take `session` are unaffected.
  supabaseClient.auth.onAuthStateChange((event, session) => callback(session, event));
}

/** Sends a password-reset email via Supabase's own built-in mailer (no
 * separate email service needed). Clicking the link in that email brings
 * the user back to this same page with a recovery session, which
 * onAuthStateChange in bootstrap.js detects via the "PASSWORD_RECOVERY"
 * event. */
export async function requestPasswordReset(email) {
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  });
  if (error) throw new Error(error.message);
}

/** Sets a new password for the currently active session. Only meaningful
 * right after a PASSWORD_RECOVERY event - Supabase's recovery session is a
 * real (temporary) session, so this uses the normal updateUser call. */
export async function updatePassword(newPassword) {
  const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}
