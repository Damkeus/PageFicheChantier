/**
 * Nex&You — Design System Nexans (source de vérité partagée).
 *
 * Ce module est volontairement dupliqué à l'identique dans les 3 PCF
 * (PageDashboard / PageFicheChantier / PageGestionChantier) car les projets
 * PCF sont compilés isolément (pas de package partagé). En cas de modification,
 * répliquer le fichier dans les 3 dossiers `theme/`.
 *
 * Règles UI corporate Nexans : fond blanc/gris épuré, rouge Nexans pour les
 * actions primaires / liserés actifs / icônes de menu, cartes à ombre légère,
 * coins arrondis 4px, typographie Segoe UI / Arial native.
 */

export const nexans = {
  color: {
    /** Rouge Nexans — actions primaires, liserés actifs, icônes de menu. */
    red: '#C90016',
    redDark: '#A30012',
    redHover: '#E11324',
    /** Teintes de rouge très claires pour fonds de survol / badges. */
    redTint: 'rgba(201, 0, 22, 0.08)',
    redTintStrong: 'rgba(201, 0, 22, 0.14)',

    // Neutres corporate
    white: '#FFFFFF',
    bg: '#FFFFFF',
    bgAlt: '#F5F6F8',
    bgSubtle: '#FAFBFC',
    surface: '#FFFFFF',

    text: '#1A1A1A',
    textSecondary: '#5A6472',
    textMuted: '#8A94A6',
    border: '#E4E7EC',
    borderStrong: '#D0D5DD',

    // États sémantiques (réutilisés par le moteur de confidence)
    success: '#1F9D55',
    successTint: 'rgba(31, 157, 85, 0.10)',
    warning: '#E8830C',
    warningTint: 'rgba(232, 131, 12, 0.12)',
    danger: '#C90016',
    dangerTint: 'rgba(201, 0, 22, 0.10)',
  },

  font: {
    family:
      "'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, 'Helvetica Neue', sans-serif",
    size: { xs: '11px', sm: '13px', md: '14px', lg: '16px', xl: '20px', xxl: '26px' },
    weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  },

  radius: { sm: '4px', md: '6px', lg: '8px', pill: '999px' },

  shadow: {
    /** Ombre légère pour les cartes (Design System Nexans). */
    card: '0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)',
    cardHover: '0 4px 12px rgba(16, 24, 40, 0.10)',
    modal: '0 20px 48px rgba(16, 24, 40, 0.22)',
  },

  space: { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px', xxl: '32px' },
} as const;

/**
 * Couleur de statut métier — alignée sur la charte (rouge Nexans pour les
 * états critiques, neutres pour le reste).
 */
export const statusColor: Record<string, string> = {
  'En cours': nexans.color.red,
  'Planifié': nexans.color.textMuted,
  'Terminé': nexans.color.success,
  'En retard': nexans.color.red,
  'Décalé': nexans.color.warning,
  'A faire': nexans.color.textMuted,
  'Bloqué': nexans.color.red,
  'En attente': nexans.color.textMuted,
};

/**
 * Injecte les variables CSS Nexans (`--nx-*`) sur :root une seule fois.
 * À appeler dans index.ts/init(). Permet d'utiliser le DS aussi bien en
 * inline-style qu'en CSS classique (et en Tailwind via arbitrary values).
 */
export function injectNexansVars(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('nexans-ds-vars')) return;
  const style = document.createElement('style');
  style.id = 'nexans-ds-vars';
  style.textContent = `:root{
    --nx-red:${nexans.color.red};
    --nx-red-dark:${nexans.color.redDark};
    --nx-red-hover:${nexans.color.redHover};
    --nx-red-tint:${nexans.color.redTint};
    --nx-bg:${nexans.color.bg};
    --nx-bg-alt:${nexans.color.bgAlt};
    --nx-surface:${nexans.color.surface};
    --nx-text:${nexans.color.text};
    --nx-text-secondary:${nexans.color.textSecondary};
    --nx-text-muted:${nexans.color.textMuted};
    --nx-border:${nexans.color.border};
    --nx-success:${nexans.color.success};
    --nx-warning:${nexans.color.warning};
    --nx-danger:${nexans.color.danger};
    --nx-radius:${nexans.radius.sm};
    --nx-shadow-card:${nexans.shadow.card};
    --nx-font:${nexans.font.family};
  }`;
  document.head.appendChild(style);
}

export type NexansTheme = typeof nexans;
