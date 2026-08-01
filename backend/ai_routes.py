"""Every route that touches the tenant's Gemini key or does anything the
frontend cannot safely do itself (SSRF-guarded scraping). Everything else
(campaigns/clients/leads CRUD) is handled directly between the frontend and
Supabase's own auto-generated REST API, protected by the RLS policies in
db/schema.sql - it doesn't need to pass through this backend at all.
"""

import asyncio
import json
import urllib.error
import urllib.parse
import urllib.request

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

import db, gemini, ssrf, usage
from auth import AuthContext, get_auth_context

# Every route below that talks to Gemini, Nominatim, or a scraped website
# uses the stdlib `urllib`, which is BLOCKING. Calling it directly inside an
# `async def` route handler freezes the entire event loop for as long as
# the network call takes - on a single-worker Uvicorn process (as used
# here) that means EVERY other request (including unrelated tenants' auth
# checks and health checks) stalls too. This went unnoticed for quick
# calls, but surfaced hard on the "match 50-100 leads" prompt: a single
# slow Gemini generation (over a minute once heavy JSON output is
# involved) blocked the whole server, and the platform's own health/idle
# handling could not get through - requests looked like they hung forever
# with no response at all, not even an error. `asyncio.to_thread` runs the
# blocking call in a worker thread instead, keeping the event loop free.

router = APIRouter(prefix="/api")

# In-memory geocode cache: {normalized place name: (lat, lon, cached_at)}.
# Deliberately process-local (no DB table) - resets on redeploy, which is
# fine since it just means the next lookup re-fetches from Nominatim. Keeps
# repeated searches for the same city (very common - most leads in one
# search share a region) from hammering Nominatim's free, rate-limited API.
_GEOCODE_CACHE: dict[str, tuple[float, float]] = {}
_GEOCODE_CACHE_MAX = 2000


def _get_tenant_key(tenant_id: str) -> str | None:
    result = (
        db.service_client()
        .table("tenant_secrets")
        .select("gemini_api_key")
        .eq("tenant_id", tenant_id)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    if not rows:
        return None
    key = (rows[0].get("gemini_api_key") or "").strip()
    return key or None


@router.get("/config/status")
async def config_status(ctx: AuthContext = Depends(get_auth_context)):
    return {"configured": _get_tenant_key(ctx.tenant_id) is not None}


class SaveConfigBody(BaseModel):
    apiKey: str


@router.post("/config")
async def save_config(body: SaveConfigBody, ctx: AuthContext = Depends(get_auth_context)):
    api_key = body.apiKey.strip()
    if not api_key:
        raise HTTPException(status_code=400, detail="Kein API-Key übergeben.")

    db.service_client().table("tenant_secrets").upsert(
        {"tenant_id": ctx.tenant_id, "gemini_api_key": api_key}
    ).execute()
    return {"ok": True}


@router.post("/config/clear")
async def clear_config(ctx: AuthContext = Depends(get_auth_context)):
    db.service_client().table("tenant_secrets").update({"gemini_api_key": ""}).eq(
        "tenant_id", ctx.tenant_id
    ).execute()
    return {"ok": True}


@router.get("/models")
async def list_models(ctx: AuthContext = Depends(get_auth_context)):
    api_key = _get_tenant_key(ctx.tenant_id)
    if not api_key:
        raise HTTPException(status_code=400, detail="Kein API-Key hinterlegt.")
    try:
        models = await asyncio.to_thread(gemini.call_list_models, api_key)
        return {"models": models}
    except Exception as e:
        print(f"[models] failed for tenant {ctx.tenant_id}: {e}")
        raise HTTPException(status_code=502, detail="Modelle konnten nicht geladen werden.")


class GenerateBody(BaseModel):
    prompt: str
    model: str | None = None


@router.post("/generate")
async def generate(body: GenerateBody, ctx: AuthContext = Depends(get_auth_context)):
    prompt = body.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Fehlender Prompt.")

    api_key = _get_tenant_key(ctx.tenant_id)
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="Kein Gemini API-Key hinterlegt. Bitte zuerst in den Einstellungen speichern.",
        )

    usage.check_and_log_usage(ctx.tenant_id, "generate")

    try:
        text = await asyncio.to_thread(gemini.call_generate, api_key, prompt, body.model or "")
        return {"text": text}
    except urllib.error.HTTPError as e:
        try:
            import json

            message = json.loads(e.read().decode("utf-8")).get("error", {}).get("message", f"HTTP-Fehler {e.code}")
        except Exception:
            message = f"HTTP-Fehler {e.code}"
        print(f"[generate] Gemini HTTP error for tenant {ctx.tenant_id}: {message}")
        raise HTTPException(status_code=502, detail=message)
    except Exception as e:
        print(f"[generate] failed for tenant {ctx.tenant_id}: {e}")
        raise HTTPException(status_code=502, detail="Anfrage an die KI ist fehlgeschlagen.")


class GenerateImageBody(BaseModel):
    prompt: str


@router.post("/generate-image")
async def generate_image(body: GenerateImageBody, ctx: AuthContext = Depends(get_auth_context)):
    prompt = body.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Fehlender Prompt.")

    api_key = _get_tenant_key(ctx.tenant_id)
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="Kein Gemini API-Key hinterlegt. Bitte zuerst in den Einstellungen speichern.",
        )

    usage.check_and_log_usage(ctx.tenant_id, "generate-image")

    try:
        image_b64 = await asyncio.to_thread(gemini.call_generate_image, api_key, prompt)
        return {"imageBase64": image_b64}
    except urllib.error.HTTPError as e:
        try:
            import json

            message = json.loads(e.read().decode("utf-8")).get("error", {}).get("message", f"HTTP-Fehler {e.code}")
        except Exception:
            message = f"HTTP-Fehler {e.code}"
        print(f"[generate-image] Gemini HTTP error for tenant {ctx.tenant_id}: {message}")
        raise HTTPException(status_code=502, detail=message)
    except Exception as e:
        print(f"[generate-image] failed for tenant {ctx.tenant_id}: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"Bildgenerierung fehlgeschlagen ({e}). Hinweis: Bild-Generierung ist nicht für jeden Gemini API-Key freigeschaltet.",
        )


@router.get("/geocode")
async def geocode(place: str = Query(...), ctx: AuthContext = Depends(get_auth_context)):
    """Resolves a free-text place name (city, region) to approximate
    lat/lon, so the frontend can sort Lead-Scout results by distance from
    the user's browser location. Uses OpenStreetMap's free Nominatim API -
    no API key, but rate-limited and usage-policy-restricted, so this is
    fine at moderate scale; if usage grows a lot, switch to a paid
    geocoding API (Google/Mapbox) or a self-hosted Nominatim instance.

    Returns {"lat": None, "lon": None} (never an error) when the place
    can't be resolved, so a bad/unknown location just quietly opts that one
    lead out of distance sorting instead of breaking the whole search."""
    normalized = place.strip().lower()
    if not normalized:
        return {"lat": None, "lon": None}

    cached = _GEOCODE_CACHE.get(normalized)
    if cached:
        return {"lat": cached[0], "lon": cached[1]}

    def _fetch_nominatim():
        url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
            {"format": "json", "limit": "1", "q": place.strip()}
        )
        req = urllib.request.Request(
            url,
            headers={
                # Nominatim's usage policy requires a real identifying
                # User-Agent (no default urllib UA, no browser spoofing).
                "User-Agent": "OrbitAI-Sales-Cockpit/1.0 (contact: ergl.vielhaber@gmail.com)"
            },
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            return json.loads(resp.read().decode("utf-8"))

    try:
        results = await asyncio.to_thread(_fetch_nominatim)
    except Exception as e:
        print(f"[geocode] lookup failed for '{place}': {e}")
        return {"lat": None, "lon": None}

    if not results:
        return {"lat": None, "lon": None}

    try:
        lat = float(results[0]["lat"])
        lon = float(results[0]["lon"])
    except (KeyError, ValueError, TypeError):
        return {"lat": None, "lon": None}

    if len(_GEOCODE_CACHE) >= _GEOCODE_CACHE_MAX:
        _GEOCODE_CACHE.clear()
    _GEOCODE_CACHE[normalized] = (lat, lon)
    return {"lat": lat, "lon": lon}


@router.get("/scrape")
async def scrape(url: str = Query(...), ctx: AuthContext = Depends(get_auth_context)):
    safe, reason, pinned_ip = ssrf.is_safe_public_url(url)
    if not safe:
        raise HTTPException(status_code=400, detail=reason)

    usage.check_and_log_usage(ctx.tenant_id, "scrape")

    import re
    from html.parser import HTMLParser

    class MLStripper(HTMLParser):
        def __init__(self):
            super().__init__()
            self.text = []

        def handle_data(self, d):
            self.text.append(d)

        def get_data(self):
            return "".join(self.text)

    def _fetch_html():
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
            },
        )
        opener = ssrf.make_pinned_opener(pinned_ip)
        with opener.open(req, timeout=10) as response:
            return response.read(2_000_000).decode("utf-8", errors="ignore")

    try:
        html_content = await asyncio.to_thread(_fetch_html)

        html_content = re.sub(r"<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>", "", html_content)
        html_content = re.sub(r"<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>", "", html_content)

        stripper = MLStripper()
        stripper.feed(html_content)
        text = re.sub(r"\s+", " ", stripper.get_data()).strip()
        return {"text": text[:4000]}
    except Exception as e:
        print(f"[scrape] failed for {url} (tenant {ctx.tenant_id}): {e}")
        raise HTTPException(status_code=502, detail="Website konnte nicht abgerufen werden.")
