import React, { useRef, useEffect } from 'react';
import { Camera, Pause, Volume2, VolumeX, Lightbulb, AlertTriangle, Disc } from 'lucide-react';
import { VehicleState } from '../game/physics/VehiclePhysics';
import { PlayerRaceProgress, RouteDefinition } from '../game/routes/RouteManager';

interface RaceHUDProps {
  vehicleState: VehicleState;
  raceProgress: PlayerRaceProgress;
  route: RouteDefinition;
  rivals: { id: string; x: number; z: number; heading: number; isPlayer?: boolean }[];
  positionRank: number;
  totalRacers: number;
  cameraMode: 'chase' | 'cockpit' | 'hood';
  controlsType: 'buttons' | 'wheel';
  headlightsOn: boolean;
  onCameraToggle: () => void;
  onPause: () => void;
  onHorn: () => void;
  onHeadlightsToggle: () => void;
  onControlInput: (type: 'throttle' | 'brake' | 'steer' | 'nitro' | 'handbrake', value: number | boolean) => void;
}

export const RaceHUD: React.FC<RaceHUDProps> = ({
  vehicleState,
  raceProgress,
  route,
  rivals,
  positionRank,
  totalRacers,
  cameraMode,
  controlsType,
  headlightsOn,
  onCameraToggle,
  onPause,
  onHorn,
  onHeadlightsToggle,
  onControlInput,
}) => {
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Draw 2D Minimap
  useEffect(() => {
    const canvas = minimapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Track bounds
    const wps = route.waypoints;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    wps.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    });

    const padding = 16;
    const rangeX = (maxX - minX) || 1;
    const rangeZ = (maxZ - minZ) || 1;

    const toMapX = (wx: number) => padding + ((wx - minX) / rangeX) * (width - padding * 2);
    const toMapY = (wz: number) => padding + ((wz - minZ) / rangeZ) * (height - padding * 2);

    // Draw route track spline
    ctx.beginPath();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    wps.forEach((pt, i) => {
      const mx = toMapX(pt.x);
      const my = toMapY(pt.z);
      if (i === 0) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    });
    ctx.closePath();
    ctx.stroke();

    // Inner glowing track line
    ctx.beginPath();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    wps.forEach((pt, i) => {
      const mx = toMapX(pt.x);
      const my = toMapY(pt.z);
      if (i === 0) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    });
    ctx.closePath();
    ctx.stroke();

    // Checkpoint markers
    wps.forEach((pt, i) => {
      const mx = toMapX(pt.x);
      const my = toMapY(pt.z);
      ctx.beginPath();
      ctx.arc(mx, my, i === 0 ? 4 : 2, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#eab308' : (i === raceProgress.currentCheckpointIndex ? '#22c55e' : '#64748b');
      ctx.fill();
    });

    // Draw rivals / AI blips
    rivals.forEach((r) => {
      const rx = toMapX(r.x);
      const ry = toMapY(r.z);
      ctx.beginPath();
      ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = r.isPlayer ? '#38bdf8' : '#ef4444';
      ctx.fill();
    });

    // Draw Player blip with heading cone
    const px = toMapX(vehicleState.position.x);
    const py = toMapY(vehicleState.position.z);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(vehicleState.rotation.y);

    // Arrow triangle
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fillStyle = '#06b6d4';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }, [vehicleState.position, vehicleState.rotation.y, raceProgress.currentCheckpointIndex, rivals, route]);

  const speed = vehicleState.speedKmh;
  const rpmRatio = Math.min(1, Math.max(0, (vehicleState.rpm - 1000) / 6500));
  const gearDisplay = vehicleState.gear === 0 ? 'N' : (vehicleState.speedKmh < 0 ? 'R' : vehicleState.gear.toString());

  // Rank suffix
  const getRankSuffix = (rank: number) => {
    if (rank === 1) return 'ST';
    if (rank === 2) return 'ND';
    if (rank === 3) return 'RD';
    return 'TH';
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-3 md:p-4 overflow-hidden z-20">
      {/* TOP BAR: Pause, Minimap, Position, Laps, Camera Toggle */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Pause & Quick Stats */}
        <div className="flex items-center space-x-3 pointer-events-auto">
          <button
            onClick={onPause}
            className="w-11 h-11 rounded-2xl racing-glass flex items-center justify-center text-white/90 hover:text-white active:scale-95 transition border border-white/20 shadow-lg"
          >
            <Pause className="w-5 h-5 fill-current" />
          </button>

          <div className="racing-glass px-4 py-2 rounded-2xl flex items-center space-x-4">
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Position</div>
              <div className="flex items-baseline font-racing font-extrabold text-2xl text-amber-400">
                <span>{positionRank}</span>
                <span className="text-xs ml-0.5">{getRankSuffix(positionRank)}</span>
                <span className="text-xs text-neutral-400 ml-1">/ {totalRacers}</span>
              </div>
            </div>

            <div className="h-7 w-[1px] bg-white/10" />

            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Lap</div>
              <div className="font-racing font-bold text-xl text-cyan-400">
                {raceProgress.currentLap} <span className="text-xs text-neutral-400">/ {raceProgress.totalLaps}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Center: Rearview mirror preview & wrong way indicator */}
        <div className="flex flex-col items-center">
          {raceProgress.isWrongWay && (
            <div className="bg-red-600/90 text-white font-racing font-extrabold px-5 py-1.5 rounded-full text-sm uppercase tracking-widest animate-bounce shadow-lg flex items-center space-x-2 border border-red-300">
              <AlertTriangle className="w-4 h-4" />
              <span>WRONG WAY!</span>
            </div>
          )}

          {/* Central Route Banner */}
          <div className="hidden sm:flex items-center space-x-2 bg-neutral-900/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">{route.name}</span>
          </div>
        </div>

        {/* Top-Right: Camera, Lighting, Minimap */}
        <div className="flex items-start space-x-3 pointer-events-auto">
          <div className="flex flex-col space-y-2">
            <button
              onClick={onCameraToggle}
              className="w-10 h-10 rounded-xl racing-glass flex items-center justify-center text-white/80 hover:text-white active:scale-95 transition"
              title={`Camera: ${cameraMode}`}
            >
              <Camera className="w-5 h-5" />
            </button>

            <button
              onClick={onHeadlightsToggle}
              className={`w-10 h-10 rounded-xl racing-glass flex items-center justify-center transition ${
                headlightsOn ? 'text-amber-300 border-amber-400/50' : 'text-neutral-400'
              }`}
              title="Toggle Headlights"
            >
              <Lightbulb className="w-5 h-5" />
            </button>
          </div>

          {/* Minimap radar */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl racing-glass p-1 border border-cyan-500/30 overflow-hidden shadow-xl">
            <canvas ref={minimapCanvasRef} width={128} height={128} className="w-full h-full rounded-xl" />
            <div className="absolute bottom-1 right-2 text-[8px] font-bold text-cyan-400/70 uppercase">Tashkent GPS</div>
          </div>
        </div>
      </div>

      {/* CENTER NOTIFICATIONS (Nitro / Drift indicators) */}
      <div className="flex flex-col items-center justify-center pointer-events-none">
        {vehicleState.isDrifting && (
          <div className="font-racing font-black text-2xl md:text-3xl text-yellow-400 tracking-wider animate-pulse drop-shadow-[0_0_12px_rgba(250,204,21,0.7)]">
            DRIFT +{Math.round(vehicleState.driftSlip * 150)} PTS
          </div>
        )}
        {vehicleState.isNitroActive && (
          <div className="font-racing font-black text-2xl md:text-3xl text-cyan-400 tracking-widest animate-pulse drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]">
            NITRO BOOST!
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS & SPEEDOMETER DASHBOARD */}
      <div className="flex items-end justify-between w-full pointer-events-auto">
        {/* BOTTOM-LEFT: Steering Controls (Arrows or Steering Wheel) */}
        <div className="flex items-center space-x-3 mb-1">
          <button
            onPointerDown={() => onControlInput('steer', -1)}
            onPointerUp={() => onControlInput('steer', 0)}
            onPointerLeave={() => onControlInput('steer', 0)}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl racing-glass flex flex-col items-center justify-center active:bg-cyan-500/30 border border-white/20 active:scale-95 transition touch-none shadow-lg"
          >
            <span className="text-3xl text-cyan-400 font-black">◀</span>
            <span className="text-[9px] uppercase font-bold text-neutral-400 mt-0.5">STEER</span>
          </button>

          <button
            onPointerDown={() => onControlInput('steer', 1)}
            onPointerUp={() => onControlInput('steer', 0)}
            onPointerLeave={() => onControlInput('steer', 0)}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl racing-glass flex flex-col items-center justify-center active:bg-cyan-500/30 border border-white/20 active:scale-95 transition touch-none shadow-lg"
          >
            <span className="text-3xl text-cyan-400 font-black">▶</span>
            <span className="text-[9px] uppercase font-bold text-neutral-400 mt-0.5">STEER</span>
          </button>

          <button
            onClick={onHorn}
            className="w-11 h-11 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 flex items-center justify-center text-yellow-400 active:scale-90 border border-white/10"
            title="Honk Car Horn"
          >
            <Disc className="w-5 h-5" />
          </button>
        </div>

        {/* BOTTOM-CENTER: SPEEDOMETER, GEAR, RPM & NITRO BAR */}
        <div className="flex flex-col items-center">
          {/* Nitro gauge bar */}
          <div className="w-48 sm:w-60 mb-2">
            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-cyan-300 px-1 mb-0.5">
              <span>NOS Nitro</span>
              <span>{vehicleState.nitroRemaining}%</span>
            </div>
            <div className="w-full h-3 bg-neutral-900/80 rounded-full overflow-hidden p-0.5 border border-cyan-500/30">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  vehicleState.isNitroActive
                    ? 'bg-gradient-to-r from-cyan-400 via-sky-300 to-white shadow-[0_0_12px_#38bdf8]'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-400'
                }`}
                style={{ width: `${vehicleState.nitroRemaining}%` }}
              />
            </div>
          </div>

          {/* Speed & Gear cluster card */}
          <div className="racing-glass px-6 py-2 rounded-2xl border border-white/20 flex items-center space-x-5 shadow-2xl">
            {/* Gear badge */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">GEAR</span>
              <span className="font-racing font-black text-3xl text-amber-400 leading-none">{gearDisplay}</span>
            </div>

            <div className="h-10 w-[1px] bg-white/15" />

            {/* Speed readout */}
            <div className="flex flex-col items-center">
              <div className="flex items-baseline">
                <span className="font-racing font-black text-4xl sm:text-5xl tracking-tight text-white leading-none">
                  {speed}
                </span>
                <span className="font-racing font-bold text-xs sm:text-sm text-cyan-400 ml-1.5">KM/H</span>
              </div>
              {/* Mini RPM bar */}
              <div className="w-24 sm:w-32 h-1.5 bg-neutral-800 rounded-full mt-1 overflow-hidden">
                <div
                  className={`h-full rounded-full ${rpmRatio > 0.85 ? 'bg-red-500' : 'bg-emerald-400'}`}
                  style={{ width: `${rpmRatio * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM-RIGHT: Gas, Brake, Drift/Handbrake, Nitro pedals */}
        <div className="flex items-center space-x-3 mb-1">
          {/* Handbrake / Drift */}
          <button
            onPointerDown={() => onControlInput('handbrake', true)}
            onPointerUp={() => onControlInput('handbrake', false)}
            onPointerLeave={() => onControlInput('handbrake', false)}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-600/30 active:bg-amber-600/60 border border-amber-500/40 flex flex-col items-center justify-center active:scale-95 transition touch-none"
          >
            <span className="text-xl">⚡</span>
            <span className="text-[9px] font-black uppercase text-amber-400 mt-0.5">DRIFT</span>
          </button>

          {/* Nitro Boost Button */}
          <button
            onPointerDown={() => onControlInput('nitro', true)}
            onPointerUp={() => onControlInput('nitro', false)}
            onPointerLeave={() => onControlInput('nitro', false)}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border flex flex-col items-center justify-center active:scale-95 transition touch-none ${
              vehicleState.nitroRemaining > 5
                ? 'bg-cyan-600/40 active:bg-cyan-500 border-cyan-400/60 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-neutral-800/40 border-neutral-700 text-neutral-500 opacity-60'
            }`}
          >
            <span className="text-xl">🔥</span>
            <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">NOS</span>
          </button>

          {/* Foot Brake / Reverse */}
          <button
            onPointerDown={() => onControlInput('brake', 1)}
            onPointerUp={() => onControlInput('brake', 0)}
            onPointerLeave={() => onControlInput('brake', 0)}
            className="w-16 h-18 sm:w-18 sm:h-20 rounded-2xl bg-red-600/30 active:bg-red-600/70 border border-red-500/40 flex flex-col items-center justify-center active:scale-95 transition touch-none"
          >
            <span className="text-2xl font-black text-red-400">■</span>
            <span className="text-[10px] font-black uppercase text-red-300 mt-0.5">BRAKE</span>
          </button>

          {/* Gas Accelerator Pedal */}
          <button
            onPointerDown={() => onControlInput('throttle', 1)}
            onPointerUp={() => onControlInput('throttle', 0)}
            onPointerLeave={() => onControlInput('throttle', 0)}
            className="w-18 h-22 sm:w-20 sm:h-24 rounded-2xl bg-gradient-to-t from-emerald-700/60 to-emerald-500/60 active:from-emerald-600 active:to-emerald-400 border border-emerald-400/50 flex flex-col items-center justify-center active:scale-95 transition touch-none shadow-xl"
          >
            <span className="text-3xl font-black text-white">▲</span>
            <span className="text-[11px] font-black uppercase text-emerald-200 tracking-wider mt-1">GAS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
