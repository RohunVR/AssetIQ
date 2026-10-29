# AssetIQ Application Specification

## 1. Purpose and scope

AssetIQ is a browser-based institutional asset and inventory system. It supports staff who manage departments, laboratories, equipment, consumable stock, borrowing, maintenance, and users, as well as faculty and students who browse assets and submit or track borrowing requests.

This document describes the reorganized repository and the behavior implemented by the application. It is an architecture and behavior reference, not a proposal for new features.

## 2. Repository architecture

```text
main.py                         Development entry point
run.sh                          macOS/Linux environment and launch helper
requirements.txt                Python runtime dependencies
PROJECT_SPEC.md                 This specification
README.md                       Setup, demo data, and user-oriented overview
backend/
  app/
    main.py                     FastAPI composition root and static SPA serving
    config.py                   Environment-backed configuration and paths
    database.py                 SQLAlchemy engine/session/base
    security.py                 Password hashing, JWT, current-user and role checks
    seed.py                     First-run institutional demo data
    library_seed.py             Library catalog and additive seed operation
    time_util.py                UTC time helper
    api/                        HTTP endpoints grouped by domain
    models/                     SQLAlchemy persistence entities
    schemas/                    Pydantic request/response contracts
frontend/
  index.html                    SPA shell
  css/styles.css                Global styles
  assets/                       Static brand assets
  js/api.js                     Fetch client and API error/auth handling
  js/auth.js                    Browser-side authentication state/actions
  js/router.js                  Hash router and application layout
  js/components/                Shared navigation, modal, and toast UI
  js/views/                     Login and product module screens
 tests/test_workflows.py        End-to-end API workflow tests
 data/assetiq.db                Default SQLite file (created at runtime)
```

### Layer responsibilities

- **Frontend:** renders screens and gathers user input. It calls `/api` endpoints through the shared API client. It is a vanilla JavaScript ES-module application; Tailwind is loaded from a CDN and application-specific styles are in `frontend/css/styles.css`.
- **API layer:** `backend/app/api/` owns HTTP routes, dependency injection, and endpoint-level access checks. The routes use domain models and schemas and contain most workflow rules today.
- **Models:** `backend/app/models/` defines SQLAlchemy entities and relationships. `models/__init__.py` exports the models used for metadata creation and seed workflows.
- **Schemas:** `backend/app/schemas/` defines validated payload and response shapes.
- **Infrastructure:** `config.py`, `database.py`, `security.py`, and `time_util.py` provide shared configuration, persistence, identity, and time behavior.
- **Composition and delivery:** `backend/app/main.py` registers routers, initializes the database at startup, and serves the frontend from the same origin.
- **Seed data:** `seed.py` inserts the standard demo scenario when there are no users. `library_seed.py` contains the library catalog and can add it to an existing database; the default first-run seed also imports this catalog.
- **Tests:** `tests/test_workflows.py` exercises end-to-end behavior through FastAPI's test client.

## 3. Runtime and request flow

1. Start with `python main.py` or `bash run.sh`. Uvicorn imports `backend.app.main:app` on `127.0.0.1:8000` with reload enabled.
2. During FastAPI lifespan startup, SQLAlchemy creates missing tables and `seed_database()` inserts demo data if the user table is empty.
3. FastAPI exposes JSON endpoints under `/api`, interactive API documentation at `/docs` and `/redoc`, and the frontend as static files. Unknown non-API browser paths fall back to `frontend/index.html` for client-side routing.
4. The browser router renders a view. The view calls the shared API client; protected calls include a JWT bearer token held by the frontend authentication module.
5. The route verifies identity and role through shared security dependencies, reads/writes via a request-scoped SQLAlchemy session, and returns a schema-shaped JSON response.
6. SQLAlchemy persists data in SQLite by default. `DATABASE_URL` can override the default database URL.

## 4. Product modules and API ownership

| Module | Route module | Main responsibility |
|---|---|---|
| Authentication | `api/auth.py` | Login, demo login, current-user identity |
| Users | `api/users.py` | Admin user creation, updates, activation and listing |
| Departments | `api/departments.py` | Department and laboratory management |
| Assets | `api/assets.py` | Asset search, CRUD, damage reporting and retirement |
| Inventory | `api/inventory.py` | Consumable stock and transaction history |
| Borrowing | `api/borrowing.py` | Request, approval/rejection, return, overdue synchronization |
| Maintenance | `api/maintenance.py` | Maintenance records and readiness verification |
| Alerts | `api/alerts.py` | Rule-based operational alerts |
| Dashboard | `api/dashboard.py` | Role-aware dashboard summaries |
| Settings | `api/settings.py` | Admin-configurable borrowing limits |

The frontend has corresponding screens in `frontend/js/views/`. Navigation and shared layout are in `router.js`, `components/sidebar.js`, and `components/header.js`.

## 5. Core domain rules

- Roles are `ADMIN`, `LAB_STAFF`, `FACULTY`, and `STUDENT`. Authorization is enforced in API routes/dependencies, not solely by hiding frontend controls.
- Students and faculty can browse assets and request available assets. Lab staff manage assets in their scope and process requests. Admins manage users, departments, and system settings.
- Borrowing limits default to three active assets and seven days, with values stored in system settings and configurable by admins.
- A requested asset must be available. Submission marks it pending; approval marks it borrowed and assigns a due date; rejection restores availability.
- Return inspection restores a good asset to availability or routes a damaged asset into maintenance. Completing a maintenance record does not itself release the asset; staff must explicitly verify readiness.
- Inventory stock-out cannot overdraw the quantity. Low-stock state is evaluated against the item's configured minimum threshold.
- Overdue state is synchronized during selected API operations and surfaced in alerts and dashboards.

## 6. Persistence and configuration

- Default storage: `data/assetiq.db`, created under the project root.
- Override: set `DATABASE_URL` before launch. SQLite connections disable same-thread enforcement for FastAPI use and enable the configured SQLite pragmas.
- Set `SECRET_KEY` outside local demonstration use to replace the development default. JWT uses HS256; expiry and borrowing defaults are configured in `config.py`.
- Startup calls `Base.metadata.create_all`; this creates missing tables but does not migrate existing schemas.
- The seed process treats the presence of any user as evidence that initial data already exists. Adding a new entity field or changing an existing database schema therefore requires a migration or a deliberate database reset; `create_all` is not a migration system.

## 7. Development and verification

- Install dependencies: `pip install -r requirements.txt`.
- Launch: `python main.py` or `bash run.sh`.
- API docs: `http://127.0.0.1:8000/docs`.
- Run workflows: `python -m unittest discover -s tests -v`.
- Add library catalog to a populated database: `python -m backend.app.library_seed`.

The workflow suite drops and recreates all tables on the configured SQLAlchemy engine before seeding. For example, use `DATABASE_URL=sqlite:///data/assetiq_test.db python -m unittest discover -s tests -v`; otherwise the engine targets the development database file.

## 8. Restructure summary

The reorganization groups workflow verification under `tests/`, moves the library catalog seeder into the backend Python package, removes its manual `sys.path` mutation, and adds explicit package markers. The main launcher and application URLs remain stable. No API contracts, database tables, frontend routes, or product workflows were intentionally changed.
