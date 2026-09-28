/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CustomizeDriveModal } from './components/CustomizeDriveModal';
import { GameHUD } from './components/GameHUD';
import { GarageMenu } from './components/GarageMenu';
import { JobCompleteModal } from './components/JobCompleteModal';
import { PauseMenu } from './components/PauseMenu';
import { TitleScreen } from './components/TitleScreen';
import { soundSynth } from './game/audio/SoundSynthesizer';
import { CameraViewMode, GameEngine } from './game/GameEngine';
import { AVAILABLE_JOBS } from './game/jobs/JobSystem';
import { BIOME_CONFIGS } from './game/world/BiomeConfigs';
import { WEATHER_CONFIGS } from './game/world/WeatherConfigs';
import {
  AudioSettings,
  BiomeId,
  ControlSettings,
  GameMode,
  GraphicsSettings,
  JobDefinition,
  JobResult,
  PlayerStats,
  PointOfInterest,
  VehicleId,
  WeatherId,
} from './types/game';

const INITIAL_PLAYER_STATS: PlayerStats = {
  credits: 500,
  reputationXp: 150,
  reputationLevel: 1,
  reputationTitle: 'Scenic Explorer',
  jobsCompleted: 0,
  unlockedVehicles: ['city_car', 'delivery_van', 'city_bus', 'camper_van'],
  selectedVehicle: 'city_car',
  selectedColor: '#3B82F6',
  selectedWheel: 'sport',
  selectedWeather: 'clear_morning',
  selectedBiome: 'alpine_pass',
  selectedRoadStyle: 'scenic_winding',
  seed: 42,
  enableJobs: false,
  selectedMode: 'pure_drive',
};

export default function App() {
  const [gameState, setGameState] = useState<'title' | 'garage' | 'driving' | 'paused'>('title');
  const [showCustomize, setShowCustomize] = useState<boolean>(false);

  // Player Stats with localStorage persistence
  const [playerStats, setPlayerStats] = useState<PlayerStats>(() => {
    try {
      const saved = localStorage.getItem('open_roads_player_stats');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_PLAYER_STATS,
          ...parsed,
          unlockedVehicles: Array.from(new Set([...(parsed.unlockedVehicles || []), 'camper_van'])),
        };
      }
    } catch {
      // Ignore
    }
    return INITIAL_PLAYER_STATS;
  });

  // Settings
  const [graphics, setGraphics] = useState<GraphicsSettings>({
    quality: 'medium',
    renderScale: 1.0,
    shadows: true,
    particleDensity: 'medium',
    trafficDensity: 'medium',
    bloom: false,
  });

  const [audio, setAudio] = useState<AudioSettings>({
    masterVolume: 0.8,
    engineVolume: 0.7,
    sfxVolume: 0.8,
    ambienceVolume: 0.6,
    muted: false,
  });

  const [controls, setControls] = useState<ControlSettings>({
    touchControlMode: 'steering_pad',
    steeringSensitivity: 1.0,
    tiltSteering: false,
  });

  // Live Vehicle Telemetry
  const [speedKmh, setSpeedKmh] = useState(0);
  const [gear, setGear] = useState('P');
  const [rpm, setRpm] = useState(900);
  const [isDrifting, setIsDrifting] = useState(false);
  const [isJackknifing, setIsJackknifing] = useState(false);
  const [playerPos, setPlayerPos] = useState<[number, number]>([0, 15]);
  const [playerHeading, setPlayerHeading] = useState(0);

  // Job & Mission State
  const [activeJob, setActiveJob] = useState<JobDefinition | null>(null);
  const [jobPromptText, setJobPromptText] = useState('');
  const [canInteract, setCanInteract] = useState(false);
  const [busDoorsOpen, setBusDoorsOpen] = useState(false);
  const [ticketsRemaining, setTicketsRemaining] = useState(0);
  const [jobCompletedResult, setJobCompletedResult] = useState<JobResult | null>(null);
  const [nearMissAlert, setNearMissAlert] = useState<{ bonus: number; combo: number } | null>(null);
  const [ticketFeedbackMessage, setTicketFeedbackMessage] = useState<string | null>(null);

  // Roadside POI Landmark
  const [nearbyPOI, setNearbyPOI] = useState<PointOfInterest | null>(null);

  // Vehicle Rig State
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('chase');
  const [headlightsOn, setHeadlightsOn] = useState(false);

  // Engine instance
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Persist stats changes
  useEffect(() => {
    try {
      localStorage.setItem('open_roads_player_stats', JSON.stringify(playerStats));
    } catch {
      // Ignore
    }
  }, [playerStats]);

  // Audio settings sync
  useEffect(() => {
    soundSynth.updateSettings(audio);
  }, [audio]);

  // Initialize GameEngine once canvas is mounted
  const initEngine = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || engineRef.current) return;

    const engine = new GameEngine(canvas);
    engineRef.current = engine;

    // Telemetry hook
    engine.onTelemetryUpdate = (data) => {
      setSpeedKmh(data.speedKmh);
      setGear(data.gear);
      setRpm(data.rpm);
      setPlayerPos(data.playerPos);
      setPlayerHeading(data.playerHeading);
      setIsDrifting(data.isDrifting);
      setIsJackknifing(data.isJackknifing);
    };

    // Near miss hook (bike & agile courier runs)
    engine.onNearMiss = (bonus, combo) => {
      setNearMissAlert({ bonus, combo });
      setTimeout(() => setNearMissAlert(null), 2500);
    };

    // Passenger dialogue hook (taxi rides)
    engine.onPassengerDialogue = () => {
      if (engine.jobSys.activeJob) {
        setActiveJob({ ...engine.jobSys.activeJob });
      }
    };

    // Job update hook
    engine.onJobUpdate = (data) => {
      setCanInteract(data.canInteract);
      setJobPromptText(data.promptText);
      if (engine.jobSys.activeJob) {
        setActiveJob({ ...engine.jobSys.activeJob });
        setBusDoorsOpen(engine.jobSys.busDoorsOpen);
        setTicketsRemaining(
          Math.max(0, engine.jobSys.passengerQueue.length - engine.jobSys.currentPassengerIndex)
        );
      }
    };

    // POI update hook
    engine.onPOINearby = (poi) => {
      setNearbyPOI(poi);
    };

    // Job completion hook
    engine.onJobCompleted = (result) => {
      setJobCompletedResult(result);

      // Update player wallet & reputation
      setPlayerStats((prev) => {
        const newCredits = prev.credits + result.finalReward;
        const newXp = prev.reputationXp + result.reputationGained;
        const newLevel = Math.floor(newXp / 300) + 1;
        const titles = ['Scenic Explorer', 'Highway Rover', 'Mountain Voyager', 'Open Roads Legend'];
        const titleIdx = Math.min(titles.length - 1, newLevel - 1);

        return {
          ...prev,
          credits: newCredits,
          reputationXp: newXp,
          reputationLevel: newLevel,
          reputationTitle: titles[titleIdx],
          jobsCompleted: prev.jobsCompleted + 1,
        };
      });
    };

    // Set initial environment & vehicle
    engine.setGraphics(graphics);
    engine.setBiome(playerStats.selectedBiome || 'alpine_pass', playerStats.seed || 42);
    engine.spawnVehicle(playerStats.selectedVehicle || 'city_car', playerStats.selectedColor);
    engine.setWeather(playerStats.selectedWeather || 'clear_morning');
    engine.start();
  }, [graphics, playerStats]);

  useEffect(() => {
    initEngine();
  }, [initEngine]);

  // Instant Launch from Title Screen
  const handleDriveNow = () => {
    soundSynth.ensureContext();
    if (!engineRef.current) {
      initEngine();
    } else {
      engineRef.current.resume();
    }
    setGameState('driving');
  };

  // Apply customizations and drive
  const handleApplyAndDrive = (updates: {
    biome: BiomeId;
    weather: WeatherId;
    mode: GameMode;
    vehicle: VehicleId;
    seed: number;
    graphics: GraphicsSettings;
  }) => {
    soundSynth.ensureContext();
    setPlayerStats((prev) => ({
      ...prev,
      selectedBiome: updates.biome,
      selectedWeather: updates.weather,
      selectedMode: updates.mode,
      selectedVehicle: updates.vehicle,
      seed: updates.seed,
    }));
    setGraphics(updates.graphics);

    if (engineRef.current) {
      engineRef.current.setGraphics(updates.graphics);
      engineRef.current.setBiome(updates.biome, updates.seed);
      engineRef.current.spawnVehicle(updates.vehicle, playerStats.selectedColor);
      engineRef.current.setWeather(updates.weather);
      engineRef.current.resume();
    }

    setShowCustomize(false);
    setGameState('driving');
  };

  // Launch from Garage
  const handleStartDriveFromGarage = (
    vehicleId: VehicleId,
    color: string,
    weatherId: WeatherId,
    mode: GameMode,
    jobId?: string
  ) => {
    soundSynth.ensureContext();
    setPlayerStats((prev) => ({
      ...prev,
      selectedVehicle: vehicleId,
      selectedColor: color,
      selectedWeather: weatherId,
      selectedMode: mode,
    }));

    if (engineRef.current) {
      engineRef.current.spawnVehicle(vehicleId, color);
      engineRef.current.setWeather(weatherId);
      if (mode === 'quick_job' && jobId) {
        const startedJob = engineRef.current.jobSys.selectJob(jobId);
        setActiveJob(startedJob ? { ...startedJob } : null);
      } else {
        engineRef.current.jobSys.cancelJob();
        setActiveJob(null);
      }
      engineRef.current.resume();
    }

    setGameState('driving');
  };

  // Unlock vehicle in garage
  const handleUnlockVehicle = (vehicleId: VehicleId) => {
    setPlayerStats((prev) => {
      if (prev.unlockedVehicles.includes(vehicleId)) return prev;
      return {
        ...prev,
        credits: Math.max(0, prev.credits - 500),
        unlockedVehicles: [...prev.unlockedVehicles, vehicleId],
      };
    });
  };

  // Roadside POI Interaction
  const handleInteractPOI = () => {
    if (engineRef.current) {
      const reward = engineRef.current.interactPOI();
      if (reward) {
        setJobCompletedResult({
          job: {
            id: 'poi_stop',
            title: nearbyPOI?.name || 'Scenic Rest Stop',
            type: 'cargo',
            districtFrom: 'pine_ridge',
            districtTo: 'pine_ridge',
            baseReward: reward.credits,
            pickupPos: [0, 0, 0],
            dropoffPos: [0, 0, 0],
            targetName: nearbyPOI?.name || 'Scenic Highway',
            weatherBonusPct: 0,
          },
          success: true,
          baseReward: reward.credits,
          safetyBonus: 0,
          weatherBonus: 0,
          penalties: 0,
          finalReward: reward.credits,
          reputationGained: reward.xp,
          timeTakenFormatted: '0:45',
        });
      }
    }
  };

  // Job Context Interaction
  const handleInteract = () => {
    if (engineRef.current) {
      engineRef.current.interact();
    }
  };

  const handleInspectTicket = (accept: boolean) => {
    if (engineRef.current) {
      const res = engineRef.current.inspectBusPassenger(accept);
      setTicketFeedbackMessage(res.message);
      setTimeout(() => setTicketFeedbackMessage(null), 3000);
      if (engineRef.current.jobSys.activeJob) {
        setActiveJob({ ...engineRef.current.jobSys.activeJob });
      }
    }
  };

  const handleSelectParcel = (index: number) => {
    if (engineRef.current) {
      engineRef.current.selectParcel(index);
      if (engineRef.current.jobSys.activeJob) {
        setActiveJob({ ...engineRef.current.jobSys.activeJob });
      }
    }
  };

  const handleCycleCamera = () => {
    if (engineRef.current) {
      const mode = engineRef.current.cycleCamera();
      setCameraMode(mode);
    }
  };

  const handleToggleHeadlights = () => {
    if (engineRef.current) {
      const state = engineRef.current.toggleHeadlights();
      setHeadlightsOn(state);
    }
  };

  const handlePause = () => {
    if (engineRef.current) {
      engineRef.current.pause();
    }
    setGameState('paused');
  };

  const handleResume = () => {
    if (engineRef.current) {
      engineRef.current.resume();
    }
    setGameState('driving');
  };

  const handleReturnToTitle = () => {
    setGameState('title');
  };

  // Keyboard Escape listener for pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (gameState === 'driving') {
          handlePause();
        } else if (gameState === 'paused') {
          handleResume();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const activeBiomeInfo = BIOME_CONFIGS[playerStats.selectedBiome] || BIOME_CONFIGS.alpine_pass;
  const activeWeatherInfo = WEATHER_CONFIGS[playerStats.selectedWeather] || WEATHER_CONFIGS.clear_morning;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas (Always present in DOM to retain context & scenic background) */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />

      {/* 1. TITLE SCREEN (CALM HERO SCREEN) */}
      {gameState === 'title' && (
        <TitleScreen
          stats={playerStats}
          onDriveNow={handleDriveNow}
          onOpenCustomize={() => setShowCustomize(true)}
          onOpenGarage={() => setGameState('garage')}
          onOpenJobs={() => {
            setPlayerStats((prev) => ({ ...prev, selectedMode: 'work_route' }));
            setShowCustomize(true);
          }}
          onOpenSettings={() => setGameState('paused')}
        />
      )}

      {/* 2. CUSTOMIZE DRIVE MODAL */}
      <CustomizeDriveModal
        stats={playerStats}
        graphics={graphics}
        isOpen={showCustomize}
        onClose={() => setShowCustomize(false)}
        onApplyAndDrive={handleApplyAndDrive}
      />

      {/* 3. GARAGE LAUNCHER VIEW */}
      {gameState === 'garage' && (
        <div className="absolute inset-0 z-30">
          <GarageMenu
            playerStats={playerStats}
            onStartDrive={handleStartDriveFromGarage}
            onUnlockVehicle={handleUnlockVehicle}
          />
        </div>
      )}

      {/* 4. IN-GAME DRIVING HUD */}
      {gameState === 'driving' && (
        <GameHUD
          speedKmh={speedKmh}
          gear={gear}
          rpm={rpm}
          isDrifting={isDrifting}
          isJackknifing={isJackknifing}
          playerPos={playerPos}
          playerHeading={playerHeading}
          activeJob={activeJob}
          jobPromptText={jobPromptText}
          canInteract={canInteract}
          busDoorsOpen={busDoorsOpen}
          ticketsRemaining={ticketsRemaining}
          cameraMode={cameraMode}
          headlightsOn={headlightsOn}
          currentBiomeName={activeBiomeInfo.name}
          currentWeatherName={activeWeatherInfo.name}
          nearbyPOI={nearbyPOI}
          nearMissAlert={nearMissAlert}
          ticketFeedbackMessage={ticketFeedbackMessage}
          onInteractPOI={handleInteractPOI}
          onInteract={handleInteract}
          onInspectTicket={handleInspectTicket}
          onSelectParcel={handleSelectParcel}
          onCycleCamera={handleCycleCamera}
          onToggleHeadlights={handleToggleHeadlights}
          onHornStart={() => soundSynth.startHorn()}
          onHornStop={() => soundSynth.stopHorn()}
          onPause={handlePause}
          onTouchSteer={(val) => {
            if (engineRef.current) engineRef.current.input.steer = val;
          }}
          onTouchThrottle={(val) => {
            if (engineRef.current) engineRef.current.input.throttle = val;
          }}
          onTouchBrake={(val) => {
            if (engineRef.current) engineRef.current.input.brake = val;
          }}
          onTouchHandbrake={(val) => {
            if (engineRef.current) engineRef.current.input.handbrake = val;
          }}
        />
      )}

      {/* 5. PAUSE & SETTINGS MODAL */}
      {gameState === 'paused' && (
        <PauseMenu
          playerPos={playerPos}
          playerStats={playerStats}
          graphics={graphics}
          audio={audio}
          controls={controls}
          onResume={handleResume}
          onRestartAtGarage={handleReturnToTitle}
          onResetToRoad={() => {
            engineRef.current?.resetVehicleToSpawn();
          }}
          onUpdateBiome={(biomeId) => {
            setPlayerStats((prev) => ({ ...prev, selectedBiome: biomeId }));
            engineRef.current?.setBiome(biomeId, playerStats.seed);
          }}
          onUpdateWeather={(weatherId) => {
            setPlayerStats((prev) => ({ ...prev, selectedWeather: weatherId }));
            engineRef.current?.setWeather(weatherId);
          }}
          onUpdateGraphics={(newG) => {
            setGraphics((prev) => {
              const merged = { ...prev, ...newG };
              engineRef.current?.setGraphics(merged);
              return merged;
            });
          }}
          onUpdateAudio={(newA) => {
            setAudio((prev) => ({ ...prev, ...newA }));
          }}
          onUpdateControls={(newC) => {
            setControls((prev) => ({ ...prev, ...newC }));
          }}
          onSelectVehicle={(vehId) => {
            setPlayerStats((prev) => ({ ...prev, selectedVehicle: vehId }));
            engineRef.current?.spawnVehicle(vehId, playerStats.selectedColor);
          }}
          onSelectColor={(hex) => {
            setPlayerStats((prev) => ({ ...prev, selectedColor: hex }));
            if (engineRef.current && engineRef.current.vehicleRig) {
              engineRef.current.spawnVehicle(playerStats.selectedVehicle, hex);
            }
          }}
        />
      )}

      {/* 6. CONTRACT COMPLETED PAYOUT MODAL */}
      {jobCompletedResult && (
        <JobCompleteModal
          result={jobCompletedResult}
          onContinue={() => setJobCompletedResult(null)}
          onNextJob={() => {
            setJobCompletedResult(null);
            const nextJob = AVAILABLE_JOBS.find(
              (j) => j.id !== jobCompletedResult.job.id && (!j.vehicleRequirement || j.vehicleRequirement.includes(playerStats.selectedVehicle))
            ) || AVAILABLE_JOBS[0];

            if (engineRef.current) {
              const started = engineRef.current.jobSys.selectJob(nextJob.id);
              setActiveJob(started ? { ...started } : null);
            }
          }}
        />
      )}
    </div>
  );
}
