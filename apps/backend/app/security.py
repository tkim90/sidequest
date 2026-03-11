"""Security middleware and utilities for Sidequest API.

Provides:
- IP-based rate limiting with sliding windows
- Concurrent stream tracking
- Cloudflare Turnstile verification
- Circuit breaker / kill switch
- Request validation helpers
"""

import os
import time
from collections import defaultdict
from dataclasses import dataclass, field

import httpx
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send


# ---------------------------------------------------------------------------
# Configuration helpers
# ---------------------------------------------------------------------------

def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "")
    try:
        return int(raw)
    except (ValueError, TypeError):
        return default


def _env_str(name: str, default: str) -> str:
    return (os.getenv(name) or "").strip() or default


# ---------------------------------------------------------------------------
# Rate-limit defaults (configurable via env vars)
# ---------------------------------------------------------------------------

RATE_LIMIT_WINDOW_SECONDS = _env_int("RATE_LIMIT_WINDOW_SECONDS", 300)  # 5 min
RATE_LIMIT_MAX_REQUESTS = _env_int("RATE_LIMIT_MAX_REQUESTS", 3)  # per window
RATE_LIMIT_DAILY_MAX = _env_int("RATE_LIMIT_DAILY_MAX", 25)
MAX_CONCURRENT_STREAMS = _env_int("MAX_CONCURRENT_STREAMS", 1)


# ---------------------------------------------------------------------------
# Input-size defaults
# ---------------------------------------------------------------------------

MAX_MESSAGES = _env_int("MAX_MESSAGES", 20)
MAX_CHARS_PER_MESSAGE = _env_int("MAX_CHARS_PER_MESSAGE", 1500)
MAX_TOTAL_CHARS = _env_int("MAX_TOTAL_CHARS", 8000)
MAX_OUTPUT_TOKENS = _env_int("MAX_OUTPUT_TOKENS", 800)


# ---------------------------------------------------------------------------
# Client IP extraction
# ---------------------------------------------------------------------------

def get_client_ip(request: Request) -> str:
    """Return the best-effort client IP, respecting common proxy headers."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"


# ---------------------------------------------------------------------------
# Sliding-window rate limiter (in-memory)
# ---------------------------------------------------------------------------

@dataclass
class _BucketEntry:
    timestamps: list[float] = field(default_factory=list)
    daily_count: int = 0
    daily_reset: float = 0.0


class RateLimiter:
    """Simple in-memory sliding-window rate limiter keyed by IP."""

    def __init__(
        self,
        window_seconds: int = RATE_LIMIT_WINDOW_SECONDS,
        max_requests: int = RATE_LIMIT_MAX_REQUESTS,
        daily_max: int = RATE_LIMIT_DAILY_MAX,
    ) -> None:
        self.window_seconds = window_seconds
        self.max_requests = max_requests
        self.daily_max = daily_max
        self._buckets: dict[str, _BucketEntry] = defaultdict(_BucketEntry)

    def check(self, key: str) -> tuple[bool, int]:
        """Return (allowed, retry_after_seconds). Does NOT record the request."""
        now = time.time()
        bucket = self._buckets[key]

        # Reset daily counter at midnight boundaries (every 86400s from first request)
        if now >= bucket.daily_reset:
            bucket.daily_count = 0
            bucket.daily_reset = now + 86400

        # Prune timestamps outside current window
        cutoff = now - self.window_seconds
        bucket.timestamps = [ts for ts in bucket.timestamps if ts > cutoff]

        # Check daily limit
        if bucket.daily_count >= self.daily_max:
            retry_after = int(bucket.daily_reset - now) + 1
            return False, retry_after

        # Check sliding window
        if len(bucket.timestamps) >= self.max_requests:
            oldest = bucket.timestamps[0]
            retry_after = int(oldest + self.window_seconds - now) + 1
            return False, max(retry_after, 1)

        return True, 0

    def record(self, key: str) -> None:
        """Record a request. Call only after all checks pass."""
        now = time.time()
        bucket = self._buckets[key]
        bucket.timestamps.append(now)
        bucket.daily_count += 1


# ---------------------------------------------------------------------------
# Concurrent-stream tracker
# ---------------------------------------------------------------------------

class StreamTracker:
    """Track number of active streaming connections per IP."""

    def __init__(self, max_concurrent: int = MAX_CONCURRENT_STREAMS) -> None:
        self.max_concurrent = max_concurrent
        self._active: dict[str, int] = defaultdict(int)

    def acquire(self, key: str) -> bool:
        """Try to start a new stream. Returns False if limit reached."""
        if self._active[key] >= self.max_concurrent:
            return False
        self._active[key] += 1
        return True

    def release(self, key: str) -> None:
        """Mark a stream as finished."""
        self._active[key] = max(0, self._active[key] - 1)
        if self._active[key] == 0:
            self._active.pop(key, None)


# ---------------------------------------------------------------------------
# Cloudflare Turnstile verification
# ---------------------------------------------------------------------------

TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


async def verify_turnstile_token(token: str, ip: str) -> bool:
    """Verify a Cloudflare Turnstile token. Returns True if valid."""
    secret_key = os.getenv("TURNSTILE_SECRET_KEY", "").strip()
    if not secret_key:
        # Turnstile not configured — allow all (dev mode)
        return True

    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.post(
            TURNSTILE_VERIFY_URL,
            data={
                "secret": secret_key,
                "response": token,
                "remoteip": ip,
            },
        )

    if response.status_code != 200:
        return False

    result = response.json()
    return bool(result.get("success"))


# ---------------------------------------------------------------------------
# Circuit-breaker check
# ---------------------------------------------------------------------------

def is_ai_disabled() -> bool:
    """Return True if the kill switch env var is set."""
    val = os.getenv("SIDEQUEST_DISABLE_AI", "").strip().lower()
    return val in ("1", "true", "yes")


# ---------------------------------------------------------------------------
# Rate-limit middleware (applied to /api/chat/stream only)
# ---------------------------------------------------------------------------

# Module-level singletons so they persist across requests
rate_limiter = RateLimiter()
stream_tracker = StreamTracker()


class RateLimitMiddleware:
    """Pure ASGI middleware: rate limiting + concurrent-stream tracking.

    Uses a raw ASGI implementation instead of Starlette's BaseHTTPMiddleware
    so that the stream-tracker slot is released only after the full response
    body has been sent to the client (not just when headers are ready).
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        method = scope.get("method", "")

        if path != "/api/chat/stream" or method != "POST":
            await self.app(scope, receive, send)
            return

        # Build a minimal Request object for IP extraction
        request = Request(scope)
        client_ip = get_client_ip(request)

        # 1. Check concurrent streams FIRST (doesn't consume quota)
        if not stream_tracker.acquire(client_ip):
            response = JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many concurrent streams. Please wait for the current stream to finish.",
                },
                headers={"Retry-After": "5"},
            )
            await response(scope, receive, send)
            return

        # 2. Check rate limit (only after concurrent stream is acquired)
        allowed, retry_after = rate_limiter.check(client_ip)
        if not allowed:
            stream_tracker.release(client_ip)
            response = JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded. Please try again later.",
                },
                headers={"Retry-After": str(retry_after)},
            )
            await response(scope, receive, send)
            return

        # 3. Record the request now that all checks passed
        rate_limiter.record(client_ip)

        # 4. Wrap send to release stream slot after body is fully sent
        released = False

        async def send_with_tracking(message: Message) -> None:
            nonlocal released
            await send(message)
            if (
                message.get("type") == "http.response.body"
                and not message.get("more_body", False)
            ):
                stream_tracker.release(client_ip)
                released = True

        try:
            await self.app(scope, receive, send_with_tracking)
        except Exception:
            # Ensure slot is released even on error (but not double-released)
            if not released:
                stream_tracker.release(client_ip)
            raise
