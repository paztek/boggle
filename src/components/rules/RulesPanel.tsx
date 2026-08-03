import { useId } from 'react';
import type { BoardSize } from '../../domain/dice.ts';
import { minimumWordLength, scoreScaleFor } from '../../domain/scoring.ts';
import { SidePanel } from '../ui/SidePanel.tsx';
import './rules.css';

type RulesPanelProps = {
  /** Format courant : détermine le barème affiché. */
  readonly size: BoardSize;
  /** Ouverture pilotée par le parent. Omis, le panneau gère son propre état. */
  readonly open?: boolean | undefined;
  readonly onOpenChange?: ((open: boolean) => void) | undefined;
};

/**
 * Panneau dépliable sur le côté gauche : rappel du barème pour le format
 * courant et bref récapitulatif des règles.
 *
 * Composant purement présentationnel — l'application ne calcule pas les points
 * (cf. docs/RULES.md § 5) : le barème n'est là qu'à titre de rappel.
 */
export function RulesPanel({ size, open, onOpenChange }: RulesPanelProps) {
  const sectionId = useId();
  const scale = scoreScaleFor(size);
  const minLength = minimumWordLength(size);

  return (
    <SidePanel
      side="left"
      title={<>Barème &amp; règles</>}
      label="Barème et règles"
      open={open}
      onOpenChange={onOpenChange}
    >
      <section className="rules__section" aria-labelledby={`${sectionId}-bareme`}>
        <h3 className="rules__subheading" id={`${sectionId}-bareme`}>
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

      <section className="rules__section" aria-labelledby={`${sectionId}-regles`}>
        <h3 className="rules__subheading" id={`${sectionId}-regles`}>
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
        <p className="rules__note">
          En cas de litige, le dictionnaire de référence est l&apos;ODS.{' '}
          {/* Seul lien sortant de l'application : la vérification d'un mot est
              déléguée, jamais assurée par une liste embarquée (cf. docs/RULES.md § 7). */}
          <a
            className="rules__link"
            href="https://www.ffscrabble.fr/verificateur-de-mots/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vérifier un mot sur le site de la FFSc
          </a>{' '}
          <span className="rules__hint">(nécessite une connexion)</span>
        </p>
      </section>
    </SidePanel>
  );
}
