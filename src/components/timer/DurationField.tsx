import { useEffect, useId, useState } from 'react';
import {
  formatRemaining,
  MAX_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
} from '../../domain/timer.ts';

type DurationFieldProps = {
  readonly value: number;
  readonly onChange: (seconds: number) => void;
};

/**
 * Pas de 1 seconde, et non un pas « pratique » de 15 : le navigateur refuserait
 * alors toute valeur qui n'en est pas un multiple (`stepMismatch`), ce qui
 * bloquerait la soumission du formulaire sans que rien ne l'explique.
 */
const STEP_SECONDS = 1;

function clamp(seconds: number): number {
  return Math.min(MAX_DURATION_SECONDS, Math.max(MIN_DURATION_SECONDS, seconds));
}

/**
 * Durée d'une manche, en secondes.
 *
 * Comme les autres champs numériques du panneau, la saisie est laissée libre —
 * y compris vide, le temps de retaper — et n'est ramenée dans ses bornes qu'à
 * la sortie du champ. L'équivalent en minutes est rappelé à côté : « 180 » ne
 * se lit pas d'un coup d'œil comme « 3:00 ».
 */
export function DurationField({ value, onChange }: DurationFieldProps) {
  const inputId = useId();
  const [draft, setDraft] = useState(String(value));

  // La durée peut changer ailleurs — reprise d'une partie, autre écran.
  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const settled = clamp(Number(draft) || value);
    setDraft(String(settled));
    onChange(settled);
  };

  return (
    <div className="game__field">
      <label className="game__label" htmlFor={inputId}>
        Durée d&apos;une manche
      </label>
      <div className="game__row">
        <input
          id={inputId}
          type="number"
          className="game__number game__number--inline"
          min={MIN_DURATION_SECONDS}
          max={MAX_DURATION_SECONDS}
          step={STEP_SECONDS}
          inputMode="numeric"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            const parsed = Number(event.target.value);
            if (
              Number.isInteger(parsed) &&
              parsed >= MIN_DURATION_SECONDS &&
              parsed <= MAX_DURATION_SECONDS
            ) {
              onChange(parsed);
            }
          }}
          onBlur={commit}
        />
        <span className="game__hint">secondes — {formatRemaining(value * 1000)}</span>
      </div>
    </div>
  );
}
