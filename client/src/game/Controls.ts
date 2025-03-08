import * as THREE from 'three';
import { Car } from './Car';

export class Controls {
  private car: Car;
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  
  private keys: { [key: string]: boolean };
  private mousePosition: { x: number; y: number };
  private cameraOffset: THREE.Vector3;
  
  constructor(car: Car, camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.car = car;
    this.camera = camera;
    this.domElement = domElement;
    
    this.keys = {};
    this.mousePosition = { x: 0, y: 0 };
    this.cameraOffset = new THREE.Vector3(0, 3, -8);
    
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
    // Handle car movement
    if (this.keys['w']) {
      const direction = this.car.mesh.getWorldDirection(new THREE.Vector3());
      this.car.velocity.add(direction.multiplyScalar(this.car.acceleration * 0.1));
    }
    if (this.keys['s']) {
      const direction = this.car.mesh.getWorldDirection(new THREE.Vector3());
      this.car.velocity.sub(direction.multiplyScalar(this.car.acceleration * 0.1));
    }
    if (this.keys['a']) {
      this.car.mesh.rotation.y += this.car.turnSpeed * 0.05;
    }
    if (this.keys['d']) {
      this.car.mesh.rotation.y -= this.car.turnSpeed * 0.05;
    }
    if (this.keys[' ']) { // Space for brake
      this.car.velocity.multiplyScalar(0.9);
    }

    // Limit speed
    const speed = this.car.velocity.length();
    if (speed > this.car.maxSpeed) {
      this.car.velocity.multiplyScalar(this.car.maxSpeed / speed);
    }

    // Update camera position
    const cameraTarget = this.car.mesh.position.clone().add(this.cameraOffset);
    this.camera.position.lerp(cameraTarget, 0.1);
    this.camera.lookAt(this.car.mesh.position);
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
      
      // Update camera offset based on mouse position
      this.cameraOffset.x = Math.sin(this.mousePosition.x) * 8;
      this.cameraOffset.z = -Math.cos(this.mousePosition.x) * 8;
      this.cameraOffset.y = 3 + this.mousePosition.y * 2;
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
