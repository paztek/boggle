import { useEffect, useId, useState } from 'react';
import { ALERT_DISABLED, MAX_ALERT_SECONDS } from '../../domain/timer.ts';
import type { Preferences } from '../../lib/storage.ts';

type TimerSettingsProps = {
  readonly prefs: Preferences;
  readonly onChange: (prefs: Preferences) => void;
};

function clampAlert(seconds: number): number {
  return Math.min(MAX_ALERT_SECONDS, Math.max(ALERT_DISABLED, seconds));
}

/**
 * Réglages d'alerte du chronomètre. Ils tiennent à l'appareil et à la table,
 * pas à la partie : ils vivent dans les préférences, pas dans le `Game`
 * (cf. docs/ARCHITECTURE.md § 7).
 */
export function TimerSettings({ prefs, onChange }: TimerSettingsProps) {
  const fieldId = useId();
  const [draft, setDraft] = useState(String(prefs.alertSeconds));

  useEffect(() => setDraft(String(prefs.alertSeconds)), [prefs.alertSeconds]);

  const commitAlert = () => {
    const settled = clampAlert(Math.trunc(Number(draft)) || ALERT_DISABLED);
    setDraft(String(settled));
    onChange({ ...prefs, alertSeconds: settled });
  };

  return (
    <div className="game__field">
      <div className="game__field">
        <label className="game__label" htmlFor={fieldId}>
          Alerte avant la fin
        </label>
        <div className="game__row">
          <input
            id={fieldId}
            type="number"
            className="game__number game__number--inline"
            min={ALERT_DISABLED}
            max={MAX_ALERT_SECONDS}
            // Pas de 1 : un pas plus large invaliderait les valeurs
            // intermédiaires (`stepMismatch`) sans bénéfice.
            step={1}
            inputMode="numeric"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              const parsed = Number(event.target.value);
              if (
                Number.isInteger(parsed) &&
                parsed >= ALERT_DISABLED &&
                parsed <= MAX_ALERT_SECONDS
              ) {
                onChange({ ...prefs, alertSeconds: parsed });
              }
            }}
            onBlur={commitAlert}
          />
          <span className="game__hint">
            {prefs.alertSeconds === ALERT_DISABLED
              ? 'secondes — alerte désactivée'
              : 'secondes avant la fin'}
          </span>
        </div>
      </div>

      <label className="game__choice">
        <input
          type="checkbox"
          checked={prefs.soundEnabled}
          onChange={(event) => onChange({ ...prefs, soundEnabled: event.target.checked })}
        />
        Bip sonore
      </label>

      <label className="game__choice">
        <input
          type="checkbox"
          checked={prefs.keepAwake}
          onChange={(event) => onChange({ ...prefs, keepAwake: event.target.checked })}
        />
        Garder l&apos;écran allumé pendant une manche
      </label>
    </div>
  );
}
