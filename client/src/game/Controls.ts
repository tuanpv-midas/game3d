import * as THREE from 'three';
import { Car } from './Car';

export class Controls {
  private car: Car;
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  private keys: { [key: string]: boolean };
  private mousePosition: { x: number; y: number };
  private cameraOffset: THREE.Vector3;
  private isFirstPerson: boolean;
  private firstPersonOffset: THREE.Vector3;
  private isPointerLocked: boolean;

  // Camera control parameters
  private zoomLevel: number;
  private minZoom: number;
  private maxZoom: number;
  private cameraShake: number;
  private targetCameraOffset: THREE.Vector3;
  private currentLookAt: THREE.Vector3;
  private targetLookAt: THREE.Vector3;

  constructor(car: Car, camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.car = car;
    this.camera = camera;
    this.domElement = domElement;

    this.keys = {};
    this.mousePosition = { x: 0, y: 0 };
    this.cameraOffset = new THREE.Vector3(0, 3, -8);
    this.firstPersonOffset = new THREE.Vector3(0, 1.5, 0.5);
    this.isFirstPerson = false;
    this.isPointerLocked = false;

    this.zoomLevel = 1;
    this.minZoom = 0.5;
    this.maxZoom = 2;
    this.cameraShake = 0;
    this.targetCameraOffset = this.cameraOffset.clone();
    this.currentLookAt = new THREE.Vector3();
    this.targetLookAt = new THREE.Vector3();

    // Setup event listeners
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('wheel', this.onMouseWheel.bind(this));
    document.addEventListener('click', this.onClick.bind(this));

    // Setup pointer lock
    document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
  }

  private onPointerLockChange() {
    this.isPointerLocked = document.pointerLockElement === this.domElement;
    console.log('Pointer lock state:', this.isPointerLocked);
  }

  private onClick(event: MouseEvent) {
    if (!this.isPointerLocked) {
      try {
        this.domElement.requestPointerLock();
      } catch (error) {
        console.warn('Pointer lock request failed:', error);
        // Even if pointer lock fails, allow shooting
        this.car.shoot();
        this.cameraShake = 0.5;
      }
    } else {
      // Shoot when pointer is locked
      this.car.shoot();
      // Add camera shake effect when shooting
      this.cameraShake = 0.5;
    }
  }

  private onMouseMove(event: MouseEvent) {
    if (this.isPointerLocked) {
      // Limit horizontal view to 180 degrees
      this.mousePosition.x = Math.clamp(
        this.mousePosition.x + event.movementX * 0.003,
        -Math.PI/2,
        Math.PI/2
      );

      // Limit vertical view to prevent over-rotation
      this.mousePosition.y = Math.clamp(
        this.mousePosition.y + event.movementY * 0.003,
        -Math.PI/3,
        Math.PI/3
      );
    }
  }

  public update() {
    const currentSpeed = this.car.velocity.length();
    const direction = this.car.mesh.getWorldDirection(new THREE.Vector3());

    // Optimized forward/backward movement
    if (this.keys['w']) {
      const accelerationFactor = Math.max(0.5, 1 - currentSpeed / this.car.maxSpeed);
      this.car.velocity.add(direction.multiplyScalar(this.car.acceleration * 0.1 * accelerationFactor));
    }
    if (this.keys['s']) {
      const reverseAcceleration = this.car.acceleration * 0.06;
      this.car.velocity.sub(direction.multiplyScalar(reverseAcceleration));
    }

    // Optimized turning
    if (this.keys['a'] || this.keys['d']) {
      const turnSpeedFactor = Math.max(0.4, 1 - currentSpeed / this.car.maxSpeed);
      const turnAmount = this.car.turnSpeed * 0.05 * turnSpeedFactor;

      if (this.keys['a']) {
        this.car.mesh.rotation.y += turnAmount;
      }
      if (this.keys['d']) {
        this.car.mesh.rotation.y -= turnAmount;
      }
    }

    // Enhanced braking
    if (this.keys[' ']) {
      this.car.brake();
    }

    // Toggle view
    if (this.keys['v']) {
      this.isFirstPerson = !this.isFirstPerson;
      this.keys['v'] = false;
    }

    // Update camera shake effect
    if (this.cameraShake > 0) {
      this.cameraShake *= 0.9;
      if (this.cameraShake < 0.001) this.cameraShake = 0;
    }

    // Update camera position based on view mode
    if (this.isFirstPerson) {
      this.updateFirstPersonCamera();
    } else {
      this.updateThirdPersonCamera();
    }
  }

  private updateFirstPersonCamera() {
    const carPosition = this.car.mesh.position.clone();
    const carDirection = this.car.mesh.getWorldDirection(new THREE.Vector3());

    const cameraPosition = carPosition.clone()
      .add(this.firstPersonOffset.clone().applyQuaternion(this.car.mesh.quaternion));

    if (this.cameraShake > 0) {
      cameraPosition.add(new THREE.Vector3(
        (Math.random() - 0.5) * this.cameraShake * 0.1,
        (Math.random() - 0.5) * this.cameraShake * 0.1,
        (Math.random() - 0.5) * this.cameraShake * 0.1
      ));
    }

    this.camera.position.lerp(cameraPosition, 0.1);

    this.targetLookAt.copy(cameraPosition)
      .add(carDirection.multiplyScalar(10))
      .add(new THREE.Vector3(
        Math.sin(this.mousePosition.x) * 2,
        Math.clamp(this.mousePosition.y, -1, 1) * 2,
        Math.cos(this.mousePosition.x) * 2
      ));

    this.currentLookAt.lerp(this.targetLookAt, 0.1);
    this.camera.lookAt(this.currentLookAt);
  }

  private updateThirdPersonCamera() {
    this.targetCameraOffset.copy(this.cameraOffset).multiplyScalar(this.zoomLevel);

    const cameraTarget = this.car.mesh.position.clone()
      .add(this.targetCameraOffset.clone().applyQuaternion(this.car.mesh.quaternion));

    if (this.cameraShake > 0) {
      cameraTarget.add(new THREE.Vector3(
        (Math.random() - 0.5) * this.cameraShake,
        (Math.random() - 0.5) * this.cameraShake,
        (Math.random() - 0.5) * this.cameraShake
      ));
    }

    this.camera.position.lerp(cameraTarget, 0.1);
    this.targetLookAt.copy(this.car.mesh.position);
    this.currentLookAt.lerp(this.targetLookAt, 0.1);
    this.camera.lookAt(this.currentLookAt);
  }

  private onKeyDown(event: KeyboardEvent) {
    this.keys[event.key.toLowerCase()] = true;
  }

  private onKeyUp(event: KeyboardEvent) {
    this.keys[event.key.toLowerCase()] = false;
  }

  private onMouseWheel(event: WheelEvent) {
    this.zoomLevel = Math.clamp(
      this.zoomLevel + event.deltaY * -0.001,
      this.minZoom,
      this.maxZoom
    );
  }

  public dispose() {
    document.removeEventListener('keydown', this.onKeyDown.bind(this));
    document.removeEventListener('keyup', this.onKeyUp.bind(this));
    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
    document.removeEventListener('wheel', this.onMouseWheel.bind(this));
    document.removeEventListener('click', this.onClick.bind(this));
    document.removeEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
  }
}

// Helper function to clamp a value between a min and max
declare global {
  interface Math {
    clamp(value: number, min: number, max: number): number;
  }
}

Math.clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};