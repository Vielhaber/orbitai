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

    try:
        data = do_call(model_name)
    except urllib.error.HTTPError as e:
        if model_name != config.FALLBACK_MODEL:
            try:
                data = do_call(config.FALLBACK_MODEL)
            except urllib.error.HTTPError:
                raise e
        else:
            raise

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
