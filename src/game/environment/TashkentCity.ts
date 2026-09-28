import * as THREE from 'three';

export interface WeatherSettings {
  isNight: boolean;
  isRaining: boolean;
}

export class TashkentCityEnvironment {
  public scene: THREE.Scene;
  public cityGroup: THREE.Group;
  public trafficGroup: THREE.Group;
  public rainParticles: THREE.Points | null = null;
  public streetLights: THREE.PointLight[] = [];

  // Lighting references
  public sunLight: THREE.DirectionalLight | null = null;
  public ambientLight: THREE.AmbientLight | null = null;
  public hemiLight: THREE.HemisphereLight | null = null;

  // Background animated traffic
  private backgroundCars: { mesh: THREE.Group; speed: number; laneZ: number; minX: number; maxX: number }[] = [];
  // Pedestrians
  private pedestrians: { mesh: THREE.Group; speed: number; direction: number; minZ: number; maxZ: number }[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.cityGroup = new THREE.Group();
    this.trafficGroup = new THREE.Group();
    this.cityGroup.name = 'tashkent_city';
    this.cityGroup.add(this.trafficGroup);
    this.scene.add(this.cityGroup);
  }

  public buildCity(trackBounds: { minX: number; maxX: number; minZ: number; maxZ: number }) {
    this.createSkyAndGround(trackBounds);
    this.createTashkentTVTower();
    this.createHotelUzbekistan();
    this.createChorsuBazaar();
    this.createTashkentCitySkyscrapers();
    this.createBoulevardsAndStreets(trackBounds);
    this.createUrbanFurnitureAndSigns();
    this.createBackgroundTraffic();
    this.createPedestrians();
    this.createRainSystem();
  }

  private createSkyAndGround(bounds: { minX: number; maxX: number; minZ: number; maxZ: number }) {
    // Vast ground terrain
    const groundGeom = new THREE.PlaneGeometry(1200, 1200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937, // dark tarmac/sidewalk blend
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.cityGroup.add(ground);

    // Green parks and tree lawns along Tashkent boulevards
    const parkMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 });
    const parkGeom = new THREE.PlaneGeometry(180, 220);
    const centralPark = new THREE.Mesh(parkGeom, parkMat);
    centralPark.rotation.x = -Math.PI / 2;
    centralPark.position.set(0, 0.02, 0);
    centralPark.receiveShadow = true;
    this.cityGroup.add(centralPark);

    // Add plane trees in park
    this.populateTrees(centralPark.position.x, centralPark.position.z, 25, 70);
  }

  /**
   * Tashkent TV Tower (375m tall TV needle, one of the tallest structures in Central Asia)
   */
  private createTashkentTVTower() {
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-220, 0, -180);

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.85,
      roughness: 0.25,
    });

    const glassMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // Base lattice tripod legs
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const legGeom = new THREE.CylinderGeometry(1.2, 2.5, 45, 8);
      const leg = new THREE.Mesh(legGeom, steelMat);
      leg.position.set(Math.cos(angle) * 12, 22, Math.sin(angle) * 12);
      leg.rotation.z = Math.cos(angle) * 0.25;
      leg.rotation.x = Math.sin(angle) * 0.25;
      towerGroup.add(leg);
    }

    // Main column
    const mainPillar = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.8, 140, 16), steelMat);
    mainPillar.position.y = 70;
    towerGroup.add(mainPillar);

    // Observation deck ring (disk)
    const deckRing = new THREE.Mesh(new THREE.CylinderGeometry(14, 12, 10, 24), steelMat);
    deckRing.position.y = 110;
    towerGroup.add(deckRing);

    // Glass panorama ring
    const glassBand = new THREE.Mesh(new THREE.CylinderGeometry(14.2, 14.2, 3.5, 24), glassMat);
    glassBand.position.y = 110;
    towerGroup.add(glassBand);

    // Upper broadcast spire
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 1.8, 90, 8), steelMat);
    spire.position.y = 175;
    towerGroup.add(spire);

    // Flashing red aircraft beacon on top
    const beaconLight = new THREE.PointLight(0xef4444, 2.5, 250);
    beaconLight.position.y = 220;
    towerGroup.add(beaconLight);

    this.cityGroup.add(towerGroup);
  }

  /**
   * Hotel Uzbekistan (Iconic curved brutalist facade with solar lattice)
   */
  private createHotelUzbekistan() {
    const hotelGroup = new THREE.Group();
    hotelGroup.position.set(160, 0, -80);

    const facadeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // pale sandstone concrete
      roughness: 0.9,
    });

    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      roughness: 0.2,
      metalness: 0.8,
    });

    // Curved arched building body (composed of angled segment slabs)
    const segments = 9;
    const radius = 65;
    const buildingHeight = 52;

    for (let i = 0; i < segments; i++) {
      const angle = -0.6 + (i * 1.2) / (segments - 1);
      const slab = new THREE.Mesh(new THREE.BoxGeometry(8, buildingHeight, 18), facadeMat);
      slab.position.set(Math.sin(angle) * radius, buildingHeight / 2, Math.cos(angle) * radius - 30);
      slab.rotation.y = angle;
      slab.castShadow = true;
      slab.receiveShadow = true;
      hotelGroup.add(slab);

      // Window balcony slots
      const win = new THREE.Mesh(new THREE.BoxGeometry(7.2, buildingHeight * 0.85, 0.4), windowMat);
      win.position.set(0, 0, 9.1);
      slab.add(win);
    }

    // Rooftop illuminated sign "HOTEL UZBEKISTAN"
    const signBar = new THREE.Mesh(new THREE.BoxGeometry(38, 3, 2), new THREE.MeshBasicMaterial({ color: 0x3b82f6 }));
    signBar.position.set(0, buildingHeight + 2, radius - 32);
    hotelGroup.add(signBar);

    this.cityGroup.add(hotelGroup);
  }

  /**
   * Chorsu Bazaar Turquoise Mosaic Dome
   */
  private createChorsuBazaar() {
    const chorsuGroup = new THREE.Group();
    chorsuGroup.position.set(-150, 0, 140);

    const turquoiseMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, // Samarkand turquoise blue ceramic glaze
      roughness: 0.35,
      metalness: 0.3,
    });

    const archMat = new THREE.MeshStandardMaterial({
      color: 0xfde047, // sandy ceramic pattern
      roughness: 0.8,
    });

    // Giant turquoise dome
    const domeGeom = new THREE.SphereGeometry(28, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const dome = new THREE.Mesh(domeGeom, turquoiseMat);
    dome.position.y = 16;
    chorsuGroup.add(dome);

    // Hexagonal arched colonnade base
    const basePillars = new THREE.Mesh(new THREE.CylinderGeometry(30, 32, 16, 12), archMat);
    basePillars.position.y = 8;
    chorsuGroup.add(basePillars);

    this.cityGroup.add(chorsuGroup);
  }

  /**
   * Modern Tashkent City High-Rises & Glass Towers
   */
  private createTashkentCitySkyscrapers() {
    const towerMat1 = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // azure glass
      metalness: 0.85,
      roughness: 0.15,
    });

    const towerMat2 = new THREE.MeshStandardMaterial({
      color: 0x475569, // slate modern steel
      metalness: 0.7,
      roughness: 0.3,
    });

    const towerConfigs = [
      { x: 140, z: 120, w: 28, d: 24, h: 95, mat: towerMat1 },
      { x: 190, z: 160, w: 22, d: 22, h: 120, mat: towerMat1 },
      { x: -90, z: -130, w: 26, d: 26, h: 75, mat: towerMat2 },
      { x: 90, z: -190, w: 32, d: 20, h: 80, mat: towerMat2 },
      { x: -180, z: 40, w: 24, d: 24, h: 68, mat: towerMat1 },
      { x: -70, z: 220, w: 30, d: 25, h: 85, mat: towerMat2 },
      { x: 80, z: 240, w: 26, d: 26, h: 105, mat: towerMat1 },
    ];

    towerConfigs.forEach((cfg) => {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d), cfg.mat);
      tower.position.set(cfg.x, cfg.h / 2, cfg.z);
      tower.castShadow = true;
      tower.receiveShadow = true;
      this.cityGroup.add(tower);

      // Neon rooftop crown border
      const crownMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const crown = new THREE.Mesh(new THREE.BoxGeometry(cfg.w + 0.6, 1.5, cfg.d + 0.6), crownMat);
      crown.position.set(cfg.x, cfg.h + 0.75, cfg.z);
      this.cityGroup.add(crown);
    });
  }

  /**
   * Wide Tashkent Boulevards with Crosswalks and Markings
   */
  private createBoulevardsAndStreets(bounds: { minX: number; maxX: number; minZ: number; maxZ: number }) {
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.75,
      metalness: 0.1,
    });

    const markingMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });

    // Main Avenue (A-B corridor)
    const mainAvenue = new THREE.Mesh(new THREE.PlaneGeometry(32, 600), roadMat);
    mainAvenue.rotation.x = -Math.PI / 2;
    mainAvenue.position.set(0, 0.01, 0);
    mainAvenue.receiveShadow = true;
    this.cityGroup.add(mainAvenue);

    // Cross Avenue
    const crossAvenue = new THREE.Mesh(new THREE.PlaneGeometry(600, 32), roadMat);
    crossAvenue.rotation.x = -Math.PI / 2;
    crossAvenue.position.set(0, 0.012, 0);
    crossAvenue.receiveShadow = true;
    this.cityGroup.add(crossAvenue);

    // Curbs along main avenue
    const curbL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 600), curbMat);
    curbL.position.set(-16, 0.12, 0);
    this.cityGroup.add(curbL);

    const curbR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 600), curbMat);
    curbR.position.set(16, 0.12, 0);
    this.cityGroup.add(curbR);

    // Dashed center markings
    for (let z = -280; z < 280; z += 12) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 6), markingMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.02, z);
      this.cityGroup.add(dash);

      // Lane dividers (3 lanes each side)
      const dashL = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 5), markingMat);
      dashL.rotation.x = -Math.PI / 2;
      dashL.position.set(-5.5, 0.02, z);
      this.cityGroup.add(dashL);

      const dashR = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 5), markingMat);
      dashR.rotation.x = -Math.PI / 2;
      dashR.position.set(5.5, 0.02, z);
      this.cityGroup.add(dashR);
    }

    // Crosswalk zebra stripes at intersections
    for (let c = -14; c <= 14; c += 2) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 5), markingMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(c, 0.025, 18);
      this.cityGroup.add(stripe);

      const stripe2 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 5), markingMat);
      stripe2.rotation.x = -Math.PI / 2;
      stripe2.position.set(c, 0.025, -18);
      this.cityGroup.add(stripe2);
    }
  }

  /**
   * Uzbek Road Signs, Benches, Streetlights, and Traffic Lights
   */
  private createUrbanFurnitureAndSigns() {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });

    // Road signs with Tashkent names
    const signNames = [
      { text: "AMIR TEMUR SHOH KO'CHASI", x: -17, z: 25, rot: 0 },
      { text: "MUSTAQILLIK MAYDONI", x: 17, z: -40, rot: Math.PI },
      { text: "CHORSU BOZORI ->", x: -17, z: -120, rot: 0 },
      { text: "TOSHKENT CITY PARK", x: 17, z: 120, rot: Math.PI },
    ];

    signNames.forEach((s) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5, 8), metalMat);
      pole.position.set(s.x, 2.5, s.z);
      this.cityGroup.add(pole);

      const board = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.2, 0.1), new THREE.MeshBasicMaterial({ color: 0x1d4ed8 }));
      board.position.set(0, 2.2, 0);
      pole.add(board);

      // Green speed limit circular sign (60 km/h)
      const speedSign = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.08, 16), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
      speedSign.rotation.x = Math.PI / 2;
      speedSign.position.set(1.5, 0.8, 0.1);
      pole.add(speedSign);
    });

    // Park benches (as shown in reference image #1)
    for (let z = -100; z <= 100; z += 40) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.8), benchWoodMat);
      bench.position.set(-18, 0.25, z);
      this.cityGroup.add(bench);
    }

    // Street Lantern Posts along the avenue
    for (let z = -240; z <= 240; z += 35) {
      this.createStreetLamp(-17, z, 0);
      this.createStreetLamp(17, z, Math.PI);
    }

    // Traffic light gantries at intersection
    this.createTrafficLightGantry(0, 20);
    this.createTrafficLightGantry(0, -20);
  }

  private createStreetLamp(x: number, z: number, rotationY: number) {
    const lampPostMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85 });
    const lampGroup = new THREE.Group();
    lampGroup.position.set(x, 0, z);
    lampGroup.rotation.y = rotationY;

    // Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 8, 8), lampPostMat);
    pole.position.y = 4;
    lampGroup.add(pole);

    // Overhang arm
    const arm = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 0.15), lampPostMat);
    arm.position.set(1.5, 8, 0);
    lampGroup.add(arm);

    // Lantern fixture
    const lampFixture = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.4), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    lampFixture.position.set(2.8, 7.8, 0);
    lampGroup.add(lampFixture);

    // Night street light source
    const light = new THREE.PointLight(0xfef08a, 1.8, 32);
    light.position.set(2.8, 7.5, 0);
    light.castShadow = false; // keep fast for mobile
    lampGroup.add(light);
    this.streetLights.push(light);

    this.cityGroup.add(lampGroup);
  }

  private createTrafficLightGantry(x: number, z: number) {
    const gantry = new THREE.Group();
    gantry.position.set(x, 0, z);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 7.5, 8), metalMat);
    pole.position.set(-16.5, 3.75, 0);
    gantry.add(pole);

    const beam = new THREE.Mesh(new THREE.BoxGeometry(33, 0.3, 0.3), metalMat);
    beam.position.set(0, 7.2, 0);
    gantry.add(beam);

    // Traffic light head over lane 1 & lane 2
    [-6, 6].forEach((laneX) => {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.6, 0.5), new THREE.MeshStandardMaterial({ color: 0x18181b }));
      head.position.set(laneX, 6.4, 0);
      gantry.add(head);

      // Green light active
      const greenLens = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 12), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
      greenLens.rotation.x = Math.PI / 2;
      greenLens.position.set(0, -0.45, 0.26);
      head.add(greenLens);
    });

    this.cityGroup.add(gantry);
  }

  private populateTrees(centerX: number, centerZ: number, count: number, radius: number) {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3e2b, roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * radius;
      const tx = centerX + Math.cos(angle) * dist;
      const tz = centerZ + Math.sin(angle) * dist;

      // Don't place trees inside the road
      if (Math.abs(tx) < 17 && Math.abs(tz) < 17) continue;

      const tree = new THREE.Group();
      tree.position.set(tx, 0, tz);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 4, 8), trunkMat);
      trunk.position.y = 2;
      tree.add(trunk);

      // Lush leafy crown
      const crown = new THREE.Mesh(new THREE.SphereGeometry(2.8 + Math.random() * 0.8, 8, 8), foliageMat);
      crown.position.y = 5.2;
      crown.scale.y = 1.25;
      tree.add(crown);

      this.cityGroup.add(tree);
    }
  }

  /**
   * Non-interactive background traffic: Yellow Tashkent Damas minivans & Chevrolet Lacettis
   */
  private createBackgroundTraffic() {
    const damasColor = 0xeab308; // classic Tashkent yellow minibus
    const sedanColor = 0xffffff;

    const spawnPositions = [
      { x: -10, z: -150, color: damasColor, speed: 22, isVan: true },
      { x: -10, z: 80, color: sedanColor, speed: 26, isVan: false },
      { x: 10, z: 120, color: sedanColor, speed: -24, isVan: false },
      { x: 10, z: -70, color: damasColor, speed: -20, isVan: true },
    ];

    spawnPositions.forEach((cfg) => {
      const carGroup = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: cfg.color, metalness: 0.6, roughness: 0.3 });

      if (cfg.isVan) {
        // Damas boxy microvan
        const vanBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 3.4), bodyMat);
        vanBody.position.y = 1.0;
        carGroup.add(vanBody);
      } else {
        // White sedan
        const sedanBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 4.2), bodyMat);
        sedanBody.position.y = 0.75;
        carGroup.add(sedanBody);
      }

      carGroup.position.set(cfg.x, 0, cfg.z);
      if (cfg.speed < 0) {
        carGroup.rotation.y = Math.PI;
      }
      this.trafficGroup.add(carGroup);

      this.backgroundCars.push({
        mesh: carGroup,
        speed: cfg.speed,
        laneZ: cfg.x,
        minX: -260,
        maxX: 260,
      });
    });
  }

  /**
   * Pedestrians strolling along Tashkent sidewalks (as in reference image #1)
   */
  private createPedestrians() {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a373 });
    const clothesColors = [0xef4444, 0x3b82f6, 0x10b981, 0x6366f1, 0xf59e0b];

    for (let i = 0; i < 8; i++) {
      const ped = new THREE.Group();
      const sideX = (i % 2 === 0 ? -18.5 : 18.5) + (Math.random() * 2 - 1);
      const startZ = -120 + i * 35;

      const shirtMat = new THREE.MeshStandardMaterial({
        color: clothesColors[i % clothesColors.length],
        roughness: 0.8,
      });
      const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

      // Torso
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.25), shirtMat);
      torso.position.y = 1.1;
      ped.add(torso);

      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), skinMat);
      head.position.y = 1.6;
      ped.add(head);

      // Legs
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.18), pantsMat);
      legL.position.set(-0.12, 0.4, 0);
      ped.add(legL);

      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.18), pantsMat);
      legR.position.set(0.12, 0.4, 0);
      ped.add(legR);

      ped.position.set(sideX, 0, startZ);
      this.cityGroup.add(ped);

      this.pedestrians.push({
        mesh: ped,
        speed: 1.2 + Math.random() * 0.8,
        direction: Math.random() > 0.5 ? 1 : -1,
        minZ: startZ - 25,
        maxZ: startZ + 25,
      });
    }
  }

  /**
   * Dynamic Rain particle streaks
   */
  private createRainSystem() {
    const rainCount = 1800;
    const rainGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 220;
      positions[i * 3 + 1] = Math.random() * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 220;
    }

    rainGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.35,
      transparent: true,
      opacity: 0.65,
    });

    this.rainParticles = new THREE.Points(rainGeom, rainMat);
    this.rainParticles.visible = false;
    this.cityGroup.add(this.rainParticles);
  }

  public setWeatherAndTime(weather: WeatherSettings) {
    if (this.rainParticles) {
      this.rainParticles.visible = weather.isRaining;
    }

    if (weather.isNight) {
      // Night in Tashkent
      this.scene.background = new THREE.Color(0x060913);
      this.scene.fog = new THREE.FogExp2(0x060913, weather.isRaining ? 0.009 : 0.005);

      if (this.ambientLight) this.ambientLight.intensity = 0.25;
      if (this.sunLight) this.sunLight.intensity = 0.15;
      if (this.hemiLight) this.hemiLight.intensity = 0.2;

      this.streetLights.forEach((l) => (l.intensity = 2.2));
    } else {
      // Bright sunny daytime
      this.scene.background = new THREE.Color(weather.isRaining ? 0x64748b : 0x7dd3fc);
      this.scene.fog = new THREE.FogExp2(weather.isRaining ? 0x64748b : 0xbae6fd, weather.isRaining ? 0.007 : 0.002);

      if (this.ambientLight) this.ambientLight.intensity = 0.85;
      if (this.sunLight) this.sunLight.intensity = 1.4;
      if (this.hemiLight) this.hemiLight.intensity = 0.7;

      this.streetLights.forEach((l) => (l.intensity = 0.0));
    }
  }

  public update(dt: number, playerPos: THREE.Vector3) {
    // 1. Move background traffic
    this.backgroundCars.forEach((car) => {
      car.mesh.position.z += car.speed * dt;
      if (car.speed > 0 && car.mesh.position.z > 260) {
        car.mesh.position.z = -260;
      } else if (car.speed < 0 && car.mesh.position.z < -260) {
        car.mesh.position.z = 260;
      }
    });

    // 2. Animate walking pedestrians
    this.pedestrians.forEach((p) => {
      p.mesh.position.z += p.speed * p.direction * dt;
      if (p.mesh.position.z > p.maxZ) {
        p.direction = -1;
        p.mesh.rotation.y = Math.PI;
      } else if (p.mesh.position.z < p.minZ) {
        p.direction = 1;
        p.mesh.rotation.y = 0;
      }
    });

    // 3. Animate rain particles around player
    if (this.rainParticles && this.rainParticles.visible) {
      const positions = this.rainParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= dt * 65; // fall speed
        if (positions[i + 1] < 0) {
          positions[i] = playerPos.x + (Math.random() - 0.5) * 160;
          positions[i + 1] = 50 + Math.random() * 20;
          positions[i + 2] = playerPos.z + (Math.random() - 0.5) * 160;
        }
      }
      this.rainParticles.geometry.attributes.position.needsUpdate = true;
    }
  }
}
