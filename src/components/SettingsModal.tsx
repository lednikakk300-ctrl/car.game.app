import React from 'react';
import { X, Volume2, Music, Sun, CloudRain, Smartphone, Zap } from 'lucide-react';
import { PlayerProfile, SaveManager } from '../game/save/SaveManager';
import { SoundManager } from '../game/audio/SoundManager';

interface SettingsModalProps {
  profile: PlayerProfile;
  onUpdateProfile: (newProfile: PlayerProfile) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ profile, onUpdateProfile, onClose }) => {
  const settings = profile.settings;

  const updateSetting = <K extends keyof PlayerProfile['settings']>(key: K, val: PlayerProfile['settings'][K]) => {
    const updated = {
      ...profile,
      settings: {
        ...profile.settings,
        [key]: val,
      },
    };
    SaveManager.saveProfile(updated);
    onUpdateProfile(updated);

    if (key === 'soundVolume' || key === 'musicVolume') {
      SoundManager.setVolumes(updated.settings.soundVolume, updated.settings.musicVolume);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="racing-glass-card max-w-lg w-full p-6 rounded-3xl border border-white/20 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h2 className="font-racing font-extrabold text-2xl uppercase tracking-wider text-cyan-400">
            Game Settings
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Audio Sliders */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-neutral-300 uppercase mb-1">
                <span className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <span>Engine & SFX Volume</span>
                </span>
                <span className="text-cyan-400 font-racing">{Math.round(settings.soundVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.soundVolume}
                onChange={(e) => updateSetting('soundVolume', parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-bold text-neutral-300 uppercase mb-1">
                <span className="flex items-center space-x-2">
                  <Music className="w-4 h-4 text-amber-400" />
                  <span>Racing Synth Music</span>
                </span>
                <span className="text-amber-400 font-racing">{Math.round(settings.musicVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.musicVolume}
                onChange={(e) => updateSetting('musicVolume', parseFloat(e.target.value))}
                className="w-full accent-amber-400"
              />
            </div>
          </div>

          {/* Time of Day */}
          <div>
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block mb-2 flex items-center space-x-2">
              <Sun className="w-4 h-4 text-yellow-400" />
              <span>Time of Day (Tashkent Lighting)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateSetting('timeOfDay', 'day')}
                className={`py-2 rounded-xl text-xs font-bold uppercase transition ${
                  settings.timeOfDay === 'day'
                    ? 'bg-amber-500 text-neutral-950 shadow-md'
                    : 'bg-neutral-900 text-neutral-400 border border-white/10 hover:border-white/20'
                }`}
              >
                ☀️ Day (Sunny)
              </button>
              <button
                onClick={() => updateSetting('timeOfDay', 'night')}
                className={`py-2 rounded-xl text-xs font-bold uppercase transition ${
                  settings.timeOfDay === 'night'
                    ? 'bg-cyan-500 text-neutral-950 shadow-md'
                    : 'bg-neutral-900 text-neutral-400 border border-white/10 hover:border-white/20'
                }`}
              >
                🌙 Night (City Lights)
              </button>
            </div>
          </div>

          {/* Weather Effects */}
          <div>
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block mb-2 flex items-center space-x-2">
              <CloudRain className="w-4 h-4 text-blue-400" />
              <span>Weather Conditions</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateSetting('weather', 'clear')}
                className={`py-2 rounded-xl text-xs font-bold uppercase transition ${
                  settings.weather === 'clear'
                    ? 'bg-emerald-500 text-neutral-950 shadow-md'
                    : 'bg-neutral-900 text-neutral-400 border border-white/10 hover:border-white/20'
                }`}
              >
                Dry Road (Crisp Grip)
              </button>
              <button
                onClick={() => updateSetting('weather', 'rain')}
                className={`py-2 rounded-xl text-xs font-bold uppercase transition ${
                  settings.weather === 'rain'
                    ? 'bg-blue-500 text-neutral-950 shadow-md'
                    : 'bg-neutral-900 text-neutral-400 border border-white/10 hover:border-white/20'
                }`}
              >
                Wet Rain (Drift Mode)
              </button>
            </div>
          </div>

          {/* Graphics Quality */}
          <div>
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block mb-2 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <span>Graphics & Shadows Performance</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['high', 'medium', 'low'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => updateSetting('graphicsQuality', q)}
                  className={`py-2 rounded-xl text-xs font-bold uppercase transition ${
                    settings.graphicsQuality === q
                      ? 'bg-purple-500 text-white shadow-md'
                      : 'bg-neutral-900 text-neutral-400 border border-white/10 hover:border-white/20'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-racing font-extrabold uppercase tracking-wider transition"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
