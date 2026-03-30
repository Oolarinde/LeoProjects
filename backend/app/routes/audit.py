from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.audit import AuditLogListResponse
from app.utils.dependencies import require_admin

router = APIRouter()


@router.get("", response_model=AuditLogListResponse)
async def list_audit_logs(
    table_name: Optional[str] = Query(None),
    record_id: Optional[UUID] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    current_user: User = Depends(require_admin()),
    db: AsyncSession = Depends(get_db),
):
    base = select(AuditLog).where(AuditLog.company_id == current_user.company_id)
    if table_name:
        base = base.where(AuditLog.table_name == table_name)
    if record_id:
        base = base.where(AuditLog.record_id == record_id)
    if action:
        base = base.where(AuditLog.action == action)

    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    q = base.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
    items = list((await db.execute(q)).scalars().all())

    return AuditLogListResponse(items=items, total=total)
