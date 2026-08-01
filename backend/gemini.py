"""Gemini API call helpers - server-side only, ported from the single-tenant
server.py. The tenant's API key is fetched from tenant_secrets by the caller
and passed in here; it never touches the frontend."""

import json
import urllib.error
import urllib.request

import config


def normalize_model(model_name: str | None) -> str:
    if not model_name or model_name in ("gemini-3.1-flash-lite", "gemini-2.0-flash"):
        return config.DEFAULT_MODEL
    return model_name


def api_version_for(model_name: str) -> str:
    if any(tag in model_name for tag in ("2.5", "2.0", "3.1")):
        return "v1beta"
    return "v1"


def call_generate(api_key: str, prompt: str, model_name: str) -> str:
    model_name = normalize_model(model_name)

    def do_call(name: str):
        version = api_version_for(name)
        url = f"https://generativelanguage.googleapis.com/{version}/models/{name}:generateContent?key={api_key}"
        body = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
        req = urllib.request.Request(
            url, data=body, headers={"Content-Type": "application/json"}, method="POST"
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))

    tried = set()
    data = None
    last_error = None
    for attempt_model in (model_name, config.FALLBACK_MODEL):
        if attempt_model in tried:
            continue
        tried.add(attempt_model)
        try:
            data = do_call(attempt_model)
            break
        except urllib.error.HTTPError as e:
            last_error = e

    if data is None:
        # Both the requested model and our hardcoded FALLBACK_MODEL failed -
        # most likely because Google retired one of these model IDs again
        # (this has already happened once: gemini-2.5-flash, previously the
        # "recommended" default, became unavailable to new API keys without
        # any action on our part). Rather than keep hand-guessing model
        # names as Google's lineup churns, ask this tenant's own key what it
        # actually has access to right now and retry once with whatever
        # comes back first.
        try:
            available = call_list_models(api_key)
        except Exception:
            available = []
        for m in available:
            name = m.get("name")
            if not name or name in tried:
                continue
            tried.add(name)
            try:
                data = do_call(name)
                break
            except urllib.error.HTTPError as e:
                last_error = e
        if data is None:
            raise last_error

    text = (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text")
    )
    if not text:
        raise ValueError("Ungueltige Antwort von der Gemini API erhalten.")
    return text


def call_generate_image(api_key: str, prompt: str) -> str:
    """Generates a single image via Gemini's image-capable model and returns
    it as a base64-encoded PNG string (no data: prefix). Used by the
    Social-Media-Content tool. This model has narrower availability than the
    plain text models, so callers should be ready to show the user a clear
    error if it's not enabled for their API key rather than silently
    pretending it worked."""
    model_name = "gemini-2.0-flash-preview-image-generation"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    body = json.dumps(
        {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    for part in parts:
        inline = part.get("inlineData") or part.get("inline_data")
        if inline and inline.get("data"):
            return inline["data"]
    raise ValueError("Die KI hat kein Bild zurückgegeben (nur Text oder leere Antwort).")


def call_list_models(api_key: str):
    url = f"https://generativelanguage.googleapis.com/v1/models?key={api_key}"
    with urllib.request.urlopen(url, timeout=20) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    models = data.get("models", [])
    result = []
    for m in models:
        methods = m.get("supportedGenerationMethods", [])
        if "generateContent" in methods:
            result.append(
                {
                    "name": m.get("name", "").replace("models/", ""),
                    "displayName": m.get("displayName", ""),
                }
            )
    return result
