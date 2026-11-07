/**
 * Turret Build Dock & Inspector Panel
 * Bottom-centered, low-occlusion, collapsible with Zero Viewport Occlusion design
 */
import React from 'react';
import {
  Crosshair,
  Snowflake,
  Bomb,
  Zap,
  MousePointer,
  ChevronDown,
  ChevronUp,
  ArrowUpCircle,
  Trash2,
  X,
  Sparkles,
} from 'lucide-react';
import { TURRET_SPECS, TurretTypeId } from '../game/constants';
import { TowerEntity } from '../game/types';
import { soundEngine } from '../game/SoundEngine';

interface BottomDockProps {
  buildType: TurretTypeId | null;
  credits: number;
  selectedTower: TowerEntity | null;
  pathLength: number;
  isCollapsed: boolean;
  onSelectBuildType: (type: TurretTypeId | null) => void;
  onUpgradeTower: () => void;
  onSellTower: () => void;
  onDeselect: () => void;
  onToggleCollapse: () => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  buildType,
  credits,
  selectedTower,
  pathLength,
  isCollapsed,
  onSelectBuildType,
  onUpgradeTower,
  onSellTower,
  onDeselect,
  onToggleCollapse,
}) => {
  const turretList: TurretTypeId[] = ['pulse', 'cryo', 'mortar', 'tesla'];

  const getTurretIcon = (id: TurretTypeId) => {
    switch (id) {
      case 'pulse':
        return <Crosshair className="w-5 h-5 text-cyan-400" />;
      case 'cryo':
        return <Snowflake className="w-5 h-5 text-blue-300" />;
      case 'mortar':
        return <Bomb className="w-5 h-5 text-orange-400" />;
      case 'tesla':
        return <Zap className="w-5 h-5 text-purple-400" />;
    }
  };

  // Selected tower upgrade stats
  const spec = selectedTower ? TURRET_SPECS[selectedTower.type] : null;
  const curStats = spec && selectedTower ? spec.levels[selectedTower.level - 1] : null;
  const nxtStats = spec && selectedTower && selectedTower.level < 3 ? spec.levels[selectedTower.level] : null;
  const refundAmount = selectedTower ? Math.floor(selectedTower.totalInvested * 0.75) : 0;
  const canAffordUpgrade = nxtStats ? credits >= nxtStats.upgradeCost : false;

  return (
    <footer className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none max-w-[96vw] w-auto">
      {/* Dynamic Inspector Drawer (Appears above the dock when a tower is clicked) */}
      {selectedTower && spec && curStats && (
        <div className="hud-glass rounded-2xl p-4 w-full sm:w-[480px] pointer-events-auto shadow-2xl border-cyan-500/40 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5 mb-2.5">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-inner"
                style={{
                  backgroundColor: `${spec.hex}22`,
                  borderColor: `${spec.hex}55`,
                  color: spec.hex,
                }}
              >
                {getTurretIcon(selectedTower.type)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-cyber text-sm font-bold text-white">{spec.name}</h3>
                  <span className="text-[10px] font-cyber px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    LVL {selectedTower.level}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  GRID ({selectedTower.gx}, {selectedTower.gz}) &bull; KILLS: {selectedTower.kills}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                soundEngine.playClick();
                onDeselect();
              }}
              className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              title="Close Panel [ESC]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300 mb-3 leading-relaxed">{spec.desc}</p>

          {/* Stats Breakdown */}
          <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-xs mb-3">
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Damage</div>
              <div className="font-mono font-bold text-white">
                {curStats.damage}
                {nxtStats && <span className="text-emerald-400 text-[11px] ml-1">→{nxtStats.damage}</span>}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Rate</div>
              <div className="font-mono font-bold text-white">
                {curStats.rate}/s
                {nxtStats && <span className="text-emerald-400 text-[11px] ml-1">→{nxtStats.rate}/s</span>}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Range</div>
              <div className="font-mono font-bold text-white">
                {curStats.range}
                {nxtStats && <span className="text-emerald-400 text-[11px] ml-1">→{nxtStats.range}</span>}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                onUpgradeTower();
              }}
              disabled={!nxtStats || !canAffordUpgrade}
              className={`hud-btn flex-1 py-2.5 px-3 rounded-xl font-cyber font-bold text-xs flex items-center justify-between shadow-lg ${
                nxtStats && canAffordUpgrade
                  ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 shadow-sky-500/25'
                  : 'bg-slate-800/80 text-slate-500 border border-slate-700/60 cursor-not-allowed'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <ArrowUpCircle className="w-4 h-4" />
                <span>{nxtStats ? `UPGRADE LVL ${selectedTower.level + 1}` : 'MAX LEVEL'}</span>
              </span>
              <span className="font-mono text-amber-200">
                {nxtStats ? `${nxtStats.upgradeCost} CR` : '---'}
              </span>
            </button>

            <button
              onClick={() => {
                onSellTower();
              }}
              className="hud-btn px-4 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 text-rose-200 font-cyber text-xs flex items-center gap-1.5"
              title="Sell Turret for partial credit refund"
            >
              <Trash2 className="w-4 h-4" />
              <span>+{refundAmount} CR</span>
            </button>
          </div>
        </div>
      )}

      {/* Control Dock Container */}
      <div className="flex flex-col items-center">
        {/* Collapse / Expand Toggle Tab */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onToggleCollapse();
          }}
          className="hud-glass hud-btn px-3 py-1 rounded-t-xl text-[10px] font-mono text-slate-300 hover:text-white flex items-center gap-1.5 pointer-events-auto border-b-0 shadow-sm"
          title="Toggle Dock Visibility [H]"
        >
          {isCollapsed ? <ChevronUp className="w-3.5 h-3.5 text-sky-400" /> : <ChevronDown className="w-3.5 h-3.5 text-sky-400" />}
          <span>{isCollapsed ? 'SHOW DOCK' : 'MINIMIZE'}</span>
        </button>

        {!isCollapsed && (
          <div className="flex flex-col items-center gap-1.5 animate-in fade-in duration-150">
            {/* Context Pill */}
            <div className="hud-glass rounded-full px-4 py-1 text-[11px] text-slate-300 flex items-center gap-4 pointer-events-auto shadow-md">
              <span>
                <MousePointer className="w-3 h-3 text-sky-400 inline mr-1" />
                Left-Click: Place / Inspect
              </span>
              <span className="hidden sm:inline text-slate-400">&bull;</span>
              <span className="hidden sm:inline">Right-Drag: Orbit</span>
              <span className="text-cyan-300 font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                A* Path: <strong className="text-white tabular-nums">{pathLength}</strong> tiles
              </span>
            </div>

            {/* Turret Cards Dock */}
            <div className="hud-glass rounded-2xl p-1.5 sm:p-2 flex items-center gap-1.5 sm:gap-3 pointer-events-auto max-w-[96vw] overflow-x-auto shadow-2xl custom-scrollbar">
              {turretList.map((typeKey, idx) => {
                const item = TURRET_SPECS[typeKey];
                const isSelected = buildType === typeKey && !selectedTower;
                const canAfford = credits >= item.cost;

                return (
                  <button
                    key={typeKey}
                    onClick={() => {
                      soundEngine.playClick();
                      if (typeof window !== 'undefined' && navigator.vibrate) {
                        try { navigator.vibrate(12); } catch {}
                      }
                      onSelectBuildType(isSelected ? null : typeKey);
                    }}
                    className={`hud-btn rounded-xl p-2 sm:p-2.5 flex items-center gap-2 sm:gap-3 min-w-[108px] sm:min-w-[165px] text-left border transition-all shrink-0 ${
                      isSelected
                        ? 'border-sky-400 bg-sky-500/25 shadow-[0_0_18px_rgba(56,189,248,0.4)] scale-[1.02]'
                        : 'border-slate-700/80 bg-slate-900/85 hover:bg-slate-800/80 active:bg-slate-800'
                    }`}
                  >
                    <div
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: `${item.hex}20`,
                        borderColor: `${item.hex}40`,
                      }}
                    >
                      {getTurretIcon(typeKey)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-cyber text-[11px] sm:text-xs font-bold text-white truncate">{item.name.split(' ')[0]}</span>
                        <span className="hidden sm:inline text-[10px] font-mono text-slate-400">[{idx + 1}]</span>
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-slate-400 truncate hidden xs:block">{item.tagline}</div>
                      <div
                        className={`font-cyber text-[11px] sm:text-xs font-bold mt-0.5 tabular-nums ${
                          canAfford ? 'text-amber-400' : 'text-slate-500'
                        }`}
                      >
                        {item.cost} CR
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Cancel Button */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  if (typeof window !== 'undefined' && navigator.vibrate) {
                    try { navigator.vibrate(10); } catch {}
                  }
                  onDeselect();
                }}
                className="hud-btn rounded-xl px-2.5 sm:px-3 py-2 sm:py-2.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-600/60 text-slate-300 text-xs flex flex-col items-center justify-center shrink-0 min-h-[44px]"
                title="Cancel Build / Selection [ESC]"
              >
                <MousePointer className="w-4 h-4 mb-0.5 text-slate-400" />
                <span className="text-[9px] font-mono">ESC</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
};
