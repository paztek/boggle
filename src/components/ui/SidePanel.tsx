import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import './side-panel.css';

type SidePanelProps = {
  /** Bord d'ancrage : le panneau des règles à gauche, celui de la partie à droite. */
  readonly side: 'left' | 'right';
  /** Intitulé du bouton d'ouverture et titre affiché en tête du panneau. */
  readonly title: ReactNode;
  /** Libellé accessible du panneau — sert aussi à le retrouver dans les tests. */
  readonly label: string;
  /** Ouverture pilotée par le parent. Omis, le panneau gère son propre état. */
  readonly open?: boolean | undefined;
  readonly onOpenChange?: ((open: boolean) => void) | undefined;
  readonly children: ReactNode;
};

/**
 * Coquille commune aux panneaux dépliables latéraux : bouton fixé, voile de
 * fond, fermeture au clic hors panneau ou à la touche `Échap`, sortie du flux
 * de tabulation une fois replié.
 *
 * Le glissement est animé en `transform` et le voile en `opacity` uniquement
 * (cf. CLAUDE.md) — aucune propriété de mise en page n'est animée.
 */
export function SidePanel({
  side,
  title,
  label,
  open: controlledOpen,
  onOpenChange,
  children,
}: SidePanelProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const panelId = useId();

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const close = useCallback(() => setOpen(false), [setOpen]);

  // Fermeture au clavier : Échap referme le panneau ouvert.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  return (
    <div className="side-panel">
      <button
        type="button"
        className="side-panel__toggle"
        data-side={side}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        {title}
      </button>

      {/* Voile de fond : referme au clic hors du panneau (surtout sur mobile). */}
      <div
        className="side-panel__overlay"
        data-open={open}
        aria-hidden="true"
        onClick={close}
      />

      <aside
        id={panelId}
        className="side-panel__panel"
        data-side={side}
        data-open={open}
        aria-label={label}
        // Hors tabulation quand le panneau est replié.
        inert={open ? undefined : true}
      >
        <div className="side-panel__head">
          <h2 className="side-panel__heading">{title}</h2>
          <button
            type="button"
            className="side-panel__close"
            onClick={close}
            aria-label="Fermer"
          >
            &times;
          </button>
        </div>

        <div className="side-panel__body">{children}</div>
      </aside>
    </div>
  );
}
