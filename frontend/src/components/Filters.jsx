// Filters.jsx — Filtres priorité / technicien

import React from "react";

function Filters({
  techniciens, priorites,
  filterPriority, filterTechnician,
  onPriority, onTechnician
}) {

  const priorityColors = {
    "Breakdown" : "#DC2626",
    "Meca/Elec" : "#EA580C",
    "monthly"   : "#2E75B6",
    "Low"       : "#16A34A",
  };

  return (
    <div className="filters">

      {/* Filtre priorité */}
      <div className="filter-group">
        <label>Priorité :</label>
        <button
          className={filterPriority === "all" ? "filter-btn active" : "filter-btn"}
          onClick={() => onPriority("all")}
        >
          Toutes
        </button>
        {priorites.map(p => (
          <button
            key={p}
            className={filterPriority === p ? "filter-btn active" : "filter-btn"}
            style={filterPriority === p
              ? { background: priorityColors[p], color: "white", borderColor: priorityColors[p] }
              : { borderColor: priorityColors[p], color: priorityColors[p] }
            }
            onClick={() => onPriority(p)}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Filtre technicien */}
      <div className="filter-group">
        <label>Technicien :</label>
        <select
          value={filterTechnician}
          onChange={e => onTechnician(e.target.value)}
          className="filter-select"
        >
          <option value="all">Tous les techniciens</option>
          {techniciens.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

    </div>
  );
}

export default Filters;