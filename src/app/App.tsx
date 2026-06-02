import { useState } from 'react';
import { GameScene } from '../components/game/GameScene';
import { Hud } from '../components/hud/Hud';
import { musicTracks } from '../game/audio';
import { initialGateHuntProgress, type GateHuntProgress } from '../game/gateHunt';
import { initialVehicleState, type VehicleState } from '../game/vehicleDynamics';

export function App() {
  const [gateHuntProgress, setGateHuntProgress] = useState<GateHuntProgress>(initialGateHuntProgress);
  const [vehicleState, setVehicleState] = useState<VehicleState>(initialVehicleState);
  const [gateHuntRetrySignal, setGateHuntRetrySignal] = useState(0);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(false);
  const [musicTrackIndex, setMusicTrackIndex] = useState(0);
  const activeMusicTrack = musicTracks[musicTrackIndex];

  return (
    <main className="app-shell">
      <GameScene
        onGateHuntProgress={setGateHuntProgress}
        onVehicleState={setVehicleState}
        gateHuntRetrySignal={gateHuntRetrySignal}
        musicEnabled={musicEnabled}
        sfxEnabled={sfxEnabled}
        musicTrackIndex={musicTrackIndex}
      />
      <Hud
        gateHuntProgress={gateHuntProgress}
        vehicleState={vehicleState}
        onRetryGateHunt={() => setGateHuntRetrySignal((signal) => signal + 1)}
        musicEnabled={musicEnabled}
        sfxEnabled={sfxEnabled}
        musicTrackLabel={activeMusicTrack.label}
        onToggleMusic={() => setMusicEnabled((enabled) => !enabled)}
        onToggleSfx={() => setSfxEnabled((enabled) => !enabled)}
        onNextMusicTrack={() => setMusicTrackIndex((index) => (index + 1) % musicTracks.length)}
      />
    </main>
  );
}
