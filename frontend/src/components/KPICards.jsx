
// KPICards.jsx — 4 cartes KPIs en haut du dashboard

import React from "react";

function KPICards({ kpis }) {

  const cards = [
    {
      icon    : "",
      value   : `${kpis.planifiees} / ${kpis.total_operations}`,
      label   : "Opérations planifiées",
      sub     : `${kpis.taux_planification}% du total`,
      color   : "#16A34A",
      bg      : "#F0FFF4",
    },
    {
      icon    : "",
      value   : kpis.violations_deadline,
      label   : "Violations deadline",
      sub     : "Toutes les dates respectées",
      color   : "#16A34A",
      bg      : "#F0FFF4",
    },
    {
      icon    : "",
      value   : "7 jours",
      label   : "Durée de planification",
      sub     : "04/11 → 12/11/2024",
      color   : "#2E75B6",
      bg      : "#EFF6FF",
    },
    {
      icon    : "",
      value   : kpis.par_technicien.length,
      label   : "Techniciens assignés",
      sub     : `${Math.round(kpis.planifiees / kpis.par_technicien.length)} ops/technicien en moy.`,
      color   : "#EA580C",
      bg      : "#FFF7ED",
    },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((card, i) => (
        <div
          key={i}
          className="kpi-card"
          style={{ borderTop: `4px solid ${card.color}`, background: card.bg }}
        >
          <div className="kpi-icon">{card.icon}</div>
          <div className="kpi-value" style={{ color: card.color }}>
            {card.value}
          </div>
          <div className="kpi-label">{card.label}</div>
          <div className="kpi-sub">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}

export default KPICards;