import { useState } from 'react';
import { GameScene } from '../components/game/GameScene';
import { Hud } from '../components/hud/Hud';
import { initialGateHuntProgress, type GateHuntProgress } from '../game/gateHunt';
import { modeCatalog } from '../game/modes';
import { vehicleCatalog } from '../game/vehicles';

export function App() {
  const [gateHuntProgress, setGateHuntProgress] = useState<GateHuntProgress>(initialGateHuntProgress);

  return (
    <main className="app-shell">
      <GameScene onGateHuntProgress={setGateHuntProgress} />
      <Hud modes={modeCatalog} vehicles={vehicleCatalog} gateHuntProgress={gateHuntProgress} />
    </main>
  );
}
