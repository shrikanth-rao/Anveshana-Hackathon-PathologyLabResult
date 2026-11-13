# PATHFLOW – Pathology Lab Result Notifier
> **Subtitle:** Pathology Laboratory Report Management & Intelligent Dispatch System  
> **Academic Integration:** Automata Theory and Computability (BCS503) & Computer Networks (BCS502)

---

## 1. Executive Summary & Objective

**PATHFLOW** is a centralized, production-grade healthcare technology web application that manages the end-to-end lifecycle of pathology laboratory results. It bridges theoretical computer science concepts with modern full-stack engineering:

- **Automata Theory & Computability (BCS503):** Implements a genuine 17-state Deterministic Finite Automaton ($M = (Q, \Sigma, \delta, q_0, F)$) alongside independent Regular Expression validation to evaluate structured patient identifiers (`^PAT[0-9]{6}-LAB[A-Z]{2}$`). An interactive visualizer animates character-by-character transitions from $q_0$ through $q_{15}$ or to the `DEAD` rejection state.
- **Computer Networks (BCS502):** Simulates priority-based packet routing across hospital ward zones (`ZONE_1` to `ZONE_4`) using an explicit routing table stored in SQLite. Implements duty doctor availability checking, active workload capacity constraints, fallback routing to backup handlers, priority escalation for critical cases, and deterministic priority queue ordering ($P_1 > P_2 > P_3 \to \text{FIFO} \to \text{Tie-breaker}$).
- **Simulated 15-Minute SLA:** Enforces a live 15-minute resolution deadline for Critical and Stat reports with real-time countdown badges and automated breach auditing.

---

## 2. Core Architecture & Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite | Single-page application, responsive hospital operations dashboard |
| **Icons & Visuals** | Lucide React, Chart.js, React-Chartjs-2 | Clinical icons, SVG automata graphs, analytics charts |
| **Routing & Client** | React Router v6, Axios | Protected client routing and API communication |
| **Backend** | Python Flask, Werkzeug | REST API, password hashing, algorithmic dispatch services |
| **Automata Engine** | Custom Python DFA & `re.fullmatch` | Formal language validation and step-by-step trace generation |
| **Database** | SQLite via Flask-SQLAlchemy | Persistence of users, zones, handlers, routing rules, reports, histories, and events |
| **Automated Testing** | Pytest (30 Automated Tests) | Unit, algorithmic, routing, and integration test coverage |

---

## 3. End-to-End Workflow

$$\text{Report Submission} \longrightarrow \text{DFA/Regex Validation} \longrightarrow \text{Classification} \longrightarrow \text{Routing Table Lookup} \longrightarrow \text{Handler Assignment or Escalation} \longrightarrow \text{Status Update} \longrightarrow \text{Resolution}$$

1. **Submission:** Laboratory reporter enters structured specimen observations.
2. **Pre-Dispatch Guard:** Patient ID is independently validated by Python DFA ($q_0 \to q_{15}$) and regex. Malformed IDs are halted before routing table inspection.
3. **Classification:** Mapped into 5 predefined categories: `Critical` ($P_1$), `Stat` ($P_2$), `Routine` ($P_3$), `Pending` (Verification Queue), or `Error` (Correction Queue).
4. **Routing Table Lookup:** Ward zone (`ZONE_1`–`ZONE_4`) matched against database rules to determine primary and backup duty doctors.
5. **Eligibility Verification:** Checks handler status (`Available` vs `Unavailable`) and active workload vs capacity (`current_load < capacity`).
6. **Fallback & Escalation:**
   - If primary is unavailable or full $\to$ Dispatches to backup doctor.
   - If both are saturated $\to$ Escalates Critical reports immediately to emergency supervisor queue; retains Stat priority in waiting queue.
   - If ward zone is unregistered $\to$ Dispatches to Central Fallback Queue with escalation audit event.
7. **Resolution:** Duty doctor signs off (`Pending` $\to$ `Assigned` $\to$ `In Progress` $\to$ `Resolved`), automatically freeing workload capacity and triggering waiting queue evaluation.

---

## 4. Fictional Demonstration Credentials

The database comes pre-seeded with fictional accounts for all three roles:

| Role | Account Name | Email | Password | Assigned Zone / Role |
|---|---|---|---|---|
| **Reporter** | Alex Rivera, MLS | `reporter@pathflow.lab` | `reporter123` | Laboratory Reporter |
| **Duty Doctor (Primary)** | Dr. Marcus Chen | `dr.chen@pathflow.lab` | `doctor123` | `ZONE_1` (ICU Duty Intensivist) |
| **Duty Doctor (Primary)** | Dr. Ananya Patel | `dr.patel@pathflow.lab` | `doctor123` | `ZONE_2` (Emergency Physician) |
| **Duty Doctor (Primary)** | Dr. Sarah Jenkins | `dr.jenkins@pathflow.lab` | `doctor123` | `ZONE_3` (Cardiology Registrar) |
| **Duty Doctor (Primary)** | Dr. Mateo Alvarez | `dr.alvarez@pathflow.lab` | `doctor123` | `ZONE_4` (Inpatient Medicine Lead) |
| **Backup Doctor** | Dr. Emily Wong | `dr.wong@pathflow.lab` | `doctor123` | `ZONE_1` (Backup Intensivist) |
| **Backup Doctor** | Dr. Kelechi Nwosu | `dr.nwosu@pathflow.lab` | `doctor123` | `ZONE_2` (Backup Trauma Registrar) |
| **Backup Doctor** | Dr. David Miller | `dr.miller@pathflow.lab` | `doctor123` | `ZONE_3` (Backup Cardiology) |
| **Backup Doctor** | Dr. Claire Foster | `dr.foster@pathflow.lab` | `doctor123` | `ZONE_4` (Backup Inpatient) |
| **Administrator** | System Administrator | `admin@pathflow.lab` | `admin123` | System Administrator |

> **Note:** A one-click **Role Switcher** is built into the top navigation bar to let evaluators instantly switch between roles without re-logging.

---

## 5. Project Folder Structure

```
pathflow/
├── backend/
│   ├── app.py                      # Flask factory, blueprint registration & CORS
│   ├── config.py                   # System configuration, SLAs, supported panels
│   ├── database.py                 # SQLAlchemy db instance
│   ├── models.py                   # User, Zone, Handler, RoutingRule, Report, History, Event
│   ├── requirements.txt            # Python dependencies
│   ├── routes/
│   │   ├── auth_routes.py          # Session auth and demo user switcher
│   │   ├── report_routes.py        # Report submission, lifecycle transitions, filtering
│   │   ├── handler_routes.py       # Doctor availability and capacity management
│   │   ├── routing_routes.py       # Zone routing table rules & dispatch events
│   │   ├── queue_routes.py         # Priority-sorted queue endpoints & processing
│   │   ├── simulation_routes.py    # 7 predefined scenarios & custom simulation telemetry
│   │   └── analytics_routes.py     # Aggregated operational KPIs & chart feeds
│   ├── services/
│   │   ├── dfa.py                  # 17-State Python DFA (q0 to q15 + DEAD)
│   │   ├── validator.py            # Dual DFA and Regex comparison service
│   │   ├── classifier.py           # 5-Category deterministic precedence engine
│   │   ├── routing.py              # Zone lookup service
│   │   ├── dispatcher.py           # Priority dispatch, availability, fallback, escalation
│   │   ├── queue_manager.py        # Deterministic queue sorter & waiting queue processor
│   │   └── sla_manager.py          # 15-Minute countdown & breach auditor
│   ├── scripts/
│   │   ├── init_db.py              # SQLite table creation
│   │   └── seed_data.py            # Fictional users, doctors, zones, reports, and events
│   └── tests/
│       └── test_pathflow_suite.py  # 30 Automated Pytest test cases
├── frontend/
│   ├── package.json
│   ├── vite.config.js              # Vite server & /api proxy to Flask port 5000
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                 # Client router with persistent layout
│       ├── styles/
│       │   └── index.css           # Healthcare design system, badges, responsive layout
│       ├── context/
│       │   └── AuthContext.jsx     # User state & demo role switching
│       ├── services/
│       │   └── api.js              # Axios REST client
│       ├── components/
│       │   ├── Sidebar.jsx         # Persistent navigation
│       │   ├── Navbar.jsx          # Live pulse, role switcher, alerts
│       │   ├── StatusBadge.jsx     # Clinical badges for category & workflow
│       │   ├── SlaTimerBadge.jsx   # Live countdown timer with SLA breach alert
│       │   ├── MetricCard.jsx      # Summary KPI cards
│       │   └── ReportModal.jsx     # Timeline modal with audit log & status actions
│       └── pages/
│           ├── OverviewDashboard.jsx    # Central operations dashboard
│           ├── ReportSubmission.jsx     # Form with live DFA/Regex telemetry
│           ├── ReportManagement.jsx     # Full directory with search & filters
│           ├── UserDashboard.jsx        # Reporter submission tracker
│           ├── HandlerDashboard.jsx     # Duty doctor view with availability controls
│           ├── RoutingManagement.jsx    # Admin routing table matrix
│           ├── AnalyticsDashboard.jsx   # Chart.js charts for categories, zones, SLA
│           ├── DfaVisualizer.jsx        # Interactive Automata Lab (SVG state graph)
│           ├── RoutingSimulationLab.jsx # 7 Computer Networks routing scenarios
│           └── SmartQueueView.jsx       # Priority queue monitor
└── README.md
```

---

## 6. Installation & Local Startup Instructions

### Prerequisites
- Python 3.10+ (or Python 3.14)
- Node.js v18+ and npm

### Step 1: Backend Setup
```powershell
# Navigate to backend directory
cd backend

# Create virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initialize and seed database with demonstration records
python scripts/seed_data.py

# Start Flask backend server (Runs on port 5000)
python app.py
```

### Step 2: Frontend Setup
Open a second terminal window:
```powershell
# Navigate to frontend directory
cd frontend

# Install npm packages
npm install

# Start Vite React development server (Runs on port 5173)
npm run dev
```

Open your browser at `http://localhost:5173` to explore PATHFLOW.

---

## 7. Running the Automated Pytest Suite

The project includes **30 automated tests** covering validation, automata agreement, classification precedence, routing, capacity saturation, priority queue ordering, SLA calculation, and SQLite persistence.

To execute the test suite:
```powershell
cd backend
.\venv\Scripts\pytest tests -v
```

### Test Suite Summary:
- **Test 01–08:** DFA boundary conditions (valid ID, short digits, long digits, wrong prefix, missing hyphen, invalid suffix, empty input).
- **Test 09–10:** Independent DFA and Regex agreement verification for valid and invalid inputs.
- **Test 11–16:** 5-category classification (`CRIT`, `STAT`, `ROUT`, `PEND`, unmapped `Error`) and emergency clinical override precedence.
- **Test 17–25:** Routing table lookup, primary duty doctor selection, unknown zone central fallback, backup handler fallback on unavailability, capacity overflow escalation, priority queue ordering ($P_1$ ahead of $P_3$), FIFO tie-breaker, and duplicate prevention.
- **Test 26–30:** SQLite end-to-end integration, handler availability toggle persistence, 15-minute SLA calculation, report resolution workload decrement, and analytics synchronization.

---

## 8. Academic Evaluation Guide

- **To evaluate BCS503 (Automata Theory):**
  1. Navigate to **DFA Visualizer** in the sidebar.
  2. Enter patient ID `PAT123456-LABAB` and click **Run Animation** or **Step-by-Step** to observe active state highlights from $q_0$ through $q_{15}$.
  3. Click **Bad Prefix (MED)** or **5 Digits** to observe immediate transition to the `DEAD` state with full explanation.
  4. Compare the DFA outcome with the independent Python regex check.
- **To evaluate BCS502 (Computer Networks):**
  1. Navigate to **Routing Simulation Lab**.
  2. Select **Scenario 2 (Primary Doctor Unavailable)** to observe automated fallback to the designated backup handler.
  3. Select **Scenario 3 (Capacity Exceeded)** to observe both doctors saturated ($4/4$) and the Critical report escalating to the emergency queue.
  4. Select **Scenario 4 (Unknown Ward Zone)** to verify central fallback routing without data loss.
- **To evaluate Live Queue & SLA:**
  1. Navigate to **Smart Queue Monitor** to observe deterministic ordering ($P_1 > P_2 > P_3 \to \text{FIFO}$).
  2. Observe live 15-minute countdown timers on Critical and Stat cards with breach auditing.
