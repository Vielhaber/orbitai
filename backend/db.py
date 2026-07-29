"""Supabase client factories.

Two distinct clients on purpose:
  * `anon_client()` is used only to verify a user's access token (calls
    Supabase Auth's /user endpoint) - it never touches application tables.
  * `service_client()` uses the service_role key, which bypasses Row Level
    Security entirely. It is the ONLY thing in this entire system allowed to
    read/write `tenant_secrets` (the Gemini key table has no RLS policies
    granting access to anyone else). Every use of this client must be
    scoped explicitly by tenant_id in application code, since the database
    will no longer do that filtering for us.
"""

from supabase import Client, create_client

import config

_service_client: Client | None = None
_anon_client: Client | None = None


def service_client() -> Client:
    global _service_client
    if _service_client is None:
        _service_client = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)
    return _service_client


def anon_client() -> Client:
    global _anon_client
    if _anon_client is None:
        _anon_client = create_client(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
    return _anon_client
