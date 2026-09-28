import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw } from 'lucide-react';

export const OrientationGuard: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 850;
      setIsPortrait(portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortrait || dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/95 flex flex-col items-center justify-center p-6 text-center text-white backdrop-blur-md">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/40 animate-pulse">
          <Smartphone className="w-12 h-12 text-cyan-400 transform rotate-90" />
        </div>
        <RotateCw className="w-7 h-7 text-yellow-400 absolute -top-1 -right-1 animate-spin" />
      </div>

      <h2 className="text-2xl font-black font-racing tracking-wider uppercase mb-2 text-cyan-400">
        Landscape Mode Required
      </h2>

      <p className="text-neutral-300 max-w-sm text-sm mb-6 leading-relaxed">
        For the optimal Tashkent Street Racing experience and responsive driving controls, please rotate your phone horizontally.
      </p>

      <button
        onClick={() => setDismissed(true)}
        className="px-6 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold uppercase tracking-wider border border-neutral-700 transition"
      >
        Continue in widescreen view
      </button>
    </div>
  );
};
