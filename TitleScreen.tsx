/**
 * Full-screen Animated Title Screen with Bespoke Inline SVG and live-world 3D back-drop
 */
import React from 'react';
import { Play, Volume2, VolumeX, Shield, Crosshair, Zap, RotateCcw } from 'lucide-react';
import { soundEngine } from '../game/SoundEngine';

interface TitleScreenProps {
  onStartGame: () => void;
  onOpenStudio?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenStudio,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-between p-6 sm:p-10 pointer-events-auto bg-gradient-to-b from-[#060913]/90 via-[#060913]/40 to-[#060913]/95">
      {/* Top Status & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="font-cyber font-bold text-xs tracking-widest text-sky-400">TACTICAL PROTOCOL</div>
            <div className="text-[11px] text-slate-400 font-mono">GRID 18x10 // OPEN-FIELD A* ENGINE</div>
          </div>
        </div>

        <button
          onClick={() => {
            soundEngine.playClick();
            onToggleMute();
          }}
          className="hud-glass hud-btn p-3 rounded-xl flex items-center gap-2 text-slate-300 hover:text-white"
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          <span className="text-xs font-mono">{isMuted ? 'MUTED' : 'SFX ON'}</span>
        </button>
      </div>

      {/* Hero Centerpiece Lockup with Bespoke SVG */}
      <div className="max-w-2xl mx-auto text-center flex flex-col items-center">
        {/* Bespoke Geometric Emblem */}
        <div className="relative mb-6">
          <svg className="w-24 h-24 sm:w-28 sm:h-28" viewBox="0 0 100 100" fill="none">
            <polygon
              points="50,6 90,28 90,72 50,94 10,72 10,28"
              stroke="#0284c7"
              strokeWidth="2"
              className="animate-spin"
              style={{ transformOrigin: '50% 50%', animationDuration: '24s' }}
            />
            <polygon
              points="50,14 82,32 82,68 50,86 18,68 18,32"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <polygon
              points="50,25 72,38 72,62 50,75 28,62 28,38"
              fill="rgba(56, 189, 248, 0.15)"
              stroke="#22d3ee"
              strokeWidth="2"
            />
            <circle cx="50" cy="50" r="7" fill="#facc15" className="animate-pulse" />
          </svg>
        </div>

        {/* Title Lockup */}
        <h1 className="font-cyber text-4xl sm:text-6xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-200 to-indigo-300 drop-shadow-[0_4px_25px_rgba(56,189,248,0.4)] mb-3">
          NEXUS GRID 3D
        </h1>
        <p className="font-cyber text-xs sm:text-sm text-sky-300/80 tracking-widest uppercase mb-4">
          Tactical Open-Field Tower Defense
        </p>

        <p className="text-slate-300 text-xs sm:text-sm max-w-lg mb-8 leading-relaxed">
          The enemy swarm navigates dynamically via real-time <span className="text-cyan-400 font-semibold font-mono">A* Pathfinding</span>. Construct composite defenses, build intricate mazes, upgrade kinetic turrets, and defend the core.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <div className="hud-glass px-3 py-1.5 rounded-full flex items-center gap-2 text-xs text-slate-300 font-mono">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span>4 Turret Archetypes</span>
          </div>
          <div className="hud-glass px-3 py-1.5 rounded-full flex items-center gap-2 text-xs text-slate-300 font-mono">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>Synthesized Web Audio</span>
          </div>
          <div className="hud-glass px-3 py-1.5 rounded-full flex items-center gap-2 text-xs text-slate-300 font-mono">
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Dynamic Maze Rerouting</span>
          </div>
        </div>

        {/* Primary Start & Studio CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => {
              soundEngine.playClick();
              soundEngine.playWaveStart();
              onStartGame();
            }}
            className="hud-btn group relative px-7 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-400 hover:from-sky-400 hover:via-cyan-300 hover:to-teal-300 text-slate-950 font-cyber font-black text-xs sm:text-sm tracking-widest shadow-[0_0_35px_rgba(56,189,248,0.5)] flex items-center gap-2.5"
          >
            <Play className="w-4 h-4 fill-slate-950 group-hover:scale-110 transition-transform" />
            <span>PLAY 18x10 GAME</span>
          </button>

          {onOpenStudio && (
            <button
              onClick={() => {
                soundEngine.playClick();
                onOpenStudio();
              }}
              className="hud-btn px-6 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-400/50 text-cyan-300 font-cyber font-bold text-xs sm:text-sm tracking-widest flex items-center gap-2 shadow-lg"
            >
              <span>3D ASSET STUDIO</span>
            </button>
          )}
        </div>
      </div>

      {/* Control Hint Line */}
      <div className="text-center">
        <p className="text-[11px] sm:text-xs text-slate-400 font-mono tracking-wider">
          <span className="text-sky-400">CLICK</span> Build/Inspect &bull; <span className="text-sky-400">1..4</span> Turret Select &bull; <span className="text-sky-400">RIGHT-DRAG</span> Orbit Camera &bull; <span className="text-sky-400">SPACE</span> Send Wave &bull; <span className="text-sky-400">ESC</span> Cancel
        </p>
      </div>
    </div>
  );
};
