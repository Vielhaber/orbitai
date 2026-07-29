from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import config
from ai_routes import router as ai_router

app = FastAPI(title="OrbitAI Sales Strategist API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    # Note: HTTPException raised here would NOT be turned into a response by
    # FastAPI's exception handlers - @app.middleware("http") sits outside
    # that layer (a Starlette BaseHTTPMiddleware quirk). Returning a
    # JSONResponse directly is the correct way to short-circuit here.
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > config.MAX_BODY_BYTES:
        return JSONResponse(status_code=413, content={"detail": "Anfrage ist zu groß."})
    return await call_next(request)


app.include_router(ai_router)


@app.get("/health")
async def health():
    return {"ok": True}
