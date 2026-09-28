import * as THREE from 'three';
import { VehicleConfig } from '../../types/game';
import { soundSynth } from '../audio/SoundSynthesizer';
import { getWorldElevation } from '../world/WorldElevation';
import { VehicleMeshRig } from './VehicleModelBuilder';

export interface VehicleInput {
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  steer: number; // -1 (left) to 1 (right)
  handbrake: boolean;
  reverse: boolean;
}

export interface CollisionBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  label?: string;
}

export class VehiclePhysics {
  public position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public rotationY: number = 0; // heading in radians
  public speed: number = 0; // forward speed in m/s
  public speedKmh: number = 0;
  public steerAngle: number = 0; // current wheel steer in radians
  public rollAngle: number = 0; // bike lean or car roll
  public pitchAngle: number = 0; // acceleration squat / braking dive

  public isDrifting: boolean = false;
  public gear: string = 'D';
  public rpm: number = 1000;
  public weatherGrip: number = 1.0;

  // Trailer Articulation State
  public trailerRotationY: number = 0;
  public isJackknifing: boolean = false;
  private lastJackknifeAudioTime: number = 0;

  // Near-Miss Detector (for Bike courier & agile maneuvers)
  public nearMissCombo: number = 0;
  public nearMissTotalCount: number = 0;
  private lastNearMissTime: number = 0;
  private checkedNearMisses: Set<string> = new Set();

  // Passenger Comfort & Dialogue Reactions (Taxi / Rideshare)
  public hasPassenger: boolean = false;
  private smoothDrivingTimer: number = 0;
  private lastFeedbackTime: number = 0;

  // Callbacks
  public onCollision?: (impactSpeed: number) => void;
  public onNearMiss?: (bonus: number, combo: number) => void;
  public onPassengerFeedback?: (text: string, mood: 'happy' | 'neutral' | 'annoyed' | 'panicked') => void;

  // Configuration
  private config: VehicleConfig;
  private rig: VehicleMeshRig;

  // Dynamic state
  private lateralSlip: number = 0;
  private collisionBoxes: CollisionBox[] = [];
  private elevationSampler?: (x: number, z: number) => number;

  constructor(config: VehicleConfig, rig: VehicleMeshRig) {
    this.config = config;
    this.rig = rig;
  }

  public setElevationSampler(fn?: (x: number, z: number) => number): void {
    this.elevationSampler = fn;
  }

  private getElevationAt(x: number, z: number): number {
    if (this.elevationSampler) {
      return this.elevationSampler(x, z);
    }
    return getWorldElevation(x, z);
  }

  public setCollisionBoxes(boxes: CollisionBox[]): void {
    this.collisionBoxes = boxes;
  }

  public setWeatherGrip(grip: number): void {
    this.weatherGrip = grip;
  }

  public reset(pos: THREE.Vector3, heading: number = 0): void {
    this.position.copy(pos);
    this.rotationY = heading;
    this.trailerRotationY = heading;
    this.isJackknifing = false;
    this.nearMissCombo = 0;
    this.checkedNearMisses.clear();
    this.smoothDrivingTimer = 0;
    this.speed = 0;
    this.speedKmh = 0;
    this.steerAngle = 0;
    this.rollAngle = 0;
    this.pitchAngle = 0;
    this.rig.root.position.copy(pos);
    this.rig.root.rotation.set(0, heading, 0);

    if (this.rig.trailerGroup) {
      const hitchOffsetZ = -1.0;
      const hx = pos.x + Math.sin(heading) * hitchOffsetZ;
      const hz = pos.z + Math.cos(heading) * hitchOffsetZ;
      this.rig.trailerGroup.position.set(hx, pos.y, hz);
      this.rig.trailerGroup.rotation.set(0, heading, 0);
    }
  }

  public update(delta: number, input: VehicleInput): void {
    const dt = Math.min(delta, 0.05); // clamp to prevent frame skips

    // 1. Steering target interpolation (A = left, D = right)
    const maxSteer = this.config.id === 'city_bus' ? 0.42 : this.config.id === 'box_truck' ? 0.45 : 0.58;
    const steerSpeed = 4.8;
    // Invert input.steer so pressing A (left) turns left, and D (right) turns right
    const targetSteer = -input.steer * maxSteer;
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1, steerSpeed * dt * 2.5);

    // Apply front wheel visual turn
    this.rig.frontSteerGroups.forEach((group) => {
      group.rotation.y = this.steerAngle;
    });

    // 2. Acceleration / Braking
    const maxSpeedMs = (this.config.topSpeed * 1000) / 3600;
    const accelPower = (this.config.acceleration / 100) * 14.0;
    const brakePower = (this.config.braking / 100) * 22.0 * this.weatherGrip;
    const dragCoeff = 0.45;
    const rollingResistance = 1.8;

    let forwardForce = 0;

    if (input.throttle > 0) {
      if (this.speed < -0.5) {
        // Active braking while reversing
        forwardForce += brakePower * input.throttle;
      } else {
        // Forward drive
        forwardForce += accelPower * input.throttle * Math.max(0.2, 1 - this.speed / maxSpeedMs);
      }
    }

    if (input.brake > 0) {
      if (this.speed > 0.5) {
        // Active forward braking
        forwardForce -= brakePower * input.brake;
      } else {
        // Reverse drive
        forwardForce -= accelPower * 0.55 * input.brake * Math.max(0.2, 1 + this.speed / (maxSpeedMs * 0.4));
      }
    }

    if (input.handbrake) {
      forwardForce -= Math.sign(this.speed) * brakePower * 1.5;
    }

    // Natural drag and rolling friction
    const drag = Math.sign(this.speed) * (this.speed * this.speed * 0.012 * dragCoeff + rollingResistance);
    forwardForce -= drag;

    // Apply acceleration
    this.speed += forwardForce * dt;

    // Zero threshold
    if (Math.abs(this.speed) < 0.08 && input.throttle === 0 && input.brake === 0) {
      this.speed = 0;
    }

    this.speedKmh = Math.round(this.speed * 3.6);

    // 3. Turning Physics & Drift Slip
    const turnSensitivity = (this.config.handling / 100) * 1.6;
    const effectiveGrip = this.weatherGrip * (input.handbrake ? 0.35 : 1.0);
    const slipThreshold = 12.0 * effectiveGrip;

    const lateralForce = Math.abs(this.speed) * Math.sin(this.steerAngle);
    this.isDrifting = lateralForce > slipThreshold || (input.handbrake && Math.abs(this.speed) > 4);

    if (this.isDrifting) {
      this.lateralSlip += (Math.sign(this.steerAngle) * (lateralForce - slipThreshold) * 0.3 - this.lateralSlip) * dt * 4;
      soundSynth.playTireSkid(Math.min(1, Math.abs(this.lateralSlip) / 8));
    } else {
      this.lateralSlip *= Math.max(0, 1 - dt * 6);
      soundSynth.stopTireSkid();
    }

    // Yaw rotation
    const yawSpeed = (this.speed / Math.max(2.0, this.config.bodyDimensions.wheelbase)) * Math.tan(this.steerAngle) * turnSensitivity;
    this.rotationY += yawSpeed * dt;

    // 4. Position update
    const forwardX = Math.sin(this.rotationY);
    const forwardZ = Math.cos(this.rotationY);
    const rightX = Math.cos(this.rotationY);
    const rightZ = -Math.sin(this.rotationY);

    const prevX = this.position.x;
    const prevZ = this.position.z;

    this.position.x += (forwardX * this.speed + rightX * this.lateralSlip) * dt;
    this.position.z += (forwardZ * this.speed + rightZ * this.lateralSlip) * dt;

    // 4b. 3D Ground Elevation Follow
    const groundY = this.getElevationAt(this.position.x, this.position.z);
    this.position.y += (groundY - this.position.y) * Math.min(1, dt * 20);

    // 5. Collision resolution with world objects
    this.checkCollisions(prevX, prevZ);

    // 6. Visual Rig Suspension and Wheel Spin
    const wheelRotDelta = (this.speed / 0.35) * dt;
    this.rig.wheels.forEach((w) => {
      w.rotation.x += wheelRotDelta;
    });

    // Pitch (squat/dive + road slope climb/descent)
    const yAhead = this.getElevationAt(this.position.x + forwardX * 2.2, this.position.z + forwardZ * 2.2);
    const yBehind = this.getElevationAt(this.position.x - forwardX * 2.2, this.position.z - forwardZ * 2.2);
    const slopePitch = -Math.atan2(yAhead - yBehind, 4.4);
    const squatPitch = (forwardForce / 25) * 0.04;
    const targetPitch = slopePitch + squatPitch;
    this.pitchAngle += (targetPitch - this.pitchAngle) * dt * 8;

    // Roll (car body roll or motorbike lean)
    if (this.config.id === 'motorbike') {
      const targetRoll = -this.steerAngle * Math.min(1, Math.abs(this.speed) / 10) * 0.6;
      this.rollAngle += (targetRoll - this.rollAngle) * dt * 8;
    } else {
      const targetRoll = this.steerAngle * Math.min(1, Math.abs(this.speed) / 15) * 0.08;
      this.rollAngle += (targetRoll - this.rollAngle) * dt * 6;
    }

    // Apply to mesh
    this.rig.root.position.copy(this.position);
    this.rig.root.rotation.set(0, this.rotationY, 0);
    this.rig.chassis.rotation.set(this.pitchAngle, 0, this.rollAngle);

    // 6b. Articulated Semi-Trailer Physics & Jackknife Calculation (Box Truck)
    if (this.rig.trailerGroup) {
      const hitchOffsetZ = -1.0;
      const hx = this.position.x + forwardX * hitchOffsetZ;
      const hz = this.position.z + forwardZ * hitchOffsetZ;
      const hy = this.position.y;

      const trailerWheelbase = 4.4; // effective wheelbase to trailer tandem axles
      let angleDiff = this.rotationY - this.trailerRotationY;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (this.speed > 0.1) {
        // Forward drive: trailer follows hitch
        this.trailerRotationY += (this.speed / trailerWheelbase) * Math.sin(angleDiff) * dt * 1.8;
      } else if (this.speed < -0.1) {
        // Reverse drive: trailer pivots away, creating jackknife risk!
        this.trailerRotationY -= (Math.abs(this.speed) / trailerWheelbase) * Math.sin(angleDiff) * dt * 2.2;
      }

      // Check jackknife warning (> 60 degrees articulation angle)
      const absAngle = Math.abs(angleDiff);
      if (absAngle > 1.05) {
        this.isJackknifing = true;
        const now = performance.now();
        if (now - this.lastJackknifeAudioTime > 2500 && Math.abs(this.speed) > 2) {
          this.lastJackknifeAudioTime = now;
          soundSynth.playTrailerJackknifeWarning();
        }
      } else {
        this.isJackknifing = false;
      }

      this.rig.trailerGroup.position.set(hx, hy, hz);
      this.rig.trailerGroup.rotation.set(this.pitchAngle * 0.4, this.trailerRotationY, 0);

      if (this.rig.trailerWheels) {
        this.rig.trailerWheels.forEach((tw) => {
          tw.rotation.x += wheelRotDelta;
        });
      }
    }

    // 6c. Near-Miss Detector (Traffic Weaving for Bike & Agile Driving)
    if (this.speedKmh > 35 && this.collisionBoxes.length > 0) {
      const now = performance.now();
      for (const box of this.collisionBoxes) {
        if (!box.label || !box.label.startsWith('traffic')) continue;
        const boxCenterX = (box.minX + box.maxX) / 2;
        const boxCenterZ = (box.minZ + box.maxZ) / 2;
        const dist = Math.hypot(this.position.x - boxCenterX, this.position.z - boxCenterZ);

        if (dist > 1.6 && dist < 2.9) {
          const key = `${Math.round(boxCenterX)}_${Math.round(boxCenterZ)}`;
          if (!this.checkedNearMisses.has(key)) {
            this.checkedNearMisses.add(key);
            this.nearMissTotalCount++;
            if (now - this.lastNearMissTime < 4000) {
              this.nearMissCombo = Math.min(5, this.nearMissCombo + 1);
            } else {
              this.nearMissCombo = 1;
            }
            this.lastNearMissTime = now;
            soundSynth.playNearMiss();
            const bonus = 25 * this.nearMissCombo;
            if (this.onNearMiss) {
              this.onNearMiss(bonus, this.nearMissCombo);
            }
          }
        }
      }

      if (now - this.lastNearMissTime > 6000 && this.checkedNearMisses.size > 20) {
        this.checkedNearMisses.clear();
      }
    }

    // 6d. Passenger Comfort & Dialogue Reactions (Taxi Runs)
    if (this.hasPassenger) {
      const now = performance.now();

      // Reaction to violent braking
      if (input.brake > 0.8 && this.speedKmh > 32 && now - this.lastFeedbackTime > 6000) {
        this.lastFeedbackTime = now;
        this.smoothDrivingTimer = 0;
        const phrases = [
          'Whoa! Easy on the brakes, please!',
          'Gentle with the stop pedal, my neck!',
          'Yikes! Almost hit the dash there!',
        ];
        const phrase = phrases[Math.floor(Math.random() * phrases.length)];
        soundSynth.playPassengerSpeech('annoyed');
        this.onPassengerFeedback?.(phrase, 'annoyed');
      }
      // Reaction to hard drift / reckless high-speed turns
      else if (this.isDrifting && this.speedKmh > 38 && now - this.lastFeedbackTime > 6000) {
        this.lastFeedbackTime = now;
        this.smoothDrivingTimer = 0;
        const phrases = [
          'Hang on! Is this a taxi or a drift car?!',
          'Whoa! Take it easy on the corners!',
          'Hold on tight, stomach is doing flips!',
        ];
        const phrase = phrases[Math.floor(Math.random() * phrases.length)];
        soundSynth.playPassengerSpeech('panicked');
        this.onPassengerFeedback?.(phrase, 'panicked');
      }
      // Reward for smooth steady driving
      else if (this.speedKmh > 25 && !this.isDrifting && input.brake < 0.3) {
        this.smoothDrivingTimer += dt;
        if (this.smoothDrivingTimer > 20 && now - this.lastFeedbackTime > 14000) {
          this.smoothDrivingTimer = 0;
          this.lastFeedbackTime = now;
          const phrases = [
            'Nice smooth cruising, very relaxing.',
            'Great driving! We will make good time.',
            'Enjoying the view out the window, thank you driver.',
          ];
          const phrase = phrases[Math.floor(Math.random() * phrases.length)];
          soundSynth.playPassengerSpeech('happy');
          this.onPassengerFeedback?.(phrase, 'happy');
        }
      }
    }

    // 7. Update Engine Sound & Telemetry
    const speedRatio = Math.min(1, Math.abs(this.speed) / maxSpeedMs);
    soundSynth.updateEnginePitch(speedRatio, input.throttle, this.config.id);

    // Determine gear
    if (this.speed < -0.2) {
      this.gear = 'R';
    } else if (Math.abs(this.speed) <= 0.2 && input.throttle === 0) {
      this.gear = 'P';
    } else {
      const gearNum = Math.min(5, Math.floor(speedRatio * 5) + 1);
      this.gear = `${gearNum}`;
    }
    this.rpm = Math.round(900 + speedRatio * 5200 + input.throttle * 800);
  }

  private checkCollisions(prevX: number, prevZ: number): void {
    const halfW = this.config.bodyDimensions.width * 0.55;
    const halfL = this.config.bodyDimensions.length * 0.55;

    const myMinX = this.position.x - halfW;
    const myMaxX = this.position.x + halfW;
    const myMinZ = this.position.z - halfL;
    const myMaxZ = this.position.z + halfL;

    for (const box of this.collisionBoxes) {
      if (myMaxX > box.minX && myMinX < box.maxX && myMaxZ > box.minZ && myMinZ < box.maxZ) {
        // Impact occurred!
        const impactSpeed = Math.abs(this.speed);
        if (impactSpeed > 2.0) {
          soundSynth.playCrash(impactSpeed / 15);
          if (this.onCollision) {
            this.onCollision(impactSpeed);
          }
        }

        // Rebound position
        this.position.x = prevX;
        this.position.z = prevZ;
        this.speed = -this.speed * 0.35; // gentle bounce
        break;
      }
    }
  }
}
