import React, { useState } from 'react';
import {
  Compass,
  CloudSun,
  Car,
  Briefcase,
  Play,
  X,
  Shuffle,
  Eye,
  Sliders,
  Sparkles,
  Shield,
  Layers,
} from 'lucide-react';
import { BiomeId, GameMode, GraphicsSettings, PlayerStats, RoadStyle, VehicleId, WeatherId } from '../types/game';
import { BIOME_CONFIGS } from '../game/world/BiomeConfigs';
import { WEATHER_CONFIGS } from '../game/world/WeatherConfigs';
import { VEHICLE_CONFIGS } from '../game/vehicle/VehicleConfigs';

interface CustomizeDriveModalProps {
  stats: PlayerStats;
  graphics: GraphicsSettings;
  isOpen: boolean;
  onClose: () => void;
  onApplyAndDrive: (updates: {
    biome: BiomeId;
    weather: WeatherId;
    mode: GameMode;
    vehicle: VehicleId;
    seed: number;
    graphics: GraphicsSettings;
  }) => void;
}

export const CustomizeDriveModal: React.FC<CustomizeDriveModalProps> = ({
  stats,
  graphics,
  isOpen,
  onClose,
  onApplyAndDrive,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'biome' | 'weather' | 'mode' | 'vehicle' | 'options'>('biome');
  const [selectedBiome, setSelectedBiome] = useState<BiomeId>(stats.selectedBiome || 'alpine_pass');
  const [selectedWeather, setSelectedWeather] = useState<WeatherId>(stats.selectedWeather || 'clear_morning');
  const [selectedMode, setSelectedMode] = useState<GameMode>(stats.selectedMode || 'pure_drive');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleId>(stats.selectedVehicle || 'city_car');
  const [seed, setSeed] = useState<number>(stats.seed || 42);
  const [currentGraphics, setCurrentGraphics] = useState<GraphicsSettings>(graphics);

  const handleRandomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 90000) + 1000);
  };

  const handleStart = () => {
    onApplyAndDrive({
      biome: selectedBiome,
      weather: selectedWeather,
      mode: selectedMode,
      vehicle: selectedVehicle,
      seed,
      graphics: currentGraphics,
    });
  };

  const activeBiomeInfo = BIOME_CONFIGS[selectedBiome] || BIOME_CONFIGS.alpine_pass;
  const activeWeatherInfo = WEATHER_CONFIGS[selectedWeather] || WEATHER_CONFIGS.clear_morning;
  const activeVehicleInfo = VEHICLE_CONFIGS[selectedVehicle] || VEHICLE_CONFIGS.city_car;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md select-none overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Compass className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Customize Your Journey</h2>
              <p className="text-xs text-slate-400">Select landscape, weather atmosphere, drive mode, and route</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-slate-800/60 bg-slate-950/40 overflow-x-auto text-xs font-medium">
          {[
            { id: 'biome', label: 'Landscape & Biome', icon: Compass },
            { id: 'weather', label: 'Weather & Time', icon: CloudSun },
            { id: 'mode', label: 'Drive Purpose & Mode', icon: Briefcase },
            { id: 'vehicle', label: 'Vehicle Choice', icon: Car },
            { id: 'options', label: 'Route & Graphics', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* TAB 1: BIOME */}
          {activeTab === 'biome' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Select Landscape Biome</h3>
                <p className="text-xs text-slate-400">Each biome features distinct road layouts, elevation profiles, and roadside landmarks.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.values(BIOME_CONFIGS).map((b) => {
                  const isSelected = selectedBiome === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBiome(b.id)}
                      className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? 'bg-slate-800/90 border-amber-500 ring-2 ring-amber-500/20 shadow-lg'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white">{b.name}</span>
                          {isSelected && (
                            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-amber-400/90 font-medium">{b.tagline}</div>
                        <p className="text-xs text-slate-300/80 leading-relaxed">{b.description}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 space-y-1">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Landmarks:</div>
                        <div className="flex flex-wrap gap-1">
                          {b.landmarks.map((l) => (
                            <span key={l} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                              {l}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: WEATHER */}
          {activeTab === 'weather' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Atmosphere & Time of Day</h3>
                <p className="text-xs text-slate-400">Affects lighting contrast, sky colors, fog horizon, rain sheen, and tire grip.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  'clear_morning',
                  'sunny_afternoon',
                  'sunset',
                  'rainy_day',
                  'snowy_day',
                  'clear_night',
                  'storm_night',
                ].map((wId) => {
                  const w = WEATHER_CONFIGS[wId as WeatherId];
                  if (!w) return null;
                  const isSelected = selectedWeather === w.id;
                  return (
                    <div
                      key={w.id}
                      onClick={() => setSelectedWeather(w.id)}
                      className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'bg-slate-800/90 border-amber-500 ring-2 ring-amber-500/20 shadow-lg'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{w.name}</span>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                      </div>
                      <p className="text-xs text-slate-300/80 leading-relaxed">{w.description}</p>
                      <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 flex items-center justify-between">
                        <span>Tire Grip:</span>
                        <span className={`font-semibold ${w.gripMultiplier < 0.8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {Math.round(w.gripMultiplier * 100)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: DRIVE PURPOSE & MODE */}
          {activeTab === 'mode' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Choose Drive Purpose</h3>
                <p className="text-xs text-slate-400">Pure Drive is the default calm escape with zero pressure. Jobs are always optional.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: 'pure_drive',
                    name: 'Pure Drive',
                    badge: 'Default • Calm Cruise',
                    desc: 'No timers, no required destination, no failure state. Cruise through endless scenic terrain indefinitely at your own pace.',
                    perks: ['Zero pressure or score penalties', 'Uncluttered scenic HUD', 'Continuous procedural horizon'],
                  },
                  {
                    id: 'guided_drive',
                    name: 'Guided Drive',
                    badge: 'Exploration & POIs',
                    desc: 'Discovers scenic rest stops, observation viewpoints, bridges, and mountain viewpoints along the highway.',
                    perks: ['Overlook photo spots', 'Scenic roadside rest shelters', 'Exploration XP bonuses'],
                  },
                  {
                    id: 'work_route',
                    name: 'Work Route',
                    badge: 'Roadside Opportunities',
                    desc: 'Adds optional passenger trips, bus stops, courier drops, and cargo hauls at roadside depots and shelters.',
                    perks: ['Contextual 1-button boarding [E]', 'Cargo & passenger rewards', 'Reputation advancement'],
                  },
                ].map((m) => {
                  const isSelected = selectedMode === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMode(m.id as GameMode)}
                      className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? 'bg-slate-800/90 border-amber-500 ring-2 ring-amber-500/20 shadow-lg'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          {m.badge}
                        </span>
                        <div className="text-base font-bold text-white pt-1">{m.name}</div>
                        <p className="text-xs text-slate-300/80 leading-relaxed">{m.desc}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 space-y-1">
                        {m.perks.map((p) => (
                          <div key={p} className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-amber-400" />
                            <span>{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: VEHICLE */}
          {activeTab === 'vehicle' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Select Vehicle Silhouette</h3>
                <p className="text-xs text-slate-400">Choose between cars, vans, buses, trucks, motorbikes, and campers.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.values(VEHICLE_CONFIGS).map((v) => {
                  const isSelected = selectedVehicle === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVehicle(v.id)}
                      className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? 'bg-slate-800/90 border-amber-500 ring-2 ring-amber-500/20 shadow-lg'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">{v.category}</span>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                        </div>
                        <div className="text-sm font-bold text-white pt-1">{v.name}</div>
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mt-1">{v.description}</p>
                      </div>

                      {/* Stat Bars */}
                      <div className="space-y-1 pt-2 border-t border-slate-800/80 text-[11px]">
                        <div className="flex justify-between text-slate-400">
                          <span>Top Speed:</span>
                          <span className="text-slate-200 font-semibold">{v.topSpeed} km/h</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Handling:</span>
                          <span className="text-slate-200 font-semibold">{v.handling}/100</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: OPTIONS & SEED */}
          {activeTab === 'options' && (
            <div className="space-y-6 max-w-xl">
              {/* Seed Generator */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white flex items-center justify-between">
                  <span>Deterministic Route Seed</span>
                  <button
                    onClick={handleRandomizeSeed}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Random Seed</span>
                  </button>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(parseInt(e.target.value) || 1)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <div className="text-xs text-slate-400 max-w-[200px]">
                    Share this number with friends to drive on the exact same road layout.
                  </div>
                </div>
              </div>

              {/* Graphics Presets */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white">Graphics & Performance Preset</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['low', 'medium', 'high'] as const).map((q) => {
                    const isQ = currentGraphics.quality === q;
                    return (
                      <button
                        key={q}
                        onClick={() => setCurrentGraphics((prev) => ({ ...prev, quality: q }))}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-semibold capitalize transition-all ${
                          isQ
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {q} Quality
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Traffic Level */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white">Roadway Traffic Level</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['low', 'medium', 'high'] as const).map((t) => {
                    const isT = currentGraphics.trafficDensity === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setCurrentGraphics((prev) => ({ ...prev, trafficDensity: t }))}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-semibold capitalize transition-all ${
                          isT
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {t === 'low' ? 'Sparse' : t === 'medium' ? 'Moderate' : 'Dense'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Summary & Start Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="font-semibold text-white">{activeBiomeInfo.name}</span>
            <span>•</span>
            <span className="text-amber-400">{activeWeatherInfo.name}</span>
            <span>•</span>
            <span className="text-sky-300">{activeVehicleInfo.name}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Start Scenic Drive</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
