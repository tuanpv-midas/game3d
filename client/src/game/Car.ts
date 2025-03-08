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

  constructor() {
    this.mesh = new THREE.Group();
    this.bullets = [];

    // Initialize systems
    this.healthSystem = new HealthSystem(100);
    this.weaponSystem = new WeaponSystem();

    // Car body
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x2266cc });
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.body.castShadow = true;
    this.mesh.add(this.body);

    // Wheels
    this.wheels = [];
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3);
    const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });

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

    // Turret
    const turretGeometry = new THREE.BoxGeometry(0.8, 0.5, 1.5);
    const turretMaterial = new THREE.MeshPhongMaterial({ color: 0x1a4d99 });
    this.turret = new THREE.Mesh(turretGeometry, turretMaterial);
    this.turret.position.set(0, 0.75, 0);
    this.turret.castShadow = true;
    this.mesh.add(this.turret);

    // Initial position and physics properties
    this.mesh.position.set(0, 1, 0);
    this.velocity = new THREE.Vector3();

    // Optimized physics parameters
    this.acceleration = 15;
    this.maxSpeed = 25;
    this.turnSpeed = 2.5;
    this.friction = 0.98;
    this.brakeForce = 0.85;
    this.turnFriction = 0.95;
    this.currentSpeed = 0;
  }

  public update(delta: number) {
    if (!this.healthSystem.isAlive()) return;

    // Calculate current speed
    this.currentSpeed = this.velocity.length();

    // Apply velocity to position
    this.mesh.position.add(this.velocity.clone().multiplyScalar(delta));

    // Apply dynamic friction based on speed and turning
    let currentFriction = this.friction;

    // More friction when turning at high speeds
    if (this.currentSpeed > this.maxSpeed * 0.5) {
      currentFriction *= this.turnFriction;
    }

    // Progressive friction at higher speeds
    if (this.currentSpeed > this.maxSpeed * 0.8) {
      currentFriction *= 0.95;
    }

    // Apply friction
    this.velocity.multiplyScalar(currentFriction);

    // Update wheels rotation based on speed
    const wheelRotationSpeed = this.currentSpeed * 2;
    this.wheels.forEach(wheel => {
      wheel.rotation.x += wheelRotationSpeed * delta;
    });
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
    // Create particle effect for explosion
    const particleCount = 20;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const radius = 0.5;
      positions.push(
        position.x + Math.cos(angle) * radius,
        position.y,
        position.z + Math.sin(angle) * radius
      );
      velocities.push(
        Math.cos(angle) * 2,
        2,
        Math.sin(angle) * 2
      );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xff6600,
      size: 0.2,
      transparent: true
    });

    const particles = new THREE.Points(geometry, material);
    this.mesh.parent?.add(particles);

    // Animate and remove after 1 second
    setTimeout(() => {
      this.mesh.parent?.remove(particles);
      geometry.dispose();
      material.dispose();
    }, 1000);
  }

  public brake() {
    this.velocity.multiplyScalar(this.brakeForce);
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