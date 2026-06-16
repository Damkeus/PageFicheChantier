import React, { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string;
  show: boolean;
  onHide: () => void;
  /** Durée d'affichage avant disparition automatique (ms). */
  durationMs?: number;
}

/**
 * Notification discrète (bas-centre) déclenchée à la sauvegarde.
 * Auto-masquage après `durationMs`, fondu via transition d'opacité.
 */
export function Toast({ message, show, onHide, durationMs = 2500 }: ToastProps) {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onHide, durationMs);
    return () => clearTimeout(timer);
  }, [show, durationMs, onHide]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: `translateX(-50%) translateY(${show ? '0' : '8px'})`,
        opacity: show ? 1 : 0,
        transition: 'opacity .25s ease, transform .25s ease',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white shadow-2xl text-sm font-medium"
        style={{ background: '#1F2937' }}
      >
        <CheckCircle2 className="w-4 h-4" style={{ color: '#46C26A' }} />
        <span>{message}</span>
      </div>
    </div>
  );
}

export default Toast;
