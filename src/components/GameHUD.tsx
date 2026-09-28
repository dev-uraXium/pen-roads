import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Heart,
  Lightbulb,
  MessageSquare,
  Package,
  Pause,
  ShieldAlert,
  Ticket,
  Volume2,
  XCircle,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { CameraViewMode } from '../game/GameEngine';
import { JobDefinition } from '../types/game';
import { MiniMap } from './MiniMap';

interface GameHUDProps {
  speedKmh: number;
  gear: string;
  rpm: number;
  isDrifting: boolean;
  isJackknifing?: boolean;
  playerPos: [number, number];
  playerHeading: number;
  activeJob: JobDefinition | null;
  jobPromptText: string;
  canInteract: boolean;
  busDoorsOpen: boolean;
  ticketsRemaining: number;
  cameraMode: CameraViewMode;
  headlightsOn: boolean;
  currentBiomeName?: string;
  currentWeatherName?: string;
  nearbyPOI?: { id: string; name: string; type: string; description: string } | null;
  nearMissAlert?: { bonus: number; combo: number } | null;
  ticketFeedbackMessage?: string | null;
  onInteractPOI?: () => void;
  onInteract: () => void;
  onInspectTicket?: (accept: boolean) => void;
  onSelectParcel?: (index: number) => void;
  onCycleCamera: () => void;
  onToggleHeadlights: () => void;
  onHornStart: () => void;
  onHornStop: () => void;
  onPause: () => void;
  // Touch inputs
  onTouchSteer: (val: number) => void;
  onTouchThrottle: (val: number) => void;
  onTouchBrake: (val: number) => void;
  onTouchHandbrake: (val: boolean) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  speedKmh,
  gear,
  rpm,
  isDrifting,
  isJackknifing,
  playerPos,
  playerHeading,
  activeJob,
  jobPromptText,
  canInteract,
  busDoorsOpen,
  cameraMode,
  headlightsOn,
  currentBiomeName,
  currentWeatherName,
  nearbyPOI,
  nearMissAlert,
  ticketFeedbackMessage,
  onInteractPOI,
  onInteract,
  onInspectTicket,
  onSelectParcel,
  onCycleCamera,
  onToggleHeadlights,
  onHornStart,
  onHornStop,
  onPause,
  onTouchSteer,
  onTouchThrottle,
  onTouchBrake,
  onTouchHandbrake,
}) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [steerTouchId, setSteerTouchId] = useState<number | null>(null);
  const [steerOffset, setSteerOffset] = useState(0); // -1 to 1
  const [showManifest, setShowManifest] = useState(true);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Distance to target
  let distanceMeters: number | null = null;
  if (activeJob) {
    let target: [number, number, number] | undefined;
    if (activeJob.type === 'bus_route' && activeJob.busStops) {
      target = activeJob.busStops[activeJob.currentBusStopIndex || 0]?.position;
    } else if (activeJob.parcels) {
      const idx = activeJob.activeParcelIndex || 0;
      target = activeJob.parcels[idx]?.position;
    } else if (activeJob.parkingBay) {
      target = activeJob.parkingBay.position;
    } else {
      target = activeJob.pickupPos;
    }

    if (target) {
      distanceMeters = Math.round(Math.hypot(playerPos[0] - target[0], playerPos[1] - target[2]));
    }
  }

  // Touch Steering Pad Handlers
  const handleSteerTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (steerTouchId !== null) return;
    const touch = e.changedTouches[0];
    setSteerTouchId(touch.identifier);
    updateSteerTouch(touch, e.currentTarget);
  };

  const handleSteerTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === steerTouchId) {
        updateSteerTouch(touch, e.currentTarget);
        break;
      }
    }
  };

  const handleSteerTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === steerTouchId) {
        setSteerTouchId(null);
        setSteerOffset(0);
        onTouchSteer(0);
        break;
      }
    }
  };

  const updateSteerTouch = (touch: React.Touch, elem: HTMLElement) => {
    const rect = elem.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const maxDelta = rect.width / 2;
    const deltaX = touch.clientX - centerX;
    const clamped = Math.max(-1, Math.min(1, deltaX / maxDelta));
    setSteerOffset(clamped);
    onTouchSteer(clamped);
  };

  const currentBusPassenger =
    activeJob?.type === 'bus_route' &&
    activeJob.passengerQueue &&
    activeJob.currentPassengerIndex !== undefined &&
    activeJob.currentPassengerIndex < activeJob.passengerQueue.length
      ? activeJob.passengerQueue[activeJob.currentPassengerIndex]
      : null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-3 md:p-6 overflow-hidden">
      {/* 1. TOP BAR & JOB OBJECTIVE STRIP */}
      <div className="flex items-start justify-between w-full gap-4">
        {/* Top-Left: Navigation buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onPause}
            className="w-11 h-11 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700/60 text-white flex items-center justify-center hover:bg-slate-800 transition-colors shadow-lg active:scale-95 cursor-pointer"
            title="Pause & Settings (Esc)"
          >
            <Pause className="w-5 h-5 text-slate-200" />
          </button>

          <button
            onClick={onCycleCamera}
            className="w-11 h-11 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700/60 text-white flex items-center justify-center hover:bg-slate-800 transition-colors shadow-lg active:scale-95 cursor-pointer"
            title="Switch Camera (C)"
          >
            <Camera className="w-5 h-5 text-slate-200" />
          </button>
        </div>

        {/* Top-Center: Job Objective Glass Banner OR Quiet Scenic Banner */}
        {activeJob ? (
          <div className="flex-1 max-w-xl mx-auto rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800 p-3 shadow-2xl pointer-events-auto">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold text-sky-400 uppercase tracking-wider text-[11px]">
                {activeJob.type.replace('_', ' ')}
              </span>
              <div className="flex items-center gap-3">
                {distanceMeters !== null && (
                  <span className="font-mono tabular-nums text-slate-300">
                    {distanceMeters > 1000 ? `${(distanceMeters / 1000).toFixed(1)} km` : `${distanceMeters} m`}
                  </span>
                )}
                {activeJob.legTimeRemaining !== undefined && (
                  <span className="flex items-center gap-1 font-mono text-amber-400">
                    <Clock className="w-3 h-3" />
                    <span>{Math.round(activeJob.legTimeRemaining)}s</span>
                  </span>
                )}
                <span className="text-emerald-400 font-bold font-mono tabular-nums">
                  +${activeJob.baseReward}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-sm md:text-base font-bold text-white truncate max-w-xs md:max-w-md">
                {activeJob.title}
              </h2>
            </div>

            {/* Status indicators */}
            <div className="mt-2 flex items-center gap-4 text-xs">
              {activeJob.type === 'bus_route' && activeJob.busStops && (
                <div className="flex items-center gap-2 text-amber-300">
                  <Ticket className="w-3.5 h-3.5" />
                  <span>
                    Stop {(activeJob.currentBusStopIndex || 0) + 1} of {activeJob.busStops.length}:{' '}
                    {activeJob.busStops[activeJob.currentBusStopIndex || 0]?.name}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="font-mono text-emerald-400">
                    Tickets: {activeJob.ticketsSold || 0}
                  </span>
                  {activeJob.dodgersCaught ? (
                    <span className="font-mono text-amber-400">
                      (Dodgers: {activeJob.dodgersCaught})
                    </span>
                  ) : null}
                </div>
              )}

              {activeJob.passengerComfort !== undefined && (
                <div className="flex items-center gap-2 text-rose-300">
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                  <span className="text-[11px] text-slate-300">Comfort:</span>
                  <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                    <div
                      className={`h-full transition-all duration-300 ${
                        activeJob.passengerComfort > 60 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${activeJob.passengerComfort}%` }}
                    />
                  </div>
                  <span className="font-mono tabular-nums text-xs">{activeJob.passengerComfort}%</span>
                </div>
              )}

              {activeJob.cargoHealth !== undefined && (
                <div className="flex items-center gap-2 text-amber-300">
                  <Package className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] text-slate-300">Cargo:</span>
                  <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                    <div
                      className={`h-full transition-all duration-300 ${
                        activeJob.cargoHealth > 70 ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${activeJob.cargoHealth}%` }}
                    />
                  </div>
                  <span className="font-mono tabular-nums text-xs">{activeJob.cargoHealth}%</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 max-w-md mx-auto flex items-center justify-center pointer-events-auto">
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-700/60 backdrop-blur-md text-xs text-slate-200 shadow-xl">
              <Compass className="w-4 h-4 text-sky-400" />
              <span className="font-semibold text-white">{currentBiomeName || 'Alpine Pass'}</span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-400">{currentWeatherName || 'Clear Morning'}</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-medium text-[11px]">Free Roam</span>
            </div>
          </div>
        )}

        {/* Top-Right: Mini-Map */}
        <div className="pointer-events-auto">
          <MiniMap
            playerPos={playerPos}
            playerHeading={playerHeading}
            targetPos={
              activeJob
                ? activeJob.type === 'bus_route' && activeJob.busStops
                  ? activeJob.busStops[activeJob.currentBusStopIndex || 0]?.position
                  : activeJob.parcels
                  ? activeJob.parcels[activeJob.activeParcelIndex || 0]?.position
                  : activeJob.pickupPos
                : null
            }
          />
        </div>
      </div>

      {/* 2. DYNAMIC NOTIFICATIONS & SPECIAL WORK WIDGETS */}
      <div className="flex flex-col items-center justify-center my-auto pointer-events-auto gap-3">
        {/* Truck Jackknife Alert */}
        {isJackknifing && (
          <div className="bg-rose-950/90 border border-rose-500 text-rose-200 px-5 py-2.5 rounded-2xl backdrop-blur-md shadow-2xl flex items-center gap-3 animate-pulse">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="text-left">
              <div className="font-bold text-xs uppercase tracking-wide text-white">Jackknife Warning!</div>
              <div className="text-[11px] text-rose-300">Trailer angle exceeded safety limit — ease steering</div>
            </div>
          </div>
        )}

        {/* Bike Near-Miss Combo Alert */}
        {nearMissAlert && (
          <div className="bg-amber-950/85 border border-amber-400 text-amber-200 px-5 py-2 rounded-2xl backdrop-blur-md shadow-2xl flex items-center gap-2.5 animate-bounce">
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span className="font-extrabold tracking-wide text-xs">
              +${nearMissAlert.bonus} NEAR MISS
            </span>
            {nearMissAlert.combo > 1 && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-black">
                x{nearMissAlert.combo} COMBO
              </span>
            )}
          </div>
        )}

        {/* Passenger Reaction Dialogue Bubble (Taxi) */}
        {activeJob?.passengerDialogue && (
          <div className="max-w-md bg-slate-900/90 border border-sky-500/40 rounded-2xl px-4 py-2.5 shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs text-slate-200 animate-in fade-in duration-300">
            <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-sky-300 text-[11px] block">Passenger:</span>
              <span>"{activeJob.passengerDialogue.text}"</span>
            </div>
          </div>
        )}

        {/* BUS TICKET INSPECTION INTERACTION CARD */}
        {activeJob?.type === 'bus_route' && busDoorsOpen && (
          <div className="bg-slate-950/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-5 shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between text-xs text-amber-400 font-semibold mb-2">
              <span className="uppercase tracking-wider text-[10px]">Bus Route Transit Check</span>
              <span className="text-slate-400">
                Stop {(activeJob.currentBusStopIndex || 0) + 1} / {activeJob.busStops?.length}
              </span>
            </div>

            {currentBusPassenger ? (
              <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 mb-4">
                <div className="text-xs text-slate-400 font-medium">Boarding Passenger:</div>
                <div className="text-base font-bold text-white mt-0.5">{currentBusPassenger.name}</div>
                <div className="mt-2 text-xs flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <Ticket className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="text-slate-300 truncate">{currentBusPassenger.ticketType}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-emerald-400 font-bold text-sm">
                All waiting passengers have boarded!
              </div>
            )}

            {ticketFeedbackMessage && (
              <div className="mb-3 text-xs text-center font-medium text-amber-300 bg-amber-500/10 py-1.5 px-2 rounded-lg border border-amber-500/20">
                {ticketFeedbackMessage}
              </div>
            )}

            {currentBusPassenger ? (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => onInspectTicket?.(true)}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Accept Pass</span>
                </button>
                <button
                  onClick={() => onInspectTicket?.(false)}
                  className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Catch Dodger</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onInteract}
                className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 cursor-pointer"
              >
                <span>Close Doors & Continue Route [E]</span>
              </button>
            )}
          </div>
        )}

        {/* VAN MULTI-STOP DELIVERY MANIFEST WIDGET */}
        {activeJob?.parcels && activeJob.parcels.length > 0 && (
          <div className="bg-slate-950/90 backdrop-blur-lg border border-slate-800 rounded-2xl p-3 max-w-md w-full shadow-2xl">
            <div
              onClick={() => setShowManifest(!showManifest)}
              className="flex items-center justify-between text-xs text-slate-300 font-semibold cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 text-sky-400">
                <Package className="w-4 h-4" />
                <span>DELIVERY MANIFEST ({activeJob.parcels.filter((p) => p.delivered).length}/{activeJob.parcels.length})</span>
              </div>
              <button className="text-slate-400 hover:text-white">
                {showManifest ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showManifest && (
              <div className="mt-2 space-y-1.5">
                {activeJob.parcels.map((parcel, idx) => {
                  const isCurrent = activeJob.activeParcelIndex === idx;
                  return (
                    <div
                      key={parcel.id}
                      onClick={() => !parcel.delivered && onSelectParcel?.(idx)}
                      className={`p-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        parcel.delivered
                          ? 'bg-slate-900/40 text-slate-500 line-through'
                          : isCurrent
                          ? 'bg-sky-950/80 border border-sky-500/50 text-white cursor-pointer'
                          : 'bg-slate-900/70 border border-slate-800 text-slate-300 hover:bg-slate-800 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {parcel.delivered ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-sky-400 shrink-0" />
                        )}
                        <span className="truncate">{parcel.name}</span>
                        {parcel.isFragile && (
                          <span className="text-[10px] text-amber-400 shrink-0">Fragile</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                        {parcel.destinationName}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* General Action Prompt (Pickup / Dropoff) */}
        {canInteract && !(activeJob?.type === 'bus_route' && busDoorsOpen) && (
          <button
            onClick={onInteract}
            className="pointer-events-auto px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm tracking-wide shadow-2xl border border-emerald-400/40 backdrop-blur-md flex items-center gap-3 transition-transform active:scale-95 animate-bounce cursor-pointer"
          >
            <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-mono text-xs">
              E
            </span>
            <span>{jobPromptText}</span>
          </button>
        )}

        {/* Scenic Roadside Landmark / POI Action Button */}
        {!activeJob && nearbyPOI && (
          <button
            onClick={onInteractPOI}
            className="pointer-events-auto px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm tracking-wide shadow-2xl border border-amber-300/40 backdrop-blur-md flex items-center gap-3 transition-transform active:scale-95 animate-bounce cursor-pointer"
          >
            <span className="w-7 h-7 rounded-lg bg-slate-950/20 flex items-center justify-center font-mono text-xs text-slate-950 font-bold">
              E
            </span>
            <span>
              {nearbyPOI.type === 'rest_stop'
                ? `Take a Break at ${nearbyPOI.name}`
                : nearbyPOI.type === 'viewpoint'
                ? `Admire Scenic Viewpoint (${nearbyPOI.name})`
                : nearbyPOI.type === 'shelter'
                ? `Board Passengers at ${nearbyPOI.name}`
                : `Load Cargo at ${nearbyPOI.name}`}
            </span>
          </button>
        )}
      </div>

      {/* 3. BOTTOM ROW: SPEEDOMETER, GAUGES & CONTROLS */}
      <div className="flex items-end justify-between w-full">
        {/* Left Side: Touch Steering Pad OR Desktop Keys Info */}
        <div className="pointer-events-auto">
          {isTouchDevice ? (
            <div
              onTouchStart={handleSteerTouchStart}
              onTouchMove={handleSteerTouchMove}
              onTouchEnd={handleSteerTouchEnd}
              onTouchCancel={handleSteerTouchEnd}
              className="relative w-36 h-36 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/20 flex items-center justify-center touch-none shadow-xl"
            >
              <div
                className="w-16 h-16 rounded-full bg-sky-500/80 shadow-lg border border-white/30 flex items-center justify-center transition-transform"
                style={{
                  transform: `translateX(${steerOffset * 40}px)`,
                }}
              >
                <Compass className="w-6 h-6 text-white" />
              </div>
              <span className="absolute bottom-2 text-[10px] text-slate-400 tracking-wider font-semibold">
                STEER
              </span>
            </div>
          ) : (
            <div className="hidden md:flex flex-col gap-1 text-[11px] text-slate-400 bg-slate-950/70 backdrop-blur-sm p-3 rounded-xl border border-slate-800">
              <div>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">W</kbd> Gas ·{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">S</kbd> Brake ·{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">A</kbd>{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">D</kbd> Steer ·{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">Space</kbd> Handbrake
              </div>
              <div>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">E</kbd> Action ·{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">C</kbd> Camera ·{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">L</kbd> Lights ·{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">H</kbd> Horn
              </div>
            </div>
          )}
        </div>

        {/* Center: Sleek Speedometer Dashboard */}
        <div className="flex flex-col items-center">
          <div className="relative flex items-baseline justify-center px-6 py-3 rounded-3xl bg-slate-950/85 backdrop-blur-md border border-slate-800 shadow-2xl">
            {/* Speed digits */}
            <span className="font-mono tabular-nums text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              {Math.abs(speedKmh)}
            </span>
            <span className="ml-1.5 text-xs font-semibold text-slate-400 uppercase">
              km/h
            </span>

            {/* Gear Indicator */}
            <div className="ml-4 pl-3 border-l border-slate-800 flex flex-col items-center">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">GEAR</span>
              <span className="font-mono font-bold text-lg text-sky-400">{gear}</span>
            </div>

            {/* Drift Alert */}
            {isDrifting && (
              <span className="absolute -top-3 px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[10px] tracking-wider animate-pulse">
                DRIFT
              </span>
            )}
          </div>

          {/* Quick status controls */}
          <div className="flex items-center gap-2 mt-2 pointer-events-auto">
            <button
              onClick={onToggleHeadlights}
              className={`p-2 rounded-lg border text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                headlightsOn
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:text-white'
              }`}
              title="Toggle Headlights (L)"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Lights</span>
            </button>

            <button
              onMouseDown={onHornStart}
              onMouseUp={onHornStop}
              onTouchStart={onHornStart}
              onTouchEnd={onHornStop}
              className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/60 text-slate-400 hover:text-white active:bg-slate-800 transition-colors text-xs flex items-center gap-1 cursor-pointer"
              title="Vehicle Horn (H)"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Horn</span>
            </button>
          </div>
        </div>

        {/* Right Side: Touch Throttle & Brake Pedals (on touch) */}
        <div className="pointer-events-auto flex items-end gap-3">
          {isTouchDevice ? (
            <div className="flex items-end gap-2 touch-none">
              {/* Brake / Reverse Pedal */}
              <button
                onTouchStart={() => onTouchBrake(1)}
                onTouchEnd={() => onTouchBrake(0)}
                onTouchCancel={() => onTouchBrake(0)}
                className="w-16 h-24 rounded-2xl bg-rose-600/80 active:bg-rose-500 border border-rose-400/40 shadow-xl flex flex-col items-center justify-center text-white font-bold text-xs"
              >
                <span>BRAKE</span>
                <span className="text-[10px] text-rose-200">REV</span>
              </button>

              {/* Handbrake Button */}
              <button
                onTouchStart={() => onTouchHandbrake(true)}
                onTouchEnd={() => onTouchHandbrake(false)}
                className="w-12 h-16 rounded-xl bg-amber-600/80 active:bg-amber-500 border border-amber-400/40 shadow-xl flex items-center justify-center text-white font-bold text-[10px]"
              >
                DRIFT
              </button>

              {/* Accel Pedal */}
              <button
                onTouchStart={() => onTouchThrottle(1)}
                onTouchEnd={() => onTouchThrottle(0)}
                onTouchCancel={() => onTouchThrottle(0)}
                className="w-16 h-32 rounded-2xl bg-emerald-600/80 active:bg-emerald-500 border border-emerald-400/40 shadow-xl flex flex-col items-center justify-center text-white font-bold text-xs"
              >
                <span>DRIVE</span>
                <span className="text-[10px] text-emerald-200">GAS</span>
              </button>
            </div>
          ) : (
            <div className="text-right text-[11px] text-slate-400 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500">Camera:</span> <span className="text-white capitalize">{cameraMode}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
