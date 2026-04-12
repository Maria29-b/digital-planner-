# main.py — Point d'entrée FastAPI

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import numpy as np
import json
import traceback

from api.scheduler import run_scheduler

# ── Encodeur JSON custom pour types numpy ─────────────────────────
# Pandas/Numpy retournent des types int64, float64 etc.
# qui ne sont pas sérialisables en JSON nativement
# Cet encodeur les convertit en types Python standard

class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, np.bool_):
            return bool(obj)
        return super().default(obj)

def clean(obj):
    """Convertit récursivement tous les types numpy et NaN en types Python"""
    if isinstance(obj, dict):
        return {k: clean(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean(i) for i in obj]
    if isinstance(obj, float) and (obj != obj):  # NaN check
        return None
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        if obj != obj:  # NaN check pour numpy float
            return None
        return float(obj)
    if isinstance(obj, np.bool_):
        return bool(obj)
    return obj

# ── Initialisation ────────────────────────────────────────────────
app = FastAPI(
    title       = "BeSap Digital Planner API",
    description = "API de planification automatique des opérations de maintenance",
    version     = "1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── Stockage en mémoire ───────────────────────────────────────────
last_result = None

# ── GET / ─────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "message"  : "BeSap Digital Planner API",
        "version"  : "1.0.0",
        "endpoints": ["/plan", "/results", "/kpis", "/technicians", "/docs"]
    }

# ── POST /plan ────────────────────────────────────────────────────
@app.post("/plan")
def plan(request: dict = None):
    global last_result
    try:
        if request is None:
            request = {}

        date_debut_str = request.get("date_debut", "2024-11-04")
        nb_jours_max   = request.get("nb_jours_max", 30)
        date_debut     = datetime.strptime(date_debut_str, "%Y-%m-%d")

        result     = run_scheduler(date_debut=date_debut, nb_jours_max=nb_jours_max)
        last_result = result

        response = {
            "message"        : f"{result['kpis']['planifiees']} opérations planifiées",
            "kpis"           : result["kpis"],
            "total_resultats": len(result["resultats"])
        }
        return JSONResponse(content=clean(response))

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "detail": traceback.format_exc()}
        )

# ── GET /results ──────────────────────────────────────────────────
@app.get("/results")
def results(skip: int = 0, limit: int = 100):
    try:
        if last_result is None:
            return JSONResponse(content={
                "message": "Aucune planification. Appelez POST /plan d'abord."
            })

        tous = last_result["resultats"]
        page = tous[skip: skip + limit]

        response = {
            "total"        : len(tous),
            "skip"         : skip,
            "limit"        : limit,
            "nb_retournes" : len(page),
            "resultats"    : page
        }
        return JSONResponse(content=clean(response))

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "detail": traceback.format_exc()}
        )

# ── GET /kpis ─────────────────────────────────────────────────────
@app.get("/kpis")
def kpis():
    try:
        if last_result is None:
            return JSONResponse(content={
                "message": "Aucune planification. Appelez POST /plan d'abord."
            })
        return JSONResponse(content=clean(last_result["kpis"]))

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "detail": traceback.format_exc()}
        )

# ── GET /technicians ──────────────────────────────────────────────
@app.get("/technicians")
def technicians():
    try:
        if last_result is None:
            return JSONResponse(content={
                "message": "Aucune planification. Appelez POST /plan d'abord."
            })
        return JSONResponse(content=clean({
            "technicians": last_result["kpis"]["par_technicien"]
        }))

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "detail": traceback.format_exc()}
        )

# ── GET /operations/{id} ──────────────────────────────────────────
@app.get("/operations/{pk_woo_id}")
def operation(pk_woo_id: int):
    try:
        if last_result is None:
            return JSONResponse(content={
                "message": "Aucune planification. Appelez POST /plan d'abord."
            })
        ops = [r for r in last_result["resultats"] if r["pk_woo_id"] == pk_woo_id]
        if not ops:
            return JSONResponse(content={
                "message": f"Opération {pk_woo_id} non trouvée"
            })
        return JSONResponse(content=clean(ops[0]))

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "detail": traceback.format_exc()}
        )