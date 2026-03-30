from fastapi import APIRouter
from pydantic import BaseModel

APP_VERSION = "0.1.0"

router = APIRouter()


class AppConfigResponse(BaseModel):
    version: str
    app_name: str


@router.get("", response_model=AppConfigResponse)
async def get_config():
    return AppConfigResponse(
        version=APP_VERSION,
        app_name="Talents Apartment Management AIS",
    )
