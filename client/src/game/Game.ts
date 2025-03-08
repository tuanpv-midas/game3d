import * as THREE from 'three';
import { WeaponSystem } from './WeaponSystem';
import { Car } from './Car';
import { Terrain } from './Terrain';
import { Controls } from './Controls';
import { PowerUp, PowerUpType } from './PowerUp';
import { BulletType } from './Bullet'; // Assuming this import is needed


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
  private lastTime: number;
  private enemies: any[]; // Assuming enemies array exists
  private isGameActive: boolean = true; // Assuming this variable is used


  constructor(container: HTMLElement, enemies: any[]) { //Added enemies parameter
    this.enemies = enemies;
    this.lastTime = performance.now();
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
    this.update(performance.now()); // Start animation loop

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private createHUD(container: HTMLElement): HTMLDivElement {
    const hud = document.createElement('div');
    hud.id = 'game-hud';

    // Add control instructions for sandboxed environment
    const instructions = document.createElement('div');
    instructions.id = 'control-instructions';
    instructions.style.cssText = `
      position: absolute;
      bottom: 10px;
      left: 10px;
      background: rgba(0,0,0,0.5);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-size: 14px;
      pointer-events: none;
      transition: opacity 1s;
      opacity: 0.8;
    `;
    instructions.innerHTML = `
      <div>Controls: WASD - Move, Space - Brake</div>
      <div>Click to shoot, Click and drag to aim</div>
      <div>V - Toggle camera view</div>
    `;
    hud.appendChild(instructions);

    // Hide instructions after 10 seconds
    setTimeout(() => {
      instructions.style.opacity = '0';
    }, 10000);

    hud.style.position = 'absolute';
    hud.style.top = '20px';
    hud.style.right = '20px';
    hud.style.color = 'white';
    hud.style.fontFamily = 'Arial, sans-serif';
    hud.style.textShadow = '2px 2px 2px rgba(0,0,0,0.5)';
    hud.innerHTML += `
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

  private update = (time: number) => {
    const delta = Math.min((time - this.lastTime) / 1000, 0.1); // Cap delta time to prevent large jumps
    this.lastTime = time;

    if (this.isGameActive) {
      // Update car and bullets (car update will call weaponSystem.update)
      this.car.update(delta);
      this.enemies.forEach(enemy => enemy.update?.(delta));
      this.car.updateBullets(delta, this.terrain);

      // Update enemies with bullet optimization
      this.enemies.forEach(enemy => {
        enemy.update(delta, this.car.mesh.position);
        enemy.updateBullets(delta, this.terrain);
      });

      // Update controls
      this.controls.update(delta);

      // Check for bullet collisions with improved performance
      this.checkBulletCollisions();

      // Update HUD
      this.updateHUD();

      // Check for powerups
      this.checkPowerUpCollisions();
      this.updatePowerUps(delta);
    }

    // Render the scene
    this.renderer.render(this.scene, this.camera);

    // Continue animation loop
    requestAnimationFrame(this.update.bind(this));
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

  private checkBulletCollisions() {
    // Create temporary bounding spheres for efficient collision detection
    const enemyBounds: { enemy: any, bounds: THREE.Sphere }[] = this.enemies.map(enemy => {
      const boundingBox = new THREE.Box3().setFromObject(enemy.mesh);
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      const radius = boundingBox.max.distanceTo(boundingBox.min) / 2;
      return { enemy, bounds: new THREE.Sphere(center, radius) };
    });

    const carBounds = new THREE.Box3().setFromObject(this.car.mesh);
    const carCenter = new THREE.Vector3();
    carBounds.getCenter(carCenter);
    const carRadius = carBounds.max.distanceTo(carBounds.min) / 2;
    const carSphere = new THREE.Sphere(carCenter, carRadius);

    // Check car bullets against enemies with early rejection
    this.car.getBullets().forEach(bullet => {
      // Only check active bullets
      if (!bullet.isActive) return;

      const bulletPos = bullet.position;

      for (const { enemy, bounds } of enemyBounds) {
        // Quick sphere test first (much faster than detailed collision)
        if (bulletPos.distanceTo(bounds.center) <= bounds.radius + 0.5) {
          // Then do more precise collision check
          if (this.checkBulletCollision(bullet, enemy.mesh)) {
            // Handle explosion for explosive ammo
            if (bullet.getType() === WeaponSystem.BulletType.EXPLOSIVE) {
              this.createAreaEffect(bullet.position.clone(), 5, enemies => {
                enemies.forEach(e => {
                  if (e && typeof e.takeDamage === 'function') {
                    e.takeDamage(bullet.getDamage() * 0.5);
                  }
                });
              });
            }

            enemy.takeDamage(bullet.getDamage());
            
            // Mark as inactive first before recycling to prevent race conditions
            bullet.isActive = false;
            
            // Safely recycle the bullet
            if (this.car && this.car.weaponSystem) {
              this.car.weaponSystem.recycleBullet(bullet);
            }
            break;
          }
        }
      }
    });

    // Check enemy bullets against car with sphere optimization
    this.enemies.forEach(enemy => {
      enemy.getBullets().forEach(bullet => {
        // Only check active bullets
        if (!bullet.isActive) return;

        // Quick sphere test first
        if (bullet.position.distanceTo(carSphere.center) <= carSphere.radius + 0.5) {
          if (this.checkBulletCollision(bullet, this.car.mesh)) {
            this.car.takeDamage(bullet.getDamage());

            // If enemy has weapon system with recycling
            if (enemy.weaponSystem && enemy.weaponSystem.recycleBullet) {
              enemy.weaponSystem.recycleBullet(bullet);
            } else {
              this.scene.remove(bullet.mesh);
              bullet.dispose();
            }

            bullet.isActive = false;
          }
        }
      });
    });
  }

  // Helper method for area effect weapons
  private createAreaEffect(position: THREE.Vector3, radius: number, effectFn: (enemies: any[]) => void) {
    // Find all enemies in radius
    const enemiesInRange = this.enemies.filter(enemy =>
      enemy.mesh.position.distanceTo(position) <= radius
    );

    if (enemiesInRange.length > 0) {
      effectFn(enemiesInRange);
    }

    // Create visual effect
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0, radius, 32),
      new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(position);
    ring.position.y += 0.1; // Slightly above ground
    this.scene.add(ring);

    // Animate and remove
    let scale = 0;
    const animate = () => {
      scale += 0.1;
      ring.scale.set(scale, scale, scale);
      ring.material.opacity = 0.7 * (1 - scale / 5);

      if (scale >= 5) {
        this.scene.remove(ring);
        ring.geometry.dispose();
        ring.material.dispose();
        return;
      }

      requestAnimationFrame(animate);
    };
    animate();
  }


  private checkBulletCollision(bullet: any, mesh: THREE.Object3D): boolean {
    // Implement your bullet collision detection logic here
    // This is a placeholder, replace with your actual collision detection
    const bulletBox = new THREE.Box3().setFromObject(bullet.mesh);
    const meshBox = new THREE.Box3().setFromObject(mesh);
    return bulletBox.intersectsBox(meshBox);
  }

  private checkPowerUpCollisions() {
    // Placeholder for power-up collision detection
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