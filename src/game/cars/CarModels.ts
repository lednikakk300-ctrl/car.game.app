import * as THREE from 'three';

export interface Car3DInstance {
  root: THREE.Group;
  bodyMesh: THREE.Mesh;
  frontLeftWheel: THREE.Group;
  frontRightWheel: THREE.Group;
  rearLeftWheel: THREE.Group;
  rearRightWheel: THREE.Group;
  leftDoor: THREE.Group | null;
  rightDoor: THREE.Group | null;
  trunk: THREE.Group | null;
  hood: THREE.Group | null;
  headlightLeft: THREE.SpotLight | null;
  headlightRight: THREE.SpotLight | null;
  brakeLightL: THREE.Mesh | null;
  brakeLightR: THREE.Mesh | null;
  steeringWheel: THREE.Group | null;
  driverSeat: THREE.Object3D | null;
  cockpitAnchor: THREE.Vector3;
  hoodAnchor: THREE.Vector3;
  setDoorOpen: (door: 'left' | 'right' | 'trunk' | 'hood', open: boolean) => void;
  updateWheelSpin: (speedMps: number, steerRad: number, dt: number) => void;
  setBraking: (braking: boolean) => void;
  setHeadlights: (on: boolean) => void;
  setPaintColor: (hexColor: string) => void;
}

export class CarModelBuilder {
  /**
   * Builds high-quality procedural 3D car inspired by Tashkent street racing cars.
   * Includes opening doors, trunk, dashboard interior, and working lights.
   */
  static createCar(carId: string, initialColorHex: string = '#dc2626'): Car3DInstance {
    const root = new THREE.Group();
    root.name = `car_${carId}`;

    // Base paint material
    const paintMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(initialColorHex),
      metalness: 0.75,
      roughness: 0.28,
    });

    const blackTrimMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.8,
      metalness: 0.2,
    });

    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      metalness: 0.95,
      roughness: 0.1,
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      metalness: 0.1,
      roughness: 0.1,
      transparent: true,
      opacity: 0.45,
    });

    const tireMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.85,
    });

    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0xe4e4e7,
      metalness: 0.85,
      roughness: 0.2,
    });

    // Body dimensions depending on model
    const isSUV = carId === 'gwagon_black';
    const isHatch = carId === 'samara_gt';
    const isHyper = carId === 'phantom_supercar';

    const carLength = isSUV ? 4.6 : (isHatch ? 4.1 : (isHyper ? 4.7 : 4.4));
    const carWidth = isSUV ? 1.95 : (isHyper ? 2.05 : 1.8);
    const carHeight = isSUV ? 1.85 : (isHyper ? 1.15 : 1.4);

    // Chassis group
    const chassis = new THREE.Group();
    root.add(chassis);

    // 1. Lower chassis body
    const lowerBodyGeom = new THREE.BoxGeometry(carWidth, carHeight * 0.42, carLength);
    const bodyMesh = new THREE.Mesh(lowerBodyGeom, paintMaterial);
    bodyMesh.position.y = carHeight * 0.45;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    chassis.add(bodyMesh);

    // Sport racing dual stripes for Samara GT (as in reference image)
    if (isHatch) {
      const stripeGeom = new THREE.BoxGeometry(0.22, 0.02, carLength + 0.02);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const stripe1 = new THREE.Mesh(stripeGeom, stripeMat);
      stripe1.position.set(-0.25, carHeight * 0.42 / 2 + 0.01, 0);
      bodyMesh.add(stripe1);

      const stripe2 = new THREE.Mesh(stripeGeom, stripeMat);
      stripe2.position.set(0.25, carHeight * 0.42 / 2 + 0.01, 0);
      bodyMesh.add(stripe2);
    }

    // 2. Cabin / Roof
    const cabinWidth = carWidth * (isSUV ? 0.92 : 0.82);
    const cabinHeight = carHeight * (isSUV ? 0.52 : (isHyper ? 0.38 : 0.46));
    const cabinLength = carLength * (isSUV ? 0.65 : (isHatch ? 0.6 : 0.52));
    const cabinZ = isHatch ? -0.2 : (isSUV ? -0.1 : -0.15);

    const cabinGeom = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength);
    const cabin = new THREE.Mesh(cabinGeom, paintMaterial);
    cabin.position.set(0, carHeight * 0.42 / 2 + cabinHeight / 2, cabinZ);
    cabin.castShadow = true;
    bodyMesh.add(cabin);

    // Windshield & Windows
    const windshieldGeom = new THREE.BoxGeometry(cabinWidth * 0.94, cabinHeight * 0.85, 0.08);
    const frontWindshield = new THREE.Mesh(windshieldGeom, glassMaterial);
    frontWindshield.position.set(0, 0, cabinLength / 2 + 0.01);
    frontWindshield.rotation.x = -0.32;
    cabin.add(frontWindshield);

    const rearWindow = new THREE.Mesh(windshieldGeom, glassMaterial);
    rearWindow.position.set(0, 0, -cabinLength / 2 - 0.01);
    rearWindow.rotation.x = isHatch ? 0.45 : 0.25;
    cabin.add(rearWindow);

    // Front Bumper & Radiator Grille
    const frontBumperGeom = new THREE.BoxGeometry(carWidth + 0.04, 0.25, 0.2);
    const frontBumper = new THREE.Mesh(frontBumperGeom, blackTrimMaterial);
    frontBumper.position.set(0, -carHeight * 0.12, carLength / 2 + 0.1);
    bodyMesh.add(frontBumper);

    // Grille with Uzbek license plate
    const plateGeom = new THREE.BoxGeometry(0.52, 0.14, 0.02);
    const plateMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const frontPlate = new THREE.Mesh(plateGeom, plateMat);
    frontPlate.position.set(0, 0, 0.11);
    frontBumper.add(frontPlate);

    // Rear Bumper with License plate "01 | 777 TSH"
    const rearBumper = new THREE.Mesh(frontBumperGeom, blackTrimMaterial);
    rearBumper.position.set(0, -carHeight * 0.12, -carLength / 2 - 0.1);
    bodyMesh.add(rearBumper);

    const rearPlate = new THREE.Mesh(plateGeom, plateMat);
    rearPlate.position.set(0, 0, -0.11);
    rearPlate.rotation.y = Math.PI;
    rearBumper.add(rearPlate);

    // Dual Chrome Exhaust
    const exhaustGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.35, 12);
    exhaustGeom.rotateX(Math.PI / 2);
    const exhaustL = new THREE.Mesh(exhaustGeom, chromeMaterial);
    exhaustL.position.set(-0.45, -0.06, -0.12);
    rearBumper.add(exhaustL);

    const exhaustR = new THREE.Mesh(exhaustGeom, chromeMaterial);
    exhaustR.position.set(0.45, -0.06, -0.12);
    rearBumper.add(exhaustR);

    // SUV details: Spare tire on back as in reference #4
    if (isSUV) {
      const spareTireGeom = new THREE.CylinderGeometry(0.42, 0.42, 0.22, 16);
      spareTireGeom.rotateZ(Math.PI / 2);
      const spareTire = new THREE.Mesh(spareTireGeom, blackTrimMaterial);
      spareTire.position.set(0, 0.2, -carLength / 2 - 0.2);
      bodyMesh.add(spareTire);
    }

    // Rear spoiler for hypercar/sport tuner
    if (isHyper || carId === 'lacetti_sport') {
      const wingGeom = new THREE.BoxGeometry(carWidth * 0.85, 0.05, 0.35);
      const wing = new THREE.Mesh(wingGeom, blackTrimMaterial);
      wing.position.set(0, 0.32, -carLength / 2 + 0.2);
      bodyMesh.add(wing);

      const standL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.1), blackTrimMaterial);
      standL.position.set(-0.5, 0.15, -carLength / 2 + 0.2);
      bodyMesh.add(standL);

      const standR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.1), blackTrimMaterial);
      standR.position.set(0.5, 0.15, -carLength / 2 + 0.2);
      bodyMesh.add(standR);
    }

    // 3. Headlights & Taillights
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const headlightGeom = new THREE.BoxGeometry(0.28, 0.14, 0.06);

    const headlightMeshL = new THREE.Mesh(headlightGeom, headlightMat);
    headlightMeshL.position.set(-carWidth * 0.36, 0.04, carLength / 2 + 0.02);
    bodyMesh.add(headlightMeshL);

    const headlightMeshR = new THREE.Mesh(headlightGeom, headlightMat);
    headlightMeshR.position.set(carWidth * 0.36, 0.04, carLength / 2 + 0.02);
    bodyMesh.add(headlightMeshR);

    // Realistic Three.js Spotlights for night driving
    const headlightLeft = new THREE.SpotLight(0xfffaed, 4.0, 70, Math.PI / 6, 0.3, 1.2);
    headlightLeft.position.set(-carWidth * 0.36, 0.04, carLength / 2 + 0.2);
    headlightLeft.target.position.set(-carWidth * 0.36, -0.2, carLength / 2 + 30);
    bodyMesh.add(headlightLeft);
    bodyMesh.add(headlightLeft.target);

    const headlightRight = new THREE.SpotLight(0xfffaed, 4.0, 70, Math.PI / 6, 0.3, 1.2);
    headlightRight.position.set(carWidth * 0.36, 0.04, carLength / 2 + 0.2);
    headlightRight.target.position.set(carWidth * 0.36, -0.2, carLength / 2 + 30);
    bodyMesh.add(headlightRight);
    bodyMesh.add(headlightRight.target);

    // Taillights
    const brakeMat = new THREE.MeshBasicMaterial({ color: 0x991b1b });
    const taillightGeom = new THREE.BoxGeometry(0.3, 0.12, 0.06);

    const brakeLightL = new THREE.Mesh(taillightGeom, brakeMat);
    brakeLightL.position.set(-carWidth * 0.36, 0.06, -carLength / 2 - 0.02);
    bodyMesh.add(brakeLightL);

    const brakeLightR = new THREE.Mesh(taillightGeom, brakeMat);
    brakeLightR.position.set(carWidth * 0.36, 0.06, -carLength / 2 - 0.02);
    bodyMesh.add(brakeLightR);

    // 4. Cockpit Interior (Dashboard, Steering Wheel, Rearview Mirror as in Reference #2)
    const dashboardMat = new THREE.MeshStandardMaterial({
      color: 0x27272a, // dark gray/beige trim
      roughness: 0.9,
    });

    const interiorGroup = new THREE.Group();
    interiorGroup.position.set(0, 0.1, 0.3);
    cabin.add(interiorGroup);

    // Dashboard desk
    const dashDesk = new THREE.Mesh(new THREE.BoxGeometry(cabinWidth * 0.9, 0.22, 0.45), dashboardMat);
    dashDesk.position.set(0, -0.05, 0.35);
    interiorGroup.add(dashDesk);

    // Speedometer cluster console
    const clusterMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const cluster = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.02), clusterMat);
    cluster.position.set(-0.35, 0.07, 0.34);
    cluster.rotation.x = -0.25;
    dashDesk.add(cluster);

    // Steering wheel (on the left side)
    const steeringWheel = new THREE.Group();
    steeringWheel.position.set(-0.35, 0.08, 0.15);
    const rimGeom = new THREE.TorusGeometry(0.18, 0.022, 10, 24);
    const wheelRim = new THREE.Mesh(rimGeom, blackTrimMaterial);
    steeringWheel.add(wheelRim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), chromeMaterial);
    hub.rotation.x = Math.PI / 2;
    steeringWheel.add(hub);
    dashDesk.add(steeringWheel);

    // Rearview mirror (as seen in Reference #2)
    const mirrorGeom = new THREE.BoxGeometry(0.32, 0.09, 0.03);
    const mirrorMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      metalness: 0.9,
      roughness: 0.1,
    });
    const rearviewMirror = new THREE.Mesh(mirrorGeom, mirrorMat);
    rearviewMirror.position.set(0, cabinHeight * 0.35, 0.45);
    cabin.add(rearviewMirror);

    // Driver & passenger seats
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.8 });
    const seatGeom = new THREE.BoxGeometry(0.42, 0.55, 0.42);

    const driverSeat = new THREE.Mesh(seatGeom, seatMat);
    driverSeat.position.set(-0.35, -0.1, -0.15);
    interiorGroup.add(driverSeat);

    const passengerSeat = new THREE.Mesh(seatGeom, seatMat);
    passengerSeat.position.set(0.35, -0.1, -0.15);
    interiorGroup.add(passengerSeat);

    // 5. Openable Doors and Trunk (As seen in Reference #1 & #3)
    // Left driver door
    const leftDoor = new THREE.Group();
    leftDoor.position.set(-carWidth / 2, carHeight * 0.38, 0.1);
    const doorPanelGeom = new THREE.BoxGeometry(0.08, carHeight * 0.45, 1.1);
    const leftDoorMesh = new THREE.Mesh(doorPanelGeom, paintMaterial);
    leftDoorMesh.position.set(0, 0, -0.55); // pivot at front edge
    leftDoor.add(leftDoorMesh);
    root.add(leftDoor);

    // Right passenger door
    const rightDoor = new THREE.Group();
    rightDoor.position.set(carWidth / 2, carHeight * 0.38, 0.1);
    const rightDoorMesh = new THREE.Mesh(doorPanelGeom, paintMaterial);
    rightDoorMesh.position.set(0, 0, -0.55);
    rightDoor.add(rightDoorMesh);
    root.add(rightDoor);

    // Trunk lid (pivots up as in reference image #1)
    const trunk = new THREE.Group();
    trunk.position.set(0, carHeight * 0.65, -carLength * 0.35);
    const trunkGeom = new THREE.BoxGeometry(carWidth * 0.8, 0.06, carLength * 0.28);
    const trunkMesh = new THREE.Mesh(trunkGeom, paintMaterial);
    trunkMesh.position.set(0, 0, -carLength * 0.14);
    trunk.add(trunkMesh);
    root.add(trunk);

    // Hood lid
    const hood = new THREE.Group();
    hood.position.set(0, carHeight * 0.65, carLength * 0.15);
    const hoodGeom = new THREE.BoxGeometry(carWidth * 0.8, 0.05, carLength * 0.32);
    const hoodMesh = new THREE.Mesh(hoodGeom, paintMaterial);
    hoodMesh.position.set(0, 0, carLength * 0.16);
    hood.add(hoodMesh);
    root.add(hood);

    // 6. Wheels (Front and Rear with brake discs and rims)
    const wheelRadius = isSUV ? 0.46 : 0.35;
    const wheelWidth = 0.26;
    const wheelBaseZ = carLength * 0.32;
    const wheelTrackX = carWidth * 0.48;

    const createWheel = () => {
      const wheelGroup = new THREE.Group();
      // Tire
      const tireGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 20);
      tireGeom.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeom, tireMaterial);
      tire.castShadow = true;
      wheelGroup.add(tire);

      // Alloy Rim
      const rimGeom = new THREE.CylinderGeometry(wheelRadius * 0.68, wheelRadius * 0.68, wheelWidth + 0.01, 16);
      rimGeom.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeom, rimMaterial);
      wheelGroup.add(rim);

      // 5 Spokes
      for (let s = 0; s < 5; s++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.04, wheelRadius * 1.25, 0.04), chromeMaterial);
        spoke.rotation.x = (s * Math.PI) / 2.5;
        wheelGroup.add(spoke);
      }

      // Brake caliper
      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.12), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
      caliper.position.set(0, 0.12, 0);
      wheelGroup.add(caliper);

      return wheelGroup;
    };

    // Front Left & Right (steerable)
    const frontLeftWheel = new THREE.Group();
    frontLeftWheel.position.set(-wheelTrackX, wheelRadius, wheelBaseZ);
    const flSpin = createWheel();
    frontLeftWheel.add(flSpin);
    root.add(frontLeftWheel);

    const frontRightWheel = new THREE.Group();
    frontRightWheel.position.set(wheelTrackX, wheelRadius, wheelBaseZ);
    const frSpin = createWheel();
    frontRightWheel.add(frSpin);
    root.add(frontRightWheel);

    // Rear Left & Right
    const rearLeftWheel = new THREE.Group();
    rearLeftWheel.position.set(-wheelTrackX, wheelRadius, -wheelBaseZ);
    const rlSpin = createWheel();
    rearLeftWheel.add(rlSpin);
    root.add(rearLeftWheel);

    const rearRightWheel = new THREE.Group();
    rearRightWheel.position.set(wheelTrackX, wheelRadius, -wheelBaseZ);
    const rrSpin = createWheel();
    rearRightWheel.add(rrSpin);
    root.add(rearRightWheel);

    // Camera Anchors
    const cockpitAnchor = new THREE.Vector3(-0.35, carHeight * 0.88, 0.1);
    const hoodAnchor = new THREE.Vector3(0, carHeight * 0.72, carLength * 0.38);

    // Helper functions
    const setDoorOpen = (door: 'left' | 'right' | 'trunk' | 'hood', open: boolean) => {
      const targetAngle = open ? (Math.PI / 3) : 0;
      if (door === 'left' && leftDoor) {
        leftDoor.rotation.y = open ? -0.85 : 0;
      } else if (door === 'right' && rightDoor) {
        rightDoor.rotation.y = open ? 0.85 : 0;
      } else if (door === 'trunk' && trunk) {
        trunk.rotation.x = open ? -0.75 : 0;
      } else if (door === 'hood' && hood) {
        hood.rotation.x = open ? 0.7 : 0;
      }
    };

    const updateWheelSpin = (speedMps: number, steerRad: number, dt: number) => {
      // Steer front wheel assemblies
      frontLeftWheel.rotation.y = steerRad;
      frontRightWheel.rotation.y = steerRad;

      // Spin tires based on angular velocity (v / r)
      const angularStep = (speedMps / wheelRadius) * dt;
      flSpin.rotation.x += angularStep;
      frSpin.rotation.x += angularStep;
      rlSpin.rotation.x += angularStep;
      rrSpin.rotation.x += angularStep;

      // Steering wheel turns with player input!
      if (steeringWheel) {
        steeringWheel.rotation.z = -steerRad * 2.8;
      }
    };

    const setBraking = (braking: boolean) => {
      const color = braking ? 0xff2222 : 0x991b1b;
      (brakeLightL.material as THREE.MeshBasicMaterial).color.setHex(color);
      (brakeLightR.material as THREE.MeshBasicMaterial).color.setHex(color);
    };

    const setHeadlights = (on: boolean) => {
      if (headlightLeft && headlightRight) {
        headlightLeft.visible = on;
        headlightRight.visible = on;
      }
      const color = on ? 0xffffff : 0x475569;
      (headlightMeshL.material as THREE.MeshBasicMaterial).color.setHex(color);
      (headlightMeshR.material as THREE.MeshBasicMaterial).color.setHex(color);
    };

    const setPaintColor = (hexColor: string) => {
      paintMaterial.color.set(hexColor);
    };

    return {
      root,
      bodyMesh,
      frontLeftWheel,
      frontRightWheel,
      rearLeftWheel,
      rearRightWheel,
      leftDoor,
      rightDoor,
      trunk,
      hood,
      headlightLeft,
      headlightRight,
      brakeLightL,
      brakeLightR,
      steeringWheel,
      driverSeat,
      cockpitAnchor,
      hoodAnchor,
      setDoorOpen,
      updateWheelSpin,
      setBraking,
      setHeadlights,
      setPaintColor,
    };
  }
}
