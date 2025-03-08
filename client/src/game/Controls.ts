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
        // Try to request pointer lock, but don't rely on it
        this.domElement.requestPointerLock();
        
        // Set a short timeout to check if pointer lock was successful
        setTimeout(() => {
          if (!document.pointerLockElement) {
            console.log('Using fallback control mode due to sandbox restrictions');
            // If pointer lock failed, we'll use the fallback mode
          }
        }, 100);
      } catch (error) {
        console.warn('Pointer lock request failed:', error);
      }
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
    } else {
      // Fallback for when pointer lock is not available (sandboxed environments)
      // Calculate normalized position based on mouse position in window
      if (event.buttons > 0) { // Only move when mouse button is pressed
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;
        
        // Use a lower sensitivity for smoother control
        this.mousePosition.x = Math.clamp(
          this.mousePosition.x + movementX * 0.001,
          -Math.PI/2,
          Math.PI/2
        );

        this.mousePosition.y = Math.clamp(
          this.mousePosition.y + movementY * 0.001,
          -Math.PI/3,
          Math.PI/3
        );
      }
    }
  }

  public update() {
    const currentSpeed = this.car.velocity.length();
    const direction = this.car.mesh.getWorldDirection(new THREE.Vector3());

    // Enhanced forward/backward movement
    if (this.keys['w']) {
      // Smoother acceleration curve, better response at lower speeds
      const accelerationFactor = Math.max(0.6, 1 - Math.pow(currentSpeed / this.car.maxSpeed, 1.2));
      this.car.velocity.add(direction.multiplyScalar(this.car.acceleration * 0.12 * accelerationFactor));
    }
    if (this.keys['s']) {
      // Better braking when going forward, better reverse acceleration when stopped
      const isMovingForward = this.car.velocity.dot(direction) > 0;
      const reverseAcceleration = isMovingForward ? 
        this.car.acceleration * 0.15 : // Stronger braking
        this.car.acceleration * 0.08;  // Normal reverse
      this.car.velocity.sub(direction.multiplyScalar(reverseAcceleration));
    }

    // Enhanced turning with variable response based on speed
    if (this.keys['a'] || this.keys['d']) {
      // More responsive at low speeds, more stable at high speeds
      // Use a curve that gives more control in mid-range speeds
      const speedRatio = currentSpeed / this.car.maxSpeed;
      let turnSpeedFactor;
      
      if (speedRatio < 0.2) {
        // Very low speed - tight turning
        turnSpeedFactor = 0.8;
      } else if (speedRatio < 0.6) {
        // Mid speeds - optimal turning
        turnSpeedFactor = 0.6;
      } else {
        // High speeds - gradual turning for stability
        turnSpeedFactor = 0.4 - (speedRatio - 0.6) * 0.2;
      }
      
      const turnAmount = this.car.turnSpeed * 0.06 * turnSpeedFactor;

      if (this.keys['a']) {
        this.car.mesh.rotation.y += turnAmount;
        // Add slight drift effect at high speeds
        if (speedRatio > 0.7) {
          const lateralForce = direction.clone().cross(new THREE.Vector3(0, 1, 0)).multiplyScalar(0.02);
          this.car.velocity.add(lateralForce);
        }
      }
      if (this.keys['d']) {
        this.car.mesh.rotation.y -= turnAmount;
        // Add slight drift effect at high speeds
        if (speedRatio > 0.7) {
          const lateralForce = direction.clone().cross(new THREE.Vector3(0, 1, 0)).multiplyScalar(-0.02);
          this.car.velocity.add(lateralForce);
        }
      }
    }

    // Shoot with space key
    if (this.keys[' ']) {
      this.car.shoot();
      this.cameraShake = 0.5;
      // Reset the key to prevent continuous shooting
      this.keys[' '] = false;
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