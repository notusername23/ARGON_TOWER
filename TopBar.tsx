/**
 * Top Status Bar & Quick Actions
 */
import React from 'react';
import {
  Coins,
  Heart,
  Activity,
  Trophy,
  Play,
  RotateCw,
  Video,
  Volume2,
  VolumeX,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { soundEngine } from '../game/SoundEngine';

interface TopBarProps {
  appMode: 'game' | 'studio';
  credits: number;
  lives: number;
  maxLives: number;
  wave: number;
  waveActive: boolean;
  score: number;
  gameSpeed: number;
  autoWave: boolean;
  camModeName: string;
  isMuted: boolean;
  activeBossName?: string | null;
  activeHazardCount?: number;
  onSwitchMode: (mode: 'game' | 'studio') => void;
  onSendWave: () => void;
  onToggleAutoWave: () => void;
  onToggleSpeed: () => void;
  onCycleCamera: () => void;
  onToggleMute: () => void;
  onResetGame: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  appMode,
  credits,
  lives,
  maxLives,
  wave,
  waveActive,
  score,
  gameSpeed,
  autoWave,
  camModeName,
  isMuted,
  activeBossName,
  activeHazardCount = 0,
  onSwitchMode,
  onSendWave,
  onToggleAutoWave,
  onToggleSpeed,
  onCycleCamera,
  onToggleMute,
  onResetGame,
}) => {
  return (
    <header className="fixed top-3 left-3 right-3 z-30 flex flex-col gap-2 pointer-events-none">
      {/* Top Flex Row: Brand, Mode Switcher, and Wave Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Brand & Resources */}
        <div className="hud-glass rounded-2xl px-4 py-2.5 flex items-center gap-4 sm:gap-6 pointer-events-auto shadow-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-inner">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <div className="font-cyber text-xs tracking-wider text-sky-400 font-bold">NEXUS GRID</div>
              <div className="text-[10px] text-slate-400 font-mono">18x10 TACTICAL</div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-700/80"></div>

          {/* Mode Switcher Pill */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80">
            <button
              onClick={() => {
                soundEngine.playClick();
                onSwitchMode('game');
              }}
              className={`px-3 py-1 rounded-lg font-cyber text-[10px] font-bold tracking-wider transition-all ${
                appMode === 'game'
                  ? 'bg-sky-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              18x10 GAME
            </button>
            <button
              onClick={() => {
                soundEngine.playClick();
                onSwitchMode('studio');
              }}
              className={`px-3 py-1 rounded-lg font-cyber text-[10px] font-bold tracking-wider transition-all ${
                appMode === 'studio'
                  ? 'bg-cyan-400 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              3D ASSET STUDIO
            </button>
          </div>

        {/* Credits */}
        <div className="flex items-center gap-2" title="Credits available for construction and upgrades">
          <Coins className="w-4 h-4 text-amber-400" />
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400">Credits</div>
            <div className="font-cyber text-sm sm:text-base font-bold text-amber-300 tabular-nums">
              {credits}
            </div>
          </div>
        </div>

        {/* Core Lives */}
        <div className="flex items-center gap-2" title="Nexus Core Integrity">
          <Heart className={`w-4 h-4 ${lives <= 5 ? 'text-rose-500 animate-pulse' : 'text-rose-400'}`} />
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400">Core HP</div>
            <div className="font-cyber text-sm sm:text-base font-bold text-rose-300 tabular-nums">
              {lives} <span className="text-xs text-slate-500 font-normal">/ {maxLives}</span>
            </div>
          </div>
        </div>

        {/* Wave */}
        <div className="flex items-center gap-2" title="Current Wave">
          <Activity className="w-4 h-4 text-cyan-400" />
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400">Wave</div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-cyber text-sm sm:text-base font-bold text-cyan-300 tabular-nums">
                {wave}
              </span>
              <span
                className={`text-[9px] font-cyber px-1.5 py-0.5 rounded font-bold ${
                  waveActive
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {waveActive ? 'INCOMING' : 'READY'}
              </span>
            </div>
          </div>
        </div>

        {/* Score */}
        <div className="hidden md:flex items-center gap-2" title="Total Score">
          <Trophy className="w-4 h-4 text-purple-400" />
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400">Score</div>
            <div className="font-cyber text-sm sm:text-base font-bold text-purple-300 tabular-nums">
              {score}
            </div>
          </div>
        </div>
      </div>

      {/* Wave & Camera Controls */}
      <div className="hud-glass rounded-2xl px-3 py-2 flex items-center gap-2 pointer-events-auto">
        {/* Send Wave CTA */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onSendWave();
          }}
          disabled={waveActive}
          className={`hud-btn px-4 py-2 rounded-xl font-cyber font-bold text-xs tracking-wider flex items-center gap-2 shadow-lg ${
            waveActive
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/25'
          }`}
          title="Send Next Wave [SPACE]"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>SEND WAVE {wave + 1}</span>
        </button>

        {/* Auto Wave Toggle */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onToggleAutoWave();
          }}
          className={`hud-btn px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 ${
            autoWave
              ? 'bg-emerald-500/20 border-emerald-400/80 text-emerald-300'
              : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300'
          }`}
          title="Toggle Auto-Start Waves"
        >
          <RotateCw className={`w-3.5 h-3.5 ${autoWave ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
          <span className="hidden sm:inline">Auto</span>
        </button>

        {/* Game Speed */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onToggleSpeed();
          }}
          className={`hud-btn px-3 py-2 rounded-xl border font-cyber text-xs font-bold ${
            gameSpeed === 2
              ? 'bg-sky-500/25 border-sky-400 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.3)]'
              : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300'
          }`}
          title="Toggle Simulation Speed (1x / 2x)"
        >
          {gameSpeed}x
        </button>

        <div className="h-5 w-px bg-slate-700 mx-0.5"></div>

        {/* Camera Preset */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onCycleCamera();
          }}
          className="hud-btn px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs text-slate-200 flex items-center gap-1.5"
          title="Cycle Camera View (Tactical / Top-Down / Isometric)"
        >
          <Video className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline font-mono text-[11px]">{camModeName}</span>
        </button>

        {/* Sound Toggle */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onToggleMute();
          }}
          className="hud-btn p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white"
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        {/* Restart Mission */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onResetGame();
          }}
          className="hud-btn p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-300"
          title="Restart Mission"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
      </div>

      {/* Environmental Hazard Alert Banner */}
      {activeHazardCount > 0 && (
        <div className="flex justify-center pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="hud-glass px-3.5 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/60 text-amber-200 font-cyber text-[11px] tracking-wider shadow-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
            <span className="font-bold text-amber-300">ENVIRONMENTAL ANOMALY:</span>
            <span>{activeHazardCount} ACTIVE HAZARD TILE{activeHazardCount > 1 ? 'S' : ''} (SLIME / ELECTRIC)</span>
          </div>
        </div>
      )}

      {/* Dynamic Boss Alert Banner (Triggered when Colossus or Overlord Primus enters the grid) */}
      {activeBossName && (
        <div className="flex justify-center pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="hud-glass px-5 py-2 rounded-2xl bg-gradient-to-r from-rose-950/95 via-red-900/90 to-rose-950/95 border border-rose-500 text-rose-100 font-cyber text-xs tracking-wider shadow-[0_0_25px_rgba(239,68,68,0.5)] flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            <span className="font-bold text-amber-300">CRITICAL THREAT:</span>
            <span>{activeBossName.toUpperCase()} HAS ENTERED THE COMBAT GRID</span>
            <span className="text-[10px] bg-rose-500/30 text-rose-200 px-2 py-0.5 rounded font-mono">PRIORITY TARGET</span>
          </div>
        </div>
      )}
    </header>
  );
};
