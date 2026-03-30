from __future__ import annotations

from uuid import UUID

import httpx
from user_agents import parse as parse_ua
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.login_session import LoginSession
from app.models.user import User


async def _geoip_lookup(ip: str) -> dict:
    """Fire-and-forget GeoIP lookup. Returns {} on failure."""
    if ip in ("127.0.0.1", "::1", "unknown", "testclient"):
        return {}
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                f"http://ip-api.com/json/{ip}?fields=city,regionName,country"
            )
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "city": data.get("city"),
                    "region": data.get("regionName"),
                    "country": data.get("country"),
                }
    except Exception:
        pass
    return {}


async def record_login(
    db: AsyncSession,
    *,
    user: User,
    ip_address: str,
    user_agent_str: str,
) -> LoginSession:
    ua = parse_ua(user_agent_str)
    browser = f"{ua.browser.family} {ua.browser.version_string}".strip()
    os_name = f"{ua.os.family} {ua.os.version_string}".strip()
    device_type = "mobile" if ua.is_mobile else "tablet" if ua.is_tablet else "desktop"

    geo = await _geoip_lookup(ip_address)

    session = LoginSession(
        company_id=user.company_id,
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent_str,
        browser=browser,
        os=os_name,
        device_type=device_type,
        city=geo.get("city"),
        region=geo.get("region"),
        country=geo.get("country"),
    )
    db.add(session)
    return session


async def list_sessions(
    db: AsyncSession,
    user_id: UUID,
    company_id: UUID,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[LoginSession], int]:
    count_q = (
        select(func.count())
        .select_from(LoginSession)
        .where(LoginSession.user_id == user_id, LoginSession.company_id == company_id)
    )
    total = (await db.execute(count_q)).scalar() or 0

    q = (
        select(LoginSession)
        .where(LoginSession.user_id == user_id, LoginSession.company_id == company_id)
        .order_by(LoginSession.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = (await db.execute(q)).scalars().all()
    return list(rows), total
