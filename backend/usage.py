"""Per-tenant usage tracking and rate limiting.

Every successful call to a costly endpoint (Gemini text/image generation, the
SSRF-guarded scrape) is logged to `usage_events`. Before making the actual
call, we count how many events this tenant has logged in the last 24 hours
and reject with 429 if they're at or over their plan's daily limit.

Deliberately a simple rolling 24h COUNT query rather than a token-bucket or
Redis-backed limiter - at this scale (dozens to low hundreds of tenants) a
plain count against Postgres is fast enough and much easier to reason about
than introducing new infrastructure.

Requires the `usage_events` table and `tenants.daily_ai_limit` column from
db/MIGRATION-usage-and-teams.sql.
"""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException

import db

logger = logging.getLogger(__name__)

DEFAULT_DAILY_LIMIT = 50

# Sentinel returned by _daily_limit_for() when the DB schema for rate
# limiting (tenants.daily_ai_limit / usage_events) hasn't been migrated in
# yet, so check_and_log_usage() knows to fail OPEN (skip rate limiting)
# instead of crashing every AI call with a 500.
_SCHEMA_NOT_READY = object()


def _daily_limit_for(tenant_id: str):
    try:
        result = (
            db.service_client()
            .table("tenants")
            .select("daily_ai_limit")
            .eq("id", tenant_id)
            .limit(1)
            .execute()
        )
    except Exception:
        logger.warning(
            "usage: 'tenants.daily_ai_limit' lookup failed - has "
            "db/MIGRATION-usage-and-teams.sql been run yet? Skipping rate "
            "limit for this call.",
            exc_info=True,
        )
        return _SCHEMA_NOT_READY
    rows = result.data or []
    if rows and rows[0].get("daily_ai_limit") is not None:
        return int(rows[0]["daily_ai_limit"])
    return DEFAULT_DAILY_LIMIT


def check_and_log_usage(tenant_id: str, endpoint: str) -> None:
    """Raises HTTPException(429) if the tenant is over their daily AI-usage
    limit. Otherwise logs this call so it counts toward the quota, and
    returns normally. Call this AFTER validating the request (missing
    prompt, missing API key, etc.) but BEFORE making the actual costly call,
    so requests that would have failed anyway don't burn quota.

    Fails OPEN (lets the request through, unlimited) if the usage-tracking
    tables/columns don't exist yet, rather than breaking every AI feature -
    see db/MIGRATION-usage-and-teams.sql."""
    daily_limit = _daily_limit_for(tenant_id)
    if daily_limit is _SCHEMA_NOT_READY:
        return

    try:
        since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        count_result = (
            db.service_client()
            .table("usage_events")
            .select("id", count="exact")
            .eq("tenant_id", tenant_id)
            .gte("created_at", since)
            .execute()
        )
        used = count_result.count or 0
    except Exception:
        logger.warning(
            "usage: 'usage_events' count failed - has "
            "db/MIGRATION-usage-and-teams.sql been run yet? Skipping rate "
            "limit for this call.",
            exc_info=True,
        )
        return

    if used >= daily_limit:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Tages-Limit von {daily_limit} KI-Aufrufen erreicht. "
                "Versuche es morgen erneut, oder kontaktiere uns für ein höheres Kontingent."
            ),
        )

    try:
        db.service_client().table("usage_events").insert(
            {"tenant_id": tenant_id, "endpoint": endpoint}
        ).execute()
    except Exception:
        logger.warning(
            "usage: could not log usage_events row (migration missing?) - "
            "request already allowed through, continuing.",
            exc_info=True,
        )
