# AssetIQ — Smart Inventory & Asset Management System

> **Centralized College Laboratory Equipment & Institutional Asset Management Portal**  
> A full-stack web application built as a college Final Year Project (FSD)

---

## Project Description

AssetIQ is a real college management system that replaces scattered Excel sheets and manual paper records with a single organized web-based portal. It manages laboratory equipment, institutional assets, consumable inventory, borrowing workflows, equipment returns, damage reporting, maintenance tracking, and user authorization — all accessible through a professional browser-based interface.

The system is "smart" through rule-based alerts and automatic status enforcement (not AI), making it a practical, working institutional tool rather than a showcase portfolio project.

---

## Features

### Authentication & Authorization
- JWT-based login and session management
- Four distinct roles: **Admin**, **Lab Staff**, **Faculty**, **Student**
- Backend enforces all permissions (not just hidden UI buttons)
- Demo quick-login buttons for project evaluation

### User Management (Admin only)
- Create, edit, activate/deactivate user accounts
- Assign roles and department associations
- Search and filter by name, email, role, department

### Department & Laboratory Management
- Multi-department structure (CSE, ECE, AIML)
- Each department has multiple laboratories
- Department-lab hierarchy maintained throughout

### Asset Management
- Register individual trackable assets with unique Asset IDs (e.g., `AST-CSE-001`)
- Categories: Computing, Electronics, Instruments, AV, Networking, Robotics
- Asset statuses: Available, Pending Request, Borrowed, Overdue, Under Maintenance, Damaged, Retired
- Search/filter by name, ID, category, department, lab, status, condition
- Asset detail view with borrowing and maintenance history
- Cross-department visibility: all users can browse all assets
- Invalid status transitions are blocked at the backend

### Inventory Management (Staff/Admin only)
- Quantity-based consumable stock management (Jumper Wires, Resistors, Batteries, etc.)
- Receive stock: increases quantity
- Issue/use stock: decreases quantity, with overdraw prevention
- Configurable minimum threshold — automatic **Low Stock Alert** when below threshold
- Per-department and per-laboratory stock management
- Transaction history for every stock movement

### Borrowing Workflow
1. Student/Faculty browses available assets and submits a borrowing request with purpose and duration
2. System validates: asset availability, user's active loan count, duration limit
3. Asset status becomes **Pending Request** immediately
4. Lab Staff reviews and approves or rejects with a written reason
5. On approval: asset becomes **Borrowed**, due date is automatically calculated
6. On rejection: asset reverts to **Available**
7. Staff records the physical return and inspection condition
8. If returned in Good condition → asset becomes **Available**
9. If returned damaged → asset becomes **Damaged**, entering the maintenance workflow

### Overdue Detection
- Every approved borrowing has a due date
- Automatic overdue detection when any borrowing endpoint is hit
- Overdue items highlighted prominently in the UI with a pulsing badge
- Dashboard shows overdue count for Staff/Admin; users see their own overdue items

### Damage Reporting
- Lab Staff records damage on return with severity level
- Students/Faculty can report a problem on any currently-borrowed item
- Damaged assets are locked from further borrowing

### Maintenance Management
- Open maintenance tickets for damaged/faulty assets
- Asset enters **Under Maintenance** status immediately
- Track: status (Pending → In Progress → Completed), technician, cost, service date
- Completing maintenance does **NOT** automatically restore the asset
- Lab Staff must physically verify and click **"Verify & Release to Available"**
- Maintenance history retained per asset

### Dashboard
- Role-specific stat cards (Total Assets, Available, Borrowed, Overdue, Low Stock, etc.)
- Urgent rule-based system alerts for critical conditions
- Admin: institution-wide overview with department distribution
- Lab Staff: department-specific metrics and pending request queue
- Student/Faculty: personal loan tracker with due dates

### Rule-Based Alerts
- Low Stock: "Jumper Wires are below the minimum stock level."
- Overdue: "Laptop LT-021 is overdue for return."
- Pending Request: "A new borrowing request requires approval."
- Maintenance: "Asset under maintenance in your department."

### Settings (Admin only)
- Configure maximum simultaneous loans per user
- Configure maximum borrowing duration in days
- Settings are database-backed and immediately enforced

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12+) |
| **ASGI Server** | [Uvicorn](https://www.uvicorn.org/) |
| **ORM / Database** | [SQLAlchemy 2.x](https://www.sqlalchemy.org/) + SQLite (file-based, zero setup) |
| **Authentication** | JWT (`PyJWT`) + Bcrypt password hashing |
| **Data Validation** | [Pydantic v2](https://docs.pydantic.dev/) |
| **Frontend** | Vanilla JavaScript (ES Modules, no framework) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) (CDN) + Custom CSS |
| **Fonts** | Inter + JetBrains Mono (Google Fonts) |
| **Serving** | FastAPI StaticFiles — single server serves both API and frontend |

---

## Project Structure

```
FSD project/
├── main.py                      # Root development launcher
├── run.sh                       # Environment setup and launcher (macOS/Linux)
├── requirements.txt             # Python dependencies
├── PROJECT_SPEC.md              # Architecture and behavior specification
├── backend/
│   ├── __init__.py
│   └── app/
│       ├── __init__.py
│       ├── main.py              # FastAPI app, lifespan, API and SPA serving
│       ├── config.py            # Paths, database URL, security and defaults
│       ├── database.py          # SQLAlchemy engine, sessions and base
│       ├── security.py          # Passwords, JWT and authorization dependencies
│       ├── seed.py              # Idempotent first-run sample data seed
│       ├── library_seed.py      # Library catalog data and optional seed command
│       ├── time_util.py         # UTC-aware datetime helper
│       ├── api/                 # HTTP routes grouped by product domain
│       ├── models/              # SQLAlchemy persistence models
│       └── schemas/             # Pydantic request and response contracts
├── frontend/
│   ├── index.html               # Single-page application shell
│   ├── css/                     # Application styles
│   ├── assets/                  # Static images and branding
│   └── js/                      # API/auth, router, components and views
├── tests/
│   ├── __init__.py
│   └── test_workflows.py        # End-to-end API workflow suite
└── data/
    └── assetiq.db               # SQLite database (created on first run)
```

The backend package owns HTTP handling, business workflows, persistence, and sample data. The frontend is a static ES-module SPA served by FastAPI. `main.py` and `run.sh` remain convenience entry points; workflow checks live in `tests/`.

---

## Installation & Setup

### Prerequisites
- **Python 3.10+** (tested on Python 3.12 / 3.14)
- **pip** and **venv** (included with Python)
- A modern web browser (Chrome, Edge, Firefox)
- Internet connection (for Google Fonts and Tailwind CDN on first load)

### Step 1: Clone / Open the Project
Open the project folder in VS Code:
```
File → Open Folder → select "FSD project"
```

### Step 2: Create the Virtual Environment
Open a terminal in VS Code (`Ctrl+`` ` or Terminal → New Terminal):
```bash
python3 -m venv .venv
```

### Step 3: Activate the Virtual Environment
**macOS/Linux:**
```bash
source .venv/bin/activate
```
**Windows (PowerShell):**
```powershell
.venv\Scripts\Activate.ps1
```

### Step 4: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 5: Run the Application

**Option A — One-click script (macOS/Linux):**
```bash
bash run.sh
```

**Option B — Direct Python launch:**
```bash
python main.py
```

**Option C — VS Code Task (if configured):**
Press `Ctrl+Shift+P` → `Tasks: Run Task` → `Start AssetIQ`

The server will start and print:
```
============================================================
  AssetIQ: Smart Inventory and Asset Management System
============================================================
Starting server on http://127.0.0.1:8000 ...
Open your browser and navigate to: http://127.0.0.1:8000
API Documentation available at:   http://127.0.0.1:8000/docs
============================================================
```

### Step 6: Open in Browser
Navigate to: **http://127.0.0.1:8000**

---

## Sample Data (Auto-Seeded)

The database is automatically seeded with realistic college and library data on first run. No manual setup required. The library catalog can also be added to an existing database with `python -m backend.app.library_seed`.

### Departments
| Code | Name |
|------|------|
| CSE | Computer Science and Engineering |
| ECE | Electronics and Communication Engineering |
| AIML | Artificial Intelligence and Machine Learning |

### Laboratories
| Code | Name | Department |
|------|------|------------|
| LAB-PROG | Programming Laboratory | CSE |
| LAB-AI | AI & Deep Learning Lab | CSE |
| LAB-NET | Networks & Cloud Computing Lab | CSE |
| LAB-ELEC | Electronics & Circuits Lab | ECE |
| LAB-IOT | IoT & Embedded Systems Lab | ECE |
| LAB-ROBO | Robotics & Computer Vision Lab | AIML |

### Sample Assets (13 total)
- Laptops (Dell Latitude, HP EliteBook) — CSE Programming Lab
- Projectors (Epson EB) — CSE / ECE
- Arduino Kits, Raspberry Pi Kits — ECE IoT Lab
- Digital Oscilloscopes — ECE Electronics Lab
- Desktop Workstations — CSE AI Lab
- DSLR Camera — CSE / AIML
- Cisco Network Switches — CSE Networking Lab

### Sample Inventory (8 items)
- Jumper Wires, Resistors Pack, Ceramic Capacitors — ECE Electronics Lab
- AA Batteries, USB Type-C Cables — ECE IoT Lab
- Ethernet Patch Cables — CSE Networking Lab
- Arduino Nano Boards — AIML Robotics Lab
- LCD 16x2 Displays — ECE IoT Lab

### Pre-Seeded Scenario Data
- **1 active borrowing**: Prof. Alan Turing has borrowed a projector
- **1 overdue borrowing**: Student Ananya Iyer has an overdue oscilloscope (set to past due date)
- **1 pending request**: Rahul Sharma has a pending laptop request
- **3 maintenance records**: Projector under maintenance, completed laptop awaiting verification

---

## Sample Login Credentials

> Use these credentials directly on the login page, or click the **Quick Login** buttons for one-click access.

| Role | Name | Email | Password |
|------|------|-------|----------|
| **Admin** | Dr. Eleanor Vance | `admin@college.edu` | `Admin@123` |
| **Librarian** | Ms. Priya Raghavan | `librarian@college.edu` | `Library@123` |
| **Lab Staff (CSE)** | Robert Sterling | `staff.cse@college.edu` | `Staff@123` |
| **Lab Staff (ECE)** | Dr. Meera Nambiar | `staff.ece@college.edu` | `Staff@123` |
| **Lab Staff (AIML)** | Dr. Riya Khanna | `staff.aiml@college.edu` | `Staff@123` |
| **Faculty** | Prof. Alan Turing | `faculty.cse@college.edu` | `Faculty@123` |
| **Student (CSE)** | Rahul Sharma | `student.cse@college.edu` | `Student@123` |
| **Student (ECE)** | Ananya Iyer *(has overdue item)* | `student.ece@college.edu` | `Student@123` |

---

## User Roles & Permissions

### Admin
- Full access to all modules and all departments
- Create/edit/deactivate user accounts and assign roles
- Manage departments and laboratories
- Configure institution-wide borrowing limits
- View all assets, inventory, borrowing, and maintenance records

### Lab Staff
- Scoped to their assigned department
- Add and edit assets in their department
- Manage consumable inventory (receive/issue stock)
- Review, approve, or reject borrowing requests
- Record equipment returns and physical condition
- Open and manage maintenance tickets
- Verify asset readiness after maintenance

### Faculty
- Browse all assets across all departments
- Submit borrowing requests with purpose and duration
- View and track their own requests
- Report problems on currently-borrowed equipment

### Student
- Browse all assets across all departments
- Submit borrowing requests (subject to active loan limits)
- View and track their own requests and due dates
- Report problems on currently-borrowed equipment

---

## Key Institutional Rules (Enforced by Backend)

| Rule | Description |
|------|-------------|
| **Borrowing Limit** | Default: max 3 active loans per user (configurable) |
| **Duration Limit** | Default: max 7 days per request (configurable) |
| **Asset Availability** | Only Available assets can be requested |
| **Status Transition** | Borrowed → Returned → Available or Damaged (enforced) |
| **Maintenance Release** | Manual staff verification required before asset becomes Available |
| **Overdraw Prevention** | Inventory quantities cannot go below zero |
| **Low Stock Threshold** | Configurable per inventory item; alerts trigger automatically |

---

## API Documentation

When the server is running, visit the interactive API docs:
- **Swagger UI**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc

---

## Running Automated Tests

The workflow suite resets the database configured by `DATABASE_URL`. Point it at a disposable database before running it:
```bash
source .venv/bin/activate
DATABASE_URL=sqlite:///data/assetiq_test.db python -m unittest discover -s tests -v
```

The test suite covers:
1. Authentication & RBAC enforcement
2. Cross-department asset visibility
3. Borrowing limit validations
4. Full borrowing and approval workflow
5. Return workflow with damage routing
6. Maintenance manual readiness verification
7. Inventory stock management and low-stock alerts
8. Overdue detection and alerting
9. Admin settings configuration

---

## Development Notes

- **Database**: SQLite file stored at `data/assetiq.db`. Delete this file to reset and re-seed.
- **Hot reload**: `python main.py` runs uvicorn with `--reload` enabled for development.
- **CORS**: Configured to allow all origins for local development.
- **Token expiry**: JWT tokens expire after 7 days (configurable in `config.py`).
- **Timezone**: All timestamps are stored and compared as UTC using `time_util.py`.

---

## Team

*AssetIQ — College Full-Stack Development Project*  
*Department of Computer Science and Engineering*
