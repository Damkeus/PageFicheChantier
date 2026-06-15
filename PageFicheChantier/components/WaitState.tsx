import React from 'react';
import { nexans } from '../theme/nexansTheme';

/**
 * Écran d'attente affiché tant que le JSON AI Builder n'est pas arrivé
 * (le flux d'analyse prend ~1 minute). Animation sobre "Nexans-like" :
 * anneau rouge qui tourne + tasse de café qui fume. Le texte est imposé
 * mot pour mot (emoji inclus) par la spécification métier.
 */
interface WaitStateProps {
  /** Bypass de l'attente IA → affiche le formulaire (données SharePoint seules). */
  onSkip?: () => void;
}

export function WaitState({ onSkip }: WaitStateProps) {
  const message =
    "L'IA n'a pas finit de traiter votre CCTP prenez un café et revenez dans quelques minute ☕";

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 360,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        padding: 32,
        background: `radial-gradient(circle at 50% 30%, ${nexans.color.bgSubtle} 0%, ${nexans.color.bgAlt} 100%)`,
        fontFamily: nexans.font.family,
        textAlign: 'center',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @keyframes nx-spin { to { transform: rotate(360deg); } }
        @keyframes nx-steam { 0% { opacity:0; transform: translateY(2px) scaleY(0.8); } 40% { opacity:.7; } 100% { opacity:0; transform: translateY(-10px) scaleY(1.2); } }
        @keyframes nx-pulse { 0%,100% { opacity:.45; } 50% { opacity:1; } }
        .nx-dot { animation: nx-pulse 1.4s ease-in-out infinite; }
        .nx-dot:nth-child(2){ animation-delay:.2s; }
        .nx-dot:nth-child(3){ animation-delay:.4s; }
      `}</style>

      {/* Anneau + tasse */}
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `4px solid ${nexans.color.redTint}`,
            borderTopColor: nexans.color.red,
            animation: 'nx-spin 1s linear infinite',
          }}
        />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="52" height="52" viewBox="0 0 64 64" aria-hidden="true">
            {/* vapeur */}
            <g stroke={nexans.color.textMuted} strokeWidth="3" strokeLinecap="round" fill="none">
              <path className="nx-dot" d="M26 14 q4 -5 0 -10" style={{ animation: 'nx-steam 2s ease-in-out infinite' }} />
              <path className="nx-dot" d="M36 14 q4 -5 0 -10" style={{ animation: 'nx-steam 2s ease-in-out infinite .6s' }} />
            </g>
            {/* tasse */}
            <path d="M14 26 h30 v14 a12 12 0 0 1 -12 12 h-6 a12 12 0 0 1 -12 -12 z" fill={nexans.color.red} />
            <path d="M44 30 h6 a7 7 0 0 1 0 14 h-6" fill="none" stroke={nexans.color.red} strokeWidth="4" />
            <rect x="12" y="56" width="34" height="4" rx="2" fill={nexans.color.textSecondary} />
          </svg>
        </div>
      </div>

      <div style={{ maxWidth: 460 }}>
        <p
          style={{
            fontSize: nexans.font.size.lg,
            fontWeight: nexans.font.weight.semibold,
            color: nexans.color.text,
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {message}
        </p>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 18 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="nx-dot"
              style={{ width: 8, height: 8, borderRadius: '50%', background: nexans.color.red, display: 'inline-block' }}
            />
          ))}
        </div>
        <p style={{ fontSize: nexans.font.size.sm, color: nexans.color.textMuted, marginTop: 14 }}>
          Analyse du CCTP en cours — cette page se mettra à jour automatiquement.
        </p>

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            style={{
              marginTop: 24,
              padding: '10px 20px',
              borderRadius: nexans.radius.pill,
              border: 'none',
              background: nexans.color.red,
              color: '#fff',
              fontFamily: nexans.font.family,
              fontSize: nexans.font.size.sm,
              fontWeight: nexans.font.weight.semibold,
              cursor: 'pointer',
              boxShadow: nexans.shadow.card,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = nexans.color.redDark; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = nexans.color.red; }}
          >
            Je commence sans CCTP
          </button>
        )}
      </div>
    </div>
  );
}

export default WaitState;
