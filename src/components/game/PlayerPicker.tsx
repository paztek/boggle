import { useId, useState } from 'react';
import type { Player } from '../../domain/game.ts';
import { findKnownPlayer, type KnownPlayer } from '../../domain/roster.ts';
import { createId } from '../../lib/ids.ts';

type PlayerPickerProps = {
  readonly selected: readonly Player[];
  readonly roster: readonly KnownPlayer[];
  readonly onChange: (players: readonly Player[]) => void;
  /** Retire durablement un joueur du répertoire local. */
  readonly onForget: (playerId: string) => void;
};

/**
 * Saisie des joueurs d'une partie : un champ de nom, plus les joueurs déjà
 * enregistrés proposés en un clic.
 *
 * Un nom déjà connu réutilise l'identifiant du répertoire, pour que le joueur
 * reste le même d'une partie à l'autre.
 */
export function PlayerPicker({ selected, roster, onChange, onForget }: PlayerPickerProps) {
  const [name, setName] = useState('');
  const inputId = useId();

  const isSelected = (candidate: string) => findKnownPlayer(selected, candidate) !== undefined;

  const add = (player: Player) => {
    if (selected.some((existing) => existing.id === player.id)) return;
    onChange([...selected, player]);
  };

  const addTyped = () => {
    const trimmed = name.trim();
    if (trimmed.length === 0 || isSelected(trimmed)) {
      setName('');
      return;
    }

    const known = findKnownPlayer(roster, trimmed);
    add(known ? { id: known.id, name: known.name } : { id: createId('p'), name: trimmed });
    setName('');
  };

  const remove = (playerId: string) => {
    onChange(selected.filter((player) => player.id !== playerId));
  };

  const suggestions = roster.filter((known) => !selected.some((player) => player.id === known.id));

  return (
    <div className="game__field">
      <label className="game__label" htmlFor={inputId}>
        Joueurs
      </label>

      <div className="game__row">
        <input
          id={inputId}
          className="game__input"
          type="text"
          autoComplete="off"
          placeholder="Nom du joueur"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            // Le champ vit dans un formulaire : on évite la soumission.
            event.preventDefault();
            addTyped();
          }}
        />
        <button type="button" className="game__button" onClick={addTyped}>
          Ajouter
        </button>
      </div>

      {selected.length > 0 && (
        <ul className="game__chips" aria-label="Joueurs de la partie">
          {selected.map((player) => (
            <li key={player.id} className="game__chip" data-selected="true">
              {player.name}
              <button
                type="button"
                className="game__chip-action"
                aria-label={`Retirer ${player.name} de la partie`}
                onClick={() => remove(player.id)}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}

      {suggestions.length > 0 && (
        <>
          <p className="game__hint" id={`${inputId}-known`}>
            Joueurs enregistrés
          </p>
          <ul className="game__chips" aria-labelledby={`${inputId}-known`}>
            {suggestions.map((known) => (
              <li key={known.id} className="game__chip">
                <button
                  type="button"
                  className="game__chip-add"
                  onClick={() => add({ id: known.id, name: known.name })}
                >
                  {known.name}
                </button>
                <button
                  type="button"
                  className="game__chip-action"
                  aria-label={`Oublier ${known.name}`}
                  onClick={() => onForget(known.id)}
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
