"""Every route that touches the tenant's Gemini key or does anything the
frontend cannot safely do itself (SSRF-guarded scraping). Everything else
(campaigns/clients/leads CRUD) is handled directly between the frontend and
Supabase's own auto-generated REST API, protected by the RLS policies in
db/schema.sql - it doesn't need to pass through this backend at all.
"""

import urllib.error

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

import db, gemini, ssrf
from auth import AuthContext, get_auth_context

router = APIRouter(prefix="/api")


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
        models = gemini.call_list_models(api_key)
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

    try:
        text = gemini.call_generate(api_key, prompt, body.model or "")
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

    try:
        image_b64 = gemini.call_generate_image(api_key, prompt)
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


@router.get("/scrape")
async def scrape(url: str = Query(...), ctx: AuthContext = Depends(get_auth_context)):
    safe, reason, pinned_ip = ssrf.is_safe_public_url(url)
    if not safe:
        raise HTTPException(status_code=400, detail=reason)

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

    try:
        import urllib.request

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
            html_content = response.read(2_000_000).decode("utf-8", errors="ignore")

        html_content = re.sub(r"<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>", "", html_content)
        html_content = re.sub(r"<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>", "", html_content)

        stripper = MLStripper()
        stripper.feed(html_content)
        text = re.sub(r"\s+", " ", stripper.get_data()).strip()
        return {"text": text[:4000]}
    except Exception as e:
        print(f"[scrape] failed for {url} (tenant {ctx.tenant_id}): {e}")
        raise HTTPException(status_code=502, detail="Website konnte nicht abgerufen werden.")
