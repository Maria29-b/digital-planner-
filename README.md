# BeSap Digital Planner

**Intelligent maintenance scheduling system for lift operations.**

BeSap Digital Planner automatically plans 1,096+ preventive and corrective maintenance work orders across technician teams, respecting skills, shifts, deadlines, precedence constraints, and geographic proximity — with a full-featured Gantt dashboard.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Docker (Recommended)](#docker-recommended)
  - [Local Development](#local-development)
- [API Reference](#api-reference)
- [Dashboard](#dashboard)
- [Algorithm](#algorithm)
- [Data Pipeline](#data-pipeline)
- [Project Structure](#project-structure)
- [Results](#results)

---

## Overview

BeSap Digital Planner solves a real-world **workforce scheduling problem** in lift maintenance:

- **1,096 operations** to schedule across **7 technicians**
- Constraints: shifts (07:00–17:00), lunch break, weekends, skill requirements, operation precedences, deadlines
- Optimization: workload balancing and geographic proximity minimization
- Output: interactive Gantt charts and KPI dashboard

---

## Features

### Scheduling Engine
- Priority-based greedy scheduler with dependency resolution
- Skill-to-operation matching (Electrician, Mechanic, Inspector Junior/Senior)
- Shift-aware slot finding with lunch break exclusion (11:00–12:00)
- Predecessor dependency queue with up to 3 resolution passes
- Geographic optimization via Haversine distance sorting (OpenStreetMap/Nominatim)
- 10 computed KPIs: planning rate, deadline violations, overlaps, per-technician breakdown

### Frontend Dashboard
- KPI cards: scheduled operations, deadline violations, total duration, active technicians
- **Gantt by Technician** — one row per tech, colored by operation type
- **Gantt by Day** — one column per workday, with per-technician load bars
- Filters by priority level (Breakdown, Meca/Elec, Monthly, Low) and technician
- Hover tooltips: operation ID, time slot, duration, asset criticality

### Infrastructure
- Fully containerized via Docker Compose (API + Frontend + Nginx reverse proxy)
- One-command startup on Windows

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, Uvicorn |
| Scheduling | Pandas, NumPy, Geopy (Nominatim) |
| Frontend | React 19, Material-UI (MUI v9), Axios |
| Database |  CSV flat files |
| Infrastructure | Docker, Docker Compose, Nginx (Alpine) |
| Analysis | Jupyter Notebooks, scikit-learn |

---

## Architecture

```
Browser (port 80)
      │
   Nginx Proxy
      │
      ├──► /plan, /results, /kpis, ...  ──► FastAPI (port 8000)
      │                                          │
      │                                     scheduler.py
      │                                          │
      │                                   final_tables/*.csv
      │
      └──► /*  ──► React SPA (static build)
```

---

## Getting Started

### Docker (Recommended)

**Prerequisites:** Docker Desktop installed and running.

```bash
# Clone the repository
git clone <repository-url>
cd digitalPlanner

# Start all services (builds images on first run)
./start.bat          # Windows
# or
docker-compose up --build -d

# Open the dashboard
# http://localhost
```

```bash
# Stop all services
./stop.bat
# or
docker-compose down
```

### Local Development

**Prerequisites:** Python 3.11+, Node.js 18+

**Backend:**
```bash
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
# API available at http://localhost:8000
# Interactive docs at http://localhost:8000/docs
```

**Frontend:**
```bash
cd frontend
npm install
npm start
# Dashboard available at http://localhost:3000
```

> In local mode the frontend proxies API calls to `http://localhost:8000`.

---

## API Reference

### `POST /plan`
Run the scheduling algorithm.

**Request body:**
```json
{
  "date_debut": "2024-11-04",
  "nb_jours_max": 30
}
```

**Response:**
```json
{
  "message": "1096 opérations planifiées",
  "kpis": {
    "total_operations": 1096,
    "planifiees": 1096,
    "non_planifiees": 0,
    "taux_planification": 100.0,
    "violations_deadline": 0,
    "chevauchements": 0,
    "par_technicien": [...],
    "par_priorite": {...}
  },
  "total_resultats": 1096
}
```

### `GET /results`
Paginated list of scheduled operations.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `skip` | int | 0 | Offset |
| `limit` | int | 200 | Page size |

### `GET /kpis`
Aggregated KPI metrics for the last scheduling run.

### `GET /technicians`
Per-technician scheduling breakdown.

### `GET /operations/{pk_woo_id}`
Details for a single operation.

---

## Dashboard

After launching, open [http://localhost](http://localhost).

1. Click **"Lancer la Planification"** to run the scheduler .
2. Review the **KPI cards** at the top.
3. Switch between **"Par Technicien"** and **"Par Jour"** Gantt views.
4. Use the **Filters** panel to focus on a specific priority or technician.
5. Hover over any operation block for a detailed tooltip.

---

## Algorithm

The scheduler uses a **priority-based greedy algorithm** with dependency resolution (`api/scheduler.py`):

1. **Sort operations** by: `priority_score` → `criticality_score` → deadline
2. **Resolve predecessors** — defer operations until all dependencies are scheduled (up to 3 passes)
3. **Match skills** — filter technicians by required operation skill
4. **Find a free slot** — iterate over shift slots (07:00–11:00, 12:00–17:00), skipping overlaps
5. **Optimize by distance** — sort candidate technicians by Haversine distance to the operation site
6. **Assign** — book the first available technician-slot pair

**Priority scoring:**

| Priority | Score | Type |
|---|---|---|
| Breakdown | 1 | Corrective, urgent |
| Meca/Elec | 2 | Corrective |
| Monthly | 3 | Preventive |
| Low | 4 | Preventive |

**Criticality scoring:**

| Asset state | Score |
|---|---|
| Bad | 1 (most urgent) |
| Adequate | 2 |
| Good | 3 |

---

## Data Pipeline

```
tables/
  Work Order Operations-Grid view.csv   ← Raw Airtable export
          │
          ▼
  data_cleaning.ipynb                   ← Cleaning & normalization
  fusion_tables.ipynb                   ← Table joins
          │
          ▼
final_tables/
  woo_final.csv                         ← 1,096 operations (30 features)
  technicians_final.csv                 ← 7 technicians (19 features)
          │
          ▼
  algorithme.ipynb                      ← Algorithm prototyping
          │
          ▼
  woo_final_planned.csv                 ← Scheduled output
```

---

## Project Structure

```
digitalPlanner/
├── api/
│   ├── main.py               # FastAPI application & endpoints
│   ├── models.py             # Pydantic request/response models
│   └── scheduler.py          # Core scheduling engine (~1,100 lines)
│
├── frontend/
│   ├── src/
│   │   ├── App.js            # Root component — data fetching & state
│   │   └── components/
│   │       ├── KPICards.jsx
│   │       ├── GanttByTech.jsx
│   │       ├── GanttByDay.jsx
│   │       └── Filters.jsx
│   └── package.json
│
├── final_tables/             # Cleaned input data (CSV)
├── tables/                   # Raw source data
│
├── algorithme.ipynb          # Scheduling algorithm (notebook)
├── analyse1.ipynb            # Exploratory data analysis
├── data_cleaning.ipynb       # Data preprocessing
├── fusion_tables.ipynb       # Table consolidation
│
├── Dockerfile.api
├── Dockerfile.frontend
├── docker-compose.yml
├── nginx.conf
├── requirements.txt
├── start.bat
└── stop.bat
```

---

## Results

Default run: **2024-11-04**.

| Metric | Value |
|---|---|
| Total operations | 1,096 |
| Scheduled | 1,096 (100%) |
| Deadline violations | 0 |
| Overlaps | 0 |
| Weekend violations | 0 |
| Overtime violations | 0 |
| Total distance covered | ~37,459 km |
| Average distance / operation | ~41.8 km |
| Active technicians | 7 |

**Operations by priority:**

| Priority | Count |
|---|---|
| Breakdown | 190 |
| Meca/Elec | 63 |
| Monthly | 220 |
| Low | 623 |
