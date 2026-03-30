from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class LoginSessionResponse(BaseModel):
    id: UUID
    ip_address: str
    browser: Optional[str] = None
    os: Optional[str] = None
    device_type: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginHistoryResponse(BaseModel):
    items: List[LoginSessionResponse]
    total: int
