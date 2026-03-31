"""Tenant Ops routes — tenants, leases, rent payments."""
from datetime import date as DateType
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from app.models.user import User
from app.models.tenant.tenant import Tenant
from app.models.tenant.lease import Lease
from app.models.tenant.rent_payment import RentPayment
from app.utils.dependencies import get_current_user

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class TenantCreate(BaseModel):
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    id_type: Optional[str] = None
    id_number: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    notes: Optional[str] = None


class TenantResponse(BaseModel):
    id: UUID
    company_id: UUID
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    id_type: Optional[str] = None
    id_number: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
    created_at: str
    active_lease_count: int = 0

    class Config:
        from_attributes = True


class LeaseCreate(BaseModel):
    tenant_id: UUID
    location_id: UUID
    unit_id: Optional[UUID] = None
    start_date: DateType
    end_date: DateType
    monthly_rent: Decimal
    caution_deposit: Decimal = Decimal(0)
    notes: Optional[str] = None


class LeaseResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    location_id: UUID
    unit_id: Optional[UUID] = None
    start_date: DateType
    end_date: DateType
    monthly_rent: Decimal
    caution_deposit: Decimal
    status: str
    notes: Optional[str] = None
    tenant_name: Optional[str] = None
    location_name: Optional[str] = None
    unit_name: Optional[str] = None
    total_paid: Decimal = Decimal(0)
    created_at: str

    class Config:
        from_attributes = True


class RentPaymentCreate(BaseModel):
    lease_id: UUID
    amount: Decimal
    payment_date: DateType
    period_month: int
    period_year: int
    payment_method: Optional[str] = None
    reference_no: Optional[str] = None
    notes: Optional[str] = None


class RentPaymentResponse(BaseModel):
    id: UUID
    lease_id: UUID
    amount: Decimal
    payment_date: DateType
    period_month: int
    period_year: int
    payment_method: Optional[str] = None
    reference_no: Optional[str] = None
    notes: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class TenantSummary(BaseModel):
    total_tenants: int = 0
    active_leases: int = 0
    total_monthly_rent: Decimal = Decimal(0)
    total_ar: Decimal = Decimal(0)  # accounts receivable (rent owed)


# ── Tenants CRUD ─────────────────────────────────────────────────────────────

@router.get("/", response_model=List[TenantResponse])
async def list_tenants(
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Tenant).where(Tenant.company_id == current_user.company_id)
    if search:
        q = q.where(Tenant.full_name.ilike(f"%{search}%"))
    q = q.order_by(Tenant.full_name)
    result = await db.execute(q)
    tenants = list(result.scalars().all())

    # Batch lease counts in one query (fixes N+1)
    tenant_ids = [t.id for t in tenants]
    lease_counts: dict = {}
    if tenant_ids:
        lc_result = await db.execute(
            select(Lease.tenant_id, func.count(Lease.id))
            .where(Lease.tenant_id.in_(tenant_ids), Lease.status == "ACTIVE")
            .group_by(Lease.tenant_id)
        )
        lease_counts = dict(lc_result.all())

    responses = []
    for t in tenants:
        responses.append(TenantResponse(
            id=t.id, company_id=t.company_id, full_name=t.full_name,
            phone=t.phone, email=t.email, id_type=t.id_type, id_number=t.id_number,
            emergency_contact=t.emergency_contact, emergency_phone=t.emergency_phone,
            notes=t.notes, is_active=t.is_active,
            created_at=str(t.created_at),
            active_lease_count=lease_counts.get(t.id, 0),
        ))
    return responses


@router.post("/", response_model=TenantResponse, status_code=201)
async def create_tenant(
    body: TenantCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = Tenant(
        company_id=current_user.company_id,
        created_by=current_user.id,
        **body.model_dump(),
    )
    db.add(tenant)
    await db.flush()
    await db.commit()
    await db.refresh(tenant)
    return TenantResponse(
        **{c.key: getattr(tenant, c.key) for c in Tenant.__table__.columns},
        created_at=str(tenant.created_at),
        active_lease_count=0,
    )


@router.patch("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: UUID,
    body: TenantCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Tenant).where(Tenant.id == tenant_id, Tenant.company_id == current_user.company_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    ALLOWED_UPDATE_FIELDS = {
        "full_name", "phone", "email", "id_type", "id_number",
        "emergency_contact", "emergency_phone", "notes",
    }
    for key, value in body.model_dump(exclude_unset=True).items():
        if key in ALLOWED_UPDATE_FIELDS:
            setattr(tenant, key, value)
    await db.commit()
    await db.refresh(tenant)

    lease_count = await db.execute(
        select(func.count(Lease.id)).where(Lease.tenant_id == tenant.id, Lease.status == "ACTIVE")
    )
    return TenantResponse(
        **{c.key: getattr(tenant, c.key) for c in Tenant.__table__.columns},
        created_at=str(tenant.created_at),
        active_lease_count=lease_count.scalar_one(),
    )


@router.delete("/{tenant_id}", status_code=204)
async def delete_tenant(
    tenant_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Tenant).where(Tenant.id == tenant_id, Tenant.company_id == current_user.company_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    await db.delete(tenant)
    await db.commit()


# ── Leases CRUD ──────────────────────────────────────────────────────────────

@router.get("/leases", response_model=List[LeaseResponse])
async def list_leases(
    tenant_id: Optional[UUID] = Query(None),
    status_filter: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(Lease)
        .where(Lease.company_id == current_user.company_id)
        .options(selectinload(Lease.tenant), selectinload(Lease.location), selectinload(Lease.unit))
    )
    if tenant_id:
        q = q.where(Lease.tenant_id == tenant_id)
    if status_filter:
        q = q.where(Lease.status == status_filter.upper())
    q = q.order_by(Lease.start_date.desc())
    result = await db.execute(q)
    leases = list(result.scalars().all())

    # Batch total paid in one query (fixes N+1)
    lease_ids = [ls.id for ls in leases]
    paid_map: dict = {}
    if lease_ids:
        paid_result = await db.execute(
            select(RentPayment.lease_id, func.coalesce(func.sum(RentPayment.amount), 0))
            .where(RentPayment.lease_id.in_(lease_ids))
            .group_by(RentPayment.lease_id)
        )
        paid_map = dict(paid_result.all())

    responses = []
    for ls in leases:
        responses.append(LeaseResponse(
            id=ls.id, tenant_id=ls.tenant_id, location_id=ls.location_id, unit_id=ls.unit_id,
            start_date=ls.start_date, end_date=ls.end_date,
            monthly_rent=ls.monthly_rent, caution_deposit=ls.caution_deposit,
            status=ls.status, notes=ls.notes,
            tenant_name=ls.tenant.full_name if ls.tenant else None,
            location_name=ls.location.name if ls.location else None,
            unit_name=ls.unit.name if ls.unit else None,
            total_paid=paid_map.get(ls.id, Decimal(0)),
            created_at=str(ls.created_at),
        ))
    return responses


@router.post("/leases", response_model=LeaseResponse, status_code=201)
async def create_lease(
    body: LeaseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lease = Lease(
        company_id=current_user.company_id,
        created_by=current_user.id,
        status="ACTIVE",
        **body.model_dump(),
    )
    db.add(lease)
    await db.flush()
    await db.commit()
    await db.refresh(lease, ["tenant", "location", "unit"])
    return LeaseResponse(
        id=lease.id, tenant_id=lease.tenant_id, location_id=lease.location_id, unit_id=lease.unit_id,
        start_date=lease.start_date, end_date=lease.end_date,
        monthly_rent=lease.monthly_rent, caution_deposit=lease.caution_deposit,
        status=lease.status, notes=lease.notes,
        tenant_name=lease.tenant.full_name if lease.tenant else None,
        location_name=lease.location.name if lease.location else None,
        unit_name=lease.unit.name if lease.unit else None,
        total_paid=Decimal(0),
        created_at=str(lease.created_at),
    )


@router.patch("/leases/{lease_id}/status")
async def update_lease_status(
    lease_id: UUID,
    new_status: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Lease).where(Lease.id == lease_id, Lease.company_id == current_user.company_id)
    )
    lease = result.scalar_one_or_none()
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")
    if new_status.upper() not in ("ACTIVE", "EXPIRED", "TERMINATED", "RENEWED"):
        raise HTTPException(status_code=422, detail="Invalid status")
    lease.status = new_status.upper()
    await db.commit()
    return {"status": lease.status}


# ── Rent Payments ────────────────────────────────────────────────────────────

@router.get("/rent-payments", response_model=List[RentPaymentResponse])
async def list_rent_payments(
    lease_id: Optional[UUID] = Query(None),
    year: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(RentPayment).where(RentPayment.company_id == current_user.company_id)
    if lease_id:
        q = q.where(RentPayment.lease_id == lease_id)
    if year:
        q = q.where(RentPayment.period_year == year)
    q = q.order_by(RentPayment.payment_date.desc())
    result = await db.execute(q)
    return [
        RentPaymentResponse(**{c.key: getattr(p, c.key) for c in RentPayment.__table__.columns}, created_at=str(p.created_at))
        for p in result.scalars().all()
    ]


@router.post("/rent-payments", response_model=RentPaymentResponse, status_code=201)
async def create_rent_payment(
    body: RentPaymentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify lease belongs to company
    lease = await db.execute(
        select(Lease).where(Lease.id == body.lease_id, Lease.company_id == current_user.company_id)
    )
    if not lease.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Lease not found")

    payment = RentPayment(
        company_id=current_user.company_id,
        created_by=current_user.id,
        **body.model_dump(),
    )
    db.add(payment)
    await db.flush()
    await db.commit()
    await db.refresh(payment)
    return RentPaymentResponse(
        **{c.key: getattr(payment, c.key) for c in RentPayment.__table__.columns},
        created_at=str(payment.created_at),
    )


# ── Summary ──────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=TenantSummary)
async def tenant_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cid = current_user.company_id

    total_tenants = (await db.execute(
        select(func.count(Tenant.id)).where(Tenant.company_id == cid, Tenant.is_active == True)
    )).scalar_one()

    active_leases_result = await db.execute(
        select(func.count(Lease.id), func.coalesce(func.sum(Lease.monthly_rent), 0))
        .where(Lease.company_id == cid, Lease.status == "ACTIVE")
    )
    row = active_leases_result.one()
    active_leases = row[0]
    total_monthly_rent = Decimal(str(row[1]))

    # AR = total rent expected - total payments received for active leases
    # Simplified: months elapsed × monthly rent - total paid
    total_paid = (await db.execute(
        select(func.coalesce(func.sum(RentPayment.amount), 0))
        .where(RentPayment.company_id == cid)
    )).scalar_one()

    return TenantSummary(
        total_tenants=total_tenants,
        active_leases=active_leases,
        total_monthly_rent=total_monthly_rent,
        total_ar=max(Decimal(0), total_monthly_rent - Decimal(str(total_paid))),
    )
