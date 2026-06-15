import React, { useState } from 'react';
import { X, Info } from 'lucide-react';
import { nexans } from '../theme/nexansTheme';
import { CONFIDENCE_LEGEND, CONFIDENCE_COLORS } from '../confidence';

/**
 * Card légende des couleurs de confiance, ancrée en bas à droite de l'onglet
 * Général. Fermable via la petite croix ; un bouton discret permet de la
 * rouvrir. Charte Nexans (coins arrondis, ombre légère, rouge #C90016).
 */
export function ConfidenceLegend() {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Afficher la légende des couleurs"
        style={{
          position: 'absolute',
          right: 18,
          bottom: 18,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          borderRadius: nexans.radius.pill,
          border: `1px solid ${nexans.color.border}`,
          background: nexans.color.surface,
          color: nexans.color.red,
          boxShadow: nexans.shadow.card,
          cursor: 'pointer',
          fontFamily: nexans.font.family,
          fontSize: nexans.font.size.sm,
          fontWeight: nexans.font.weight.semibold,
        }}
      >
        <Info style={{ width: 15, height: 15 }} />
        Légende
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        right: 18,
        bottom: 18,
        zIndex: 40,
        width: 248,
        background: nexans.color.surface,
        border: `1px solid ${nexans.color.border}`,
        borderRadius: nexans.radius.lg,
        boxShadow: nexans.shadow.cardHover,
        padding: 14,
        fontFamily: nexans.font.family,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: nexans.font.size.sm, fontWeight: nexans.font.weight.bold, color: nexans.color.text }}>
          <Info style={{ width: 15, height: 15, color: nexans.color.red }} />
          Fiabilité des champs
        </span>
        <button
          onClick={() => setOpen(false)}
          aria-label="Fermer la légende"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, color: nexans.color.textMuted, display: 'flex' }}
        >
          <X style={{ width: 16, height: 16 }} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {CONFIDENCE_LEGEND.map((item) => {
          const c = CONFIDENCE_COLORS[item.level];
          return (
            <div key={item.level} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
              <span
                style={{
                  flexShrink: 0,
                  marginTop: 2,
                  width: 14,
                  height: 14,
                  borderRadius: nexans.radius.sm,
                  background: c.badgeBg,
                  border: `2px solid ${c.border}`,
                }}
              />
              <span style={{ lineHeight: 1.3 }}>
                <span style={{ display: 'block', fontSize: nexans.font.size.sm, fontWeight: nexans.font.weight.semibold, color: c.badgeText }}>
                  {item.title}
                </span>
                <span style={{ fontSize: nexans.font.size.xs, color: nexans.color.textMuted }}>{item.desc}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ConfidenceLegend;
