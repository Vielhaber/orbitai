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
  supabaseClient.auth.onAuthStateChange((_event, session) => callback(session));
}
