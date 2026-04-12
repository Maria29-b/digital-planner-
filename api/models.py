# 
# models.py — Structures de données Pydantic
# Définit ce que l'API accepte en entrée et retourne en sortie
# 

from pydantic import BaseModel
from typing import Optional, List, Dict

# ── Requête POST /plan ────────────────────────────────────────────
class PlanRequest(BaseModel):
    date_debut   : Optional[str] = "2024-11-04"  # format YYYY-MM-DD
    nb_jours_max : Optional[int] = 30

# ── Résultat d'une opération planifiée ───────────────────────────
class OperationResult(BaseModel):
    pk_woo_id                 : int
    fk_assigned_technician_id : int
    technician_full_name      : str
    operation_scheduled_start : str
    operation_scheduled_end   : str
    operation_subtype         : str
    priority_score            : int
    asset_criticality         : str
    duration_minutes          : int
    deadline                  : str

# ── KPIs ─────────────────────────────────────────────────────────
class KPIResponse(BaseModel):
    total_operations    : int
    planifiees          : int
    non_planifiees      : int
    taux_planification  : float
    violations_deadline : int
    chevauchements      : int
    date_debut          : str
    nb_jours_max        : int
    par_technicien      : List[Dict]
    par_priorite        : Dict

# ── Réponse POST /plan ────────────────────────────────────────────
class PlanResponse(BaseModel):
    message        : str
    kpis           : KPIResponse
    total_resultats: int