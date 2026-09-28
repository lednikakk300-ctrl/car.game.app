import * as THREE from 'three';
import { CarModelBuilder, Car3DInstance } from '../cars/CarModels';

export interface NetworkPlayer {
  id: string;
  name: string;
  carId: string;
  carColor: string;
  isHost: boolean;
  isReady: boolean;
  ping: number;
  lastSeen: number;
}

export interface PlayerSyncPayload {
  playerId: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  speed: number;
  steer: number;
  isNitro: boolean;
  isBraking: boolean;
  lap: number;
  progress: number;
  timestamp: number;
}

export type NetworkMessage =
  | { type: 'ROOM_ANNOUNCE'; roomCode: string; host: NetworkPlayer; selectedRoute: string }
  | { type: 'ROOM_JOIN'; roomCode: string; player: NetworkPlayer }
  | { type: 'ROOM_LEAVE'; roomCode: string; playerId: string }
  | { type: 'PLAYER_UPDATE'; roomCode: string; player: NetworkPlayer }
  | { type: 'START_RACE'; roomCode: string; routeId: string; timestamp: number }
  | { type: 'STATE_SYNC'; roomCode: string; data: PlayerSyncPayload }
  | { type: 'RACE_FINISHED'; roomCode: string; playerId: string; finishTime: number };

export class RemotePlayerRacer {
  public player: NetworkPlayer;
  public car3D: Car3DInstance;
  public targetPosition: THREE.Vector3 = new THREE.Vector3();
  public currentPosition: THREE.Vector3 = new THREE.Vector3();
  public targetHeading: number = 0;
  public currentHeading: number = 0;
  public speed: number = 0;
  public progress: number = 0;
  public currentLap: number = 1;
  public isFinished: boolean = false;

  constructor(scene: THREE.Scene, player: NetworkPlayer) {
    this.player = player;
    this.car3D = CarModelBuilder.createCar(player.carId, player.carColor);
    scene.add(this.car3D.root);
  }

  public applySync(data: PlayerSyncPayload) {
    this.targetPosition.set(data.x, data.y, data.z);
    this.targetHeading = data.heading;
    this.speed = data.speed;
    this.progress = data.progress;
    this.currentLap = data.lap;
    this.car3D.setBraking(data.isBraking);
    this.car3D.setHeadlights(true);
  }

  public update(dt: number) {
    // Smooth linear interpolation to eliminate network jitter
    const lerpRate = Math.min(1, dt * 14);
    this.currentPosition.lerp(this.targetPosition, lerpRate);
    this.car3D.root.position.copy(this.currentPosition);

    // Angle lerp
    let diff = this.targetHeading - this.currentHeading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.currentHeading += diff * lerpRate;
    this.car3D.root.rotation.y = this.currentHeading;

    this.car3D.updateWheelSpin(this.speed, 0, dt);
  }

  public destroy(scene: THREE.Scene) {
    scene.remove(this.car3D.root);
  }
}

export class MultiplayerManager {
  public localPlayerId: string;
  public localPlayerName: string;
  public currentRoomCode: string | null = null;
  public isHost: boolean = false;
  public selectedRouteId: string = 'route_amir_timur';
  public connectedPlayers: Map<string, NetworkPlayer> = new Map();
  public remoteRacers: Map<string, RemotePlayerRacer> = new Map();

  private channel: BroadcastChannel | null = null;
  private syncInterval: number | null = null;
  private onMessageCallbacks: ((msg: NetworkMessage) => void)[] = [];
  private onRaceStartCallback: ((routeId: string) => void) | null = null;

  constructor(playerName: string = 'TashkentRacer') {
    this.localPlayerId = 'p_' + Math.random().toString(36).substring(2, 9);
    this.localPlayerName = playerName;
    this.initChannel();
  }

  private initChannel() {
    try {
      this.channel = new BroadcastChannel('tashkent_racer_wifi_network');
      this.channel.onmessage = (event) => {
        this.handleIncomingMessage(event.data as NetworkMessage);
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported in this environment, falling back to in-memory relay.', e);
    }
  }

  public createRoom(roomCode: string, initialCarId: string, initialColor: string, routeId: string): NetworkPlayer {
    this.currentRoomCode = roomCode;
    this.isHost = true;
    this.selectedRouteId = routeId;
    this.connectedPlayers.clear();

    const hostPlayer: NetworkPlayer = {
      id: this.localPlayerId,
      name: this.localPlayerName,
      carId: initialCarId,
      carColor: initialColor,
      isHost: true,
      isReady: true,
      ping: 8,
      lastSeen: Date.now(),
    };

    this.connectedPlayers.set(this.localPlayerId, hostPlayer);

    // Broadcast room announcement
    this.sendMessage({
      type: 'ROOM_ANNOUNCE',
      roomCode,
      host: hostPlayer,
      selectedRoute: routeId,
    });

    return hostPlayer;
  }

  public joinRoom(roomCode: string, playerCarId: string, playerColor: string): NetworkPlayer {
    this.currentRoomCode = roomCode;
    this.isHost = false;
    this.connectedPlayers.clear();

    const localPlayer: NetworkPlayer = {
      id: this.localPlayerId,
      name: this.localPlayerName,
      carId: playerCarId,
      carColor: playerColor,
      isHost: false,
      isReady: false,
      ping: 15,
      lastSeen: Date.now(),
    };

    this.connectedPlayers.set(this.localPlayerId, localPlayer);

    this.sendMessage({
      type: 'ROOM_JOIN',
      roomCode,
      player: localPlayer,
    });

    return localPlayer;
  }

  public updateLocalPlayer(carId: string, carColor: string, isReady: boolean) {
    if (!this.currentRoomCode) return;
    const local = this.connectedPlayers.get(this.localPlayerId);
    if (local) {
      local.carId = carId;
      local.carColor = carColor;
      local.isReady = isReady;

      this.sendMessage({
        type: 'PLAYER_UPDATE',
        roomCode: this.currentRoomCode,
        player: local,
      });
    }
  }

  public startRace() {
    if (!this.currentRoomCode || !this.isHost) return;
    this.sendMessage({
      type: 'START_RACE',
      roomCode: this.currentRoomCode,
      routeId: this.selectedRouteId,
      timestamp: Date.now(),
    });
    if (this.onRaceStartCallback) {
      this.onRaceStartCallback(this.selectedRouteId);
    }
  }

  public leaveRoom() {
    if (!this.currentRoomCode) return;
    this.sendMessage({
      type: 'ROOM_LEAVE',
      roomCode: this.currentRoomCode,
      playerId: this.localPlayerId,
    });
    this.currentRoomCode = null;
    this.connectedPlayers.clear();
  }

  public sendPositionSync(payload: Omit<PlayerSyncPayload, 'playerId' | 'timestamp'>) {
    if (!this.currentRoomCode) return;
    this.sendMessage({
      type: 'STATE_SYNC',
      roomCode: this.currentRoomCode,
      data: {
        ...payload,
        playerId: this.localPlayerId,
        timestamp: Date.now(),
      },
    });
  }

  public onRaceStart(cb: (routeId: string) => void) {
    this.onRaceStartCallback = cb;
  }

  public onMessage(cb: (msg: NetworkMessage) => void) {
    this.onMessageCallbacks.push(cb);
  }

  private sendMessage(msg: NetworkMessage) {
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch (e) {
        console.warn('Network send error:', e);
      }
    }
    // Also notify local listeners
    this.handleIncomingMessage(msg);
  }

  private handleIncomingMessage(msg: NetworkMessage) {
    if (msg.roomCode !== this.currentRoomCode) return;

    if (msg.type === 'ROOM_ANNOUNCE' && !this.isHost) {
      this.connectedPlayers.set(msg.host.id, msg.host);
      this.selectedRouteId = msg.selectedRoute;
    } else if (msg.type === 'ROOM_JOIN') {
      this.connectedPlayers.set(msg.player.id, msg.player);
      // If host, announce ourselves back to the new player
      if (this.isHost) {
        const host = this.connectedPlayers.get(this.localPlayerId);
        if (host) {
          this.sendMessage({
            type: 'ROOM_ANNOUNCE',
            roomCode: this.currentRoomCode,
            host,
            selectedRoute: this.selectedRouteId,
          });
        }
      }
    } else if (msg.type === 'PLAYER_UPDATE') {
      this.connectedPlayers.set(msg.player.id, msg.player);
    } else if (msg.type === 'ROOM_LEAVE') {
      this.connectedPlayers.delete(msg.playerId);
    } else if (msg.type === 'START_RACE') {
      if (this.onRaceStartCallback) {
        this.onRaceStartCallback(msg.routeId);
      }
    } else if (msg.type === 'STATE_SYNC') {
      if (msg.data.playerId !== this.localPlayerId) {
        const racer = this.remoteRacers.get(msg.data.playerId);
        if (racer) {
          racer.applySync(msg.data);
        }
      }
    }

    this.onMessageCallbacks.forEach((cb) => cb(msg));
  }

  public initRemoteRacersInScene(scene: THREE.Scene) {
    // Clear old
    this.remoteRacers.forEach((r) => r.destroy(scene));
    this.remoteRacers.clear();

    // Spawn 3D cars for other players in the room
    this.connectedPlayers.forEach((player) => {
      if (player.id !== this.localPlayerId) {
        const racer = new RemotePlayerRacer(scene, player);
        this.remoteRacers.set(player.id, racer);
      }
    });
  }

  public updateRemoteRacers(dt: number) {
    this.remoteRacers.forEach((r) => r.update(dt));
  }
}
