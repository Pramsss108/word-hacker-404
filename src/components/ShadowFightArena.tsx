import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Wifi, Skull } from 'lucide-react';
import './ShadowFightArena.css';
import './ShadowFightArenaOverlay.css';

// --- TYPES ---
interface PlayerState {
  x: number;
  hp: number;
  action: 'IDLE' | 'PUNCH' | 'BLOCK' | 'HIT';
  frame: number;
}

interface NetworkPacket {
  frame: number;
  input: string;
  checksum: string;
}

// --- MOCK NETWORK CLASS (Simulates P2P) ---
class MockP2PNetwork {
  private latencyMs: number = 0;
  private packetLoss: number = 0;
  private isLagSwitchActive: boolean = false;
  private onPacketReceived: (packet: NetworkPacket) => void;

  constructor(onPacket: (packet: NetworkPacket) => void) {
    this.onPacketReceived = onPacket;
  }

  public send(packet: NetworkPacket) {
    if (this.isLagSwitchActive) return; // Drop all packets
    if (Math.random() < this.packetLoss) return; // Random loss

    setTimeout(() => {
      this.onPacketReceived(packet);
    }, this.latencyMs);
  }

  // --- RED TEAM TOOLS ---
  public setLatency(ms: number) { this.latencyMs = ms; }
  public getLatency() { return this.latencyMs; }
  public setPacketLoss(rate: number) { this.packetLoss = rate; }
  public setLagSwitch(active: boolean) { this.isLagSwitchActive = active; }
}

const ShadowFightArena: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  // Game State
  const [p1, setP1] = useState<PlayerState>({ x: 100, hp: 100, action: 'IDLE', frame: 0 });
  const [p2, setP2] = useState<PlayerState>({ x: 300, hp: 100, action: 'IDLE', frame: 0 });
  const [gameFrame, setGameFrame] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'SYNCED' | 'DESYNC' | 'ROLLBACK'>('SYNCED');
  const [winner, setWinner] = useState<'P1' | 'P2' | null>(null);
  
  // Red Team Controls
  const [showRedTeam, setShowRedTeam] = useState(false);
  const [lagSwitch, setLagSwitch] = useState(false);
  const [autoBlockHack, setAutoBlockHack] = useState(false);

  // Refs for loop
  const networkRef = useRef<MockP2PNetwork | null>(null);
  const frameRef = useRef<number>(0);

  // Initialize Network
  useEffect(() => {
    networkRef.current = new MockP2PNetwork((packet) => {
      // When we receive a packet from "Remote" (P2), we validate it
      // In this mock, we just log it or check checksums
      if (packet.checksum !== generateChecksum(p2)) {
        setSyncStatus('DESYNC');
      }
    });

    const loop = setInterval(() => {
      if (syncStatus === 'DESYNC' || winner) return; // Stop loop on Desync or Win
      gameLoop();
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(loop);
  }, [syncStatus, winner]);

  // --- GAME LOGIC (Deterministic) ---
  const gameLoop = () => {
    frameRef.current++;
    setGameFrame(frameRef.current);

    // 1. Process Inputs (Mock AI for P2)
    const p2Input = Math.random() > 0.95 ? 'PUNCH' : 'IDLE';
    
    // 2. Update Physics
    setP1(prev => {
      // Simple logic
      return { ...prev, frame: frameRef.current };
    });

    setP2(prev => {
      let newHp = prev.hp;
      let action = prev.action;

      // HACK: Auto-Block Logic (If enabled, P2 never takes damage)
      if (autoBlockHack && p1.action === 'PUNCH') {
        action = 'BLOCK'; 
      } else if (p2Input === 'PUNCH') {
        action = 'PUNCH';
      } else {
        action = 'IDLE';
      }

      // Check Death
      if (newHp <= 0 && !winner) setWinner('P1');

      return { ...prev, hp: newHp, action: action as any, frame: frameRef.current };
    });

    // Check P1 Death
    if (p1.hp <= 0 && !winner) setWinner('P2');

    // 3. Send State to Network
    if (networkRef.current) {
      networkRef.current.setLagSwitch(lagSwitch);
      networkRef.current.send({
        frame: frameRef.current,
        input: 'IDLE', // Placeholder
        checksum: generateChecksum(p1) // Send OUR view of the world
      });
    }
  };

  const generateChecksum = (state: PlayerState) => {
    return `${state.x}-${state.hp}-${state.action}`;
  };

  // --- ACTIONS ---
  const handlePunch = () => {
    if (syncStatus === 'DESYNC' || winner) return;
    setP1(prev => ({ ...prev, action: 'PUNCH' }));
    // Hit detection logic would go here
    if (p2.x - p1.x < 50 && p2.action !== 'BLOCK') {
       setP2(prev => ({ ...prev, hp: Math.max(0, prev.hp - 10), action: 'HIT' }));
    }
    setTimeout(() => setP1(prev => ({ ...prev, action: 'IDLE' })), 300);
  };

  const resetMatch = () => {
    setP1({ x: 100, hp: 100, action: 'IDLE', frame: 0 });
    setP2({ x: 300, hp: 100, action: 'IDLE', frame: 0 });
    setSyncStatus('SYNCED');
    setWinner(null);
    frameRef.current = 0;
    setGameFrame(0);
  };

  return (
    <div className="arena-container">
      {/* OVERLAYS */}
      {syncStatus === 'DESYNC' && (
        <div className="match-overlay draw">
          <h1>⚠ MATCH NULLIFIED ⚠</h1>
          <p>Synchronization Error Detected</p>
          <div className="result-badge">DRAW</div>
          <button className="restart-btn" onClick={resetMatch}>RESTART MATCH</button>
        </div>
      )}

      {winner && (
        <div className={`match-overlay ${winner === 'P1' ? 'win' : 'loss'}`}>
          <h1>{winner === 'P1' ? 'VICTORY' : 'DEFEAT'}</h1>
          <div className="result-badge">{winner === 'P1' ? 'YOU WIN' : 'YOU LOSE'}</div>
          <button className="restart-btn" onClick={resetMatch}>PLAY AGAIN</button>
        </div>
      )}

      {/* HUD */}
      <div className="arena-hud">
        <div className="health-bar p1">
          <div className="fill" style={{ width: `${p1.hp}%` }}></div>
        </div>
        <div className="timer">{Math.floor(gameFrame / 60)}</div>
        <div className="health-bar p2">
          <div className="fill" style={{ width: `${p2.hp}%` }}></div>
        </div>
      </div>

      {/* SYNC STATUS */}
      <div className={`sync-status ${syncStatus.toLowerCase()}`}>
        {syncStatus === 'SYNCED' ? <Wifi size={16} /> : <AlertTriangle size={16} />}
        {syncStatus}
      </div>

      {/* GAME WORLD */}
      <div className="game-world">
        {/* Player 1 */}
        <div className={`fighter p1 ${p1.action.toLowerCase()}`} style={{ left: p1.x }}>
          <div className="hitbox"></div>
          <span className="label">YOU</span>
        </div>

        {/* Player 2 */}
        <div className={`fighter p2 ${p2.action.toLowerCase()}`} style={{ left: p2.x }}>
          <div className="hitbox"></div>
          <span className="label">OPPONENT</span>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="game-controls">
        <button className="btn-action punch" onClick={handlePunch}>👊 PUNCH</button>
        <button className="btn-action block">🛡️ BLOCK</button>
      </div>

      {/* RED TEAM TOOLS TOGGLE */}
      <button className="red-team-toggle" onClick={() => setShowRedTeam(!showRedTeam)}>
        <Skull size={20} /> RED TEAM TOOLS
      </button>

      {/* RED TEAM PANEL */}
      {showRedTeam && (
        <div className="red-team-panel">
          <h3><Skull size={16}/> HACKER CONSOLE</h3>
          
          <div className="tool-row">
            <label>LAG SWITCH (3000ms)</label>
            <button 
              className={`toggle-btn ${lagSwitch ? 'active' : ''}`}
              onClick={() => setLagSwitch(!lagSwitch)}
            >
              {lagSwitch ? 'ACTIVE' : 'INACTIVE'}
            </button>
          </div>

          <div className="tool-row">
            <label>SIMULATE AMSTERDAM (200ms)</label>
            <button 
              className={`toggle-btn ${networkRef.current?.getLatency() === 200 ? 'active' : ''}`}
              onClick={() => {
                if (networkRef.current) {
                  const active = networkRef.current.getLatency() === 200;
                  networkRef.current.setLatency(active ? 0 : 200);
                  networkRef.current.setPacketLoss(active ? 0 : 0.05); // 5% packet loss
                }
              }}
            >
              {networkRef.current?.getLatency() === 200 ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="tool-row">
            <label>AUTO-BLOCK (Memory Hack)</label>
            <button 
              className={`toggle-btn ${autoBlockHack ? 'active' : ''}`}
              onClick={() => setAutoBlockHack(!autoBlockHack)}
            >
              {autoBlockHack ? 'INJECTED' : 'OFF'}
            </button>
          </div>

          <div className="tool-row">
            <label>FORCE DRAW (Desync Exploit)</label>
            <button className="action-btn" onClick={() => setSyncStatus('DESYNC')}>
              TRIGGER
            </button>
          </div>

          <div className="tool-row">
            <label>INSTANT WIN (1-Hit Kill)</label>
            <button className="action-btn" onClick={() => setP2(prev => ({ ...prev, hp: 0 }))}>
              EXECUTE
            </button>
          </div>

          <div className="console-log">
            <p>{`> Frame: ${gameFrame}`}</p>
            <p>{`> P1 Checksum: ${generateChecksum(p1)}`}</p>
            <p>{`> P2 Checksum: ${generateChecksum(p2)}`}</p>
            {syncStatus === 'DESYNC' && <p className="error">{`> CRITICAL: STATE MISMATCH`}</p>}
          </div>
        </div>
      )}

      <button className="back-btn" onClick={onBack}>EXIT ARENA</button>
    </div>
  );
};

export default ShadowFightArena;
