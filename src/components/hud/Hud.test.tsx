import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { initialGateHuntProgress } from '../../game/gateHunt';
import { initialVehicleState } from '../../game/vehicleDynamics';
import { Hud } from './Hud';

describe('Hud', () => {
  it('renders compact Gate Hunt status', () => {
    render(<Hud gateHuntProgress={initialGateHuntProgress} vehicleState={initialVehicleState} />);

    expect(screen.getByText('Terep3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Gate Hunt' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Gate A' })).toBeInTheDocument();
    expect(screen.getByText(/Run active/)).toBeInTheDocument();
    expect(screen.getByText(/Next B/)).toBeInTheDocument();
    expect(screen.getByLabelText('Mini route map')).toBeInTheDocument();
  });

  it('renders active gate feedback and exposes retry', () => {
    const onRetry = vi.fn();

    render(
      <Hud
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
    expect(screen.getByText(/Next D/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry Gate Hunt' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});
