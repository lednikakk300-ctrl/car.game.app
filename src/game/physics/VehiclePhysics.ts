import * as THREE from 'three';
import { CarConfig } from '../save/SaveManager';

export interface VehicleInputs {
  throttle: number; // 0 to 1
  brake: number;    // 0 to 1
  steer: number;    // -1 (left) to 1 (right)
  handbrake: boolean;
  nitro: boolean;
  reverse: boolean;
}

export interface VehicleState {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  quaternion: THREE.Quaternion;
  velocity: THREE.Vector3;
  speedKmh: number;
  gear: number;
  rpm: number;
  nitroRemaining: number; // 0 to 100
  isNitroActive: boolean;
  isDrifting: boolean;
  driftSlip: number;      // 0 to 1
  steeringAngle: number;  // current front wheels angle in radians
}

export class VehiclePhysics {
  public position: THREE.Vector3 = new THREE.Vector3(0, 0.4, 0);
  public rotation: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  public speed: number = 0; // m/s
  public heading: number = 0; // radians around Y
  public steerAngle: number = 0;
  public nitroRemaining: number = 100;
  public isNitroActive: boolean = false;
  public isDrifting: boolean = false;
  public driftSlip: number = 0;
  public currentGear: number = 1;
  public currentRpm: number = 900;

  // Car tuning specs
  private maxSpeedMs: number = 65; // ~234 km/h default
  private accelForce: number = 18;
  private brakeForce: number = 28;
  private turnSpeed: number = 2.4;
  private grip: number = 0.94;
  private weight: number = 1200;

  constructor(carConfig?: CarConfig) {
    if (carConfig) {
      this.applyCarConfig(carConfig);
    }
  }

  public applyCarConfig(car: CarConfig) {
    const engineUpgradeBonus = car.upgrades.engine * 0.12;
    const tireUpgradeBonus = car.upgrades.tires * 0.08;
    const nitroUpgradeBonus = car.upgrades.nitro * 0.15;
    const brakeUpgradeBonus = car.upgrades.brakes * 0.12;

    // Convert km/h to m/s
    this.maxSpeedMs = ((car.stats.topSpeed * (1 + engineUpgradeBonus)) / 3.6);
    this.accelForce = (car.stats.acceleration * 2.2) * (1 + engineUpgradeBonus);
    this.turnSpeed = (car.stats.handling * 0.32) * (1 + tireUpgradeBonus);
    this.grip = 0.91 + (car.stats.handling * 0.007) + tireUpgradeBonus * 0.02;
    this.brakeForce = (car.stats.braking * 3.4) * (1 + brakeUpgradeBonus);
  }

  public setWeatherGrip(isRaining: boolean) {
    if (isRaining) {
      this.grip = Math.max(0.85, this.grip * 0.9);
    }
  }

  public reset(pos: THREE.Vector3, headingRad: number = 0) {
    this.position.copy(pos);
    this.heading = headingRad;
    this.rotation.set(0, headingRad, 0);
    this.velocity.set(0, 0, 0);
    this.speed = 0;
    this.steerAngle = 0;
    this.nitroRemaining = 100;
    this.isNitroActive = false;
    this.isDrifting = false;
    this.currentGear = 1;
    this.currentRpm = 900;
  }

  public update(dt: number, inputs: VehicleInputs) {
    // Clamp delta time to avoid large physics steps
    const delta = Math.min(dt, 0.1);

    // Nitro handling
    if (inputs.nitro && this.nitroRemaining > 2 && inputs.throttle > 0.1) {
      this.isNitroActive = true;
      this.nitroRemaining = Math.max(0, this.nitroRemaining - delta * 32);
    } else {
      this.isNitroActive = false;
      // Passive nitro regen when drifting or driving
      if (this.isDrifting) {
        this.nitroRemaining = Math.min(100, this.nitroRemaining + delta * 15);
      } else {
        this.nitroRemaining = Math.min(100, this.nitroRemaining + delta * 4);
      }
    }

    const nitroMultiplier = this.isNitroActive ? 1.65 : 1.0;
    const currentMaxSpeed = this.maxSpeedMs * (this.isNitroActive ? 1.25 : 1.0);

    // Steering smoothing
    const targetSteer = -inputs.steer * 0.58; // max ~33 degrees
    const steerSpeed = 6.0;
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1, delta * steerSpeed);

    // Heading change: turn rate drops at very high speeds to prevent erratic twitching
    const speedRatio = Math.min(1, Math.abs(this.speed) / 25);
    const speedTurnDampen = Math.max(0.45, 1 - (this.speed / currentMaxSpeed) * 0.55);
    const turnAmount = this.steerAngle * this.turnSpeed * speedRatio * speedTurnDampen * delta;

    // Handbrake drift factor
    const isHandbraking = inputs.handbrake;
    const effectiveGrip = isHandbraking ? this.grip * 0.72 : this.grip;

    this.heading += turnAmount;
    this.rotation.y = this.heading;

    // Acceleration & Braking
    if (inputs.throttle > 0 && !inputs.reverse) {
      const power = inputs.throttle * this.accelForce * nitroMultiplier;
      // Resistance increases as we approach top speed
      const availablePower = power * Math.max(0, 1 - (this.speed / currentMaxSpeed));
      this.speed += availablePower * delta;
    } else if (inputs.reverse) {
      // Reverse gear
      const reverseMax = -12; // ~43 km/h
      this.speed -= this.accelForce * 0.55 * delta;
      if (this.speed < reverseMax) this.speed = reverseMax;
    }

    if (inputs.brake > 0) {
      const brakePower = inputs.brake * this.brakeForce * delta;
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - brakePower);
      } else if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + brakePower);
      }
    }

    if (isHandbraking) {
      const handbrakeBrake = 12 * delta;
      if (Math.abs(this.speed) > 0.5) {
        this.speed -= Math.sign(this.speed) * handbrakeBrake;
      }
    }

    // Natural rolling air/tire resistance
    this.speed *= (1 - 0.08 * delta);

    // Forward direction vector from heading
    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);

    // Target velocity along car heading
    const targetVelX = forwardX * this.speed;
    const targetVelZ = forwardZ * this.speed;

    // Lateral drift / slip simulation
    const lerpGrip = Math.min(1, delta * 15 * effectiveGrip);
    this.velocity.x += (targetVelX - this.velocity.x) * lerpGrip;
    this.velocity.z += (targetVelZ - this.velocity.z) * lerpGrip;

    // Drift detection: difference between heading vector and actual velocity vector
    const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    if (currentSpeed > 8) {
      const velHeading = Math.atan2(this.velocity.x, this.velocity.z);
      let angleDiff = Math.abs(this.heading - velHeading);
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      angleDiff = Math.abs(angleDiff);

      this.driftSlip = Math.min(1, angleDiff / 0.5);
      this.isDrifting = this.driftSlip > 0.22 || (isHandbraking && currentSpeed > 6);
    } else {
      this.isDrifting = false;
      this.driftSlip = 0;
    }

    // Update position
    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.z * delta;

    // Subtle chassis roll/pitch during heavy steering or braking
    const rollAngle = -this.steerAngle * Math.min(0.06, (currentSpeed / 30) * 0.05);
    const pitchAngle = inputs.brake > 0 ? 0.03 : (inputs.throttle > 0 ? -0.02 : 0);
    this.rotation.z = rollAngle;
    this.rotation.x = pitchAngle;

    // Calculate gear and RPM for engine sound and HUD
    this.updateGearsAndRpm(currentSpeed * 3.6);
  }

  private updateGearsAndRpm(speedKmh: number) {
    const gearRatios = [
      { gear: 1, min: 0, max: 50 },
      { gear: 2, min: 45, max: 90 },
      { gear: 3, min: 85, max: 140 },
      { gear: 4, min: 135, max: 200 },
      { gear: 5, min: 195, max: 350 },
    ];

    let current = gearRatios[0];
    for (const g of gearRatios) {
      if (speedKmh >= g.min) {
        current = g;
      }
    }
    this.currentGear = current.gear;

    // RPM runs from 1000 idle to 7500 redline
    const range = current.max - current.min;
    const progress = Math.max(0, Math.min(1, (speedKmh - current.min) / range));
    this.currentRpm = 1000 + progress * 6200;
  }

  public applyCollisionImpulse(normal: THREE.Vector3, bounceFactor: number = 0.5) {
    // Reflect velocity off obstacle normal
    const dot = this.velocity.dot(normal);
    if (dot < 0) {
      this.velocity.sub(normal.clone().multiplyScalar((1 + bounceFactor) * dot));
      this.speed *= 0.65; // speed loss on impact
    }
  }

  public getState(): VehicleState {
    const speedKmh = Math.round(this.speed * 3.6);
    return {
      position: this.position.clone(),
      rotation: this.rotation.clone(),
      quaternion: new THREE.Quaternion().setFromEuler(this.rotation),
      velocity: this.velocity.clone(),
      speedKmh: Math.max(0, speedKmh),
      gear: this.currentGear,
      rpm: Math.round(this.currentRpm),
      nitroRemaining: Math.round(this.nitroRemaining),
      isNitroActive: this.isNitroActive,
      isDrifting: this.isDrifting,
      driftSlip: this.driftSlip,
      steeringAngle: this.steerAngle,
    };
  }
}
