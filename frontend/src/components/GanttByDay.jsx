// GanttByDay.jsx — Vue Gantt par jour
// 1 colonne par jour, lignes = techniciens

import React, { useState } from "react";

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

const HOUR_START  = 7;
const HOUR_END    = 17;
const HOURS_TOTAL = HOUR_END - HOUR_START;
const CELL_WIDTH  = 80;   // pixels par heure
const ROW_HEIGHT  = 52;   // pixels par technicien

const JOURS = [
  { label: "Lun 04/11", date: "2024-11-04" },
  { label: "Mar 05/11", date: "2024-11-05" },
  { label: "Mer 06/11", date: "2024-11-06" },
  { label: "Jeu 07/11", date: "2024-11-07" },
  { label: "Ven 08/11", date: "2024-11-08" },
  { label: "Lun 11/11", date: "2024-11-11" },
  { label: "Mar 12/11", date: "2024-11-12" },
];

const heures = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

function GanttByDay({ operations }) {

  const [selectedDay, setSelectedDay] = useState(JOURS[0].date);
  const [tooltip, setTooltip]         = useState(null);

  const techniciens = [
    ...new Set(operations.map(o => o.technician_full_name))
  ].sort();

  const opsJour = operations.filter(o =>
    o.operation_scheduled_start.startsWith(selectedDay)
  );

  function getBlockStyle(op) {
    const start = new Date(op.operation_scheduled_start);
    const end   = new Date(op.operation_scheduled_end);

    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour   = end.getHours()   + end.getMinutes()   / 60;

    const left  = (startHour - HOUR_START) * CELL_WIDTH;
    const width = (endHour - startHour)    * CELL_WIDTH;

    return { left: Math.max(0, left), width: Math.max(4, width) };
  }

  // Stats du jour sélectionné
  const totalJour   = opsJour.length;
  const minutesJour = opsJour.reduce((s, o) => s + o.duration_minutes, 0);

  return (
    <div className="gantt-wrapper">

      {/* Sélecteur de jour */}
      <div className="day-selector">
        <span className="day-selector-label">Jour :</span>
        {JOURS.map(j => (
          <button
            key={j.date}
            className={selectedDay === j.date ? "day-btn active" : "day-btn"}
            onClick={() => setSelectedDay(j.date)}
          >
            {j.label}
          </button>
        ))}
      </div>

      {/* Stats du jour */}
      <div className="day-stats">
        <span>📋 {totalJour} opérations ce jour</span>
        <span>⏱️ {(minutesJour / 60).toFixed(1)}h de travail total</span>
        <span>👷 {techniciens.length} techniciens actifs</span>
      </div>

      {/* Gantt */}
      <div className="gantt-scroll">

        {/* Header heures */}
        <div className="gantt-header-row">
          <div className="gantt-tech-label"></div>
          <div className="day-timeline" style={{ width: HOURS_TOTAL * CELL_WIDTH }}>
            {heures.map(h => (
              <div key={h} className="hour-cell" style={{ width: CELL_WIDTH }}>
                {h}h
              </div>
            ))}
          </div>
        </div>

        {/* Lignes techniciens */}
        {techniciens.map(tech => {
          const opsTech = opsJour.filter(o => o.technician_full_name === tech);
          const minutesTech = opsTech.reduce((s, o) => s + o.duration_minutes, 0);

          return (
            <div key={tech} className="gantt-row" style={{ height: ROW_HEIGHT }}>

              {/* Label technicien */}
              <div className="gantt-tech-label" style={{ width: 120 }}>
                <span className="tech-avatar">
                  {tech.split(" ").map(n => n[0]).join("")}
                </span>
                <div>
                  <div className="tech-name">{tech.split(" ")[0]}</div>
                  <div className="tech-stats">{opsTech.length} ops</div>
                </div>
              </div>

              {/* Timeline */}
              <div className="day-cell-full"
                style={{ width: HOURS_TOTAL * CELL_WIDTH, height: ROW_HEIGHT }}>

                {/* Grille heures */}
                {heures.map(h => (
                  <div key={h} className="hour-grid-line"
                    style={{ left: (h - HOUR_START) * CELL_WIDTH }}
                  />
                ))}

                {/* Zone pause 11h-12h */}
                <div className="pause-zone" style={{
                  left  : (11 - HOUR_START) * CELL_WIDTH,
                  width : CELL_WIDTH,
                }}/>

                {/* Blocs opérations */}
                {opsTech.map(op => {
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
                      {width > 40 && (
                        <span className="block-label">
                          {op.operation_subtype}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Barre de charge */}
                <div className="charge-bar"
                  style={{
                    width: `${Math.min(100, minutesTech / 540 * 100)}%`,
                    background: minutesTech >= 540 ? "#DC2626" : "#16A34A"
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="tooltip" style={{
          left: tooltip.x + 12, top: tooltip.y - 60
        }}>
          <div className="tooltip-title">{tooltip.op.operation_subtype}</div>
          <div>🗂️ ID opération : {tooltip.op.pk_woo_id || "—"}</div>
          <div>🔢 Ordre {tooltip.op.operation_order || "—"}</div>
          <div>📝 {tooltip.op.operation_description || "—"}</div>
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

export default GanttByDay;