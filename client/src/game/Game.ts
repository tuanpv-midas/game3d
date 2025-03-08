import * as THREE from 'three';
import { Car } from './Car';
import { Terrain } from './Terrain';
import { Controls } from './Controls';
import { PowerUp, PowerUpType } from './PowerUp';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private car: Car;
  private terrain: Terrain;
  private controls: Controls;
  private clock: THREE.Clock;
  private powerUps: PowerUp[];
  private powerUpSpawnTimer: number;
  private hud: HTMLDivElement;

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

    // Initialize power-ups
    this.powerUps = [];
    this.powerUpSpawnTimer = 0;

    // Create HUD before spawning power-ups
    this.hud = this.createHUD(container);
    container.appendChild(this.hud);

    // Spawn initial power-ups after HUD is created
    this.spawnInitialPowerUps();

    // Start animation loop
    this.animate();

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private createHUD(container: HTMLElement): HTMLDivElement {
    const hud = document.createElement('div');
    hud.style.position = 'absolute';
    hud.style.top = '20px';
    hud.style.right = '20px';
    hud.style.color = 'white';
    hud.style.fontFamily = 'Arial, sans-serif';
    hud.style.textShadow = '2px 2px 2px rgba(0,0,0,0.5)';
    hud.innerHTML = `
      <div id="game-hud">
        <div id="health-bar" class="bar-container">
          <div>HP: <span id="health-value">100</span></div>
          <div class="bar-background">
            <div id="health-fill" class="bar-fill" style="background: #00ff00;"></div>
          </div>
        </div>
        <div id="armor-bar" class="bar-container">
          <div>Armor: <span id="armor-value">0</span></div>
          <div class="bar-background">
            <div id="armor-fill" class="bar-fill" style="background: #0066ff;"></div>
          </div>
        </div>

  private update(delta: number): void {
    // Update player car
    this.player.update(delta);
    
    // Update bullets
    this.player.updateBullets(delta);
    
    // Update controls
    this.controls.update();
    
    // Update camera
    this.updateCamera();
    
    // Check for collisions
    this.checkCollisions();
    
    // Update other game objects
    this.updatePowerUps(delta);
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
  }

        <div id="weapon-cooldown" class="bar-container">
          <div>Weapon Ready</div>
          <div class="bar-background">
            <div id="cooldown-fill" class="bar-fill" style="background: #ff6600;"></div>
          </div>
        </div>
      </div>
    `;

    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
      .bar-container {
        margin-bottom: 10px;
      }
      .bar-background {
        width: 150px;
        height: 20px;
        background: rgba(0,0,0,0.5);
        border-radius: 10px;
        overflow: hidden;
      }
      .bar-fill {
        width: 100%;
        height: 100%;
        transition: width 0.3s;
      }
    `;
    document.head.appendChild(style);

    return hud;
  }

  private updateHUD() {
    const hudElement = document.getElementById('game-hud');
    if (!hudElement) return;

    const health = this.car.getHealth();
    const armor = this.car.getArmor();

    const healthValue = document.getElementById('health-value');
    const healthFill = document.getElementById('health-fill');
    const armorValue = document.getElementById('armor-value');
    const armorFill = document.getElementById('armor-fill');
    const cooldownFill = document.getElementById('cooldown-fill');

    if (healthValue && healthFill) {
      healthValue.textContent = health.toString();
      healthFill.style.width = `${health}%`;
    }

    if (armorValue && armorFill) {
      armorValue.textContent = armor.toString();
      armorFill.style.width = `${(armor / 50) * 100}%`;
    }

    if (cooldownFill) {
      const cooldownProgress = (this.car as any).weaponSystem.getCooldownProgress() * 100;
      cooldownFill.style.width = `${cooldownProgress}%`;
    }
  }

  private spawnInitialPowerUps() {
    const types = Object.values(PowerUpType);
    for (let i = 0; i < 5; i++) {
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * 100,
        1,
        (Math.random() - 0.5) * 100
      );
      const type = types[Math.floor(Math.random() * types.length)] as PowerUpType;
      this.spawnPowerUp(position, type);
    }
  }

  private spawnPowerUp(position: THREE.Vector3, type: PowerUpType) {
    const powerUp = new PowerUp(position, type);
    this.powerUps.push(powerUp);
    this.scene.add(powerUp.mesh);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    // Update game objects
    this.car.update(delta);
    this.controls.update();

    // Update bullets and check collisions
    this.car.updateBullets(delta, this.terrain);

    // Update power-ups
    this.updatePowerUps(delta);

    // Update HUD
    this.updateHUD();

    // Render scene
    this.renderer.render(this.scene, this.camera);
  };

  private updatePowerUps(delta: number) {
    // Update existing power-ups
    this.powerUps.forEach(powerUp => powerUp.update(delta));

    // Check collisions with car
    const carPosition = this.car.mesh.position;
    this.powerUps = this.powerUps.filter(powerUp => {
      if (powerUp.mesh.position.distanceTo(carPosition) < 2) {
        powerUp.apply(this.car);
        this.scene.remove(powerUp.mesh);
        powerUp.dispose();
        return false;
      }
      return true;
    });

    // Spawn new power-ups periodically
    this.powerUpSpawnTimer += delta;
    if (this.powerUpSpawnTimer > 10) { // Spawn every 10 seconds
      this.powerUpSpawnTimer = 0;
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * 100,
        1,
        (Math.random() - 0.5) * 100
      );
      const types = Object.values(PowerUpType);
      const type = types[Math.floor(Math.random() * types.length)] as PowerUpType;
      this.spawnPowerUp(position, type);
    }
  }

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
    this.powerUps.forEach(powerUp => powerUp.dispose());
    if (this.hud && this.hud.parentElement) {
      this.hud.parentElement.removeChild(this.hud);
    }
  }
}