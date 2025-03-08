import * as THREE from 'three';
import { Bullet } from './Bullet';
import { Terrain } from './Terrain';
import { HealthSystem } from './Health';
import { WeaponSystem, BulletType } from './Weapon';

export class Car {
  public mesh: THREE.Group;
  private body: THREE.Mesh;
  private wheels: THREE.Mesh[];
  private turret: THREE.Mesh;
  private bullets: Bullet[];
  private healthSystem: HealthSystem;
  private weaponSystem: WeaponSystem;

  public velocity: THREE.Vector3;
  public acceleration: number;
  public maxSpeed: number;
  public turnSpeed: number;

  // Physics parameters
  private friction: number;
  private brakeForce: number;
  private turnFriction: number;
  private currentSpeed: number;
  private driftFactor: number;
  private wheelRotation: number;
  private collisionRecoveryTime: number;

  constructor() {
    this.mesh = new THREE.Group();
    this.bullets = [];

    // Initialize systems
    this.healthSystem = new HealthSystem(100);
    this.weaponSystem = new WeaponSystem();

    // Car body
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x2266cc,
      specular: 0x111111,
      shininess: 50 
    });
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.body.castShadow = true;
    this.mesh.add(this.body);

    // Wheels with better detail

  public shoot(): void {
    if (!this.weaponSystem.canFire()) return;
    
    // Get direction from turret rotation
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.turret.quaternion);
    
    // Get turret position for bullet spawn
    const turretPosition = new THREE.Vector3();
    this.turret.getWorldPosition(turretPosition);
    
    // Adjust spawn position slightly forward from turret
    const spawnPosition = turretPosition.clone().add(direction.clone().multiplyScalar(1));
    
    // Create bullet
    const bullet = this.weaponSystem.fire(spawnPosition, direction, turretPosition);
    if (bullet) {
      this.bullets.push(bullet);
      // Add bullet to scene - assuming you have a reference to the scene
      if (this.mesh.parent) {
        this.mesh.parent.add(bullet.mesh);
      }
    }
  }
  
  public updateBullets(delta: number): void {
    // Update existing bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {

  public getBullets(): Bullet[] {
    return this.bullets;
  }

      this.bullets[i].update(delta);
      
      // Remove bullets that have traveled too far
      if (this.bullets[i].distanceTraveled > 100) {
        this.bullets[i].dispose();
        this.bullets.splice(i, 1);
      }
    }
  }

    this.wheels = [];
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
    const wheelMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x333333,
      specular: 0x222222,
      shininess: 30
    });

    const wheelPositions = [
      new THREE.Vector3(-1, -0.3, 1.5),
      new THREE.Vector3(1, -0.3, 1.5),
      new THREE.Vector3(-1, -0.3, -1.5),
      new THREE.Vector3(1, -0.3, -1.5)
    ];

    wheelPositions.forEach(position => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.copy(position);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      this.wheels.push(wheel);
      this.mesh.add(wheel);
    });

    // Enhanced turret with details
    const turretGeometry = new THREE.BoxGeometry(0.8, 0.5, 1.5);
    const turretMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x1a4d99,
      specular: 0x111111,
      shininess: 50
    });
    this.turret = new THREE.Mesh(turretGeometry, turretMaterial);
    this.turret.position.set(0, 0.75, 0);
    this.turret.castShadow = true;
    this.mesh.add(this.turret);

    // Initial position and physics properties
    this.mesh.position.set(0, 1, 0);
    this.velocity = new THREE.Vector3();

    // Enhanced physics parameters
    this.acceleration = 20; // Increased for better responsiveness
    this.maxSpeed = 30;
    this.turnSpeed = 3;
    this.friction = 0.98;
    this.brakeForce = 0.85;
    this.turnFriction = 0.95;
    this.currentSpeed = 0;
    this.driftFactor = 0.8; // New drift mechanic
    this.wheelRotation = 0;
    this.collisionRecoveryTime = 0;
  }

  public update(delta: number) {
    if (!this.healthSystem.isAlive()) return;

    // Calculate current speed
    this.currentSpeed = this.velocity.length();

    // Apply velocity to position with collision check
    const nextPosition = this.mesh.position.clone().add(this.velocity.clone().multiplyScalar(delta));

    // Collision recovery
    if (this.collisionRecoveryTime > 0) {
      this.collisionRecoveryTime -= delta;
      this.velocity.multiplyScalar(0.95); // Slow down during recovery
    }

    // Apply dynamic friction based on speed and turning
    let currentFriction = this.friction;

    // More friction when turning at high speeds
    if (this.currentSpeed > this.maxSpeed * 0.5) {
      currentFriction *= this.turnFriction;
    }

    // Progressive friction at higher speeds for better control
    if (this.currentSpeed > this.maxSpeed * 0.8) {
      currentFriction *= 0.95;
    }

    // Apply drift mechanics
    if (this.currentSpeed > this.maxSpeed * 0.6) {
      currentFriction *= this.driftFactor;
    }

    // Apply friction
    this.velocity.multiplyScalar(currentFriction);

    // Update wheels rotation based on speed and direction
    const wheelRotationSpeed = this.currentSpeed * 2;
    this.wheelRotation += wheelRotationSpeed * delta;
    this.wheels.forEach((wheel, index) => {
      wheel.rotation.x = this.wheelRotation;
      // Add slight tilt to wheels when turning
      if (index < 2) { // Front wheels
        wheel.rotation.y = this.mesh.rotation.y * 0.5;
      }
    });

    // Update position if no collision
    this.mesh.position.copy(nextPosition);
  }

  public shoot() {
    if (!this.healthSystem.isAlive()) return;

    const bullet = this.weaponSystem.fire(
      this.mesh.position.clone(),
      this.mesh.getWorldDirection(new THREE.Vector3()),
      this.turret.getWorldPosition(new THREE.Vector3())
    );

    if (bullet) {
      this.bullets.push(bullet);
      // Add recoil effect
      this.velocity.sub(this.mesh.getWorldDirection(new THREE.Vector3()).multiplyScalar(0.5));
    }
  }

  public updateBullets(delta: number, terrain: Terrain) {
    this.bullets = this.bullets.filter(bullet => {
      bullet.update(delta);

      // Check terrain collision
      if (terrain.checkCollision(bullet.position)) {
        // Create explosion effect for explosive ammo
        if (bullet.getType() === BulletType.EXPLOSIVE) {
          this.createExplosion(bullet.position.clone());
        }
        bullet.dispose();
        return false;
      }

      // Check range
      if (bullet.distanceTraveled > 200) {
        bullet.dispose();
        return false;
      }

      return true;
    });
  }

  private createExplosion(position: THREE.Vector3) {
    // Enhanced particle effect for explosion
    const particleCount = 30;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const sizes = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const radius = 0.5 + Math.random() * 0.5;

      positions.push(
        position.x + Math.cos(angle) * radius,
        position.y + Math.random() * 2,
        position.z + Math.sin(angle) * radius
      );

      // Add varied colors for more realistic explosion
      const color = new THREE.Color();
      color.setHSL(0.1 + Math.random() * 0.1, 1, 0.5 + Math.random() * 0.5);
      colors.push(color.r, color.g, color.b);

      sizes.push(0.2 + Math.random() * 0.3);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });

    const particles = new THREE.Points(geometry, material);
    this.mesh.parent?.add(particles);

    // Animate and remove particles
    let time = 0;
    const animate = () => {
      time += 0.016;
      if (time >= 1) {
        this.mesh.parent?.remove(particles);
        geometry.dispose();
        material.dispose();
        return;
      }

      const positions = geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += 0.1; // Move particles up
      }
      geometry.attributes.position.needsUpdate = true;
      material.opacity = 1 - time;

      requestAnimationFrame(animate);
    };
    animate();
  }

  public brake() {
    // Enhanced braking with drift
    const brakingForce = this.currentSpeed > this.maxSpeed * 0.7 ? 
      this.brakeForce * 0.7 : // Less effective at high speeds to allow drifting
      this.brakeForce;
    this.velocity.multiplyScalar(brakingForce);
  }

  public handleCollision() {
    // Start collision recovery
    this.collisionRecoveryTime = 0.5;

    // Bounce back effect
    this.velocity.negate().multiplyScalar(0.3);

    // Take damage
    this.takeDamage(10);
  }

  public takeDamage(amount: number) {
    const isDestroyed = this.healthSystem.takeDamage(amount);
    if (isDestroyed) {
      this.createExplosion(this.mesh.position);
    }
  }

  public heal(amount: number) {
    this.healthSystem.heal(amount);
  }

  public addArmor(amount: number) {
    this.healthSystem.addArmor(amount);
  }

  public setBulletType(type: BulletType) {
    this.weaponSystem.setBulletType(type);
  }

  public getHealth(): number {
    return this.healthSystem.getHealth();
  }

  public getArmor(): number {
    return this.healthSystem.getArmor();
  }

  public dispose() {
    this.bullets.forEach(bullet => bullet.dispose());
    this.bullets = [];
  }
}