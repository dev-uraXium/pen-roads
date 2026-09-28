import {
  Compass,
  Monitor,
  Palette,
  Sliders,
  Volume2,
  X,
  Play,
  RotateCcw,
  Check,
  CloudSun,
  Navigation
} from 'lucide-react';
import React, { useState } from 'react';
import { DISTRICTS, ROAD_NETWORK } from '../game/world/DistrictData';
import { VEHICLE_CONFIGS } from '../game/vehicle/VehicleConfigs';
import { BIOME_CONFIGS } from '../game/world/BiomeConfigs';
import { WEATHER_CONFIGS } from '../game/world/WeatherConfigs';
import {
  AudioSettings,
  BiomeId,
  ControlSettings,
  GraphicsSettings,
  PlayerStats,
  VehicleId,
  WeatherId,
} from '../types/game';

interface PauseMenuProps {
  playerPos: [number, number];
  playerStats: PlayerStats;
  graphics: GraphicsSettings;
  audio: AudioSettings;
  controls: ControlSettings;
  onResume: () => void;
  onRestartAtGarage: () => void;
  onResetToRoad?: () => void;
  onUpdateGraphics: (settings: Partial<GraphicsSettings>) => void;
  onUpdateAudio: (settings: Partial<AudioSettings>) => void;
  onUpdateControls: (settings: Partial<ControlSettings>) => void;
  onSelectVehicle: (id: VehicleId) => void;
  onSelectColor: (color: string) => void;
  onUpdateBiome?: (biomeId: BiomeId) => void;
  onUpdateWeather?: (weatherId: WeatherId) => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  playerPos,
  playerStats,
  graphics,
  audio,
  controls,
  onResume,
  onRestartAtGarage,
  onResetToRoad,
  onUpdateGraphics,
  onUpdateAudio,
  onUpdateControls,
  onSelectVehicle,
  onSelectColor,
  onUpdateBiome,
  onUpdateWeather,
}) => {
  const [activeTab, setActiveTab] = useState<'scenic' | 'map' | 'vehicle' | 'controls' | 'settings'>('scenic');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg text-white tracking-wide">
              Northbridge Navigation & Settings
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-mono text-emerald-400">
              ${playerStats.credits} Credits
            </span>
          </div>

          <button
            onClick={onResume}
            className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-white/10 bg-slate-900/50 overflow-x-auto">
          {[
            { id: 'scenic', label: 'Landscape & Weather', icon: CloudSun },
            { id: 'map', label: 'Town Map', icon: Compass },
            { id: 'vehicle', label: 'Vehicles & Garage', icon: Palette },
            { id: 'controls', label: 'Controls', icon: Sliders },
            { id: 'settings', label: 'Graphics & Audio', icon: Monitor },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 0: SCENIC ROUTE & WEATHER */}
          {activeTab === 'scenic' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white">Change Landscape Biome</h3>
                <p className="text-xs text-slate-400">Stream a new endless scenic highway on the fly</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                  {Object.values(BIOME_CONFIGS).map((b) => {
                    const isSelected = playerStats.selectedBiome === b.id;
                    return (
                      <button
                        key={b.id}
                        onClick={() => onUpdateBiome?.(b.id)}
                        className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-white'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-sm text-white flex items-center justify-between">
                          <span>{b.name}</span>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                        </div>
                        <div className="text-xs text-amber-400/90 font-medium mt-0.5">{b.tagline}</div>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{b.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <h3 className="text-sm font-bold text-white">Atmosphere & Weather</h3>
                <p className="text-xs text-slate-400">Instantly switch lighting, cloud cover, and tire grip</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
                  {Object.values(WEATHER_CONFIGS).map((w) => {
                    const isSelected = playerStats.selectedWeather === w.id;
                    return (
                      <button
                        key={w.id}
                        onClick={() => onUpdateWeather?.(w.id)}
                        className={`text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-white font-semibold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{w.name}</span>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">Grip: {Math.round(w.gripMultiplier * 100)}%</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: TOWN MAP */}
          {activeTab === 'map' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Explore the 5 connected districts of Northbridge. Your live location is marked by the blue pulse.
              </div>

              {/* 2D Town Map Canvas / SVG rendering */}
              <div className="relative w-full h-80 bg-slate-950 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center p-4">
                <svg viewBox="-320 -320 640 640" className="w-full h-full">
                  {/* Lake */}
                  <ellipse cx="220" cy="190" rx="90" ry="70" fill="#0369a1" opacity="0.6" />
                  <text x="220" y="195" fill="#bae6fd" fontSize="14" textAnchor="middle" fontWeight="bold">Lake Northbridge</text>

                  {/* District Boundaries */}
                  {Object.values(DISTRICTS).map((d) => (
                    <g key={d.id}>
                      <circle
                        cx={d.center[0]}
                        cy={d.center[1]}
                        r={d.radius}
                        fill="none"
                        stroke={d.color}
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        opacity="0.4"
                      />
                      <text
                        x={d.center[0]}
                        y={d.center[1] - d.radius + 18}
                        fill={d.color}
                        fontSize="13"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {d.name}
                      </text>
                    </g>
                  ))}

                  {/* Roads */}
                  {ROAD_NETWORK.map((r, idx) => (
                    <line
                      key={idx}
                      x1={r.p1[0]}
                      y1={r.p1[2]}
                      x2={r.p2[0]}
                      y2={r.p2[2]}
                      stroke={r.isBridge ? '#f59e0b' : '#64748b'}
                      strokeWidth={r.width * 0.7}
                      strokeLinecap="round"
                    />
                  ))}

                  {/* Player Position Indicator */}
                  <g transform={`translate(${playerPos[0]}, ${playerPos[1]})`}>
                    <circle r="12" fill="#38bdf8" opacity="0.3" className="animate-ping" />
                    <circle r="6" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
                  </g>
                </svg>
              </div>

              {/* District Guide Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.values(DISTRICTS).map((d) => (
                  <div key={d.id} className="p-3 rounded-xl bg-slate-800/60 border border-white/5 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <h4 className="text-xs font-bold text-white">{d.name}</h4>
                    </div>
                    <p className="text-[11px] text-slate-400">{d.tagline}</p>
                    <p className="text-[11px] text-sky-300 font-medium">Activity: {d.bestActivities}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: VEHICLES & GARAGE */}
          {activeTab === 'vehicle' && (
            <div className="space-y-6">
              <div className="text-xs text-slate-400">
                Choose a vehicle and paint job. Switch freely during Free Drive or return to the garage.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.values(VEHICLE_CONFIGS).map((v) => {
                  const isUnlocked = playerStats.unlockedVehicles.includes(v.id);
                  const isSelected = playerStats.selectedVehicle === v.id;

                  return (
                    <div
                      key={v.id}
                      onClick={() => {
                        if (isUnlocked) onSelectVehicle(v.id);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-sky-950/40 border-sky-500 shadow-lg shadow-sky-500/10'
                          : isUnlocked
                          ? 'bg-slate-800/50 border-white/10 hover:border-white/30'
                          : 'bg-slate-900/40 border-white/5 opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase">
                            {v.category}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-500/30">
                              ACTIVE
                            </span>
                          )}
                          {!isUnlocked && (
                            <span className="text-[11px] font-mono text-amber-400">
                              ${v.price} Credits
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-sm text-white mb-1">{v.name}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                          {v.description}
                        </p>

                        {/* Specs bars */}
                        <div className="space-y-2 text-[11px] text-slate-400">
                          <div>
                            <div className="flex justify-between">
                              <span>Top Speed</span>
                              <span className="font-mono text-white">{v.topSpeed} km/h</span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
                              <div className="h-full bg-sky-500" style={{ width: `${(v.topSpeed / 180) * 100}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between">
                              <span>Handling</span>
                              <span className="font-mono text-white">{v.handling}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${v.handling}%` }} />
                            </div>
                          </div>

                          <div className="flex justify-between pt-1 text-slate-300">
                            <span>Capacity:</span>
                            <span>{v.passengerCapacity > 0 ? `${v.passengerCapacity} Pass` : `${v.cargoCapacity} Cargo`}</span>
                          </div>
                        </div>
                      </div>

                      {/* Paint Swatches for Selected Vehicle */}
                      {isSelected && (
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <div className="text-[11px] text-slate-400 mb-2">Paint Color:</div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {v.availableColors.map((hex) => (
                              <button
                                key={hex}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectColor(hex);
                                }}
                                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                                  playerStats.selectedColor === hex ? 'scale-125 border-white' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CONTROLS */}
          {activeTab === 'controls' && (
            <div className="space-y-6">
              <div className="text-xs text-slate-400">
                Configure your driving inputs for desktop keyboard or mobile touch screen.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Desktop Keybinds */}
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/10 space-y-3">
                  <h4 className="text-sm font-bold text-white">Keyboard Controls</h4>
                  <div className="space-y-2 text-xs">
                    {[
                      { key: 'W / Up Arrow', desc: 'Accelerate' },
                      { key: 'S / Down Arrow', desc: 'Brake / Reverse' },
                      { key: 'A / D or Left / Right', desc: 'Smooth Steer' },
                      { key: 'Spacebar', desc: 'Handbrake / Drift' },
                      { key: 'E', desc: 'Interact / Doors / Tickets / Load' },
                      { key: 'C', desc: 'Cycle Camera (Chase, Hood, Cabin)' },
                      { key: 'L', desc: 'Toggle Headlights' },
                      { key: 'H', desc: 'Horn' },
                      { key: 'Esc', desc: 'Pause / Settings' },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between py-1 border-b border-white/5">
                        <span className="text-slate-400">{row.desc}</span>
                        <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-white/10 text-sky-300 font-mono text-[11px]">
                          {row.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Touch Settings */}
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/10 space-y-4">
                  <h4 className="text-sm font-bold text-white">Mobile & Touch Options</h4>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Steering Input Mode</span>
                      <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-white/10">
                        <button
                          onClick={() => onUpdateControls({ touchControlMode: 'steering_pad' })}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            controls.touchControlMode === 'steering_pad' ? 'bg-sky-500 text-white' : 'text-slate-400'
                          }`}
                        >
                          Pad
                        </button>
                        <button
                          onClick={() => onUpdateControls({ touchControlMode: 'steering_wheel' })}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            controls.touchControlMode === 'steering_wheel' ? 'bg-sky-500 text-white' : 'text-slate-400'
                          }`}
                        >
                          Wheel
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Optional Tilt Steering</span>
                      <button
                        onClick={() => onUpdateControls({ tiltSteering: !controls.tiltSteering })}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${
                          controls.tiltSteering ? 'bg-sky-500' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            controls.tiltSteering ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GRAPHICS & AUDIO */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Graphics Presets */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Graphics Quality Tier
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {(['low', 'medium', 'high'] as const).map((tier) => (
                    <button
                      key={tier}
                      onClick={() => onUpdateGraphics({ quality: tier })}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold capitalize transition-all ${
                        graphics.quality === tier
                          ? 'bg-sky-500 border-sky-400 text-white shadow-lg shadow-sky-500/20'
                          : 'bg-slate-800 border-white/10 text-slate-300 hover:border-white/20'
                      }`}
                    >
                      {tier} Quality
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-white/5">
                  <span className="text-slate-300">Real-time Vehicle Shadows</span>
                  <input
                    type="checkbox"
                    checked={graphics.shadows}
                    onChange={(e) => onUpdateGraphics({ shadows: e.target.checked })}
                    className="w-4 h-4 accent-sky-500 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-white/5">
                  <span className="text-slate-300">Traffic Density</span>
                  <select
                    value={graphics.trafficDensity}
                    onChange={(e) => onUpdateGraphics({ trafficDensity: e.target.value as 'low' | 'medium' | 'high' })}
                    className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-slate-200 text-xs"
                  >
                    <option value="low">Low (4 cars)</option>
                    <option value="medium">Medium (8 cars)</option>
                    <option value="high">High (14 cars)</option>
                  </select>
                </div>
              </div>

              {/* Audio Volume Sliders */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Audio & Synthesizer
                  </h4>
                  <button
                    onClick={() => onUpdateAudio({ muted: !audio.muted })}
                    className={`px-3 py-1 rounded text-xs font-medium border ${
                      audio.muted ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-slate-800 border-white/10 text-slate-300'
                    }`}
                  >
                    {audio.muted ? 'Muted' : 'Unmuted'}
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between mb-1 text-slate-300">
                      <span>Master Volume</span>
                      <span className="font-mono">{Math.round(audio.masterVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={audio.masterVolume}
                      onChange={(e) => onUpdateAudio({ masterVolume: parseFloat(e.target.value) })}
                      className="w-full accent-sky-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-slate-300">
                      <span>Engine Rev Sound</span>
                      <span className="font-mono">{Math.round(audio.engineVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={audio.engineVolume}
                      onChange={(e) => onUpdateAudio({ engineVolume: parseFloat(e.target.value) })}
                      className="w-full accent-sky-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-slate-300">
                      <span>Effects & Horn</span>
                      <span className="font-mono">{Math.round(audio.sfxVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={audio.sfxVolume}
                      onChange={(e) => onUpdateAudio({ sfxVolume: parseFloat(e.target.value) })}
                      className="w-full accent-sky-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <button
              onClick={onRestartAtGarage}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset at Garage</span>
            </button>

            {onResetToRoad && (
              <button
                onClick={() => {
                  onResetToRoad();
                  onResume();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:text-emerald-100 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Car to Road</span>
              </button>
            )}
          </div>

          <button
            onClick={onResume}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-sky-400 hover:bg-sky-300 transition-colors shadow-lg shadow-sky-400/20"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Resume Driving</span>
          </button>
        </div>
      </div>
    </div>
  );
};
