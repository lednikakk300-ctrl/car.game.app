import React from 'react';
import { Play, Users, Trophy, Car, Map, Settings, Zap, Volume2, Shield } from 'lucide-react';
import { PlayerProfile } from '../game/save/SaveManager';
import { RouteDefinition } from '../game/routes/RouteManager';

interface MainMenuProps {
  profile: PlayerProfile;
  currentRoute: RouteDefinition;
  onPlayQuickRace: () => void;
  onOpenMultiplayer: () => void;
  onOpenSinglePlayer: () => void;
  onOpenGarage: () => void;
  onOpenRoutes: () => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  profile,
  currentRoute,
  onPlayQuickRace,
  onOpenMultiplayer,
  onOpenSinglePlayer,
  onOpenGarage,
  onOpenRoutes,
  onOpenSettings,
}) => {
  const activeCar = profile.cars[profile.selectedCarId] || profile.cars.samara_gt;

  return (
    <div className="absolute inset-0 bg-neutral-950/80 flex flex-col justify-between p-4 md:p-6 select-none z-20 overflow-hidden">
      {/* TOP HEADER */}
      <div className="flex items-center justify-between z-10 w-full">
        {/* Game Title & Tashkent Flag Accent */}
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-10 rounded-full bg-gradient-to-b from-blue-500 via-white to-emerald-500 shadow-lg" />
          <div>
            <h1 className="font-racing font-black text-2xl sm:text-3xl tracking-wider text-white uppercase flex items-center">
              <span>TASHKENT</span>
              <span className="text-cyan-400 ml-2">STREET RACER</span>
              <span className="text-xs ml-2 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                3D
              </span>
            </h1>
            <p className="text-[11px] text-neutral-400 uppercase tracking-widest">
              Uzbekistan Underground City Racing Championship
            </p>
          </div>
        </div>

        {/* Currency & Settings */}
        <div className="flex items-center space-x-3">
          <div className="racing-glass px-4 py-2 rounded-2xl border border-amber-500/30 flex items-center space-x-2 shadow-lg">
            <span className="text-amber-400 text-lg">💰</span>
            <div className="font-racing font-bold text-base sm:text-lg text-amber-300">
              {profile.credits.toLocaleString()} <span className="text-xs text-neutral-400">UZS</span>
            </div>
          </div>

          <button
            onClick={onOpenSettings}
            className="w-11 h-11 rounded-2xl racing-glass flex items-center justify-center text-neutral-300 hover:text-white active:scale-95 transition border border-white/10 shadow-lg"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* CENTER / MAIN ACTION AREA */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 my-auto z-10 max-w-6xl mx-auto w-full">
        {/* Left Side: Navigation Menu Buttons */}
        <div className="flex flex-col space-y-2.5 w-full md:w-80">
          {/* PLAY (Instant Action) */}
          <button
            onClick={onPlayQuickRace}
            className="group w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-neutral-950 font-racing font-black text-xl uppercase tracking-wider flex items-center justify-between shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-98 transition"
          >
            <span className="flex items-center space-x-3">
              <Play className="w-6 h-6 fill-current" />
              <span>PLAY QUICK RACE</span>
            </span>
            <span className="text-xs font-bold text-neutral-900 group-hover:translate-x-1 transition">▶</span>
          </button>

          {/* MULTIPLAYER */}
          <button
            onClick={onOpenMultiplayer}
            className="w-full py-3.5 px-6 rounded-2xl racing-glass hover:bg-neutral-800/90 text-white font-racing font-bold text-base uppercase tracking-wider flex items-center justify-between border border-cyan-500/30 hover:border-cyan-400/60 active:scale-98 transition shadow-lg"
          >
            <span className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>MULTIPLAYER (WI-FI)</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
              LOCAL P2P
            </span>
          </button>

          {/* SINGLE PLAYER */}
          <button
            onClick={onOpenSinglePlayer}
            className="w-full py-3.5 px-6 rounded-2xl racing-glass hover:bg-neutral-800/90 text-white font-racing font-bold text-base uppercase tracking-wider flex items-center justify-between border border-white/10 hover:border-white/20 active:scale-98 transition shadow-lg"
          >
            <span className="flex items-center space-x-3">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>SINGLE PLAYER (AI RACE)</span>
            </span>
            <span className="text-[10px] text-neutral-400">CAREER</span>
          </button>

          {/* GARAGE */}
          <button
            onClick={onOpenGarage}
            className="w-full py-3.5 px-6 rounded-2xl racing-glass hover:bg-neutral-800/90 text-white font-racing font-bold text-base uppercase tracking-wider flex items-center justify-between border border-white/10 hover:border-white/20 active:scale-98 transition shadow-lg"
          >
            <span className="flex items-center space-x-3">
              <Car className="w-5 h-5 text-cyan-400" />
              <span>GARAGE & TUNING</span>
            </span>
            <span className="text-[10px] text-neutral-400">5 CARS</span>
          </button>

          {/* ROUTES */}
          <button
            onClick={onOpenRoutes}
            className="w-full py-3.5 px-6 rounded-2xl racing-glass hover:bg-neutral-800/90 text-white font-racing font-bold text-base uppercase tracking-wider flex items-center justify-between border border-white/10 hover:border-white/20 active:scale-98 transition shadow-lg"
          >
            <span className="flex items-center space-x-3">
              <Map className="w-5 h-5 text-blue-400" />
              <span>ROUTES (TASHKENT)</span>
            </span>
            <span className="text-[10px] text-neutral-400">4 TRACKS</span>
          </button>

          {/* SETTINGS */}
          <button
            onClick={onOpenSettings}
            className="w-full py-3 px-6 rounded-2xl racing-glass hover:bg-neutral-800/90 text-neutral-300 font-racing font-semibold text-sm uppercase tracking-wider flex items-center justify-between border border-white/10 hover:border-white/20 active:scale-98 transition"
          >
            <span className="flex items-center space-x-3">
              <Settings className="w-4 h-4 text-neutral-400" />
              <span>SETTINGS</span>
            </span>
            <span className="text-[10px] text-neutral-500">GRAPHICS / AUDIO</span>
          </button>
        </div>

        {/* Right Side: Active Car Spotlight Card */}
        <div className="w-full md:w-96 racing-glass-card p-5 rounded-3xl border border-white/15 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                ACTIVE RIDE
              </span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                {activeCar.category}
              </span>
            </div>

            <h3 className="font-racing font-black text-2xl text-white mb-1">{activeCar.name}</h3>
            <p className="text-xs text-neutral-300 mb-4 line-clamp-2">{activeCar.description}</p>

            {/* Performance Stats */}
            <div className="space-y-2 text-xs mb-4">
              <div>
                <div className="flex justify-between text-neutral-400 mb-0.5">
                  <span>Top Speed</span>
                  <span className="font-racing font-bold text-white">{activeCar.stats.topSpeed} KM/H</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 rounded-full"
                    style={{ width: `${(activeCar.stats.topSpeed / 340) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-neutral-400 mb-0.5">
                  <span>Acceleration</span>
                  <span className="font-racing font-bold text-white">{activeCar.stats.acceleration * 10}%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full"
                    style={{ width: `${activeCar.stats.acceleration * 10}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Current track indicator */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <div>
              <div className="text-[9px] uppercase font-bold text-neutral-400">Selected Route</div>
              <div className="font-racing font-bold text-sm text-cyan-300">{currentRoute.name}</div>
            </div>
            <button
              onClick={onOpenRoutes}
              className="text-xs font-semibold text-cyan-400 hover:underline"
            >
              Change
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM FOOTER */}
      <div className="flex items-center justify-between text-[11px] text-neutral-500 z-10">
        <div>Keyboard: W/A/S/D or Arrows • Space = Drift • Shift = Nitro • C = Camera • H = Horn</div>
        <div className="text-neutral-400 font-bold">Tashkent City 3D Engine • 60 FPS Optimized</div>
      </div>
    </div>
  );
};
