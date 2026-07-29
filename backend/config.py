"""Centralized environment configuration. Fails loudly and immediately if a
required secret is missing, rather than limping along and failing confusingly
on the first real request."""

import os

from dotenv import load_dotenv

load_dotenv()


def _require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {name}. "
            f"Copy .env.example to .env and fill it in."
        )
    return value


SUPABASE_URL = _require("SUPABASE_URL")
SUPABASE_ANON_KEY = _require("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = _require("SUPABASE_SERVICE_ROLE_KEY")

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", "http://localhost:8080").split(",")
    if origin.strip()
]

DEFAULT_MODEL = "gemini-2.5-flash"
FALLBACK_MODEL = "gemini-1.5-flash"

MAX_BODY_BYTES = 2_000_000
