import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Timer } from './Timer.tsx';

function renderTimer(overrides: Partial<Parameters<typeof Timer>[0]> = {}) {
  const props = {
    status: 'arrete' as const,
    remainingMs: 180_000,
    alerting: false,
    onPause: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  };
  render(<Timer {...props} />);
  return props;
}

describe('Timer — affichage', () => {
  it('montre le temps restant en minutes et secondes', () => {
    renderTimer({ remainingMs: 125_000 });

    expect(screen.getByText('2:05')).toBeInTheDocument();
  });

  it('n’annonce rien tant que rien ne change — le décompte noierait un lecteur d’écran', () => {
    renderTimer({ remainingMs: 125_000 });

    expect(screen.getByRole('status')).toHaveTextContent('');
  });
});

describe('Timer — contrôles selon l’état', () => {
  it('à l’arrêt : aucun bouton — « Démarrer » est porté par la grille masquée', () => {
    renderTimer();

    // Le lancement se fait sur la grille (cf. App), pas dans le chrono.
    expect(screen.queryByRole('button', { name: /démarrer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /réinitialiser/i })).not.toBeInTheDocument();
  });

  it('en cours : pause et réinitialisation', async () => {
    const user = userEvent.setup();
    const props = renderTimer({ status: 'en-cours' });

    await user.click(screen.getByRole('button', { name: /pause/i }));
    await user.click(screen.getByRole('button', { name: /réinitialiser/i }));

    expect(props.onPause).toHaveBeenCalled();
    expect(props.onReset).toHaveBeenCalled();
  });

  it('suspendu : réinitialisation, la reprise étant portée par la grille masquée', () => {
    renderTimer({ status: 'suspendu' });

    // « Reprendre » vit sur la grille (cf. App), pas dans le chrono.
    expect(screen.queryByRole('button', { name: /reprendre/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /réinitialiser/i })).toBeInTheDocument();
  });
});

describe('Timer — alerte', () => {
  // `global.css` neutralise les animations sous `prefers-reduced-motion` : une
  // alerte qui ne tiendrait qu'à la pulsation disparaîtrait pour ces
  // utilisateurs. Elle doit donc aussi être écrite et annoncée.
  it('affiche un libellé, pas seulement une animation', () => {
    renderTimer({ status: 'en-cours', remainingMs: 20_000, alerting: true });

    expect(screen.getByText('Bientôt fini')).toBeInTheDocument();
  });

  it('annonce l’approche de la fin aux lecteurs d’écran', () => {
    renderTimer({ status: 'en-cours', remainingMs: 20_000, alerting: true });

    expect(screen.getByRole('status')).toHaveTextContent('Bientôt fini : 0:20.');
  });

  it('annonce la fin du temps', () => {
    renderTimer({ status: 'termine', remainingMs: 0 });

    expect(screen.getByText('Temps écoulé')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Temps écoulé.');
  });
});
