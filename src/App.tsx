/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrientationGuard } from './components/OrientationGuard';
import { MainMenu } from './components/MainMenu';
import { RaceHUD } from './components/RaceHUD';
import { GarageView } from './components/GarageView';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { SettingsModal } from './components/SettingsModal';
import { RoutesModal } from './components/RoutesModal';
import { PostRaceModal } from './components/PostRaceModal';

import { VehiclePhysics, VehicleInputs } from './game/physics/VehiclePhysics';
import { CarModelBuilder, Car3DInstance } from './game/cars/CarModels';
import { TashkentCityEnvironment } from './game/environment/TashkentCity';
import { RouteManager, ROUTES, RouteDefinition, PlayerRaceProgress } from './game/routes/RouteManager';
import { AIRacerInstance, AI_DRIVERS } from './game/ai/AIRacer';
import { MultiplayerManager } from './game/networking/MultiplayerManager';
import { SoundManager } from './game/audio/SoundManager';
import { SaveManager, PlayerProfile } from './game/save/SaveManager';

type GameScreen = 'menu' | 'racing' | 'garage' | 'multiplayer' | 'routes' | 'settings';

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Profile & Saved data
  const [profile, setProfile] = useState<PlayerProfile>(() => SaveManager.loadProfile());
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false);
  const [showPostRace, setShowPostRace] = useState(false);

  // Race Config
  const [currentRouteId, setCurrentRouteId] = useState('route_amir_timur');
  const [raceDifficulty, setRaceDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [isMultiplayerRace, setIsMultiplayerRace] = useState(false);

  // In-Race State
  const [vehicleState, setVehicleState] = useState(() => new VehiclePhysics().getState());
  const [raceProgress, setRaceProgress] = useState<PlayerRaceProgress>({
    currentLap: 1,
    totalLaps: 2,
    currentCheckpointIndex: 1,
    totalCheckpoints: 12,
    lapProgressRatio: 0,
    totalRaceProgressRatio: 0,
    isFinished: false,
    lapTimes: [],
    currentLapTime: 0,
    bestLapTime: null,
    distanceToNextCheckpoint: 100,
    isWrongWay: false,
  });
  const [positionRank, setPositionRank] = useState(1);
  const [rivalsList, setRivalsList] = useState<{ id: string; x: number; z: number; heading: number; isPlayer?: boolean }[]>([]);
  const [headlightsOn, setHeadlightsOn] = useState(true);
  const [cameraMode, setCameraMode] = useState<'chase' | 'cockpit' | 'hood'>('chase');

  // Results state
  const [finalRank, setFinalRank] = useState(1);
  const [finalTime, setFinalTime] = useState(0);
  const [finalEarnings, setFinalEarnings] = useState(0);

  // Engine references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerPhysicsRef = useRef<VehiclePhysics>(new VehiclePhysics());
  const playerCar3DRef = useRef<Car3DInstance | null>(null);
  const cityEnvRef = useRef<TashkentCityEnvironment | null>(null);
  const routeMgrRef = useRef<RouteManager | null>(null);
  const aiRacersRef = useRef<AIRacerInstance[]>([]);
  const multiplayerMgrRef = useRef<MultiplayerManager>(new MultiplayerManager(profile.name));

  // Input states
  const inputsRef = useRef<VehicleInputs>({
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    nitro: false,
    reverse: false,
  });

  const activeCar = profile.cars[profile.selectedCarId] || profile.cars.samara_gt;
  const currentRoute = ROUTES.find((r) => r.id === currentRouteId) || ROUTES[0];

  // Initialize Three.js WebGL Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7dd3fc);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.2, 800);
    camera.position.set(0, 5, -10);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = profile.settings.graphicsQuality !== 'low';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting setup
    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x334155, 0.6);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff7ed, 1.4);
    sun.position.set(120, 180, 80);
    sun.castShadow = profile.settings.graphicsQuality !== 'low';
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 400;
    const shadowD = 90;
    sun.shadow.camera.left = -shadowD;
    sun.shadow.camera.right = shadowD;
    sun.shadow.camera.top = shadowD;
    sun.shadow.camera.bottom = -shadowD;
    scene.add(sun);

    // Build Tashkent City Environment
    const city = new TashkentCityEnvironment(scene);
    city.ambientLight = ambient;
    city.hemiLight = hemi;
    city.sunLight = sun;
    city.buildCity({ minX: -300, maxX: 300, minZ: -300, maxZ: 300 });
    cityEnvRef.current = city;

    // Build Route & Checkpoints
    const routeMgr = new RouteManager(scene, currentRouteId);
    routeMgrRef.current = routeMgr;

    // Build Player Car 3D
    const car3D = CarModelBuilder.createCar(activeCar.id, activeCar.color);
    scene.add(car3D.root);
    playerCar3DRef.current = car3D;

    // Apply physics specs
    playerPhysicsRef.current.applyCarConfig(activeCar);
    playerPhysicsRef.current.reset(currentRoute.startPosition, currentRoute.startHeading);

    // Main 60 FPS Game Loop
    let lastTime = performance.now();
    let animId: number;

    const gameLoop = (now: number) => {
      animId = requestAnimationFrame(gameLoop);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Update City background animations
      if (cityEnvRef.current) {
        cityEnvRef.current.update(dt, playerPhysicsRef.current.position);
      }

      // If in race mode & not paused, update vehicle physics & AI
      if (screen === 'racing' && !isPaused && !raceProgress.isFinished) {
        const physics = playerPhysicsRef.current;
        const inputs = inputsRef.current;

        // Step physics
        physics.update(dt, inputs);
        const state = physics.getState();
        setVehicleState(state);

        // Update 3D car visual transform
        if (playerCar3DRef.current) {
          playerCar3DRef.current.root.position.copy(state.position);
          playerCar3DRef.current.root.rotation.copy(state.rotation);
          playerCar3DRef.current.updateWheelSpin(state.speedKmh / 3.6, state.steeringAngle, dt);
          playerCar3DRef.current.setBraking(inputs.brake > 0.1 || inputs.handbrake);
        }

        // Update Sound
        SoundManager.updateEnginePitch(state.speedKmh, (state.rpm - 1000) / 6500, state.isNitroActive);
        SoundManager.playTireSkid(state.isDrifting, state.driftSlip);
        SoundManager.playNitro(state.isNitroActive);

        // Update Race Progress & Checkpoints
        if (routeMgrRef.current) {
          setRaceProgress((prevProg) => {
            const nextProg = routeMgrRef.current!.updateProgress(state.position, state.rotation.y, prevProg, dt);

            // Check if player just finished the race!
            if (!prevProg.isFinished && nextProg.isFinished) {
              handleRaceCompleted(nextProg);
            }
            return nextProg;
          });
        }

        // Update AI Opponents
        const allPositions = [state.position];
        aiRacersRef.current.forEach((ai) => {
          ai.update(dt, currentRoute, raceDifficulty, state.position, allPositions);
          allPositions.push(ai.position);
        });

        // Update Multiplayer sync
        if (isMultiplayerRace && multiplayerMgrRef.current) {
          multiplayerMgrRef.current.sendPositionSync({
            x: state.position.x,
            y: state.position.y,
            z: state.position.z,
            heading: state.rotation.y,
            speed: state.speedKmh / 3.6,
            steer: state.steeringAngle,
            isNitro: state.isNitroActive,
            isBraking: inputs.brake > 0.1,
            lap: raceProgress.currentLap,
            progress: raceProgress.totalRaceProgressRatio,
          });
          multiplayerMgrRef.current.updateRemoteRacers(dt);
        }

        // Compute Race Rankings
        const racers = [
          { id: 'player', progress: raceProgress.totalRaceProgressRatio, isPlayer: true },
          ...aiRacersRef.current.map((ai) => ({ id: ai.profile.id, progress: ai.totalProgress, isPlayer: false })),
        ];
        racers.sort((a, b) => b.progress - a.progress);
        const playerRank = racers.findIndex((r) => r.isPlayer) + 1;
        setPositionRank(playerRank);

        // Update Minimap Rivals Blips
        const rivals = aiRacersRef.current.map((ai) => ({
          id: ai.profile.id,
          x: ai.position.x,
          z: ai.position.z,
          heading: ai.heading,
        }));
        setRivalsList(rivals);

        // Update Camera Follow
        updateCameraFollow(camera, state, cameraMode);
      } else if (screen === 'menu') {
        // Slow cinematic camera pan across Tashkent boulevard
        const t = now * 0.0003;
        camera.position.set(Math.sin(t) * 18, 4.5, Math.cos(t) * 18 - 180);
        camera.lookAt(0, 1.2, -180);
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(gameLoop);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      SoundManager.stopAll();
    };
  }, []);

  // Update Environment Day/Night and Weather whenever settings change
  useEffect(() => {
    if (cityEnvRef.current) {
      cityEnvRef.current.setWeatherAndTime({
        isNight: profile.settings.timeOfDay === 'night',
        isRaining: profile.settings.weather === 'rain',
      });
    }
    playerPhysicsRef.current.setWeatherGrip(profile.settings.weather === 'rain');
    SoundManager.setVolumes(profile.settings.soundVolume, profile.settings.musicVolume);
  }, [profile.settings.timeOfDay, profile.settings.weather, profile.settings.soundVolume, profile.settings.musicVolume]);

  // Update Player 3D car model when selected car or color changes
  useEffect(() => {
    if (!sceneRef.current) return;
    if (playerCar3DRef.current) {
      sceneRef.current.remove(playerCar3DRef.current.root);
    }
    const newCar3D = CarModelBuilder.createCar(activeCar.id, activeCar.color);
    sceneRef.current.add(newCar3D.root);
    playerCar3DRef.current = newCar3D;
    playerPhysicsRef.current.applyCarConfig(activeCar);
  }, [activeCar.id, activeCar.color]);

  // Handle Race Finish
  const handleRaceCompleted = (finalProg: PlayerRaceProgress) => {
    const totalTime = finalProg.lapTimes.reduce((a, b) => a + b, 0);
    const rewardBase = currentRoute.rewardUZS;
    const rankBonus = positionRank === 1 ? 1.0 : (positionRank === 2 ? 0.7 : (positionRank === 3 ? 0.5 : 0.2));
    const prizeWon = Math.round(rewardBase * rankBonus);

    setFinalRank(positionRank);
    setFinalTime(totalTime);
    setFinalEarnings(prizeWon);
    setShowPostRace(true);

    // Save prize money & best lap record
    const updated = SaveManager.addCredits(prizeWon);
    setProfile(updated);
    SoundManager.stopEngine();
  };

  // Camera Follow logic with 3 modes (Chase, Cockpit as in Reference #2, Hood)
  const updateCameraFollow = (
    cam: THREE.PerspectiveCamera,
    state: ReturnType<VehiclePhysics['getState']>,
    mode: 'chase' | 'cockpit' | 'hood'
  ) => {
    const carPos = state.position;
    const heading = state.rotation.y;

    if (mode === 'chase') {
      // 3rd person chase cam
      const dist = 7.5;
      const height = 2.8;
      const targetCamX = carPos.x - Math.sin(heading) * dist;
      const targetCamZ = carPos.z - Math.cos(heading) * dist;
      const targetCamY = carPos.y + height;

      cam.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.15);
      cam.lookAt(carPos.x, carPos.y + 1.2, carPos.z);
    } else if (mode === 'cockpit') {
      // 1st person dashboard view as in reference image #2!
      const cockpitOffsetX = -0.35 * Math.cos(heading) - 0.1 * Math.sin(heading);
      const cockpitOffsetZ = 0.35 * Math.sin(heading) - 0.1 * Math.cos(heading);
      cam.position.set(carPos.x + cockpitOffsetX, carPos.y + 1.15, carPos.z + cockpitOffsetZ);

      // Look forward along car direction
      const lookDist = 25;
      cam.lookAt(carPos.x + Math.sin(heading) * lookDist, carPos.y + 0.9, carPos.z + Math.cos(heading) * lookDist);
    } else {
      // Hood / Bumper camera
      const hoodX = carPos.x + Math.sin(heading) * 1.5;
      const hoodZ = carPos.z + Math.cos(heading) * 1.5;
      cam.position.set(hoodX, carPos.y + 0.95, hoodZ);
      cam.lookAt(carPos.x + Math.sin(heading) * 30, carPos.y + 0.8, carPos.z + Math.cos(heading) * 30);
    }
  };

  // Keyboard controls listener (W/A/S/D / Arrows / Space / Shift / C / H / L)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'racing') return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        inputsRef.current.throttle = 1;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        inputsRef.current.brake = 1;
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        inputsRef.current.steer = -1;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        inputsRef.current.steer = 1;
      } else if (e.key === ' ') {
        inputsRef.current.handbrake = true;
      } else if (e.key === 'Shift') {
        inputsRef.current.nitro = true;
      } else if (e.key === 'c' || e.key === 'C') {
        handleCameraToggle();
      } else if (e.key === 'h' || e.key === 'H') {
        handleHorn();
      } else if (e.key === 'l' || e.key === 'L') {
        handleHeadlightsToggle();
      } else if (e.key === 'Escape') {
        setIsPaused((p) => !p);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        inputsRef.current.throttle = 0;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        inputsRef.current.brake = 0;
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (inputsRef.current.steer < 0) inputsRef.current.steer = 0;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (inputsRef.current.steer > 0) inputsRef.current.steer = 0;
      } else if (e.key === ' ') {
        inputsRef.current.handbrake = false;
      } else if (e.key === 'Shift') {
        inputsRef.current.nitro = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [screen]);

  // Touch HUD Controls Handler
  const handleControlInput = (
    type: 'throttle' | 'brake' | 'steer' | 'nitro' | 'handbrake',
    value: number | boolean
  ) => {
    if (type === 'throttle') inputsRef.current.throttle = value as number;
    if (type === 'brake') inputsRef.current.brake = value as number;
    if (type === 'steer') inputsRef.current.steer = value as number;
    if (type === 'nitro') inputsRef.current.nitro = value as boolean;
    if (type === 'handbrake') inputsRef.current.handbrake = value as boolean;
  };

  const handleCameraToggle = () => {
    setCameraMode((prev) => {
      if (prev === 'chase') return 'cockpit';
      if (prev === 'cockpit') return 'hood';
      return 'chase';
    });
  };

  const handleHorn = () => {
    SoundManager.playHorn();
  };

  const handleHeadlightsToggle = () => {
    const next = !headlightsOn;
    setHeadlightsOn(next);
    if (playerCar3DRef.current) {
      playerCar3DRef.current.setHeadlights(next);
    }
  };

  // Launch a race (Quick, AI or Multiplayer)
  const startRace = (routeId: string, isMulti: boolean = false) => {
    const route = ROUTES.find((r) => r.id === routeId) || ROUTES[0];
    setCurrentRouteId(route.id);
    setIsMultiplayerRace(isMulti);
    setShowPostRace(false);
    setIsPaused(false);

    // Update Route Manager track
    if (routeMgrRef.current) {
      routeMgrRef.current.setRoute(route.id);
    }

    // Reset player car & physics
    playerPhysicsRef.current.reset(route.startPosition, route.startHeading);
    if (playerCar3DRef.current) {
      playerCar3DRef.current.root.position.copy(route.startPosition);
      playerCar3DRef.current.root.rotation.y = route.startHeading;
    }

    // Reset Race Progress
    setRaceProgress({
      currentLap: 1,
      totalLaps: route.totalLaps,
      currentCheckpointIndex: 1,
      totalCheckpoints: route.waypoints.length,
      lapProgressRatio: 0,
      totalRaceProgressRatio: 0,
      isFinished: false,
      lapTimes: [],
      currentLapTime: 0,
      bestLapTime: null,
      distanceToNextCheckpoint: 100,
      isWrongWay: false,
    });

    // Clear old AI drivers and spawn 3 new rivals
    if (sceneRef.current) {
      aiRacersRef.current.forEach((ai) => ai.destroy(sceneRef.current!));
      aiRacersRef.current = [];

      // Spawn AI grid behind/beside player
      const startWp = route.waypoints[0];
      const nextWp = route.waypoints[1];
      const startDir = new THREE.Vector3().subVectors(nextWp, startWp).normalize();
      const perpDir = new THREE.Vector3(-startDir.z, 0, startDir.x);

      AI_DRIVERS.slice(0, 3).forEach((driver, idx) => {
        const offsetDist = -(idx + 1) * 9;
        const laneOffset = (idx % 2 === 0 ? 3.5 : -3.5);
        const aiPos = route.startPosition.clone()
          .add(startDir.clone().multiplyScalar(offsetDist))
          .add(perpDir.clone().multiplyScalar(laneOffset));

        const aiInstance = new AIRacerInstance(
          sceneRef.current!,
          driver,
          aiPos,
          route.startHeading,
          laneOffset
        );
        aiRacersRef.current.push(aiInstance);
      });

      // If multiplayer, spawn remote network cars
      if (isMulti && multiplayerMgrRef.current) {
        multiplayerMgrRef.current.initRemoteRacersInScene(sceneRef.current);
      }
    }

    // Start Audio
    SoundManager.startEngine();
    SoundManager.startMusic();
    setScreen('racing');
  };

  const handleReturnToMenu = () => {
    SoundManager.stopAll();
    setIsPaused(false);
    setShowPostRace(false);
    setScreen('menu');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 text-white font-sans select-none">
      {/* Landscape Orientation Detector Guard */}
      <OrientationGuard />

      {/* 3D WebGL Canvas Layer */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* GAME SCREENS & OVERLAYS */}
      {screen === 'menu' && (
        <MainMenu
          profile={profile}
          currentRoute={currentRoute}
          onPlayQuickRace={() => startRace(currentRouteId, false)}
          onOpenMultiplayer={() => setScreen('multiplayer')}
          onOpenSinglePlayer={() => startRace(currentRouteId, false)}
          onOpenGarage={() => setScreen('garage')}
          onOpenRoutes={() => setShowRoutes(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {screen === 'garage' && (
        <GarageView
          profile={profile}
          onUpdateProfile={(p) => setProfile(p)}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'multiplayer' && (
        <MultiplayerLobby
          profile={profile}
          multiplayer={multiplayerMgrRef.current}
          onStartMultiplayerRace={(routeId) => startRace(routeId, true)}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'racing' && (
        <RaceHUD
          vehicleState={vehicleState}
          raceProgress={raceProgress}
          route={currentRoute}
          rivals={rivalsList}
          positionRank={positionRank}
          totalRacers={aiRacersRef.current.length + 1}
          cameraMode={cameraMode}
          controlsType={profile.settings.controls}
          headlightsOn={headlightsOn}
          onCameraToggle={handleCameraToggle}
          onPause={() => setIsPaused(true)}
          onHorn={handleHorn}
          onHeadlightsToggle={handleHeadlightsToggle}
          onControlInput={handleControlInput}
        />
      )}

      {/* PAUSE MODAL */}
      {isPaused && (
        <div className="fixed inset-0 z-40 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="racing-glass-card max-w-sm w-full p-6 rounded-3xl border border-white/20 text-center shadow-2xl space-y-3">
            <h2 className="font-racing font-black text-3xl uppercase tracking-wider text-cyan-400 mb-4">
              Game Paused
            </h2>

            <button
              onClick={() => setIsPaused(false)}
              className="w-full py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-racing font-black text-base uppercase tracking-wider transition"
            >
              Resume Race
            </button>

            <button
              onClick={() => startRace(currentRouteId, isMultiplayerRace)}
              className="w-full py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-racing font-bold text-sm uppercase tracking-wider border border-white/10 transition"
            >
              Restart Race
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="w-full py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-racing font-bold text-sm uppercase tracking-wider border border-white/10 transition"
            >
              Settings
            </button>

            <button
              onClick={handleReturnToMenu}
              className="w-full py-3 rounded-2xl bg-red-600/30 hover:bg-red-600/50 text-red-300 font-racing font-bold text-sm uppercase tracking-wider border border-red-500/30 transition"
            >
              Quit to Main Menu
            </button>
          </div>
        </div>
      )}

      {/* POST RACE VICTORY / RESULTS MODAL */}
      {showPostRace && (
        <PostRaceModal
          rank={finalRank}
          totalRacers={aiRacersRef.current.length + 1}
          route={currentRoute}
          totalTimeSec={finalTime}
          bestLapSec={raceProgress.bestLapTime}
          earningsUZS={finalEarnings}
          onRestart={() => startRace(currentRouteId, isMultiplayerRace)}
          onGarage={() => {
            setShowPostRace(false);
            setScreen('garage');
          }}
          onMainMenu={handleReturnToMenu}
        />
      )}

      {/* ROUTES BROWSER MODAL */}
      {showRoutes && (
        <RoutesModal
          selectedRouteId={currentRouteId}
          onSelectRoute={(id) => {
            setCurrentRouteId(id);
            setShowRoutes(false);
          }}
          onClose={() => setShowRoutes(false)}
        />
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <SettingsModal
          profile={profile}
          onUpdateProfile={(p) => setProfile(p)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
