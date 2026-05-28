import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { initialGateHuntProgress } from '../../game/gateHunt';
import { modeCatalog } from '../../game/modes';
import { vehicleCatalog } from '../../game/vehicles';
import { Hud } from './Hud';

describe('Hud', () => {
  it('renders mode and garage data from the catalogs', () => {
    render(<Hud modes={modeCatalog} vehicles={vehicleCatalog} gateHuntProgress={initialGateHuntProgress} />);

    expect(screen.getByRole('heading', { name: 'Terep3' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Gate Hunt' })).toHaveLength(2);
    expect(screen.getByText('Puli 4x4')).toBeInTheDocument();
    expect(screen.getByText('Online rooms')).toBeInTheDocument();
  });
});
