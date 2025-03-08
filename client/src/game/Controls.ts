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

  constructor(car: Car, camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.car = car;
    this.camera = camera;
    this.domElement = domElement;

    this.keys = {};
    this.mousePosition = { x: 0, y: 0 };
    this.cameraOffset = new THREE.Vector3(0, 3, -8); // Third person view
    this.firstPersonOffset = new THREE.Vector3(0, 1.5, 0.5); // First person view (from cabin)
    this.isFirstPerson = false;

    // Setup event listeners
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
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

    // Update camera position based on view mode
    if (this.isFirstPerson) {
      // First person view - camera follows from inside car
      const carPosition = this.car.mesh.position.clone();
      const carDirection = this.car.mesh.getWorldDirection(new THREE.Vector3());

      // Calculate camera position inside car
      const cameraPosition = carPosition.clone()
        .add(this.firstPersonOffset.clone().applyQuaternion(this.car.mesh.quaternion));

      this.camera.position.copy(cameraPosition);

      // Look in car's direction plus mouse offset
      const lookAtPoint = cameraPosition.clone()
        .add(carDirection.multiplyScalar(10))
        .add(new THREE.Vector3(
          Math.sin(this.mousePosition.x) * 2,
          this.mousePosition.y * 2,
          Math.cos(this.mousePosition.x) * 2
        ));

      this.camera.lookAt(lookAtPoint);
    } else {
      // Third person view - camera follows from behind
      const cameraTarget = this.car.mesh.position.clone()
        .add(this.cameraOffset.clone().applyQuaternion(this.car.mesh.quaternion));
      this.camera.position.lerp(cameraTarget, 0.1);
      this.camera.lookAt(this.car.mesh.position);
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
      this.mousePosition.x += event.movementX * 0.003;
      this.mousePosition.y = Math.max(-Math.PI/3, Math.min(Math.PI/3, 
        this.mousePosition.y + event.movementY * 0.003));
    }
  }

  private onMouseClick() {
    if (document.pointerLockElement) {
      this.car.shoot();
    }
  }

  public dispose() {
    document.removeEventListener('keydown', this.onKeyDown.bind(this));
    document.removeEventListener('keyup', this.onKeyUp.bind(this));
    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
    document.removeEventListener('click', this.onMouseClick.bind(this));
  }
}