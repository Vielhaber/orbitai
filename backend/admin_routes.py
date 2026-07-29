"""Operator-only routes: usage dashboard and a full data export for backups.

Gated by `require_admin` (auth.py), which compares the caller's verified
Supabase email against the ADMIN_EMAIL env var. Nobody else can reach these,
including other tenants' owners - there is no "admin" concept in the
tenant/tenant_members model, this is purely for the single operator running
the whole business.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends

import db
from auth import AuthContext, require_admin

router = APIRouter(prefix="/api/admin")


@router.get("/stats")
async def stats(ctx: AuthContext = Depends(require_admin)):
    tenants_result = (
        db.service_client().table("tenants").select("id,name,plan,daily_ai_limit,created_at").execute()
    )
    tenants = tenants_result.data or []

    members_result = db.service_client().table("tenant_members").select("tenant_id", count="exact").execute()
    total_members = members_result.count or 0

    since_7d = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    since_24h = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

    usage_7d_result = (
        db.service_client()
        .table("usage_events")
        .select("tenant_id,created_at")
        .gte("created_at", since_7d)
        .execute()
    )
    usage_7d = usage_7d_result.data or []

    per_tenant_24h: dict[str, int] = {}
    per_tenant_7d: dict[str, int] = {}
    for row in usage_7d:
        tid = row["tenant_id"]
        per_tenant_7d[tid] = per_tenant_7d.get(tid, 0) + 1
        if row["created_at"] >= since_24h:
            per_tenant_24h[tid] = per_tenant_24h.get(tid, 0) + 1

    tenant_summaries = [
        {
            "id": t["id"],
            "name": t["name"],
            "plan": t["plan"],
            "daily_ai_limit": t["daily_ai_limit"],
            "created_at": t["created_at"],
            "usage_24h": per_tenant_24h.get(t["id"], 0),
            "usage_7d": per_tenant_7d.get(t["id"], 0),
        }
        for t in tenants
    ]
    tenant_summaries.sort(key=lambda t: t["usage_7d"], reverse=True)

    return {
        "total_tenants": len(tenants),
        "total_members": total_members,
        "total_usage_24h": sum(per_tenant_24h.values()),
        "total_usage_7d": len(usage_7d),
        "tenants": tenant_summaries,
    }


@router.get("/export")
async def export_all(ctx: AuthContext = Depends(require_admin)):
    """Full JSON dump of every tenant-owned table. Meant to be pulled
    periodically (e.g. by a scheduled task) and stored somewhere safe as a
    backup - Supabase's free tier has no automatic point-in-time recovery.

    Includes tenant_secrets (raw Gemini keys) because a backup that can't
    restore a tenant's working configuration isn't much of a backup - treat
    the exported file as sensitive and don't share it.
    """
    client = db.service_client()
    tenants = client.table("tenants").select("*").execute().data or []
    tenant_members = client.table("tenant_members").select("*").execute().data or []
    tenant_secrets = client.table("tenant_secrets").select("*").execute().data or []
    tenant_documents = client.table("tenant_documents").select("*").execute().data or []

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "tenants": tenants,
        "tenant_members": tenant_members,
        "tenant_secrets": tenant_secrets,
        "tenant_documents": tenant_documents,
    }
