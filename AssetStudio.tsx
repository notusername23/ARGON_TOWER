/**
 * 3D Asset Studio - Dedicated Full-Page 3D Workstation Component
 * Complete standalone page view separated from the tactical game HUD.
 * Features live turntable inspection, tier morphing, weapon firing sandbox,
 * collapsible sidebars ("Zen / Cinema Mode"), and .OBJ / Three.js .JSON mesh exporters.
 */
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Crosshair,
  Flame,
  Shield,
  Download,
  Code,
  RotateCw,
  Sun,
  Layers,
  Sparkles,
  Play,
  Bomb,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Eye,
  CheckCircle,
  HelpCircle,
  Cpu,
} from 'lucide-react';
import { TURRET_SPECS, ENEMY_TYPES, TurretTypeId, EnemyTypeId } from '../game/constants';
import { soundEngine } from '../game/SoundEngine';

export interface AssetStudioItem {
  id: string;
  category: 'turret' | 'enemy' | 'structure';
  name: string;
  sub: string;
  color: string;
  turretType?: TurretTypeId;
  enemyType?: EnemyTypeId;
}

export const ASSET_CATALOG: AssetStudioItem[] = [
  // Turrets (4 Archetypes)
  { id: 'pulse', category: 'turret', name: 'Pulse Cannon', sub: 'Kinetic Twin Laser', color: '#22d3ee', turretType: 'pulse' },
  { id: 'cryo', category: 'turret', name: 'Cryo Emitter', sub: 'Sub-Zero Frost Nova', color: '#60a5fa', turretType: 'cryo' },
  { id: 'mortar', category: 'turret', name: 'Mortar Battery', sub: 'Heavy Plasma Artillery', color: '#f97316', turretType: 'mortar' },
  { id: 'tesla', category: 'turret', name: 'Tesla Coil', sub: 'Chain Ionization Spire', color: '#c084fc', turretType: 'tesla' },
  // Swarm & Bosses (6 Archetypes)
  { id: 'scout', category: 'enemy', name: 'Swarm Scout', sub: 'Fast Diamond Drone', color: '#38bdf8', enemyType: 'scout' },
  { id: 'sprinter', category: 'enemy', name: 'Speed Sprinter', sub: 'Dart Interceptor', color: '#facc15', enemyType: 'sprinter' },
  { id: 'tank', category: 'enemy', name: 'Armored Tank', sub: 'Goliath Crawler', color: '#f43f5e', enemyType: 'tank' },
  { id: 'boss', category: 'enemy', name: 'Dreadnought Core', sub: 'Tier I Boss Core', color: '#a855f7', enemyType: 'boss' },
  { id: 'colossus', category: 'enemy', name: 'Apex Colossus', sub: 'Tier II Quad-Mech Boss', color: '#f97316', enemyType: 'colossus' },
  { id: 'final_boss', category: 'enemy', name: 'Overlord Primus', sub: '★ Supreme Final Boss ★', color: '#ef4444', enemyType: 'final_boss' },
  // Environment Structures (2 Objectives)
  { id: 'nexus', category: 'structure', name: 'Nexus Crystal Core', sub: 'Command Objective', color: '#22d3ee' },
  { id: 'portal', category: 'structure', name: 'Spawn Portal Gate', sub: 'Warp Vortex Conduit', color: '#c084fc' },
];

interface AssetStudioProps {
  onSwitchToGame: () => void;
  onSelectStudioAsset: (item: AssetStudioItem, level: number) => void;
  onFireWeaponTest: () => void;
  onTriggerExplosionDemo: () => void;
  onToggleTurntableSpin: () => boolean;
  onToggleWireframe: () => boolean;
  onSetLighting: (mode: 'cyber' | 'day') => void;
  onResetCameraAngle: () => void;
  onExportOBJ: () => void;
  onExportJSON: () => void;
  meshCount: number;
  vertexCount: number;
  triangleCount: number;
}

export const AssetStudio: React.FC<AssetStudioProps> = ({
  onSwitchToGame,
  onSelectStudioAsset,
  onFireWeaponTest,
  onTriggerExplosionDemo,
  onToggleTurntableSpin,
  onToggleWireframe,
  onSetLighting,
  onResetCameraAngle,
  onExportOBJ,
  onExportJSON,
  meshCount,
  vertexCount,
  triangleCount,
}) => {
  const [selectedId, setSelectedId] = useState<string>('final_boss');
  const [activeCategory, setActiveCategory] = useState<'all' | 'turret' | 'enemy' | 'structure'>('all');
  const [activeLevel, setActiveLevel] = useState<number>(3);
  const [lightingMode, setLightingMode] = useState<'cyber' | 'day'>('cyber');
  const [isWireframe, setIsWireframe] = useState<boolean>(false);
  const [isSpinning, setIsSpinning] = useState<boolean>(true);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Ergonomic Zen Mode & Sidebars Collapse States (Zero Viewport Occlusion)
  const [leftOpen, setLeftOpen] = useState<boolean>(true);
  const [rightOpen, setRightOpen] = useState<boolean>(true);
  const [zenMode, setZenMode] = useState<boolean>(false);

  const selectedItem = ASSET_CATALOG.find((a) => a.id === selectedId) || ASSET_CATALOG[9];

  useEffect(() => {
    onSelectStudioAsset(selectedItem, activeLevel);
  }, [selectedId, activeLevel]);

  const handleSelect = (item: AssetStudioItem) => {
    soundEngine.playClick();
    setSelectedId(item.id);
  };

  const handleLevelChange = (lvl: number) => {
    soundEngine.playUpgrade();
    setActiveLevel(lvl);
  };

  const handleExportOBJ = () => {
    soundEngine.playClick();
    onExportOBJ();
    setExportNotice('.OBJ Mesh Exported!');
    setTimeout(() => setExportNotice(null), 2500);
  };

  const handleExportJSON = () => {
    soundEngine.playClick();
    onExportJSON();
    setExportNotice('Three.js JSON Exported!');
    setTimeout(() => setExportNotice(null), 2500);
  };

  const filteredAssets = ASSET_CATALOG.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const turretSpec = selectedItem.turretType ? TURRET_SPECS[selectedItem.turretType] : null;
  const enemySpec = selectedItem.enemyType ? ENEMY_TYPES[selectedItem.enemyType] : null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between overflow-hidden">
      {/* ======================================================== */}
      {/* 1. STANDALONE STUDIO HEADER (NO OVERLAP WITH GAME HUD)   */}
      {/* ======================================================== */}
      <header className="pointer-events-auto w-full px-3 sm:px-6 pt-3 pb-2 flex flex-col md:flex-row items-center justify-between gap-3 bg-gradient-to-b from-[#060913]/95 via-[#060913]/85 to-transparent border-b border-slate-800/80 backdrop-blur-md">
        {/* Left: Back to Game Button & Branding */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <button
            onClick={() => {
              soundEngine.playClick();
              onSwitchToGame();
            }}
            className="hud-btn group px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-sky-500/20 border border-slate-700 hover:border-sky-400 text-slate-200 hover:text-sky-300 font-cyber text-xs font-bold tracking-wider flex items-center gap-2 shadow-lg transition-all"
            title="Return to Tactical 18x10 Game (ESC)"
          >
            <ArrowLeft className="w-4 h-4 text-sky-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>RETURN TO GAME</span>
            <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">ESC</span>
          </button>

          <div className="h-6 w-px bg-slate-700/60 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shadow-inner">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="font-cyber text-xs font-black tracking-widest text-cyan-300">NEXUS ASSET STUDIO</div>
              <div className="text-[10px] font-mono text-slate-400">3D PROCEDURAL WORKSTATION</div>
            </div>
          </div>
        </div>

        {/* Center: Category Filter Tabs */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveCategory('all');
            }}
            className={`px-3 py-1 rounded-lg font-cyber text-[11px] font-bold tracking-wider transition-all ${
              activeCategory === 'all'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ALL (12)
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveCategory('turret');
            }}
            className={`px-3 py-1 rounded-lg font-cyber text-[11px] font-bold tracking-wider transition-all ${
              activeCategory === 'turret'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            TURRETS (4)
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveCategory('enemy');
            }}
            className={`px-3 py-1 rounded-lg font-cyber text-[11px] font-bold tracking-wider transition-all ${
              activeCategory === 'enemy'
                ? 'bg-rose-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ENEMIES & BOSSES (6)
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveCategory('structure');
            }}
            className={`px-3 py-1 rounded-lg font-cyber text-[11px] font-bold tracking-wider transition-all ${
              activeCategory === 'structure'
                ? 'bg-purple-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            OBJECTIVES (2)
          </button>
        </div>

        {/* Right: Telemetry & Viewport Toggles */}
        <div className="flex items-center gap-2">
          {/* Live Polycount Telemetry Pill */}
          <div className="hidden xl:flex items-center gap-3 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300">
            <span>MESHES: <strong className="text-white">{meshCount}</strong></span>
            <span>VERTS: <strong className="text-emerald-400">{vertexCount.toLocaleString()}</strong></span>
            <span>TRIS: <strong className="text-amber-300">{triangleCount.toLocaleString()}</strong></span>
          </div>

          {/* Lighting Mode Toggle */}
          <button
            onClick={() => {
              soundEngine.playClick();
              const next = lightingMode === 'cyber' ? 'day' : 'cyber';
              setLightingMode(next);
              onSetLighting(next);
            }}
            className={`hud-btn px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 shadow-md ${
              lightingMode === 'cyber'
                ? 'bg-sky-500/20 border-sky-400/60 text-sky-200'
                : 'bg-amber-500/20 border-amber-400/60 text-amber-200'
            }`}
            title="Toggle Studio Lighting Environment"
          >
            {lightingMode === 'cyber' ? <Sparkles className="w-3.5 h-3.5 text-sky-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <span className="hidden sm:inline">{lightingMode === 'cyber' ? 'Cyber Neon' : 'Studio Day'}</span>
          </button>

          {/* Wireframe Toggle */}
          <button
            onClick={() => {
              soundEngine.playClick();
              const next = onToggleWireframe();
              setIsWireframe(next);
            }}
            className={`hud-btn px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 shadow-md ${
              isWireframe
                ? 'bg-purple-500/30 border-purple-400 text-purple-200'
                : 'bg-slate-900/80 border-slate-700/80 text-slate-300'
            }`}
            title="Toggle Procedural Wireframe View"
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Wireframe</span>
          </button>

          {/* Turntable Auto-Spin Toggle */}
          <button
            onClick={() => {
              soundEngine.playClick();
              const next = onToggleTurntableSpin();
              setIsSpinning(next);
            }}
            className={`hud-btn p-2 rounded-xl border text-xs shadow-md ${
              isSpinning ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300' : 'bg-slate-900/80 border-slate-700/80 text-slate-400'
            }`}
            title="Toggle Turntable Spin"
          >
            <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
          </button>

          {/* Reset Camera Angle */}
          <button
            onClick={() => {
              soundEngine.playClick();
              onResetCameraAngle();
            }}
            className="hud-btn p-2 rounded-xl border border-slate-700/80 bg-slate-900/80 text-slate-300 hover:text-white"
            title="Reset Camera Preset"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Zen View (Hide All Panels for 100% Unobstructed Turntable) */}
          <button
            onClick={() => {
              soundEngine.playClick();
              setZenMode((prev) => !prev);
            }}
            className={`hud-btn px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 shadow-md ${
              zenMode
                ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                : 'bg-slate-900/80 border-slate-700/80 text-slate-300'
            }`}
            title="Toggle Zen Mode (Maximize 3D Turntable)"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{zenMode ? 'Show Panels' : 'Cinema Mode'}</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. MAIN 3D WORKSTATION VIEW (COLLAPSIBLE SIDEBARS)       */}
      {/* ======================================================== */}
      <div className="flex-1 relative flex items-stretch justify-between p-3 sm:p-5 overflow-hidden pointer-events-none">
        {/* LEFT CATALOG SIDEBAR */}
        {!zenMode && (
          <aside
            className={`pointer-events-auto transition-all duration-300 ease-out flex flex-col ${
              leftOpen ? 'w-64 sm:w-72 opacity-100' : 'w-10 opacity-80'
            } max-h-[calc(100vh-140px)] z-20`}
          >
            <div className="hud-glass rounded-2xl flex flex-col h-full p-3 shadow-2xl border border-slate-700/70 overflow-hidden">
              {/* Header with Collapse Button */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                {leftOpen && (
                  <span className="font-cyber text-xs font-bold tracking-wider text-sky-400 truncate">
                    MODEL CATALOG ({filteredAssets.length})
                  </span>
                )}
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setLeftOpen((prev) => !prev);
                  }}
                  className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white ml-auto"
                  title={leftOpen ? 'Collapse Catalog' : 'Expand Catalog'}
                >
                  {leftOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>

              {/* Scrollable Model List */}
              {leftOpen && (
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {filteredAssets.map((item) => {
                    const isSelected = selectedId === item.id;
                    const isFinal = item.id === 'final_boss';
                    const isColossus = item.id === 'colossus';
                    const isBoss = item.id === 'boss';

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={`w-full p-2 rounded-xl flex items-center gap-2.5 text-left transition-all border ${
                          isSelected
                            ? isFinal
                              ? 'border-rose-400 bg-rose-500/25 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                              : isColossus
                              ? 'border-amber-400 bg-amber-500/25 shadow-md'
                              : 'border-sky-400 bg-sky-500/20 shadow-md'
                            : 'border-slate-800/80 bg-slate-900/75 hover:bg-slate-800/80'
                        }`}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 border"
                          style={{
                            backgroundColor: `${item.color}25`,
                            borderColor: `${item.color}60`,
                            color: item.color,
                          }}
                        >
                          {isFinal ? (
                            <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
                          ) : item.category === 'turret' ? (
                            <Crosshair className="w-3.5 h-3.5" />
                          ) : item.category === 'enemy' ? (
                            <Shield className="w-3.5 h-3.5" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-cyber text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <span className="truncate">{item.name}</span>
                            {isFinal && (
                              <span className="text-[8px] bg-rose-500/40 text-rose-200 px-1 py-0.2 rounded font-mono font-black shrink-0">
                                FINAL
                              </span>
                            )}
                            {isColossus && (
                              <span className="text-[8px] bg-amber-500/40 text-amber-200 px-1 py-0.2 rounded font-mono font-black shrink-0">
                                TIER II
                              </span>
                            )}
                            {isBoss && (
                              <span className="text-[8px] bg-purple-500/40 text-purple-200 px-1 py-0.2 rounded font-mono font-black shrink-0">
                                TIER I
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate font-sans">{item.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* RIGHT INSPECTOR & WEAPON SANDBOX SIDEBAR */}
        {!zenMode && (
          <aside
            className={`pointer-events-auto transition-all duration-300 ease-out flex flex-col ${
              rightOpen ? 'w-72 sm:w-80 opacity-100' : 'w-10 opacity-80'
            } max-h-[calc(100vh-140px)] z-20`}
          >
            <div className="hud-glass rounded-2xl flex flex-col h-full p-3.5 shadow-2xl border border-slate-700/70 overflow-hidden">
              {/* Header with Collapse Button */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setRightOpen((prev) => !prev);
                  }}
                  className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white mr-auto"
                  title={rightOpen ? 'Collapse Inspector' : 'Expand Inspector'}
                >
                  {rightOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
                {rightOpen && (
                  <span className="font-cyber text-xs font-bold tracking-wider text-cyan-400 truncate">
                    TECHNICAL INSPECTOR
                  </span>
                )}
              </div>

              {/* Scrollable Content */}
              {rightOpen && (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {/* Model Header */}
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-inner"
                      style={{
                        backgroundColor: `${selectedItem.color}25`,
                        borderColor: `${selectedItem.color}60`,
                        color: selectedItem.color,
                      }}
                    >
                      {selectedItem.category === 'turret' ? (
                        <Crosshair className="w-5 h-5" />
                      ) : selectedItem.id === 'final_boss' ? (
                        <Flame className="w-6 h-6 text-rose-400 animate-pulse" />
                      ) : (
                        <Shield className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-cyber uppercase tracking-wider text-sky-400 truncate">
                        {selectedItem.sub}
                      </div>
                      <h2 className="font-cyber text-sm font-black text-white truncate">{selectedItem.name}</h2>
                    </div>
                  </div>

                  {/* Turret Tier Selection */}
                  {selectedItem.category === 'turret' && (
                    <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                      <div className="text-[10px] font-cyber uppercase tracking-wider text-slate-400 mb-1.5 flex justify-between">
                        <span>Procedural Tier Morph</span>
                        <span className="text-sky-400 font-bold">LVL {activeLevel}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[1, 2, 3].map((lvl) => (
                          <button
                            key={lvl}
                            onClick={() => handleLevelChange(lvl)}
                            className={`hud-btn py-1.5 rounded-lg font-cyber text-xs font-bold border transition-all ${
                              activeLevel === lvl
                                ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            LVL {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Boss Special Banner */}
                  {selectedItem.id === 'final_boss' && (
                    <div className="p-2.5 rounded-xl bg-gradient-to-r from-rose-950/90 via-red-950/70 to-slate-900 border border-rose-500/60 text-xs">
                      <div className="font-cyber font-bold text-rose-300 flex items-center gap-1.5 mb-1">
                        <Flame className="w-4 h-4 text-rose-400" />
                        <span>★ OVERLORD PRIMUS ★</span>
                      </div>
                      <p className="text-[11px] text-rose-200/90 leading-relaxed font-sans">
                        Supreme Final Boss of Wave 8 & 12. Armed with dual contra-rotating energy shields, monolithic composite armor, and 3,400 base HP. Requires high-damage kinetic artillery.
                      </p>
                    </div>
                  )}

                  {selectedItem.id === 'colossus' && (
                    <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/90 via-yellow-950/70 to-slate-900 border border-amber-500/60 text-xs">
                      <div className="font-cyber font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                        <Shield className="w-4 h-4 text-amber-400" />
                        <span>★ APEX COLOSSUS MECH ★</span>
                      </div>
                      <p className="text-[11px] text-amber-200/90 leading-relaxed font-sans">
                        Tier II Quad-Legged Heavy Siege Mech. Fast forward stride with heavy forward shock absorbers. Highly resistant to Cryo slow fields.
                      </p>
                    </div>
                  )}

                  {/* Technical Specs Breakdown */}
                  <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 space-y-1.5 text-xs font-mono">
                    {turretSpec && (
                      <>
                        <div className="flex justify-between items-center py-0.5 border-b border-slate-800/80">
                          <span className="text-slate-400 font-sans">Tier Setup</span>
                          <span className="font-cyber text-sky-400 font-bold">LEVEL {activeLevel}</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-b border-slate-800/80">
                          <span className="text-slate-400 font-sans">Build Cost</span>
                          <span className="text-amber-300">{turretSpec.cost} CR</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-b border-slate-800/80">
                          <span className="text-slate-400 font-sans">Damage / Shot</span>
                          <span className="text-white font-bold">{turretSpec.levels[activeLevel - 1].damage} DMG</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-b border-slate-800/80">
                          <span className="text-slate-400 font-sans">Fire Rate</span>
                          <span className="text-emerald-400 font-bold">{turretSpec.levels[activeLevel - 1].rate}/sec</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-slate-400 font-sans">Special Ability</span>
                          <span className="text-purple-300 truncate max-w-[140px] text-right">{turretSpec.special}</span>
                        </div>
                      </>
                    )}

                    {enemySpec && (
                      <>
                        <div className="flex justify-between items-center py-0.5 border-b border-slate-800/80">
                          <span className="text-slate-400 font-sans">Hull Integrity</span>
                          <span className="text-rose-400 font-bold">{enemySpec.hp} HP</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-b border-slate-800/80">
                          <span className="text-slate-400 font-sans">Traversal Speed</span>
                          <span className="text-amber-300">{enemySpec.speed} Tiles/s</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-b border-slate-800/80">
                          <span className="text-slate-400 font-sans">Destruction Bounty</span>
                          <span className="text-emerald-400 font-bold">+{enemySpec.reward} CR</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-slate-400 font-sans">Core Breach DMG</span>
                          <span className="text-rose-300 font-bold">-{enemySpec.damage} Lives</span>
                        </div>
                      </>
                    )}

                    {!turretSpec && !enemySpec && (
                      <>
                        <div className="flex justify-between items-center py-0.5 border-b border-slate-800/80">
                          <span className="text-slate-400 font-sans">Field Position</span>
                          <span className="text-cyan-300">{selectedItem.id === 'portal' ? 'Spawn (0, 4/5)' : 'Nexus Core (17, 4/5)'}</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-slate-400 font-sans">Material Type</span>
                          <span className="text-purple-300">PBR Emissive Bloom</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Interactive Weapon Testing Bay */}
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                    <div className="text-[10px] font-cyber uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                      <span>Live Weapon Sandbox</span>
                      <span className="text-cyan-400 font-mono text-[9px]">TARGET DUMMY ACTIVE</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          soundEngine.playClick();
                          onFireWeaponTest();
                        }}
                        className="hud-btn py-2 px-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-cyber font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>FIRE WEAPON</span>
                      </button>
                      <button
                        onClick={() => {
                          soundEngine.playExplosion(true);
                          onTriggerExplosionDemo();
                        }}
                        className="hud-btn py-2 px-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/60 text-rose-200 font-cyber font-bold text-[11px] flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                      >
                        <Bomb className="w-3.5 h-3.5 text-rose-400" />
                        <span>TEST BLAST FX</span>
                      </button>
                    </div>
                  </div>

                  {/* 3D Geometry Exporter Pipeline */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-cyber uppercase tracking-wider text-emerald-400">
                      <span>Export 3D Model</span>
                      {exportNotice && <span className="text-emerald-300 font-mono animate-pulse">{exportNotice}</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleExportOBJ}
                        className="hud-btn py-2 px-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 font-cyber text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-md"
                        title="Download Wavefront .OBJ 3D Model"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>.OBJ FILE</span>
                      </button>
                      <button
                        onClick={handleExportJSON}
                        className="hud-btn py-2 px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 font-cyber text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-md"
                        title="Download Three.js JSON Geometry"
                      >
                        <Code className="w-3.5 h-3.5" />
                        <span>THREE .JSON</span>
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        onSwitchToGame();
                      }}
                      className="hud-btn w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 font-cyber font-black text-xs tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(52,211,153,0.35)] mt-1 transition-all"
                    >
                      <Play className="w-4 h-4 fill-slate-950" />
                      <span>DEPLOY IN 18x10 GAME</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. BOTTOM VIEWPORT CONTROLS & ERGONOMIC NAVIGATION BAR   */}
      {/* ======================================================== */}
      <footer className="pointer-events-auto w-full px-4 py-2 flex items-center justify-between bg-gradient-to-t from-[#060913]/95 via-[#060913]/85 to-transparent border-t border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <RotateCw className="w-3.5 h-3.5 text-sky-400" />
            <strong className="text-slate-200">Left-Click Drag:</strong> Orbit Turntable
          </span>
          <span className="hidden sm:inline text-slate-600">&bull;</span>
          <span className="hidden sm:flex items-center gap-1.5">
            <strong className="text-slate-200">Scroll:</strong> Macro Zoom
          </span>
          <span className="hidden md:inline text-slate-600">&bull;</span>
          <span className="hidden md:inline text-slate-400">
            Target Dummy active for live laser testing
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-emerald-400 font-mono text-xs flex items-center gap-1.5 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/40">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">WebGL Studio Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
