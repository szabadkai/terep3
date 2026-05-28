import { useState } from 'react';
import { GameScene } from '../components/game/GameScene';
import { Hud } from '../components/hud/Hud';
import { initialGateHuntProgress, type GateHuntProgress } from '../game/gateHunt';
import { initialVehicleState, type VehicleState } from '../game/vehicleDynamics';

export function App() {
  const [gateHuntProgress, setGateHuntProgress] = useState<GateHuntProgress>(initialGateHuntProgress);
  const [vehicleState, setVehicleState] = useState<VehicleState>(initialVehicleState);
  const [gateHuntRetrySignal, setGateHuntRetrySignal] = useState(0);

  return (
    <main className="app-shell">
      <GameScene
        onGateHuntProgress={setGateHuntProgress}
        onVehicleState={setVehicleState}
        gateHuntRetrySignal={gateHuntRetrySignal}
      />
      <Hud
        gateHuntProgress={gateHuntProgress}
        vehicleState={vehicleState}
        onRetryGateHunt={() => setGateHuntRetrySignal((signal) => signal + 1)}
      />
    </main>
  );
}
