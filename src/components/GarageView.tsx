import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ArrowLeft, Check, Lock, ChevronLeft, ChevronRight, Zap, Shield, Gauge, Wrench } from 'lucide-react';
import { CarConfig, PlayerProfile, SaveManager } from '../game/save/SaveManager';
import { CarModelBuilder, Car3DInstance } from '../game/cars/CarModels';

interface GarageViewProps {
  profile: PlayerProfile;
  onUpdateProfile: (newProfile: PlayerProfile) => void;
  onBack: () => void;
}

const COLOR_PALETTE = [
  { name: 'Tashkent Red', hex: '#dc2626' },
  { name: 'Samarkand Blue', hex: '#2563eb' },
  { name: 'Stealth Black', hex: '#171717' },
  { name: 'Silk Amber Gold', hex: '#f59e0b' },
  { name: 'Fergana Emerald', hex: '#059669' },
  { name: 'Tien Shan White', hex: '#f8fafc' },
];

export const GarageView: React.FC<GarageViewProps> = ({ profile, onUpdateProfile, onBack }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const carList = Object.values(profile.cars);
  const [selectedIdx, setSelectedIdx] = useState(() => {
    const idx = carList.findIndex((c) => c.id === profile.selectedCarId);
    return idx >= 0 ? idx : 0;
  });

  const activeCar = carList[selectedIdx] || carList[0];

  // Interactive doors state
  const [leftDoorOpen, setLeftDoorOpen] = useState(false);
  const [rightDoorOpen, setRightDoorOpen] = useState(false);
  const [trunkOpen, setTrunkOpen] = useState(false);
  const [hoodOpen, setHoodOpen] = useState(false);

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const carInstanceRef = useRef<Car3DInstance | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const isDraggingRef = useRef(false);
  const prevMouseXRef = useRef(0);
  const carAngleRef = useRef(0);

  // Initialize 3D Turntable Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 2.2, 5.8);
    camera.lookAt(0, 0.6, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Showroom Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);

    const spotLight1 = new THREE.SpotLight(0x38bdf8, 3.5, 30, Math.PI / 4, 0.4);
    spotLight1.position.set(5, 7, 5);
    scene.add(spotLight1);

    const spotLight2 = new THREE.SpotLight(0xf59e0b, 2.5, 30, Math.PI / 4, 0.4);
    spotLight2.position.set(-5, 7, -5);
    scene.add(spotLight2);

    // Reflective showroom floor
    const floorGeom = new THREE.CylinderGeometry(4.8, 5.0, 0.25, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.position.y = -0.12;
    scene.add(floor);

    // Neon floor ring
    const ringGeom = new THREE.RingGeometry(4.6, 4.75, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);

    // Animation loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (carInstanceRef.current && !isDraggingRef.current) {
        carAngleRef.current += 0.004; // subtle auto-rotation
        carInstanceRef.current.root.rotation.y = carAngleRef.current;
      }
      renderer.render(scene, camera);
    };
    animate();

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
    };
  }, []);

  // Update car 3D model when activeCar changes
  useEffect(() => {
    if (!sceneRef.current) return;
    if (carInstanceRef.current) {
      sceneRef.current.remove(carInstanceRef.current.root);
    }

    const instance = CarModelBuilder.createCar(activeCar.id, activeCar.color);
    instance.root.rotation.y = carAngleRef.current;
    sceneRef.current.add(instance.root);
    carInstanceRef.current = instance;

    // Reset doors state
    setLeftDoorOpen(false);
    setRightDoorOpen(false);
    setTrunkOpen(false);
    setHoodOpen(false);
  }, [activeCar.id]);

  // Update paint color live
  useEffect(() => {
    if (carInstanceRef.current) {
      carInstanceRef.current.setPaintColor(activeCar.color);
    }
  }, [activeCar.color]);

  // Touch / Mouse Drag Rotation
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    prevMouseXRef.current = e.clientX;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !carInstanceRef.current) return;
    const deltaX = e.clientX - prevMouseXRef.current;
    prevMouseXRef.current = e.clientX;
    carAngleRef.current += deltaX * 0.01;
    carInstanceRef.current.root.rotation.y = carAngleRef.current;
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  // Toggle Doors / Trunk / Hood (As shown in Reference Image #1 & #3)
  const toggleDoor = (door: 'left' | 'right' | 'trunk' | 'hood') => {
    if (!carInstanceRef.current) return;
    if (door === 'left') {
      const next = !leftDoorOpen;
      setLeftDoorOpen(next);
      carInstanceRef.current.setDoorOpen('left', next);
    } else if (door === 'right') {
      const next = !rightDoorOpen;
      setRightDoorOpen(next);
      carInstanceRef.current.setDoorOpen('right', next);
    } else if (door === 'trunk') {
      const next = !trunkOpen;
      setTrunkOpen(next);
      carInstanceRef.current.setDoorOpen('trunk', next);
    } else if (door === 'hood') {
      const next = !hoodOpen;
      setHoodOpen(next);
      carInstanceRef.current.setDoorOpen('hood', next);
    }
  };

  const handleSelectCar = () => {
    if (!activeCar.unlocked) return;
    const updated = { ...profile, selectedCarId: activeCar.id };
    SaveManager.saveProfile(updated);
    onUpdateProfile(updated);
  };

  const handleUnlockCar = () => {
    const res = SaveManager.unlockCar(activeCar.id);
    if (res.success) {
      onUpdateProfile(res.profile);
    }
  };

  const handleUpgrade = (part: 'engine' | 'tires' | 'nitro' | 'brakes') => {
    const res = SaveManager.upgradeCar(activeCar.id, part);
    if (res.success) {
      onUpdateProfile(res.profile);
    }
  };

  const handleColorChange = (hex: string) => {
    const updated = SaveManager.updateCarColor(activeCar.id, hex);
    onUpdateProfile(updated);
  };

  const isSelected = profile.selectedCarId === activeCar.id;

  return (
    <div className="absolute inset-0 bg-neutral-950 flex flex-col justify-between p-3 md:p-6 overflow-hidden select-none z-30">
      {/* TOP HEADER */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="w-11 h-11 rounded-2xl racing-glass flex items-center justify-center text-white/90 hover:text-white active:scale-95 transition border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-racing font-extrabold text-2xl uppercase tracking-wider text-cyan-400">
              Tashkent Garage
            </h1>
            <p className="text-xs text-neutral-400">Customization, Performance & Tuning</p>
          </div>
        </div>

        {/* Currency balance */}
        <div className="racing-glass px-4 py-2 rounded-2xl border border-amber-500/30 flex items-center space-x-2">
          <span className="text-amber-400 font-bold text-lg">💰</span>
          <div className="font-racing font-bold text-lg text-amber-300">
            {profile.credits.toLocaleString()} <span className="text-xs text-neutral-400">UZS</span>
          </div>
        </div>
      </div>

      {/* 3D TURNTABLE VIEWPORT IN BACKGROUND */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
      />

      {/* CAR SWITCHER ARROWS */}
      <div className="absolute top-1/2 left-3 right-3 flex items-center justify-between pointer-events-none z-10 -translate-y-1/2">
        <button
          onClick={() => setSelectedIdx((prev) => (prev - 1 + carList.length) % carList.length)}
          className="w-12 h-12 rounded-2xl racing-glass pointer-events-auto flex items-center justify-center text-white hover:text-cyan-400 active:scale-90 transition border border-white/20 shadow-xl"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={() => setSelectedIdx((prev) => (prev + 1) % carList.length)}
          className="w-12 h-12 rounded-2xl racing-glass pointer-events-auto flex items-center justify-center text-white hover:text-cyan-400 active:scale-90 transition border border-white/20 shadow-xl"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* INTERACTIVE CAR SIMULATOR CONTROLS (Open Doors / Trunk / Hood) */}
      <div className="absolute top-20 right-4 z-10 flex flex-col space-y-2 pointer-events-auto">
        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5 text-right">
          Car Simulator Interactive
        </div>

        <button
          onClick={() => toggleDoor('left')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider border transition ${
            leftDoorOpen ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400' : 'racing-glass text-neutral-300 border-white/10'
          }`}
        >
          {leftDoorOpen ? 'Close Driver Door' : 'Open Driver Door'}
        </button>

        <button
          onClick={() => toggleDoor('right')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider border transition ${
            rightDoorOpen ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400' : 'racing-glass text-neutral-300 border-white/10'
          }`}
        >
          {rightDoorOpen ? 'Close Passenger Door' : 'Open Passenger Door'}
        </button>

        <button
          onClick={() => toggleDoor('trunk')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider border transition ${
            trunkOpen ? 'bg-amber-500/30 text-amber-300 border-amber-400' : 'racing-glass text-neutral-300 border-white/10'
          }`}
        >
          {trunkOpen ? 'Close Trunk' : 'Open Trunk'}
        </button>

        <button
          onClick={() => toggleDoor('hood')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider border transition ${
            hoodOpen ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400' : 'racing-glass text-neutral-300 border-white/10'
          }`}
        >
          {hoodOpen ? 'Close Engine Hood' : 'Open Engine Hood'}
        </button>
      </div>

      {/* BOTTOM INFO, STATS & UPGRADE PANEL */}
      <div className="z-10 flex flex-col md:flex-row items-end justify-between gap-4 pointer-events-auto max-w-5xl mx-auto w-full">
        {/* Left Card: Car details & stats */}
        <div className="racing-glass-card p-4 rounded-3xl w-full md:w-80 shadow-2xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
              {activeCar.category}
            </span>
            <span className="text-xs text-neutral-400">{activeCar.fullName}</span>
          </div>

          <h2 className="font-racing font-black text-2xl text-white mb-2">{activeCar.name}</h2>

          {/* Performance stats bars */}
          <div className="space-y-1.5 text-xs mb-3">
            <div>
              <div className="flex justify-between text-neutral-300 mb-0.5">
                <span>Top Speed</span>
                <span className="font-bold">{activeCar.stats.topSpeed} km/h</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full"
                  style={{ width: `${(activeCar.stats.topSpeed / 340) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-neutral-300 mb-0.5">
                <span>Acceleration</span>
                <span className="font-bold">{activeCar.stats.acceleration * 10}%</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{ width: `${activeCar.stats.acceleration * 10}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-neutral-300 mb-0.5">
                <span>Handling / Grip</span>
                <span className="font-bold">{activeCar.stats.handling * 10}%</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full"
                  style={{ width: `${activeCar.stats.handling * 10}%` }}
                />
              </div>
            </div>
          </div>

          {/* Color swatches */}
          <div className="flex items-center space-x-2 pt-2 border-t border-white/10">
            <span className="text-[10px] text-neutral-400 uppercase font-bold mr-1">Paint:</span>
            {COLOR_PALETTE.map((c) => (
              <button
                key={c.hex}
                onClick={() => handleColorChange(c.hex)}
                className={`w-6 h-6 rounded-full border-2 transition ${
                  activeCar.color === c.hex ? 'border-white scale-110 shadow-lg' : 'border-neutral-600'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Right Card: Performance Upgrades & Action Button */}
        <div className="racing-glass-card p-4 rounded-3xl w-full md:w-96 shadow-2xl flex flex-col justify-between">
          <div className="mb-3">
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Wrench className="w-3.5 h-3.5 text-cyan-400" />
              <span>Performance Tuning (Stage 0 - 3)</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {(['engine', 'tires', 'nitro', 'brakes'] as const).map((part) => {
                const lvl = activeCar.upgrades[part];
                const cost = (lvl + 1) * 8000;
                const isMax = lvl >= 3;

                return (
                  <button
                    key={part}
                    onClick={() => handleUpgrade(part)}
                    disabled={isMax || profile.credits < cost || !activeCar.unlocked}
                    className="p-2 rounded-xl bg-neutral-900/80 border border-white/10 hover:border-cyan-400/50 flex flex-col justify-between transition disabled:opacity-50 text-left"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold uppercase text-neutral-300 text-[11px]">{part}</span>
                      <span className="text-[10px] text-cyan-400 font-bold">LVL {lvl}/3</span>
                    </div>
                    <div className="text-[10px] text-amber-400 mt-1">
                      {isMax ? 'MAXED' : `${cost.toLocaleString()} UZS`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action button: Select or Buy */}
          {activeCar.unlocked ? (
            <button
              onClick={handleSelectCar}
              className={`w-full py-3 rounded-2xl font-racing font-extrabold text-sm uppercase tracking-wider transition flex items-center justify-center space-x-2 ${
                isSelected
                  ? 'bg-emerald-500 text-white cursor-default'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950 active:scale-98'
              }`}
            >
              {isSelected ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>SELECTED VEHICLE</span>
                </>
              ) : (
                <span>DRIVE THIS CAR</span>
              )}
            </button>
          ) : (
            <button
              onClick={handleUnlockCar}
              disabled={profile.credits < activeCar.price}
              className="w-full py-3 rounded-2xl font-racing font-extrabold text-sm uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-neutral-950 active:scale-98 transition flex items-center justify-center space-x-2 disabled:opacity-40"
            >
              <Lock className="w-4 h-4" />
              <span>UNLOCK FOR {activeCar.price.toLocaleString()} UZS</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
