import { useId, useState } from 'react';
import {
  MAX_ROUNDS,
  MAX_TARGET,
  MIN_ROUNDS,
  MIN_TARGET,
  type EndCondition,
} from '../../domain/game.ts';

type EndConditionFieldProps = {
  readonly value: EndCondition;
  readonly onChange: (condition: EndCondition) => void;
};

const DEFAULT_ROUNDS = 5;
const DEFAULT_TARGET = 200;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Valeur exploitable saisie dans le champ, ou `null` tant qu'elle ne l'est pas. */
function parseInRange(text: string, min: number, max: number): number | null {
  const value = Number(text);
  if (text.trim() === '' || !Number.isInteger(value)) return null;
  return value >= min && value <= max ? value : null;
}

/**
 * Choix de la condition d'arrêt. Elle ne verrouille rien : une fois atteinte,
 * l'application se contente de proposer de terminer (cf. docs/RULES.md § 6).
 *
 * Les champs numériques gardent leur saisie telle quelle — y compris vide, le
 * temps de retaper un nombre — et ne sont ramenés dans les bornes qu'à la
 * sortie du champ.
 */
export function EndConditionField({ value, onChange }: EndConditionFieldProps) {
  const groupName = useId();
  const [rounds, setRounds] = useState(String(DEFAULT_ROUNDS));
  const [target, setTarget] = useState(String(DEFAULT_TARGET));

  const roundsValue = parseInRange(rounds, MIN_ROUNDS, MAX_ROUNDS) ?? DEFAULT_ROUNDS;
  const targetValue = parseInRange(target, MIN_TARGET, MAX_TARGET) ?? DEFAULT_TARGET;

  const commitRounds = () => {
    const settled = clamp(Number(rounds) || DEFAULT_ROUNDS, MIN_ROUNDS, MAX_ROUNDS);
    setRounds(String(settled));
    onChange({ kind: 'manches', rounds: settled });
  };

  const commitTarget = () => {
    const settled = clamp(Number(target) || DEFAULT_TARGET, MIN_TARGET, MAX_TARGET);
    setTarget(String(settled));
    onChange({ kind: 'score', target: settled });
  };

  return (
    <fieldset className="game__fieldset">
      <legend className="game__label">Fin de partie</legend>

      <div className="game__choice">
        <input
          type="radio"
          id={`${groupName}-libre`}
          name={groupName}
          checked={value.kind === 'libre'}
          onChange={() => onChange({ kind: 'libre' })}
        />
        <label htmlFor={`${groupName}-libre`}>Libre — les joueurs décident</label>
      </div>

      <div className="game__choice">
        <input
          type="radio"
          id={`${groupName}-manches`}
          name={groupName}
          checked={value.kind === 'manches'}
          onChange={() => onChange({ kind: 'manches', rounds: roundsValue })}
        />
        <label htmlFor={`${groupName}-manches`}>Nombre de manches</label>
        <input
          type="number"
          className="game__number"
          min={MIN_ROUNDS}
          max={MAX_ROUNDS}
          step={1}
          inputMode="numeric"
          value={rounds}
          disabled={value.kind !== 'manches'}
          aria-label="Nombre de manches"
          onChange={(event) => {
            setRounds(event.target.value);
            const parsed = parseInRange(event.target.value, MIN_ROUNDS, MAX_ROUNDS);
            if (parsed !== null) onChange({ kind: 'manches', rounds: parsed });
          }}
          onBlur={commitRounds}
        />
      </div>

      <div className="game__choice">
        <input
          type="radio"
          id={`${groupName}-score`}
          name={groupName}
          checked={value.kind === 'score'}
          onChange={() => onChange({ kind: 'score', target: targetValue })}
        />
        <label htmlFor={`${groupName}-score`}>Score à atteindre</label>
        <input
          type="number"
          className="game__number"
          min={MIN_TARGET}
          max={MAX_TARGET}
          step={1}
          inputMode="numeric"
          value={target}
          disabled={value.kind !== 'score'}
          aria-label="Score à atteindre"
          onChange={(event) => {
            setTarget(event.target.value);
            const parsed = parseInRange(event.target.value, MIN_TARGET, MAX_TARGET);
            if (parsed !== null) onChange({ kind: 'score', target: parsed });
          }}
          onBlur={commitTarget}
        />
      </div>
    </fieldset>
  );
}
