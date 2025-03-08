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

  // New camera control parameters
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
    this.cameraOffset = new THREE.Vector3(0, 3, -8); // Third person view
    this.firstPersonOffset = new THREE.Vector3(0, 1.5, 0.5); // First person view (from cabin)
    this.isFirstPerson = false;

    // Initialize new camera parameters
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
    document.addEventListener('click', this.onMouseClick.bind(this));

    // Lock pointer for FPS-style camera
    domElement.addEventListener('click', () => {
      domElement.requestPointerLock();
    });
  }

  public update() {
    const currentSpeed = this.car.velocity.length();
    const direction = this.car.mesh.getWorldDirection(new THREE.Vector3());

    // Optimized forward/backward movement
    if (this.keys['w']) {
      // Progressive acceleration based on current speed
      const accelerationFactor = Math.max(0.5, 1 - currentSpeed / this.car.maxSpeed);
      this.car.velocity.add(direction.multiplyScalar(this.car.acceleration * 0.1 * accelerationFactor));
    }
    if (this.keys['s']) {
      // Reverse speed is slower than forward
      const reverseAcceleration = this.car.acceleration * 0.06;
      this.car.velocity.sub(direction.multiplyScalar(reverseAcceleration));
    }

    // Optimized turning
    if (this.keys['a'] || this.keys['d']) {
      // Reduce turn speed at higher speeds
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
      this.keys['v'] = false; // Reset to prevent multiple toggles
    }

    // Update camera shake effect
    if (this.cameraShake > 0) {
      this.cameraShake *= 0.9; // Decay shake effect
      if (this.cameraShake < 0.001) this.cameraShake = 0;
    }

    // Update camera position based on view mode
    if (this.isFirstPerson) {
      // First person view - camera follows from inside car
      const carPosition = this.car.mesh.position.clone();
      const carDirection = this.car.mesh.getWorldDirection(new THREE.Vector3());

      // Calculate camera position inside car
      const cameraPosition = carPosition.clone()
        .add(this.firstPersonOffset.clone().applyQuaternion(this.car.mesh.quaternion));

      // Apply camera shake in first person
      if (this.cameraShake > 0) {
        cameraPosition.add(new THREE.Vector3(
          (Math.random() - 0.5) * this.cameraShake * 0.1,
          (Math.random() - 0.5) * this.cameraShake * 0.1,
          (Math.random() - 0.5) * this.cameraShake * 0.1
        ));
      }

      this.camera.position.lerp(cameraPosition, 0.1);

      // Calculate look target with smooth transition
      this.targetLookAt.copy(cameraPosition)
        .add(carDirection.multiplyScalar(10))
        .add(new THREE.Vector3(
          Math.sin(this.mousePosition.x) * 2,
          Math.clamp(this.mousePosition.y, -1, 1) * 2,
          Math.cos(this.mousePosition.x) * 2
        ));

      this.currentLookAt.lerp(this.targetLookAt, 0.1);
      this.camera.lookAt(this.currentLookAt);

    } else {
      // Third person view - camera follows from behind
      // Apply zoom to camera offset
      this.targetCameraOffset.copy(this.cameraOffset).multiplyScalar(this.zoomLevel);

      // Calculate target camera position with smooth transition
      const cameraTarget = this.car.mesh.position.clone()
        .add(this.targetCameraOffset.clone().applyQuaternion(this.car.mesh.quaternion));

      // Apply camera shake in third person
      if (this.cameraShake > 0) {
        cameraTarget.add(new THREE.Vector3(
          (Math.random() - 0.5) * this.cameraShake,
          (Math.random() - 0.5) * this.cameraShake,
          (Math.random() - 0.5) * this.cameraShake
        ));
      }

      // Smooth camera movement
      this.camera.position.lerp(cameraTarget, 0.1);

      // Smooth look-at transition
      this.targetLookAt.copy(this.car.mesh.position);
      this.currentLookAt.lerp(this.targetLookAt, 0.1);
      this.camera.lookAt(this.currentLookAt);
    }
  }

  private onKeyDown(event: KeyboardEvent) {
    this.keys[event.key.toLowerCase()] = true;
  }

  private onKeyUp(event: KeyboardEvent) {
    this.keys[event.key.toLowerCase()] = false;
  }

  private onMouseMove(event: MouseEvent) {
    if (document.pointerLockElement) {
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

  private onMouseWheel(event: WheelEvent) {
    // Update zoom level based on wheel movement
    this.zoomLevel = Math.clamp(
      this.zoomLevel + event.deltaY * -0.001,
      this.minZoom,
      this.maxZoom
    );
  }

  private onMouseClick() {
    if (document.pointerLockElement) {
      this.car.shoot();
      // Add camera shake effect when shooting
      this.cameraShake = 0.5;
    }
  }

  public dispose() {
    document.removeEventListener('keydown', this.onKeyDown.bind(this));
    document.removeEventListener('keyup', this.onKeyUp.bind(this));
    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
    document.removeEventListener('wheel', this.onMouseWheel.bind(this));
    document.removeEventListener('click', this.onMouseClick.bind(this));
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