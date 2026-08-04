"""Authentication dependency for FastAPI routes.

The frontend logs in via Supabase Auth directly (supabase-js) and sends the
resulting access token as `Authorization: Bearer <token>` on every request to
this backend. We verify that token against Supabase itself (rather than
manually checking a JWT signature) so we never have to worry about key
rotation or algorithm details - Supabase always tells us definitively who a
token belongs to.

Every route that touches tenant-scoped data or the Gemini key MUST depend on
`get_auth_context` - there is no route in this backend that operates without
knowing which tenant it's acting on behalf of.
"""

import asyncio
import logging
from dataclasses import dataclass

import httpx
from fastapi import Depends, Header, HTTPException

import config
import db

logger = logging.getLogger("uvicorn.error")


@dataclass
class AuthContext:
    user_id: str
    tenant_id: str
    email: str | None = None


async def _verify_token(token: str) -> dict:
    """Verifies a Supabase access token via a direct REST call to GoTrue's
    /auth/v1/user endpoint, rather than through the supabase-py SDK's
    auth.get_user(). The SDK's bundled gotrue-py client (as of supabase-py
    2.7.4) mishandles Supabase's newer non-JWT `sb_publishable_...` key
    format - it ends up sending it where a real JWT is expected and the
    request is rejected with "Invalid API key", even though the exact same
    key/token pair works fine as a plain REST call. Calling the endpoint
    directly sidesteps that SDK bug entirely.
    """
    url = f"{config.SUPABASE_URL}/auth/v1/user"
    headers = {"apikey": config.SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, headers=headers)
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Ungültiges oder abgelaufenes Zugriffstoken.")
    return resp.json()


async def get_auth_context(authorization: str | None = Header(default=None)) -> AuthContext:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Fehlender oder ungültiger Authorization-Header.")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Fehlendes Zugriffstoken.")

    user = await _verify_token(token)
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Ungültiges oder abgelaufenes Zugriffstoken.")

    def _lookup_membership():
        return (
            db.service_client()
            .table("tenant_members")
            .select("tenant_id")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )

    # This runs on EVERY authenticated request (it's the shared auth
    # dependency), so keeping it off the event loop matters even though
    # each individual call is normally fast - see the note in ai_routes.py
    # about synchronous Supabase/urllib calls blocking the whole server.
    membership = await asyncio.to_thread(_lookup_membership)
    rows = membership.data or []
    if not rows:
        # Should not normally happen - the signup trigger creates a tenant
        # for every new user - but fail closed rather than guessing.
        raise HTTPException(status_code=403, detail="Kein Mandant für diesen Nutzer gefunden.")

    return AuthContext(user_id=user_id, tenant_id=rows[0]["tenant_id"], email=user.get("email"))


async def require_admin(ctx: AuthContext = Depends(get_auth_context)) -> AuthContext:
    """Gate for operator-only routes (usage dashboard, data export). Compares
    the verified email from Supabase against ADMIN_EMAIL - simplest possible
    check that doesn't need a new 'is_admin' column or role system for what
    is, for now, a single-operator business."""
    if not config.ADMIN_EMAIL or (ctx.email or "").lower() != config.ADMIN_EMAIL.lower():
        raise HTTPException(status_code=403, detail="Kein Zugriff.")
    return ctx
