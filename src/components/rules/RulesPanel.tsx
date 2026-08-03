import { useCallback, useEffect, useId, useState } from 'react';
import type { BoardSize } from '../../domain/dice.ts';
import { minimumWordLength, scoreScaleFor } from '../../domain/scoring.ts';
import './rules.css';

type RulesPanelProps = {
  /** Format courant : détermine le barème affiché. */
  readonly size: BoardSize;
};

/**
 * Panneau dépliable sur le côté gauche : rappel du barème pour le format
 * courant et bref récapitulatif des règles.
 *
 * Composant purement présentationnel — l'application ne calcule pas les points
 * (cf. docs/RULES.md § 5) : le barème n'est là qu'à titre de rappel.
 */
export function RulesPanel({ size }: RulesPanelProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const close = useCallback(() => setOpen(false), []);

  // Fermeture au clavier : Échap referme le panneau ouvert.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  const scale = scoreScaleFor(size);
  const minLength = minimumWordLength(size);

  return (
    <div className="rules">
      <button
        type="button"
        className="rules__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        Barème &amp; règles
      </button>

      {/* Voile de fond : referme au clic hors du panneau (surtout sur mobile). */}
      <div
        className="rules__overlay"
        data-open={open}
        aria-hidden="true"
        onClick={close}
      />

      <aside
        id={panelId}
        className="rules__panel"
        data-open={open}
        aria-label="Barème et règles"
        // Hors tabulation quand le panneau est replié.
        inert={open ? undefined : true}
      >
        <div className="rules__head">
          <h2 className="rules__heading">Barème &amp; règles</h2>
          <button type="button" className="rules__close" onClick={close} aria-label="Fermer">
            &times;
          </button>
        </div>

        <section className="rules__section" aria-labelledby={`${panelId}-bareme`}>
          <h3 className="rules__subheading" id={`${panelId}-bareme`}>
            Barème {size}×{size}
          </h3>
          <table className="rules__scale">
            <thead>
              <tr>
                <th scope="col">Longueur du mot</th>
                <th scope="col">Points</th>
              </tr>
            </thead>
            <tbody>
              {scale.map((row) => (
                <tr key={row.length} data-invalid={row.points === null}>
                  <th scope="row">{row.length}</th>
                  <td>{row.points === null ? '—' : row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="rules__note">
            Rappel uniquement : les joueurs comptent leurs points et saisissent leur total.
          </p>
        </section>

        <section className="rules__section" aria-labelledby={`${panelId}-regles`}>
          <h3 className="rules__subheading" id={`${panelId}-regles`}>
            En bref
          </h3>
          <ul className="rules__list">
            <li>
              Relier des lettres <strong>adjacentes</strong> (côté ou diagonale) ; un même dé ne
              sert pas deux fois dans un mot.
            </li>
            <li>
              Mots d&apos;au moins <strong>{minLength} lettres</strong>.
            </li>
            <li>
              Accents, cédilles et trémas ignorés : <em>ELEVE</em> vaut <em>ÉLÈVE</em>.
            </li>
            <li>Exclus : noms propres, abréviations, sigles, mots étrangers non francisés.</li>
            <li>
              Un mot trouvé par <strong>plusieurs joueurs</strong> est rayé de toutes les listes.
            </li>
          </ul>
          <p className="rules__note">En cas de litige, le dictionnaire de référence est l&apos;ODS.</p>
        </section>
      </aside>
    </div>
  );
}
