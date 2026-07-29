/**
 * Public, per-deployment configuration. The Supabase anon key is DESIGNED to
 * be public (it's meant to sit in browser code) - Row Level Security in the
 * database is what actually protects data, not secrecy of this key. Never
 * put the Supabase *service_role* key here.
 *
 * Fill these in once you have created your Supabase project and deployed
 * the backend (see /SETUP-Accounts.md and /backend/render.yaml).
 */
export const SUPABASE_URL = "https://acfksemikdokwteeifpx.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_vk_fEmNndk_Ra1wB9oL4Rw_hnYte2WC";

// Base URL of the FastAPI backend (backend/), e.g. your Render service URL.
export const BACKEND_URL = "https://orbitai-d0b9.onrender.com";
