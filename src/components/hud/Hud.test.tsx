import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { initialGateHuntProgress } from '../../game/gateHunt';
import { modeCatalog } from '../../game/modes';
import { initialVehicleState } from '../../game/vehicleDynamics';
import { vehicleCatalog } from '../../game/vehicles';
import { Hud } from './Hud';

describe('Hud', () => {
  it('renders mode and garage data from the catalogs', () => {
    render(
      <Hud
        modes={modeCatalog}
        vehicles={vehicleCatalog}
        gateHuntProgress={initialGateHuntProgress}
        vehicleState={initialVehicleState}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Terep3' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Gate Hunt' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Puli 4x4')).toBeInTheDocument();
    expect(screen.getByText('Run active')).toBeInTheDocument();
    expect(screen.getByLabelText('Mini route map')).toBeInTheDocument();
    expect(screen.getByLabelText('Race timing callouts')).toHaveTextContent('NextGate B');
  });

  it('renders active gate feedback and exposes retry', () => {
    const onRetry = vi.fn();

    render(
      <Hud
        modes={modeCatalog}
        vehicles={vehicleCatalog}
        gateHuntProgress={{
          ...initialGateHuntProgress,
          activeGateIndex: 2,
          activeGateId: 'C',
          headingToGate: 0.8,
          completedRuns: 1,
          lastRunSeconds: 72.4,
          bestTimeImproved: true,
        }}
        vehicleState={{ ...initialVehicleState, damage: 42, mechanicalDamage: 35 }}
        onRetryGateHunt={onRetry}
      />,
    );

    expect(screen.getByLabelText('Active gate C')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Vehicle route to gate C' })).toBeInTheDocument();
    expect(screen.getByText('Best run')).toBeInTheDocument();
    expect(screen.getByText('1:12.4')).toBeInTheDocument();
    expect(screen.getByLabelText('Vehicle damage 42%')).toBeInTheDocument();
    expect(screen.getByLabelText('Race timing callouts')).toHaveTextContent('NextGate D');

    fireEvent.click(screen.getByRole('button', { name: 'Retry Gate Hunt' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});
