/**
 * Cloud sync for the three data blobs the app already keeps in
 * localStorage (`sales_campaigns`, `sales_clients`, and branding settings).
 * This intentionally does NOT change how app.js reads/writes those
 * localStorage keys day-to-day (all the existing campaign/lead/client
 * logic keeps working untouched) - it only adds a thin sync layer on top:
 * pull from the cloud once at login to hydrate localStorage, then push to
 * the cloud after each local write. localStorage remains the fast local
 * cache; tenant_documents in Supabase is the durable, synced source of
 * truth across devices/browsers.
 */
import { supabaseClient, getTenantId } from "./auth.js";

export async function getDoc(docType, fallback) {
  const { data, error } = await supabaseClient
    .from("tenant_documents")
    .select("data")
    .eq("doc_type", docType)
    .maybeSingle();

  if (error) {
    console.error(`cloud.getDoc(${docType}) failed:`, error);
    return fallback;
  }
  return data ? data.data : fallback;
}

export async function setDoc(docType, value) {
  const tenantId = await getTenantId();
  const { error } = await supabaseClient.from("tenant_documents").upsert(
    {
      tenant_id: tenantId,
      doc_type: docType,
      data: value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,doc_type" }
  );
  if (error) throw new Error(error.message);
}

/** Fire-and-forget sync of a localStorage JSON blob to the cloud. Logs
 * failures instead of throwing, so a flaky connection never blocks the
 * user from continuing to work locally. */
export function syncToCloud(docType, localStorageKey, emptyValue) {
  try {
    const raw = localStorage.getItem(localStorageKey);
    const value = raw ? JSON.parse(raw) : emptyValue;
    setDoc(docType, value).catch((err) =>
      console.error(`Cloud-Sync für "${docType}" fehlgeschlagen:`, err)
    );
  } catch (err) {
    console.error(`Cloud-Sync für "${docType}" fehlgeschlagen (ungültiges JSON):`, err);
  }
}

export function syncSettingsToCloud() {
  const settings = {
    app_name: localStorage.getItem("sales_app_name") || "",
    app_color: localStorage.getItem("sales_app_color") || "",
    hide_key: localStorage.getItem("sales_hide_key") === "true",
    admin_pass_hash: localStorage.getItem("sales_admin_pass_hash") || "",
  };
  setDoc("settings", settings).catch((err) =>
    console.error("Cloud-Sync für Einstellungen fehlgeschlagen:", err)
  );
}

/** Pulls all docs from the cloud and writes them into localStorage, so the
 * rest of app.js (which only ever reads localStorage) picks up the synced
 * state transparently. Call this once, right after login, before running
 * the app's normal init(). */
export async function hydrateFromCloud() {
  const [campaigns, clients, settings, offers] = await Promise.all([
    getDoc("campaigns", {}),
    getDoc("clients", []),
    getDoc("settings", {}),
    getDoc("offers", []),
  ]);

  localStorage.setItem("sales_campaigns", JSON.stringify(campaigns || {}));
  localStorage.setItem("sales_clients", JSON.stringify(clients || []));
  localStorage.setItem("sales_offers", JSON.stringify(offers || []));

  if (settings) {
    if (settings.app_name) localStorage.setItem("sales_app_name", settings.app_name);
    if (settings.app_color) localStorage.setItem("sales_app_color", settings.app_color);
    if (typeof settings.hide_key === "boolean") {
      localStorage.setItem("sales_hide_key", settings.hide_key ? "true" : "false");
    }
    if (settings.admin_pass_hash) {
      localStorage.setItem("sales_admin_pass_hash", settings.admin_pass_hash);
    }
  }
}
