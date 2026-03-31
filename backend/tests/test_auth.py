import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
def test_register_and_login(client: AsyncClient):
    # Register
    resp = client.post("/api/auth/register", json={
        "email": "owner@talents.com",
        "password": "SecurePass123!",
        "full_name": "Test Owner",
        "company_name": "Talents Apartments",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data

    # Login with same credentials
    resp = client.post("/api/auth/login", json={
        "email": "owner@talents.com",
        "password": "SecurePass123!",
    })
    assert resp.status_code == 200
    tokens = resp.json()
    assert "access_token" in tokens

    # Get current user
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert resp.status_code == 200
    user = resp.json()
    assert user["email"] == "owner@talents.com"
    assert user["role"] == "OWNER"


@pytest.mark.asyncio
def test_login_unauthorized(client: AsyncClient):
    resp = client.post("/api/auth/login", json={
        "email": "nobody@talents.com",
        "password": "wrongpass",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
def test_me_without_token(client: AsyncClient):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 403


@pytest.mark.asyncio
def test_register_invalid_email(client: AsyncClient):
    resp = client.post("/api/auth/register", json={
        "email": "not-an-email",
        "password": "SecurePass123!",
        "full_name": "Test",
        "company_name": "Test Co",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
def test_refresh_token(client: AsyncClient):
    # Register to get tokens
    resp = client.post("/api/auth/register", json={
        "email": "refresh@talents.com",
        "password": "SecurePass123!",
        "full_name": "Refresh User",
        "company_name": "Talents Apartments",
    })
    refresh_token = resp.json()["refresh_token"]

    # Use refresh token
    resp = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
def test_refresh_invalid_token(client: AsyncClient):
    resp = client.post("/api/auth/refresh", json={"refresh_token": "invalid.token.here"})
    assert resp.status_code == 401
