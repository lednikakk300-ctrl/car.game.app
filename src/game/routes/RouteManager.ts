import * as THREE from 'three';

export interface RouteDefinition {
  id: string;
  name: string;
  location: string;
  description: string;
  totalLaps: number;
  lengthKm: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  rewardUZS: number;
  previewColor: string;
  waypoints: THREE.Vector3[];
  startPosition: THREE.Vector3;
  startHeading: number;
}

export const ROUTES: RouteDefinition[] = [
  {
    id: 'route_amir_timur',
    name: 'Amir Timur Grand Avenue',
    location: 'Central Tashkent',
    description: 'High-speed sprint past Hotel Uzbekistan, central gardens, and broad multilane boulevards.',
    totalLaps: 2,
    lengthKm: 2.4,
    difficulty: 'Easy',
    rewardUZS: 15000,
    previewColor: '#3b82f6',
    startPosition: new THREE.Vector3(0, 0.4, -200),
    startHeading: 0,
    waypoints: [
      new THREE.Vector3(0, 0, -200),
      new THREE.Vector3(0, 0, -100),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 100),
      new THREE.Vector3(0, 0, 200),
      new THREE.Vector3(30, 0, 240),
      new THREE.Vector3(80, 0, 220),
      new THREE.Vector3(100, 0, 140),
      new THREE.Vector3(80, 0, 40),
      new THREE.Vector3(50, 0, -60),
      new THREE.Vector3(80, 0, -140),
      new THREE.Vector3(40, 0, -220),
    ],
  },
  {
    id: 'route_tashkent_city',
    name: 'Tashkent City Night Loop',
    location: 'Tashkent City District',
    description: 'Technical circuit between gleaming glass skyscrapers, illuminated fountain plazas, and neon boulevards.',
    totalLaps: 2,
    lengthKm: 3.1,
    difficulty: 'Medium',
    rewardUZS: 25000,
    previewColor: '#06b6d4',
    startPosition: new THREE.Vector3(60, 0.4, 0),
    startHeading: Math.PI / 2,
    waypoints: [
      new THREE.Vector3(60, 0, 0),
      new THREE.Vector3(120, 0, 0),
      new THREE.Vector3(160, 0, 60),
      new THREE.Vector3(140, 0, 140),
      new THREE.Vector3(60, 0, 180),
      new THREE.Vector3(-40, 0, 160),
      new THREE.Vector3(-80, 0, 80),
      new THREE.Vector3(-60, 0, -20),
      new THREE.Vector3(0, 0, -60),
      new THREE.Vector3(60, 0, -40),
    ],
  },
  {
    id: 'route_chorsu_ring',
    name: 'Old Chorsu Grand Ring',
    location: 'Old City (Eski Shahar)',
    description: 'Winding historic circuit surrounding the famous turquoise Chorsu dome and bazaar arches.',
    totalLaps: 3,
    lengthKm: 2.8,
    difficulty: 'Hard',
    rewardUZS: 35000,
    previewColor: '#10b981',
    startPosition: new THREE.Vector3(-120, 0.4, 80),
    startHeading: 0,
    waypoints: [
      new THREE.Vector3(-120, 0, 80),
      new THREE.Vector3(-120, 0, 160),
      new THREE.Vector3(-160, 0, 200),
      new THREE.Vector3(-220, 0, 160),
      new THREE.Vector3(-220, 0, 60),
      new THREE.Vector3(-180, 0, -20),
      new THREE.Vector3(-120, 0, -40),
      new THREE.Vector3(-60, 0, 0),
      new THREE.Vector3(-80, 0, 60),
    ],
  },
  {
    id: 'route_tv_tower',
    name: 'TV Tower Skyline Express',
    location: 'Yunusobod District',
    description: 'Sweeping high-velocity straights and fast chicanes beneath the towering 375m Tashkent TV needle.',
    totalLaps: 2,
    lengthKm: 3.6,
    difficulty: 'Hard',
    rewardUZS: 50000,
    previewColor: '#f59e0b',
    startPosition: new THREE.Vector3(-160, 0.4, -100),
    startHeading: -Math.PI / 4,
    waypoints: [
      new THREE.Vector3(-160, 0, -100),
      new THREE.Vector3(-200, 0, -140),
      new THREE.Vector3(-240, 0, -200),
      new THREE.Vector3(-180, 0, -240),
      new THREE.Vector3(-100, 0, -220),
      new THREE.Vector3(-40, 0, -180),
      new THREE.Vector3(20, 0, -120),
      new THREE.Vector3(-20, 0, -60),
      new THREE.Vector3(-100, 0, -60),
    ],
  },
];

export interface PlayerRaceProgress {
  currentLap: number;
  totalLaps: number;
  currentCheckpointIndex: number;
  totalCheckpoints: number;
  lapProgressRatio: number; // 0 to 1
  totalRaceProgressRatio: number; // 0 to 1
  isFinished: boolean;
  lapTimes: number[];
  currentLapTime: number;
  bestLapTime: number | null;
  distanceToNextCheckpoint: number;
  isWrongWay: boolean;
}

export class RouteManager {
  public currentRoute: RouteDefinition;
  public checkpointsGroup: THREE.Group;
  private checkpointMeshes: THREE.Group[] = [];
  private finishLineMesh: THREE.Group | null = null;

  constructor(scene: THREE.Scene, initialRouteId: string = 'route_amir_timur') {
    this.currentRoute = ROUTES.find((r) => r.id === initialRouteId) || ROUTES[0];
    this.checkpointsGroup = new THREE.Group();
    this.checkpointsGroup.name = 'route_checkpoints';
    scene.add(this.checkpointsGroup);
    this.buildRouteVisuals();
  }

  public setRoute(routeId: string) {
    const route = ROUTES.find((r) => r.id === routeId);
    if (!route) return;
    this.currentRoute = route;
    this.buildRouteVisuals();
  }

  private buildRouteVisuals() {
    // Clear old checkpoint meshes
    while (this.checkpointsGroup.children.length > 0) {
      this.checkpointsGroup.remove(this.checkpointsGroup.children[0]);
    }
    this.checkpointMeshes = [];

    // Create Start / Finish Gantry at index 0
    const startPt = this.currentRoute.waypoints[0];
    const nextPt = this.currentRoute.waypoints[1];
    const dir = new THREE.Vector3().subVectors(nextPt, startPt).normalize();
    const angle = Math.atan2(dir.x, dir.z);

    this.finishLineMesh = this.createFinishLineGantry(startPt, angle);
    this.checkpointsGroup.add(this.finishLineMesh);

    // Create glowing neon checkpoint gates along waypoints
    for (let i = 1; i < this.currentRoute.waypoints.length; i++) {
      const pt = this.currentRoute.waypoints[i];
      const prev = this.currentRoute.waypoints[i - 1];
      const wpDir = new THREE.Vector3().subVectors(pt, prev).normalize();
      const wpAngle = Math.atan2(wpDir.x, wpDir.z);

      const gate = this.createCheckpointGate(pt, wpAngle, i);
      this.checkpointMeshes.push(gate);
      this.checkpointsGroup.add(gate);
    }
  }

  private createFinishLineGantry(pos: THREE.Vector3, angle: number): THREE.Group {
    const gantry = new THREE.Group();
    gantry.position.copy(pos);
    gantry.rotation.y = angle;

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    const bannerMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // Checkered finish banner
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // Left post
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 0.5), metalMat);
    postL.position.set(-10, 3.5, 0);
    gantry.add(postL);

    // Right post
    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 0.5), metalMat);
    postR.position.set(10, 3.5, 0);
    gantry.add(postR);

    // Cross overhead bridge
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(21, 1.2, 0.8), metalMat);
    crossBeam.position.set(0, 6.8, 0);
    gantry.add(crossBeam);

    // FINISH / START banner board
    const banner = new THREE.Mesh(new THREE.BoxGeometry(16, 1.4, 0.1), bannerMat);
    banner.position.set(0, 6.8, 0.42);
    gantry.add(banner);

    // Glowing finish line on ground
    const lineGeom = new THREE.PlaneGeometry(18, 2);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.8 });
    const groundLine = new THREE.Mesh(lineGeom, lineMat);
    groundLine.rotation.x = -Math.PI / 2;
    groundLine.position.set(0, 0.04, 0);
    gantry.add(groundLine);

    return gantry;
  }

  private createCheckpointGate(pos: THREE.Vector3, angle: number, index: number): THREE.Group {
    const gate = new THREE.Group();
    gate.position.copy(pos);
    gate.rotation.y = angle;
    gate.name = `checkpoint_${index}`;

    // Glowing cyan laser arches
    const archMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.75,
    });

    const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 5.5, 8), archMat);
    poleL.position.set(-9, 2.75, 0);
    gate.add(poleL);

    const poleR = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 5.5, 8), archMat);
    poleR.position.set(9, 2.75, 0);
    gate.add(poleR);

    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.25, 0.25), archMat);
    topBeam.position.set(0, 5.5, 0);
    gate.add(topBeam);

    // Semi-transparent laser curtain
    const curtainGeom = new THREE.PlaneGeometry(18, 5.5);
    const curtainMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
    });
    const curtain = new THREE.Mesh(curtainGeom, curtainMat);
    curtain.position.set(0, 2.75, 0);
    gate.add(curtain);

    return gate;
  }

  /**
   * Evaluates player's progress along current track, checks checkpoint crossings, lap counting
   */
  public updateProgress(
    carPos: THREE.Vector3,
    carHeading: number,
    currentProgress: PlayerRaceProgress,
    dt: number
  ): PlayerRaceProgress {
    if (currentProgress.isFinished) return currentProgress;

    const updated = { ...currentProgress };
    updated.currentLapTime += dt;

    const waypoints = this.currentRoute.waypoints;
    const nextWpIdx = updated.currentCheckpointIndex;
    const targetWp = waypoints[nextWpIdx];

    const dist = new THREE.Vector2(carPos.x, carPos.z).distanceTo(new THREE.Vector2(targetWp.x, targetWp.z));
    updated.distanceToNextCheckpoint = dist;

    // Check if player passed the target checkpoint (within 16m radius)
    if (dist < 16) {
      if (nextWpIdx === waypoints.length - 1) {
        // Last checkpoint passed, next is finish line (index 0)
        updated.currentCheckpointIndex = 0;
      } else if (nextWpIdx === 0 && updated.lapTimes.length > 0) {
        // Crossed finish line for a new lap
        updated.lapTimes.push(updated.currentLapTime);
        if (!updated.bestLapTime || updated.currentLapTime < updated.bestLapTime) {
          updated.bestLapTime = updated.currentLapTime;
        }

        if (updated.currentLap >= updated.totalLaps) {
          // Finished race!
          updated.isFinished = true;
          updated.totalRaceProgressRatio = 1.0;
          return updated;
        } else {
          updated.currentLap += 1;
          updated.currentLapTime = 0;
          updated.currentCheckpointIndex = 1;
        }
      } else {
        updated.currentCheckpointIndex += 1;
      }
    }

    // Calculate lap progress
    const totalWps = waypoints.length;
    const lapRatio = updated.currentCheckpointIndex / totalWps;
    updated.lapProgressRatio = lapRatio;

    const completedLapsRatio = (updated.currentLap - 1) / updated.totalLaps;
    const currentLapContribution = (1 / updated.totalLaps) * lapRatio;
    updated.totalRaceProgressRatio = Math.min(1, completedLapsRatio + currentLapContribution);

    // Wrong-way check
    const wpDir = new THREE.Vector3().subVectors(targetWp, carPos).normalize();
    const carFwd = new THREE.Vector3(Math.sin(carHeading), 0, Math.cos(carHeading));
    const dot = wpDir.dot(carFwd);
    updated.isWrongWay = dot < -0.4 && dist > 18;

    return updated;
  }
}
