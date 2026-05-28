import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { initialGateHuntProgress } from '../../game/gateHunt';
import { modeCatalog } from '../../game/modes';
import { vehicleCatalog } from '../../game/vehicles';
import { Hud } from './Hud';

describe('Hud', () => {
  it('renders mode and garage data from the catalogs', () => {
    render(<Hud modes={modeCatalog} vehicles={vehicleCatalog} gateHuntProgress={initialGateHuntProgress} />);

    expect(screen.getByRole('heading', { name: 'Terep3' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Gate Hunt' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Puli 4x4')).toBeInTheDocument();
    expect(screen.getByText('Run active')).toBeInTheDocument();
  });

  it('renders active gate feedback and exposes retry', () => {
    const onRetry = vi.fn();

    render(
      <Hud
        modes={modeCatalog}
        vehicles={vehicleCatalog}
        gateHuntProgress={{
          ...initialGateHuntProgress,
          activeGateId: 'C',
          headingToGate: 0.8,
          completedRuns: 1,
          lastRunSeconds: 72.4,
          bestTimeImproved: true,
        }}
        onRetryGateHunt={onRetry}
      />,
    );

    expect(screen.getByLabelText('Active gate C')).toBeInTheDocument();
    expect(screen.getByText('Best run')).toBeInTheDocument();
    expect(screen.getByText('1:12.4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry Gate Hunt' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});
