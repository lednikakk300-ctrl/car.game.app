import React, { useState, useEffect } from 'react';
import { ArrowLeft, Wifi, Users, Play, Copy, Check, Car, Flag, ShieldCheck } from 'lucide-react';
import { MultiplayerManager, NetworkPlayer } from '../game/networking/MultiplayerManager';
import { PlayerProfile } from '../game/save/SaveManager';
import { ROUTES } from '../game/routes/RouteManager';

interface MultiplayerLobbyProps {
  profile: PlayerProfile;
  multiplayer: MultiplayerManager;
  onStartMultiplayerRace: (routeId: string) => void;
  onBack: () => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  profile,
  multiplayer,
  onStartMultiplayerRace,
  onBack,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [inRoom, setInRoom] = useState(!!multiplayer.currentRoomCode);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [roomCode, setRoomCode] = useState(multiplayer.currentRoomCode || '');
  const [isHost, setIsHost] = useState(multiplayer.isHost);
  const [players, setPlayers] = useState<NetworkPlayer[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState(multiplayer.selectedRouteId);
  const [copied, setCopied] = useState(false);
  const [isReady, setIsReady] = useState(true);

  // Listen to network changes
  useEffect(() => {
    const updatePlayersList = () => {
      setPlayers(Array.from(multiplayer.connectedPlayers.values()));
      setIsHost(multiplayer.isHost);
      setRoomCode(multiplayer.currentRoomCode || '');
      setSelectedRouteId(multiplayer.selectedRouteId);
    };

    multiplayer.onMessage(() => {
      updatePlayersList();
    });

    multiplayer.onRaceStart((routeId) => {
      onStartMultiplayerRace(routeId);
    });

    updatePlayersList();
  }, [multiplayer, onStartMultiplayerRace]);

  const handleCreateRoom = () => {
    const generatedCode = 'TSH-' + Math.floor(1000 + Math.random() * 9000);
    const activeCar = profile.cars[profile.selectedCarId];
    multiplayer.createRoom(generatedCode, activeCar.id, activeCar.color, selectedRouteId);
    setRoomCode(generatedCode);
    setInRoom(true);
    setIsHost(true);
    setPlayers(Array.from(multiplayer.connectedPlayers.values()));
  };

  const handleJoinRoom = () => {
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) return;
    const activeCar = profile.cars[profile.selectedCarId];
    multiplayer.joinRoom(code, activeCar.id, activeCar.color);
    setRoomCode(code);
    setInRoom(true);
    setIsHost(false);
    setPlayers(Array.from(multiplayer.connectedPlayers.values()));
  };

  const handleLeaveRoom = () => {
    multiplayer.leaveRoom();
    setInRoom(false);
  };

  const handleToggleReady = () => {
    const next = !isReady;
    setIsReady(next);
    const activeCar = profile.cars[profile.selectedCarId];
    multiplayer.updateLocalPlayer(activeCar.id, activeCar.color, next);
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartRace = () => {
    if (!isHost) return;
    multiplayer.startRace();
    onStartMultiplayerRace(selectedRouteId);
  };

  const activeCar = profile.cars[profile.selectedCarId];

  return (
    <div className="absolute inset-0 bg-neutral-950 flex flex-col justify-between p-4 md:p-6 overflow-hidden select-none z-30">
      {/* HEADER */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <button
            onClick={inRoom ? handleLeaveRoom : onBack}
            className="w-11 h-11 rounded-2xl racing-glass flex items-center justify-center text-white/90 hover:text-white active:scale-95 transition border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-racing font-extrabold text-2xl uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
              <Wifi className="w-6 h-6 text-emerald-400" />
              <span>Wi-Fi Multiplayer Lobby</span>
            </h1>
            <p className="text-xs text-neutral-400">Race with friends on the same local Wi-Fi network</p>
          </div>
        </div>

        {/* Current Car Badge */}
        <div className="racing-glass px-4 py-2 rounded-2xl border border-white/10 flex items-center space-x-3">
          <Car className="w-5 h-5 text-cyan-400" />
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-neutral-400">Current Car</div>
            <div className="font-racing font-bold text-sm text-white">{activeCar.name}</div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      {!inRoom ? (
        /* CREATE OR JOIN TABS */
        <div className="max-w-xl mx-auto w-full my-auto z-10">
          <div className="racing-glass-card p-6 rounded-3xl border border-white/15 shadow-2xl">
            {/* Tab switchers */}
            <div className="flex p-1 bg-neutral-900 rounded-2xl mb-6">
              <button
                onClick={() => setTab('create')}
                className={`flex-1 py-2.5 rounded-xl font-racing font-bold text-sm uppercase tracking-wider transition ${
                  tab === 'create' ? 'bg-cyan-500 text-neutral-950 shadow-md' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Create Room
              </button>
              <button
                onClick={() => setTab('join')}
                className={`flex-1 py-2.5 rounded-xl font-racing font-bold text-sm uppercase tracking-wider transition ${
                  tab === 'join' ? 'bg-cyan-500 text-neutral-950 shadow-md' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Join Room
              </button>
            </div>

            {tab === 'create' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block mb-2">
                    Select Race Route
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROUTES.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRouteId(r.id)}
                        className={`p-3 rounded-2xl border text-left transition ${
                          selectedRouteId === r.id
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                            : 'bg-neutral-900/60 border-white/10 text-neutral-400 hover:border-white/20'
                        }`}
                      >
                        <div className="font-racing font-bold text-sm text-white">{r.name}</div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">{r.location} • {r.lengthKm} km</div>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCreateRoom}
                  className="w-full py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-racing font-black text-lg uppercase tracking-wider shadow-lg active:scale-98 transition flex items-center justify-center space-x-2"
                >
                  <Wifi className="w-5 h-5" />
                  <span>Host Wi-Fi Race</span>
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block mb-2">
                    Enter Wi-Fi Room Code
                  </label>
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. TSH-7788"
                    className="w-full px-4 py-3.5 rounded-2xl bg-neutral-900 border border-white/20 text-center font-racing font-bold text-2xl tracking-widest text-cyan-400 uppercase placeholder-neutral-600 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <button
                  onClick={handleJoinRoom}
                  disabled={!joinCodeInput.trim()}
                  className="w-full py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-racing font-black text-lg uppercase tracking-wider shadow-lg active:scale-98 transition disabled:opacity-40"
                >
                  Join Race Room
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* INSIDE ROOM LOBBY */
        <div className="max-w-3xl mx-auto w-full my-auto z-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Room info & code */}
          <div className="racing-glass-card p-5 rounded-3xl border border-white/10 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
                Room Access Code
              </span>
              <div className="flex items-center space-x-2">
                <div className="font-racing font-black text-3xl text-white tracking-widest">{roomCode}</div>
                <button
                  onClick={handleCopyCode}
                  className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
                  title="Copy Code"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-neutral-400 mt-2 leading-relaxed">
                Other players on the same Wi-Fi can enter this code in the Multiplayer menu to join this room.
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="text-[10px] uppercase font-bold text-neutral-400 mb-1">Selected Circuit</div>
              <div className="font-racing font-bold text-base text-cyan-300">
                {ROUTES.find((r) => r.id === selectedRouteId)?.name}
              </div>
            </div>
          </div>

          {/* Players in Room */}
          <div className="md:col-span-2 racing-glass-card p-5 rounded-3xl border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center space-x-1.5">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Racers in Room ({players.length}/6)</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>Wi-Fi Sync Active</span>
                </span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {players.map((p) => {
                  const carCfg = profile.cars[p.carId] || profile.cars.samara_gt;
                  return (
                    <div
                      key={p.id}
                      className="p-3 rounded-2xl bg-neutral-900/80 border border-white/10 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-white/50"
                          style={{ backgroundColor: p.carColor }}
                        />
                        <div>
                          <div className="font-racing font-bold text-sm text-white flex items-center space-x-2">
                            <span>{p.name}</span>
                            {p.isHost && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                HOST
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-neutral-400">{carCfg.name}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-neutral-500">{p.ping}ms</span>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            p.isReady ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {p.isReady ? 'Ready' : 'Waiting'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-3 mt-4 pt-3 border-t border-white/10">
              {!isHost && (
                <button
                  onClick={handleToggleReady}
                  className={`flex-1 py-3.5 rounded-2xl font-racing font-bold text-sm uppercase tracking-wider transition ${
                    isReady ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400'
                  }`}
                >
                  {isReady ? 'Cancel Ready' : 'Ready Up!'}
                </button>
              )}

              {isHost ? (
                <button
                  onClick={handleStartRace}
                  className="flex-1 py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-racing font-black text-base uppercase tracking-wider shadow-lg active:scale-98 transition flex items-center justify-center space-x-2"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Wi-Fi Race</span>
                </button>
              ) : (
                <div className="text-center text-xs text-neutral-400 italic">Waiting for host to launch the race...</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FOOTER HINT */}
      <div className="text-center text-[11px] text-neutral-500 z-10">
        Connected to local Tashkent Wi-Fi Network relay • Low latency P2P mesh architecture
      </div>
    </div>
  );
};
