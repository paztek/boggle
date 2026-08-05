import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Board as BoardModel } from '../../domain/draw.ts';
import { Board } from './Board.tsx';

const BOARD: BoardModel = {
  size: 4,
  tiles: [
    { face: 'A', rotation: 0, dieIndex: 0 },
    { face: 'B', rotation: 90, dieIndex: 1 },
    { face: 'C', rotation: 180, dieIndex: 2 },
    { face: 'D', rotation: 270, dieIndex: 3 },
  ],
};

describe('Board — masquage avant le démarrage', () => {
  it('énonce les lettres tant que la grille est visible', () => {
    render(<Board board={BOARD} />);

    // Les lettres sont dans le libellé accessible du rôle « img ».
    expect(screen.getByRole('img')).toHaveAccessibleName(/A, B, C, D/);
  });

  it('masquée : ne révèle aucune lettre au lecteur d’écran', () => {
    render(<Board board={BOARD} blurred />);

    const grid = screen.getByRole('img');
    expect(grid).toHaveClass('board--blurred');
    // Aucune lettre ne doit fuiter par le libellé accessible.
    expect(grid).not.toHaveAccessibleName(/A, B, C, D/);
    expect(grid.getAttribute('aria-label')).toMatch(/masquée/i);
  });
});
