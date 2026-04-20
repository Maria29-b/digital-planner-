// 
// App.jsx — Composant principal
// Se connecte à l'API FastAPI et distribue les données
// 

import React, { useState, useEffect } from "react";
import axios from "axios";
import KPICards from "./components/KPICards";
import GanttByTech from "./components/GanttByTech";
import GanttByDay from "./components/GanttByDay";
import Filters from "./components/Filters";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

function App() {
  const [operations, setOperations] = useState([]);
  const [kpis, setKpis]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [view, setView]             = useState("tech"); // "tech" ou "day"

  // Filtres
  const [filterPriority,   setFilterPriority]   = useState("all");
  const [filterRegion,     setFilterRegion]     = useState("all");
  const [filterTechnician, setFilterTechnician] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // 1. Lancer l'algorithme
      await axios.post(`${API_URL}/plan`, {
        date_debut   : "2024-11-04",
        nb_jours_max : 30
      });

      // 2. Récupérer tous les résultats (pagination)
      let allOps = [];
      let skip   = 0;
      const limit = 200;

      while (true) {
        const res = await axios.get(
          `${API_URL}/results?skip=${skip}&limit=${limit}`
        );
        allOps = [...allOps, ...res.data.resultats];
        if (allOps.length >= res.data.total) break;
        skip += limit;
      }

      // 3. Récupérer les KPIs
      const kpiRes = await axios.get(`${API_URL}/kpis`);

      setOperations(allOps);
      setKpis(kpiRes.data);
      setLoading(false);

    } catch (err) {
      setError("Erreur de connexion à l'API. Vérifiez que uvicorn tourne.");
      setLoading(false);
    }
  };

  // ── Filtrage des opérations ───────────────────────────────────
  const priorityLabels = { 1:"Breakdown", 2:"Meca/Elec", 3:"monthly", 4:"Low" };

  const opsFiltrees = operations.filter(op => {
    if (filterPriority !== "all" &&
        priorityLabels[op.priority_score] !== filterPriority) return false;
    if (filterTechnician !== "all" &&
        op.technician_full_name !== filterTechnician) return false;
    return true;
  });

  // ── Listes pour les filtres ───────────────────────────────────
  const techniciens = [...new Set(operations.map(o => o.technician_full_name))].sort();
  const priorites   = ["Breakdown", "Meca/Elec", "monthly", "Low"];

  // ── Affichage ─────────────────────────────────────────────────
  if (loading) return (
    <div className="loading">
      <div className="spinner"></div>
      <p>Chargement du planning...</p>
    </div>
  );

  if (error) return (
    <div className="error">
      <h2>❌ {error}</h2>
      <p>Lancez uvicorn avec : <code>uvicorn api.main:app --reload</code></p>
    </div>
  );

  return (
    <div className="app">

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1> BeSap Digital Planner</h1>
          <span className="subtitle">Lift Maintenance Platform</span>
        </div>
        <div className="header-right">
        </div>
      </header>

      {/* KPI Cards */}
      {kpis && <KPICards kpis={kpis} />}

      {/* Filtres */}
      <Filters
        techniciens      = {techniciens}
        priorites        = {priorites}
        filterPriority   = {filterPriority}
        filterTechnician = {filterTechnician}
        onPriority       = {setFilterPriority}
        onTechnician     = {setFilterTechnician}
      />

      {/* Sélecteur de vue */}
      <div className="view-selector">
        <button
          className={view === "tech" ? "btn-view active" : "btn-view"}
          onClick={() => setView("tech")}
        >
           Vue par technicien
        </button>
        <button
          className={view === "day" ? "btn-view active" : "btn-view"}
          onClick={() => setView("day")}
        >
           Vue par jour
        </button>
        <span className="ops-count">
          {opsFiltrees.length} opération(s) affichée(s)
        </span>
      </div>

      {/* Gantt */}
      <div className="gantt-container">
        {view === "tech"
          ? <GanttByTech operations={opsFiltrees} />
          : <GanttByDay  operations={opsFiltrees} />
        }
      </div>

    </div>
  );
}

export default App;