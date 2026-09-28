import * as THREE from 'three';
import { CarModelBuilder, Car3DInstance } from '../cars/CarModels';
import { RouteDefinition } from '../routes/RouteManager';

export interface AIDriverProfile {
  id: string;
  name: string;
  carId: string;
  carColor: string;
  personality: 'Aggressive' | 'Technical' | 'Defensive' | 'Balanced';
  aggression: number;    // 0 to 1
  cornerGrip: number;     // 0 to 1
  topSpeedFactor: number; // 0.85 to 1.15
  nitroChance: number;    // 0 to 1
}

export const AI_DRIVERS: AIDriverProfile[] = [
  {
    id: 'ai_rustam',
    name: 'Rustam "The Bullet"',
    carId: 'samara_gt',
    carColor: '#dc2626',
    personality: 'Aggressive',
    aggression: 0.95,
    cornerGrip: 0.88,
    topSpeedFactor: 1.05,
    nitroChance: 0.85,
  },
  {
    id: 'ai_dilshod',
    name: 'Dilshod "Drifter"',
    carId: 'lacetti_sport',
    carColor: '#059669',
    personality: 'Technical',
    aggression: 0.75,
    cornerGrip: 0.96,
    topSpeedFactor: 0.98,
    nitroChance: 0.65,
  },
  {
    id: 'ai_shavkat',
    name: 'Shavkat "Iron Wall"',
    carId: 'gwagon_black',
    carColor: '#171717',
    personality: 'Defensive',
    aggression: 0.85,
    cornerGrip: 0.82,
    topSpeedFactor: 1.0,
    nitroChance: 0.75,
  },
  {
    id: 'ai_farrukh',
    name: 'Farrukh "Phantom"',
    carId: 'phantom_supercar',
    carColor: '#f59e0b',
    personality: 'Balanced',
    aggression: 0.8,
    cornerGrip: 0.9,
    topSpeedFactor: 1.08,
    nitroChance: 0.9,
  },
];

export class AIRacerInstance {
  public profile: AIDriverProfile;
  public car3D: Car3DInstance;
  public position: THREE.Vector3;
  public heading: number = 0;
  public speed: number = 0;
  public currentWaypointIndex: number = 1;
  public currentLap: number = 1;
  public totalProgress: number = 0;
  public isFinished: boolean = false;
  public laneOffset: number = 0; // -4 to +4 meters offset to prevent AI stacking
  public isNitroActive: boolean = false;
  private nitroCooldown: number = 5.0;

  constructor(scene: THREE.Scene, profile: AIDriverProfile, startPos: THREE.Vector3, startHeading: number, laneOffset: number = 0) {
    this.profile = profile;
    this.car3D = CarModelBuilder.createCar(profile.carId, profile.carColor);
    scene.add(this.car3D.root);

    this.position = startPos.clone();
    this.heading = startHeading;
    this.laneOffset = laneOffset;
    this.car3D.root.position.copy(this.position);
    this.car3D.root.rotation.y = this.heading;
  }

  public update(
    dt: number,
    route: RouteDefinition,
    difficulty: 'Easy' | 'Medium' | 'Hard',
    playerPos: THREE.Vector3,
    allCarsPos: THREE.Vector3[]
  ) {
    if (this.isFinished) {
      // Slow down to a stop after race
      this.speed = Math.max(0, this.speed - dt * 15);
      this.car3D.updateWheelSpin(this.speed, 0, dt);
      return;
    }

    // Difficulty scaling
    let speedLimit = 42; // ~150 km/h for Easy
    if (difficulty === 'Medium') speedLimit = 55; // ~200 km/h
    if (difficulty === 'Hard') speedLimit = 68; // ~245 km/h
    speedLimit *= this.profile.topSpeedFactor;

    // Target waypoint
    const waypoints = route.waypoints;
    const targetWp = waypoints[this.currentWaypointIndex];

    // Compute target position with lateral lane offset
    const prevWp = waypoints[(this.currentWaypointIndex - 1 + waypoints.length) % waypoints.length];
    const segmentDir = new THREE.Vector3().subVectors(targetWp, prevWp).normalize();
    const perpDir = new THREE.Vector3(-segmentDir.z, 0, segmentDir.x);
    const targetWithOffset = targetWp.clone().add(perpDir.multiplyScalar(this.laneOffset));

    // Distance and vector to target
    const toTarget = new THREE.Vector3().subVectors(targetWithOffset, this.position);
    toTarget.y = 0;
    const distToTarget = toTarget.length();

    // Reached waypoint?
    if (distToTarget < 14) {
      this.currentWaypointIndex = (this.currentWaypointIndex + 1) % waypoints.length;
      if (this.currentWaypointIndex === 0) {
        this.currentLap += 1;
        if (this.currentLap > route.totalLaps) {
          this.isFinished = true;
          this.totalProgress = 1.0;
          return;
        }
      }
    }

    // Calculate desired heading to target
    const desiredHeading = Math.atan2(toTarget.x, toTarget.z);
    let headingDiff = desiredHeading - this.heading;
    while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
    while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;

    // Steering behavior
    const steerGain = 3.8 * this.profile.cornerGrip;
    this.heading += headingDiff * Math.min(1, dt * steerGain);
    this.car3D.root.rotation.y = this.heading;

    // Corner braking: slow down if turning sharply
    const turnSeverity = Math.abs(headingDiff);
    let targetSpeed = speedLimit;
    if (turnSeverity > 0.45) {
      targetSpeed *= 0.58; // brake for sharp turn
      this.car3D.setBraking(true);
    } else {
      this.car3D.setBraking(false);
    }

    // Nitro logic on straight lines
    this.nitroCooldown -= dt;
    if (turnSeverity < 0.15 && distToTarget > 35 && this.nitroCooldown <= 0 && Math.random() < this.profile.nitroChance) {
      this.isNitroActive = true;
      this.nitroCooldown = 8.0;
      targetSpeed *= 1.25;
    } else if (this.nitroCooldown < 5.0) {
      this.isNitroActive = false;
    }

    // Acceleration / Braking
    const accelRate = 18 * this.profile.aggression;
    if (this.speed < targetSpeed) {
      this.speed = Math.min(targetSpeed, this.speed + accelRate * dt);
    } else {
      this.speed = Math.max(targetSpeed, this.speed - 25 * dt);
    }

    // Avoid colliding directly into player or other AI (overtake or slow down)
    const distToPlayer = this.position.distanceTo(playerPos);
    if (distToPlayer < 9) {
      const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
      const dotFwd = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading)).dot(toPlayer.normalize());
      if (dotFwd > 0.7) {
        // Player is directly ahead! Swerve or brake
        this.speed = Math.max(10, this.speed - 20 * dt);
        this.laneOffset = (this.laneOffset > 0 ? -3.5 : 3.5);
      }
    }

    // Move forward
    this.position.x += Math.sin(this.heading) * this.speed * dt;
    this.position.z += Math.cos(this.heading) * this.speed * dt;
    this.car3D.root.position.copy(this.position);

    // Wheel spin & steer visuals
    const steerAngleVisual = Math.max(-0.45, Math.min(0.45, headingDiff * 0.8));
    this.car3D.updateWheelSpin(this.speed, steerAngleVisual, dt);

    // Update overall race progress for leaderboard ranking
    const totalWps = waypoints.length;
    const lapProgress = this.currentWaypointIndex / totalWps;
    const completedLaps = (this.currentLap - 1) / route.totalLaps;
    this.totalProgress = Math.min(1, completedLaps + (1 / route.totalLaps) * lapProgress);
  }

  public reset(startPos: THREE.Vector3, startHeading: number) {
    this.position.copy(startPos);
    this.heading = startHeading;
    this.speed = 0;
    this.currentWaypointIndex = 1;
    this.currentLap = 1;
    this.totalProgress = 0;
    this.isFinished = false;
    this.isNitroActive = false;
    this.car3D.root.position.copy(this.position);
    this.car3D.root.rotation.y = this.heading;
  }

  public destroy(scene: THREE.Scene) {
    scene.remove(this.car3D.root);
  }
}
