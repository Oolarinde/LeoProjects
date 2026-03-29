---
name: add-module
description: 'Scaffolds a complete CRUD module for Talents Apartments AIS — model, schema, route, service, tests, and React page — from a single description. Use when the user says "add module", "add a new module for", "scaffold module", or "/add-module [name]". Follows the full backend-first build order defined in CLAUDE.md.'
argument-hint: 'Module name and description, e.g. "revenue" or "maintenance-requests with title, unit, status, reported_date"'
disable-model-invocation: true
---

# Add Module

Scaffolds a full CRUD stack for a new Talents Apartments AIS module.

## Before Starting

1. Read `CLAUDE.md` — check existing patterns in Database and Domain Modules sections
2. Check `backend/app/models/` for existing models to avoid duplication
3. Check `backend/migrations/` for the latest migration version number

## Build Order

Always follow this sequence — never skip or reorder:

1. **Model** (`backend/app/models/<name>.py`)
   - Include `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - Include `company_id UUID REFERENCES companies(id)` — mandatory for all financial models
   - Include `created_at TIMESTAMPTZ DEFAULT NOW()`
   - Include `location_id` if the module is location-scoped
   - Register in `backend/app/models/__init__.py`

2. **Migration** (`backend/migrations/versions/NNN_add_<name>.py`)
   - Use the next sequential version number
   - Full `upgrade()` and `downgrade()` functions — no placeholders

3. **Schema** (`backend/app/schemas/schemas.py` — add to existing file)
   - `<Name>Create` — input validation, positive amounts, required fields
   - `<Name>Update` — all fields optional
   - `<Name>Response` — includes `id`, `created_at`

4. **Service** (`backend/app/services/<name>.py`)
   - `create_<name>`, `get_<name>s`, `get_<name>`, `update_<name>`, `delete_<name>`
   - Every query filters by `company_id` — never omit this
   - Year + location filters where applicable

5. **Route** (`backend/app/routes/<name>.py`)
   - All routes use `get_current_user` dependency
   - POST `/api/<name>` — create
   - GET `/api/<name>` — list (with pagination, filters)
   - GET `/api/<name>/{id}` — single record
   - PUT `/api/<name>/{id}` — update
   - DELETE `/api/<name>/{id}` — delete
   - Register router in `backend/main.py`

6. **Tests** (`backend/tests/test_<name>.py`)
   - Test 1: Happy path — create + retrieve
   - Test 2: Unauthorized — no token returns 401
   - Test 3: Invalid input — missing required field returns 422; if module has an amount field, negative value also returns 422
   - Use real PostgreSQL test DB — no mocks

7. **API service** (`frontend/src/services/<name>Api.ts`)
   - Typed Axios functions for each endpoint
   - Passes `year` and `locationId` from Zustand global store

8. **React page** (`frontend/src/pages/<Name>.tsx`)
   - MUI DataGrid or Table for list view
   - MUI Dialog form for create/edit
   - Connects to global `{ year, location }` store for filtering
   - Brand colours: `#1B2A4A` (navy — headers, sidebar), `#E85D5D` (red — expense totals), `#F0F4F8` (page background), `#2D3748` (body text)
   - Add route to `frontend/src/App.tsx` and sidebar entry in `frontend/src/components/Layout.tsx`

## Output

After generating all files, list:
- Files created with their paths
- The `alembic upgrade head` command to run
- Any seed data needed for this module
