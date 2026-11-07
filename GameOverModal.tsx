/**
 * Game Over & Victory Modal
 */
import React from 'react';
import { Skull, Trophy, RotateCcw } from 'lucide-react';
import { soundEngine } from '../game/SoundEngine';

interface GameOverModalProps {
  isOpen: boolean;
  isVictory?: boolean;
  wavesSurvived: number;
  score: number;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  isVictory = false,
  wavesSurvived,
  score,
  onRestart,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#060913]/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div
        className={`hud-glass rounded-3xl max-w-md w-full p-6 sm:p-8 text-center border shadow-2xl ${
          isVictory ? 'border-emerald-500/50 shadow-emerald-500/20' : 'border-rose-500/50 shadow-rose-500/20'
        }`}
      >
        <div
          className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner ${
            isVictory
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
              : 'bg-rose-500/20 border-rose-500/50 text-rose-400'
          }`}
        >
          {isVictory ? <Trophy className="w-8 h-8" /> : <Skull className="w-8 h-8" />}
        </div>

        <h2 className="font-cyber text-2xl sm:text-3xl font-black text-white tracking-wider mb-2">
          {isVictory ? 'DEFENSE SUCCESSFUL' : 'NEXUS CORE BREACHED'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
          {isVictory
            ? 'All hostile waves repelled. The tactical defense matrix has restored full perimeter stability!'
            : 'The hostile swarm overwhelmed your tactical perimeter defenses and penetrated the core.'}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-mono tracking-wider">Waves Survived</div>
            <div className="font-cyber text-xl font-bold text-cyan-400 tabular-nums">{wavesSurvived}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-mono tracking-wider">Final Score</div>
            <div className="font-cyber text-xl font-bold text-amber-400 tabular-nums">{score}</div>
          </div>
        </div>

        <button
          onClick={() => {
            soundEngine.playClick();
            onRestart();
          }}
          className="hud-btn w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-400 text-slate-950 font-cyber font-black text-xs sm:text-sm tracking-wider shadow-[0_0_25px_rgba(56,189,248,0.4)] flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>REBOOT DEFENSE MATRIX</span>
        </button>
      </div>
    </div>
  );
};
