import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Clock, Zap, ArrowRight, RotateCcw, Home } from 'lucide-react';
import { RouteDefinition } from '../game/routes/RouteManager';
import { SoundManager } from '../game/audio/SoundManager';

interface PostRaceModalProps {
  rank: number;
  totalRacers: number;
  route: RouteDefinition;
  totalTimeSec: number;
  bestLapSec: number | null;
  earningsUZS: number;
  onRestart: () => void;
  onGarage: () => void;
  onMainMenu: () => void;
}

export const PostRaceModal: React.FC<PostRaceModalProps> = ({
  rank,
  totalRacers,
  route,
  totalTimeSec,
  bestLapSec,
  earningsUZS,
  onRestart,
  onGarage,
  onMainMenu,
}) => {
  useEffect(() => {
    SoundManager.playFinishVictory();
    if (rank <= 3) {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
      });
    }
  }, [rank]);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${mins}:${s < 10 ? '0' : ''}${s}.${ms < 10 ? '0' : ''}${ms}`;
  };

  const getRankBadge = () => {
    if (rank === 1) {
      return {
        title: 'VICTORY! 1ST PLACE',
        color: 'text-amber-400',
        bg: 'from-amber-500/20 to-yellow-500/10 border-amber-400',
        icon: '🏆',
      };
    }
    if (rank === 2) {
      return {
        title: '2ND PLACE PODIUM',
        color: 'text-slate-300',
        bg: 'from-slate-400/20 to-slate-600/10 border-slate-300',
        icon: '🥈',
      };
    }
    if (rank === 3) {
      return {
        title: '3RD PLACE PODIUM',
        color: 'text-amber-600',
        bg: 'from-amber-700/20 to-amber-900/10 border-amber-600',
        icon: '🥉',
      };
    }
    return {
      title: `${rank}TH PLACE FINISH`,
      color: 'text-neutral-400',
      bg: 'from-neutral-800 to-neutral-900 border-neutral-700',
      icon: '🏁',
    };
  };

  const badge = getRankBadge();

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-lg flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="racing-glass-card max-w-lg w-full p-6 sm:p-8 rounded-3xl border border-white/20 shadow-2xl text-center">
        {/* Podium Icon */}
        <div className="text-5xl sm:text-6xl mb-2 animate-bounce">{badge.icon}</div>

        <h2 className={`font-racing font-black text-3xl sm:text-4xl tracking-wider uppercase mb-1 ${badge.color}`}>
          {badge.title}
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 mb-6">{route.name} • {route.location}</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-neutral-900/80 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Total Time</span>
            <span className="font-racing font-bold text-base sm:text-lg text-white">{formatTime(totalTimeSec)}</span>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-900/80 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Best Lap</span>
            <span className="font-racing font-bold text-base sm:text-lg text-cyan-400">
              {bestLapSec ? formatTime(bestLapSec) : '--:--'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-900/80 border border-amber-500/30">
            <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1">Prize Won</span>
            <span className="font-racing font-bold text-base sm:text-lg text-amber-300">
              +{earningsUZS.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onRestart}
            className="w-full sm:flex-1 py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-racing font-black text-sm uppercase tracking-wider active:scale-98 transition flex items-center justify-center space-x-2 shadow-lg"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Race Again</span>
          </button>

          <button
            onClick={onGarage}
            className="w-full sm:flex-1 py-3.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-racing font-bold text-sm uppercase tracking-wider border border-white/15 active:scale-98 transition flex items-center justify-center space-x-2"
          >
            <span>Garage</span>
          </button>

          <button
            onClick={onMainMenu}
            className="w-full sm:w-12 py-3.5 sm:py-0 h-12 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center border border-white/10 transition"
            title="Main Menu"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
