import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RulesPanel } from './RulesPanel.tsx';

describe('RulesPanel', () => {
  it('est replié au départ : le panneau est hors tabulation', () => {
    render(<RulesPanel size={4} />);

    const toggle = screen.getByRole('button', { name: /barème & règles/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Barème et règles')).toHaveAttribute('inert');
  });

  it('se déplie au clic puis se referme avec Échap', async () => {
    const user = userEvent.setup();
    render(<RulesPanel size={4} />);

    const toggle = screen.getByRole('button', { name: /barème & règles/i });
    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Barème et règles')).not.toHaveAttribute('inert');

    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('affiche le barème du format 4×4 (3 lettres = 1 point)', () => {
    render(<RulesPanel size={4} />);

    const panel = screen.getByLabelText('Barème et règles');
    expect(within(panel).getByText('Barème 4×4')).toBeInTheDocument();
    const row = within(panel).getByRole('rowheader', { name: '3 lettres' }).closest('tr');
    expect(row).not.toBeNull();
    expect(within(row as HTMLTableRowElement).getByRole('cell')).toHaveTextContent('1');
  });

  it("affiche le barème du format 5×5 (3 lettres non valide, mots d'au moins 4 lettres)", () => {
    render(<RulesPanel size={5} />);

    const panel = screen.getByLabelText('Barème et règles');
    expect(within(panel).getByText('Barème 5×5')).toBeInTheDocument();
    const row = within(panel).getByRole('rowheader', { name: '3 lettres' }).closest('tr');
    expect(within(row as HTMLTableRowElement).getByRole('cell')).toHaveTextContent('—');

    const items = within(panel).getAllByRole('listitem');
    expect(items.some((li) => /au moins\s*4 lettres/.test(li.textContent ?? ''))).toBe(true);
  });
});
