import React from 'react';
import { X, MapPin, Trophy, Gauge, Flag } from 'lucide-react';
import { RouteDefinition, ROUTES } from '../game/routes/RouteManager';

interface RoutesModalProps {
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
  onClose: () => void;
}

export const RoutesModal: React.FC<RoutesModalProps> = ({
  selectedRouteId,
  onSelectRoute,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="racing-glass-card max-w-2xl w-full p-6 rounded-3xl border border-white/20 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            <h2 className="font-racing font-extrabold text-2xl uppercase tracking-wider text-cyan-400">
              Tashkent Street Circuits
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1">
          {ROUTES.map((route) => {
            const isSelected = route.id === selectedRouteId;
            return (
              <div
                key={route.id}
                onClick={() => onSelectRoute(route.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'bg-neutral-900/70 border-white/10 hover:border-white/25'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                      {route.location}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        route.difficulty === 'Easy'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : route.difficulty === 'Medium'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {route.difficulty}
                    </span>
                  </div>

                  <h3 className="font-racing font-bold text-lg text-white mb-1.5">{route.name}</h3>
                  <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed mb-3">
                    {route.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3 text-neutral-400">
                    <span>{route.lengthKm} KM</span>
                    <span>•</span>
                    <span>{route.totalLaps} LAPS</span>
                  </div>

                  <div className="text-amber-400 font-racing font-bold">
                    +{route.rewardUZS.toLocaleString()} UZS
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-racing font-bold text-sm uppercase tracking-wider transition"
          >
            Confirm Route
          </button>
        </div>
      </div>
    </div>
  );
};
