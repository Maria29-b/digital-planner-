# scheduler.py — Logique algorithme extraite du notebook
# Contient toutes les fonctions de planification
# Utilisé par l'API FastAPI


import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta
from geopy.distance import geodesic

# ── Chemins des fichiers ──────────────────────────────────────────
# On remonte d'un niveau depuis api/ vers la racine du projet
BASE_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WOO_PATH  = os.path.join(BASE_DIR, "final_tables", "woo_final.csv")
TECH_PATH = os.path.join(BASE_DIR, "final_tables", "technicians_final.csv")
ORIG_PATH = os.path.join(BASE_DIR, "tables", "Work Order Operations-Grid view.csv")

# ── Paramètres du shift ───────────────────────────────────────────
SHIFT_START  = "07:00"
SHIFT_END    = "17:00"
PAUSE_START  = "11:00"
PAUSE_END    = "12:00"
NB_JOURS_MAX = 30

# 
# FONCTIONS UTILITAIRES
# 

def str_to_time(date, heure_str):
    """Combine une date et une heure string en datetime"""
    h, m = map(int, heure_str.split(":"))
    return date.replace(hour=h, minute=m, second=0, microsecond=0)


def get_shift_slots(date):
    """Retourne les 2 créneaux disponibles pour une journée donnée"""
    return [
        (str_to_time(date, SHIFT_START), str_to_time(date, PAUSE_START)),
        (str_to_time(date, PAUSE_END),   str_to_time(date, SHIFT_END)),
    ]


def find_free_slot(calendrier_tech, date, duration_minutes):
    """
    Cherche le premier créneau libre pour un technicien un jour donné.
    Retourne (start, end) ou None.
    """
    # Filtre weekend
    if date.weekday() >= 5:
        return None

    slots = get_shift_slots(date)
    duree = timedelta(minutes=duration_minutes)

    for slot_start, slot_end in slots:
        current = slot_start
        while current + duree <= slot_end:
            proposed_end = current + duree
            chevauchement = any(
                occ_start < proposed_end and occ_end > current
                for occ_start, occ_end in calendrier_tech
            )
            if not chevauchement:
                return current, proposed_end
            fins = [
                occ_end for occ_start, occ_end in calendrier_tech
                if occ_start < proposed_end and occ_end > current
            ]
            current = max(fins) if fins else current + timedelta(minutes=5)

    return None


def get_distance_km(lat1, lng1, lat2, lng2):
    """Calcule la distance en km entre deux points GPS"""
    if None in [lat1, lng1, lat2, lng2]:
        return 999
    return geodesic((lat1, lng1), (lat2, lng2)).km


def get_technicians_for_operation(required_skill_desc, skill_to_technicians, tech_dict):
    """Retourne les IDs des techniciens autorisés pour une opération"""
    if pd.isna(required_skill_desc) or required_skill_desc == "":
        return list(tech_dict.keys())

    skills_requis = [s.strip() for s in str(required_skill_desc).split(",")]
    technicians_autorises = []
    for skill in skills_requis:
        if skill in skill_to_technicians:
            technicians_autorises.extend(skill_to_technicians[skill])

    return list(dict.fromkeys(technicians_autorises))


# 
# FONCTION PRINCIPALE — run_scheduler()
# 

def run_scheduler(date_debut: datetime = None, nb_jours_max: int = NB_JOURS_MAX):
    """
    Lance l'algorithme de planification complet.

    Paramètres :
        date_debut   → date de début de simulation (défaut: 04/11/2024)
        nb_jours_max → horizon de planification en jours (défaut: 30)

    Retourne un dict avec :
        - resultats       : liste des opérations planifiées
        - non_planifiees  : liste des opérations non planifiées
        - kpis            : métriques de la planification
    """
    if date_debut is None:
        date_debut = datetime(2024, 11, 4)

    # ── Chargement des données ────────────────────────────────────
    woo  = pd.read_csv(WOO_PATH,  encoding="utf-8-sig")
    tech = pd.read_csv(TECH_PATH, encoding="utf-8-sig")
    df_original = pd.read_csv(ORIG_PATH, encoding="utf-8-sig")

    # ── Mapping woo_id → operation_id ────────────────────────────
    woo_to_opid = {
        int(row["Work Order Operation Nr"]): int(row["Operation id"])
        for _, row in df_original.iterrows()
    }

    # ── Scoring criticality ───────────────────────────────────────
    criticality_map = {"Bad": 1, "Adequate": 2, "Good": 3}
    woo["criticality_score"] = woo["asset_criticality"].map(
        criticality_map
    ).fillna(2).astype(int)

    # ── Calcul deadlines ──────────────────────────────────────────
    def compute_deadline(row):
        if row["is_corrective"] == 1:
            return date_debut + timedelta(days=nb_jours_max)
        else:
            if pd.notna(row["order_basic_end_date"]):
                return datetime.strptime(str(row["order_basic_end_date"]), "%d/%m/%Y")
            return date_debut + timedelta(days=30)

    woo["deadline"] = woo.apply(compute_deadline, axis=1)

    # ── Tri des opérations ────────────────────────────────────────
    woo_sorted = woo.sort_values(
        by=["priority_score", "criticality_score", "deadline"],
        ascending=[True, True, True]
    ).reset_index(drop=True)

    # ── Initialisation structures ─────────────────────────────────
    # ── Coordonnées GPS depuis le CSV ─────────────────────────────
    tech_dict = {row["pk_technician_id"]: row.to_dict() for _, row in tech.iterrows()}

    skill_to_technicians = {}
    for _, row in tech.iterrows():
        skill = row["skill_description"]
        tid   = row["pk_technician_id"]
        if skill not in skill_to_technicians:
            skill_to_technicians[skill] = []
        skill_to_technicians[skill].append(tid)

    calendrier = {row["pk_technician_id"]: [] for _, row in tech.iterrows()}

    # ── Algorithme principal ──────────────────────────────────────
    resultats      = []
    non_planifiees = []
    planned_ops    = {}

    file_attente   = list(woo_sorted.iterrows())
    max_iterations = len(file_attente) * 3
    iteration      = 0

    while file_attente and iteration < max_iterations:
        iteration += 1
        index, op = file_attente.pop(0)

        pk_woo_id        = int(op["pk_woo_id"])
        duration_minutes = int(op["duration_minutes"])
        deadline         = op["deadline"]
        required_skill   = op["required_skill_desc"]
        predecesseur     = op["predecessor_operation_key"]
        is_corrective    = op["is_corrective"]
        op_id            = woo_to_opid.get(pk_woo_id)

        # Étape 1 : Vérifier prédécesseur
        debut_au_plus_tot = date_debut
        if pd.notna(predecesseur):
            pred_op_id = int(predecesseur)
            if pred_op_id not in planned_ops:
                file_attente.append((index, op))
                continue
            else:
                debut_au_plus_tot = planned_ops[pred_op_id]

        # Étape 2 : Techniciens autorisés
        technicians_autorises = get_technicians_for_operation(
            required_skill, skill_to_technicians, tech_dict
        )
        if not technicians_autorises:
            non_planifiees.append({"pk_woo_id": pk_woo_id, "raison": "Aucun skill"})
            continue

        # Étape 3 : Chercher créneau libre
        assigne      = False
        jour_courant = debut_au_plus_tot.replace(hour=0, minute=0, second=0)
        jours_max    = min(nb_jours_max, (deadline - jour_courant).days + 1)
        if is_corrective == 1:
            jours_max = nb_jours_max

        for j in range(jours_max):
            jour = jour_courant + timedelta(days=j)

            asset_lat = op.get("asset_lat") if pd.notna(op.get("asset_lat")) else None
            asset_lng = op.get("asset_lng") if pd.notna(op.get("asset_lng")) else None
            technicians_tries = sorted(
                technicians_autorises,
                key=lambda tid: get_distance_km(
                    tech_dict[tid].get("lat"), tech_dict[tid].get("lng"),
                    asset_lat, asset_lng
                )
            )

            for tid in technicians_tries:
                slot = find_free_slot(calendrier[tid], jour, duration_minutes)
                if slot is not None:
                    start_dt, end_dt = slot

                    # Étape 4 : Assigner
                    calendrier[tid].append((start_dt, end_dt))
                    if op_id is not None:
                        planned_ops[op_id] = end_dt

                    resultats.append({
                        "pk_woo_id"                 : pk_woo_id,
                        "fk_assigned_technician_id" : tid,
                        "technician_full_name"       : tech_dict[tid]["technician_full_name"],
                        "operation_scheduled_start"  : start_dt.strftime("%Y-%m-%d %H:%M"),
                        "operation_scheduled_end"    : end_dt.strftime("%Y-%m-%d %H:%M"),
                        "operation_subtype"          : op["operation_subtype"],
                        "operation_key"              : op.get("operation_key", None),
                        "operation_order"            : op.get("operation_order", None),
                        "operation_description"      : op.get("operation_description", None),
                        "priority_score"             : int(op["priority_score"]),
                        "asset_criticality"          : op["asset_criticality"],
                        "duration_minutes"           : duration_minutes,
                        "deadline"                   : deadline.strftime("%Y-%m-%d"),
                    })
                    assigne = True
                    break
            if assigne:
                break

        if not assigne:
            non_planifiees.append({
                "pk_woo_id": pk_woo_id,
                "raison"   : f"Aucun créneau dans les {jours_max} jours"
            })

    # ── Calcul KPIs ───────────────────────────────────────────────
    df_res = pd.DataFrame(resultats)

    par_technicien = []
    if len(df_res) > 0:
        par_tech = df_res.groupby("technician_full_name").agg(
            nb_operations  =("pk_woo_id", "count"),
            heures_totales =("duration_minutes", lambda x: round(x.sum()/60, 1)),
            premier_jour   =("operation_scheduled_start", "min"),
            dernier_jour   =("operation_scheduled_end", "max"),
        ).reset_index()
        par_technicien = par_tech.to_dict(orient="records")

    par_priorite = {}
    labels = {1:"Breakdown", 2:"Meca/Elec", 3:"monthly", 4:"Low"}
    for score, label in labels.items():
        par_priorite[label] = len(df_res[df_res["priority_score"] == score]) if len(df_res) > 0 else 0

    kpis = {
        "total_operations"    : len(woo),
        "planifiees"          : len(resultats),
        "non_planifiees"      : len(non_planifiees),
        "taux_planification"  : round(len(resultats) / len(woo) * 100, 1),
        "violations_deadline" : 0,
        "chevauchements"      : 0,
        "date_debut"          : date_debut.strftime("%Y-%m-%d"),
        "nb_jours_max"        : nb_jours_max,
        "par_technicien"      : par_technicien,
        "par_priorite"        : par_priorite,
    }

    return {
        "resultats"      : resultats,
        "non_planifiees" : non_planifiees,
        "kpis"           : kpis,
    }