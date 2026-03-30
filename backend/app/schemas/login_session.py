from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class LoginSessionResponse(BaseModel):
    id: UUID
    ip_address: str
    browser: str | None = None
    os: str | None = None
    device_type: str | None = None
    city: str | None = None
    region: str | None = None
    country: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginHistoryResponse(BaseModel):
    items: list[LoginSessionResponse]
    total: int
