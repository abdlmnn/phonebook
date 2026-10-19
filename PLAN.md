# Phonebook CRUD System — Implementation Plan

> This document is the single source of truth for building the Phonebook CRUD application.
> New agents should read this fully before writing any code.

## 0. Working Style (standing instruction from the user)

- Before every code change, briefly explain: **what piece we're building, the logic behind it, why it comes now** — so the user always understands what's happening.
- Keep steps small and sequential; finish one piece (verify it) before starting the next.
- Stick to the order in section 8.

## 1. Project Overview

Build a Phonebook CRUD web application:

- **Frontend:** Next.js (App Router, TypeScript)
- **Backend:** Django REST Framework
- **Database:** SQLite (Django's default `db.sqlite3` — user explicitly chose this instead of PostgreSQL)

Users manage contacts through a table-based interface with create, read/search, update, and delete.

**Scope guard:** Do NOT add authentication, registration, roles, pagination, or any features not listed here.

## 2. Environment & Prepared Decisions

These decisions are already confirmed by the user — do not re-ask:

| Topic | Decision |
|---|---|
| Database | SQLite via Django's default `DATABASES` config |
| Phone number format | Optional leading `+`, 7–15 digits — regex `^\+?\d{7,15}$` |
| Styling | Plain CSS (single stylesheet, no Tailwind, no component libraries) |
| Add/Edit form | Presented as a modal dialog |
| Delete confirmation | Presented as a modal dialog (not browser `confirm()`) |
| CORS | Avoided entirely by proxying `/api/*` through Next.js rewrites |
| Data fetching | Plain `fetch` (no React Query, SWR, or axios) |
| Auth | None — API is open |
| Commits | Do not commit or push unless explicitly instructed |

Environment versions present on the machine: Node v20.19.6, npm 10.8.2, Python 3.10.10.
Therefore use **Django 5.2 LTS** (`djangorestframework` 3.16.x) and **Next.js 15.x** (React 19).

## 3. Project Structure

```
phonebook/
├── PLAN.md                     # this file
├── README.md                   # how to run both apps (write at the end)
├── backend/
│   ├── manage.py
│   ├── db.sqlite3              # created by migrate
│   ├── requirements.txt        # django, djangorestframework
│   ├── config/                 # Django project: settings.py, urls.py, wsgi.py
│   └── contacts/               # app: models.py, serializers.py, views.py, urls.py, tests.py
└── frontend/
    ├── next.config.ts          # rewrite /api/* -> http://localhost:8000/api/*
    ├── package.json
    └── src/
        ├── app/
        │   ├── page.tsx        # Phonebook page (title, search, table, all client logic)
        │   ├── globals.css     # plain CSS
        │   └── layout.tsx
        └── components/
            ├── ContactFormModal.tsx
            └── ConfirmDeleteModal.tsx
```

`page.tsx` holds table state + search; modals are isolated client components.
Everything under `frontend` that changes is client-side (`"use client"`); no server components fetching.

## 4. Contact Data Model

Django model `Contact` in `backend/contacts/models.py`:

| Field | Django field | Rules |
|---|---|---|
| `name` | `CharField(max_length=120)` | required, non-empty after strip |
| `address` | `TextField()` | required, non-empty after strip |
| `contact_number` | `CharField(max_length=20)` | required, must match `^\+?\d{7,15}$` |
| `email` | `EmailField(blank=True, null=True)` | optional |
| `id` | auto PK (integer) | unique identifier |
| `created_at` / `updated_at` | `auto_now_add` / `auto_now` timestamps | returned in API, display optional |

- Contact numbers are stored as **strings** (never integers) to preserve leading zeros and `+`.
- Empty submitted email is normalized to `null` (`None`) on the backend.

### Validation rules (serializer-level, backend is final authority)

1. `name` — required; reject empty/whitespace-only.
2. `address` — required; reject empty/whitespace-only.
3. `contact_number` — required; must match `^\+?\d{7,15}$` (digits only, optional leading `+`, total 7–15).
4. `email` — conditional logic:
   - Empty or missing → valid, save as `null`.
   - Provided and valid → save.
   - Provided and invalid → reject with a field-specific error (use `EmailField` semantics / Django's `validate_email` in a `validate_email` serializer method).

Mirror the same rules for the basic client-side validation in the frontend; the backend remains the final authority.

## 5. API Endpoints (DRF router, no trailing-slash surprises)

| Method | Endpoint | Purpose | Success | Failure |
|---|---|---|---|---|
| GET | `/api/contacts/` | List contacts | `200` array | `500` only for real server errors |
| POST | `/api/contacts/` | Create contact | `201` + created object | `400` field-specific errors |
| GET | `/api/contacts/{id}/` | Retrieve one contact | `200` | `404` |
| PATCH | `/api/contacts/{id}/` | Partial update | `200` + updated object | `400` / `404` |
| DELETE | `/api/contacts/{id}/` | Delete contact | `204` no content | `404` |

- List supports `?search=<term>` filtering by `name` OR `contact_number` (use DRF `SearchFilter`, icontains; search must never modify or delete records).
- No pagination. No auth. JSON only.
- Invalid/nonexistent IDs → DRF standard `404 {"detail": "Not found."}`.
- Validation failures → `400` with DRF field-keyed error objects, e.g. `{"contact_number": ["Contact number must be 7–15 digits, optionally starting with +."]}`.

### Backend tests (`backend/contacts/tests.py`) — must cover

1. Create success (with and without email).
2. Create rejection: missing name / address / contact_number; whitespace-only values.
3. Contact number rejections: 6 digits, 16 digits, letters, embedded spaces/dashes, `+` not at start.
4. Email conditional: empty → OK; valid → OK; invalid (`foo@`, `a@b`, missing `@`) → 400.
5. Retrieve 200 + 404 for bogus id.
6. PATCH: partial update keeps other fields; PATCH with bad email returns 400 and does NOT modify the record.
7. DELETE: 204 then subsequent GET → 404; DELETE bogus id → 404.
8. Search: matches on name and on contact_number; unknown term → empty array.

Run with `python manage.py test` (temporary SQLite test database; no pollution of `db.sqlite3`).

## 6. Frontend Behavior

### Main page (`/`)
- Page title: **Phonebook**
- **Add Contact** button (opens empty modal form)
- **Search input** (debounced ~300ms, triggers API refetch with `?search=`)
- Contacts table showing: Name, Address, Contact Number, Email, **Actions** (Edit, Delete)
- States to implement:
  - Loading (skeleton or loading row)
  - API/network error (banner with retry, message hides internals)
  - Empty list (clear message when no contacts at all)
  - Empty search result (distinct message, e.g. "No contacts match your search.", offer clear-search)

### Contact form modal (shared by Add and Edit)
- Fields: Name, Address, Contact Number, Email (optional, labeled as such)
- Client-side validation mirroring backend rules before submit
- On submit: `POST /api/contacts/` (create) or `PATCH /api/contacts/{id}/` (edit, prefilled with current values)
- On `400`: map and display field-specific server errors next to fields
- On success: close modal, show success message ("Contact created." / "Contact updated."), refresh table

### Delete flow
- Delete button → confirmation modal ("Are you sure you want to delete this contact?")
- Cancel → no request, unchanged; Confirm → `DELETE /api/contacts/{id}/` → success message + refresh
- If the contact no longer exists (404): show "This contact no longer exists." then refresh table

### API wiring
- All requests go to `/api/...` on the Next.js origin.
- `next.config.ts` rewrites: `/api/:path*` → `http://localhost:8000/api/:path*`
- This means zero CORS configuration on Django (no `django-cors-headers`).
- Non-2xx responses must be surfaced as friendly UI errors — never raw stack traces.

## 7. Error Handling Checklist

- [ ] Required fields missing → field errors (client + server)
- [ ] Invalid email format → field error, save allowed only when empty/valid
- [ ] Invalid contact number → field error
- [ ] Nonexistent contact id → 404 → friendly message
- [ ] API/database failure → error banner, no internal details exposed
- [ ] Empty contact list → empty state
- [ ] Search with no matches → empty-search state
- [ ] Delete canceled → nothing happens; confirmed → delete + refresh

## 8. Implementation Order

1. Scaffold `backend/` (Django 5.2 project `config` + `contacts` app, DRF, SQLite).
2. Implement model, serializer (with `^[+]?[0-9]{7,15}$` + conditional email), router, URLs.
3. `makemigrations` + `migrate`, then write and run `contacts` tests until green.
4. Scaffold `frontend/` (create-next-app, TS, App Router, no Tailwind), strip demo code.
5. Build Phonebook page: table, search, states; then modals (form + delete confirm).
6. Wire frontend to API; verify proxy rewrites; manual E2E: create → search → edit → delete (+ 404 path via stale row).
7. Write root `README.md` (run instructions: backend `python manage.py runserver`, frontend `npm run dev`).
8. Review: remove unused scaffolding, confirm no duplicated logic, no extra deps, no leftover files.

## 9. Out of Scope

- Authentication / registration / roles
- Import/export, avatars, multiple phone numbers, groups/tags
- Pagination, sorting, bulk operations
- Docker/deployment configuration
- Any git commits or pushes (unless the user explicitly asks)

## 10. Definition of Done

- All CRUD endpoints behave per section 5, verified by passing Django tests.
- Full UI flows work end-to-end with both dev servers running (sections 6–7).
- Validation works on both sides; backend rejects what the frontend misses.
- Direct browser access to `http://localhost:8000/api/contacts/` returns JSON (sanity check that SQLite is wired).
- No console errors in normal flows; friendly error states reachable.
