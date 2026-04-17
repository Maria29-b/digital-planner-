// GanttByTech.jsx — Vue Gantt par technicien
// 1 ligne par technicien, colonnes = jours ouvrés

import React, { useState } from "react";

// ── Couleurs par type d'opération ────────────────────────────────
const COLORS = {
  "Breakdown" : { bg: "#FEE2E2", border: "#DC2626", text: "#DC2626" },
  "Meca"      : { bg: "#FFEDD5", border: "#EA580C", text: "#EA580C" },
  "Elec"      : { bg: "#FEF9C3", border: "#CA8A04", text: "#CA8A04" },
  "monthly"   : { bg: "#DBEAFE", border: "#2E75B6", text: "#2E75B6" },
  "Low"       : { bg: "#DCFCE7", border: "#16A34A", text: "#16A34A" },
};

function getColor(subtype) {
  if (subtype === "Breakdown") return COLORS["Breakdown"];
  if (subtype === "Meca")      return COLORS["Meca"];
  if (subtype === "Elec")      return COLORS["Elec"];
  if (subtype === "monthly")   return COLORS["monthly"];
  return COLORS["Low"];
}

// ── Constantes de mise en page ────────────────────────────────────
const HOUR_START  = 7;   // 07:00
const HOUR_END    = 17;  // 17:00
const HOURS_TOTAL = HOUR_END - HOUR_START; // 10h
const DAY_WIDTH   = 600; // pixels par jour
const ROW_HEIGHT  = 60;  // pixels par technicien

// ── Jours ouvrés de la simulation ────────────────────────────────
const JOURS = [
  { label: "Lun 04/11", date: "2024-11-04" },
  { label: "Mar 05/11", date: "2024-11-05" },
  { label: "Mer 06/11", date: "2024-11-06" },
  { label: "Jeu 07/11", date: "2024-11-07" },
  { label: "Ven 08/11", date: "2024-11-08" },
  { label: "Lun 11/11", date: "2024-11-11" },
  { label: "Mar 12/11", date: "2024-11-12" },
];

function GanttByTech({ operations }) {

  const [tooltip, setTooltip] = useState(null);

  // ── Grouper par technicien ────────────────────────────────────
  const techniciens = [...new Set(operations.map(o => o.technician_full_name))].sort();

  // ── Calculer position et largeur d'un bloc ────────────────────
  function getBlockStyle(op) {
    const start = new Date(op.operation_scheduled_start);
    const end   = new Date(op.operation_scheduled_end);

    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour   = end.getHours()   + end.getMinutes()   / 60;

    const left  = ((startHour - HOUR_START) / HOURS_TOTAL) * DAY_WIDTH;
    const width = ((endHour - startHour)    / HOURS_TOTAL) * DAY_WIDTH;

    return { left: Math.max(0, left), width: Math.max(4, width) };
  }

  // ── Heures affichées en header ────────────────────────────────
  const heures = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

  return (
    <div className="gantt-wrapper">

      {/* Légende */}
      <div className="gantt-legend">
        {Object.entries(COLORS).map(([type, c]) => (
          <span key={type} className="legend-item">
            <span style={{
              display: "inline-block", width: 12, height: 12,
              background: c.bg, border: `2px solid ${c.border}`,
              borderRadius: 3, marginRight: 4
            }}></span>
            {type}
          </span>
        ))}
        {/* Pause */}
        <span className="legend-item">
          <span style={{
            display: "inline-block", width: 12, height: 12,
            background: "#F1F5F9", border: "2px solid #CBD5E1",
            borderRadius: 3, marginRight: 4
          }}></span>
          Pause
        </span>
      </div>

      <div className="gantt-scroll">

        {/* ── Header jours ─────────────────────────────────────── */}
        <div className="gantt-header-row">
          <div className="gantt-tech-label"></div>
          {JOURS.map(j => (
            <div key={j.date} className="gantt-day-header" style={{ width: DAY_WIDTH }}>
              {j.label}
              {/* Heures */}
              <div className="gantt-hours-row">
                {heures.map(h => (
                  <span key={h} style={{ width: DAY_WIDTH / HOURS_TOTAL }}>{h}h</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Lignes techniciens ───────────────────────────────── */}
        {techniciens.map((tech, ti) => {
          const opsTech = operations.filter(o => o.technician_full_name === tech);

          return (
            <div key={tech} className="gantt-row" style={{ height: ROW_HEIGHT }}>

              {/* Nom technicien */}
              <div className="gantt-tech-label">
                <span className="tech-avatar">
                  {tech.split(" ").map(n => n[0]).join("")}
                </span>
                <span className="tech-name">{tech.split(" ")[0]}</span>
              </div>

              {/* Cellules par jour */}
              {JOURS.map(jour => {
                const opsJour = opsTech.filter(o =>
                  o.operation_scheduled_start.startsWith(jour.date)
                );

                return (
                  <div key={jour.date} className="gantt-day-cell"
                    style={{ width: DAY_WIDTH, height: ROW_HEIGHT }}>

                    {/* Zone pause 11h-12h */}
                    <div className="pause-zone" style={{
                      left  : ((11 - HOUR_START) / HOURS_TOTAL) * DAY_WIDTH,
                      width : (1 / HOURS_TOTAL) * DAY_WIDTH,
                    }}/>

                    {/* Blocs opérations */}
                    {opsJour.map(op => {
                      const { left, width } = getBlockStyle(op);
                      const color = getColor(op.operation_subtype);
                      return (
                        <div
                          key={op.pk_woo_id}
                          className="gantt-block"
                          style={{
                            left,
                            width,
                            background  : color.bg,
                            borderColor : color.border,
                            color       : color.text,
                          }}
                          onMouseEnter={e => setTooltip({
                            op, x: e.clientX, y: e.clientY
                          })}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          {width > 30 && (
                            <span className="block-label">
                              {op.operation_subtype}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="tooltip" style={{ left: tooltip.x + 12, top: tooltip.y - 60 }}>
          <div className="tooltip-title">{tooltip.op.operation_subtype}</div>
          <div>👷 {tooltip.op.technician_full_name}</div>
          <div>🕐 {tooltip.op.operation_scheduled_start.slice(11,16)}
               → {tooltip.op.operation_scheduled_end.slice(11,16)}</div>
          <div>⏱️ {tooltip.op.duration_minutes} min</div>
          <div>⚡ Priorité {tooltip.op.priority_score}</div>
          <div>🏭 {tooltip.op.asset_criticality || "—"}</div>
        </div>
      )}
    </div>
  );
}

export default GanttByTech;