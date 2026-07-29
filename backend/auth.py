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

import logging
import traceback
from dataclasses import dataclass

from fastapi import Header, HTTPException

import db

logger = logging.getLogger("uvicorn.error")


@dataclass
class AuthContext:
    user_id: str
    tenant_id: str


async def get_auth_context(authorization: str | None = Header(default=None)) -> AuthContext:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Fehlender oder ungültiger Authorization-Header.")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Fehlendes Zugriffstoken.")

    try:
        user_response = db.anon_client().auth.get_user(token)
    except Exception as exc:
        logger.error("auth.get_user failed: %s\n%s", exc, traceback.format_exc())
        raise HTTPException(status_code=401, detail=f"Ungültiges oder abgelaufenes Zugriffstoken. ({exc})")

    user = getattr(user_response, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Ungültiges oder abgelaufenes Zugriffstoken.")

    membership = (
        db.service_client()
        .table("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .execute()
    )
    rows = membership.data or []
    if not rows:
        # Should not normally happen - the signup trigger creates a tenant
        # for every new user - but fail closed rather than guessing.
        raise HTTPException(status_code=403, detail="Kein Mandant für diesen Nutzer gefunden.")

    return AuthContext(user_id=user.id, tenant_id=rows[0]["tenant_id"])
