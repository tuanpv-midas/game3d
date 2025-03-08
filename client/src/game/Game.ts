import * as THREE from 'three';
import { Car } from './Car';
import { Terrain } from './Terrain';
import { Controls } from './Controls';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private car: Car;
  private terrain: Terrain;
  private controls: Controls;
  private clock: THREE.Clock;

  constructor(container: HTMLElement) {
    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue

    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    
    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // Initialize game objects
    this.terrain = new Terrain();
    this.scene.add(this.terrain.mesh);

    this.car = new Car();
    this.scene.add(this.car.mesh);

    // Setup controls
    this.controls = new Controls(this.car, this.camera, container);

    // Setup clock for animation
    this.clock = new THREE.Clock();

    // Start animation loop
    this.animate();

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    // Update game objects
    this.car.update(delta);
    this.controls.update();

    // Update bullets and check collisions
    this.car.updateBullets(delta, this.terrain);

    // Render scene
    this.renderer.render(this.scene, this.camera);
  };

  private onWindowResize() {
    const container = this.renderer.domElement.parentElement;
    if (!container) return;

    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  public dispose() {
    this.controls.dispose();
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
  }
}
