"""Team management: let a tenant's owner add other already-registered users
as 'member' of the same tenant, and list current members.

Deliberately does NOT send invitation e-mails - that would need a separate
transactional e-mail service (Resend, SendGrid, ...) which isn't wired up
yet. Inviting someone who hasn't signed up returns 'not_found' and the
frontend tells the owner to ask that person to register first, then try
again.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
from auth import AuthContext, get_auth_context

router = APIRouter(prefix="/api/team")


def _require_owner(ctx: AuthContext) -> None:
    result = (
        db.service_client()
        .table("tenant_members")
        .select("role")
        .eq("tenant_id", ctx.tenant_id)
        .eq("user_id", ctx.user_id)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    if not rows or rows[0].get("role") != "owner":
        raise HTTPException(status_code=403, detail="Nur der Owner kann Team-Mitglieder verwalten.")


class InviteBody(BaseModel):
    email: str


@router.post("/invite")
async def invite_member(body: InviteBody, ctx: AuthContext = Depends(get_auth_context)):
    email = body.email.strip()
    if not email:
        raise HTTPException(status_code=400, detail="Fehlende E-Mail-Adresse.")

    _require_owner(ctx)

    result = db.service_client().rpc(
        "invite_member_by_email", {"p_tenant_id": ctx.tenant_id, "p_email": email}
    ).execute()
    status = result.data
    return {"status": status}


@router.get("/members")
async def list_members(ctx: AuthContext = Depends(get_auth_context)):
    result = db.service_client().rpc("list_tenant_members", {"p_tenant_id": ctx.tenant_id}).execute()
    return {"members": result.data or []}
