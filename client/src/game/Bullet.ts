import * as THREE from 'three';
import { BulletType } from './WeaponSystem';

export class Bullet {
  public mesh: THREE.Mesh;
  public velocity: THREE.Vector3;
  public position: THREE.Vector3;
  public distanceTraveled: number;
  public isActive: boolean;
  private speed: number;
  private startPosition: THREE.Vector3;
  private type: BulletType;
  private damage: number;
  private lifeTime: number;
  private maxLifeTime: number;

  // Cached geometries and materials for reuse
  private static geometries: Record<BulletType, THREE.BufferGeometry> = {} as any;
  private static materials: Record<BulletType, THREE.Material> = {} as any;

  constructor(
    position: THREE.Vector3, 
    direction: THREE.Vector3, 
    turretPosition: THREE.Vector3,
    type: BulletType = BulletType.NORMAL,
    damage: number = 10
  ) {
    this.type = type;
    this.damage = damage;
    this.isActive = true;
    this.lifeTime = 0;
    this.maxLifeTime = 5; // 5 seconds maximum life

    // Initialize static geometry and material caches if needed
    if (Object.keys(Bullet.geometries).length === 0) {
      Bullet.geometries[BulletType.NORMAL] = new THREE.SphereGeometry(0.1);
      Bullet.geometries[BulletType.EXPLOSIVE] = new THREE.SphereGeometry(0.2);
      Bullet.geometries[BulletType.LASER] = new THREE.CylinderGeometry(0.05, 0.05, 0.5);
      Bullet.geometries[BulletType.MISSILE] = new THREE.ConeGeometry(0.15, 0.5);

      Bullet.materials[BulletType.NORMAL] = new THREE.MeshPhongMaterial({ color: 0xffff00 });
      Bullet.materials[BulletType.EXPLOSIVE] = new THREE.MeshPhongMaterial({ color: 0xff6600 });
      Bullet.materials[BulletType.LASER] = new THREE.MeshPhongMaterial({ 
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 2
      });
      Bullet.materials[BulletType.MISSILE] = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    }

    // Set speed based on bullet type
    switch(type) {
      case BulletType.EXPLOSIVE: this.speed = 40; break;
      case BulletType.LASER: this.speed = 80; break;
      case BulletType.MISSILE: this.speed = 30; break;
      default: this.speed = 50; // Normal
    }

    // Create mesh using cached geometries and materials
    this.mesh = new THREE.Mesh(
      Bullet.geometries[type],
      Bullet.materials[type].clone() // Clone material to allow individual bullet coloring
    );

    // Set up position and movement
    this.position = new THREE.Vector3();
    this.startPosition = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.distanceTraveled = 0;

    // Set initial state
    this.reset(position, direction, turretPosition, type, damage);

    // Add trail for missiles
    if (type === BulletType.MISSILE) {
      this.addMissileTrail();
    }
  }

  public reset(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    turretPosition: THREE.Vector3,
    type: BulletType = BulletType.NORMAL,
    damage: number = 10
  ): void {
    // Reset all properties for reuse
    this.position.copy(position);
    this.startPosition.copy(position);
    this.velocity.copy(direction.normalize().multiplyScalar(this.speed));
    this.type = type;
    this.damage = damage;
    this.isActive = true;
    this.distanceTraveled = 0;

    // Update position
    this.mesh.position.copy(position);

    // Reset rotation
    this.mesh.lookAt(position.clone().add(direction));

    // Apply specific bullet type settings
    this.updateBulletTypeVisuals();
  }

  private updateBulletTypeVisuals(): void {
    // Update bullet appearance based on type
    switch(this.type) {
      case BulletType.NORMAL:
        this.mesh.scale.set(0.1, 0.1, 0.5);
        (this.mesh.material as THREE.MeshBasicMaterial).color.set(0xffff00);
        break;
      case BulletType.EXPLOSIVE:
        this.mesh.scale.set(0.2, 0.2, 0.6);
        (this.mesh.material as THREE.MeshBasicMaterial).color.set(0xff6600);
        break;
      case BulletType.LASER:
        this.mesh.scale.set(0.08, 0.08, 1.0);
        (this.mesh.material as THREE.MeshBasicMaterial).color.set(0x00ffff);
        break;
      case BulletType.MISSILE:
        this.mesh.scale.set(0.2, 0.2, 0.8);
        (this.mesh.material as THREE.MeshBasicMaterial).color.set(0xff0000);

        // Add/update trail for missiles
        if (this.mesh.children.length === 0) {
          this.addMissileTrail();
        }
        break;
    }
  }

  public update(delta: number): boolean {
    if (!this.isActive) return false;

    // Update lifetime
    this.lifeTime += delta;
    if (this.lifeTime > this.maxLifeTime) {
      this.isActive = false;
      return false;
    }

    // Update position with time-based movement
    const movement = this.velocity.clone().multiplyScalar(delta);
    this.position.add(movement);
    this.mesh.position.copy(this.position);

    // Calculate distance traveled
    this.distanceTraveled = this.position.distanceTo(this.startPosition);

    // Check if bullet has gone too far
    if (this.distanceTraveled > 200) {
      this.isActive = false;
      return false;
    }

    // Update missile trail with optimized buffer updates
    if (this.type === BulletType.MISSILE && this.mesh.children.length > 0) {
      const trail = this.mesh.children[0] as THREE.Points;
      const positions = new Float32Array(15); // 5 points × 3 coordinates

      for (let i = 0; i < 5; i++) {
        const offset = i * 3;
        positions[offset] = this.position.x - this.velocity.x * i * 0.05;
        positions[offset + 1] = this.position.y - this.velocity.y * i * 0.05;
        positions[offset + 2] = this.position.z - this.velocity.z * i * 0.05;
      }

      trail.geometry.setAttribute('position', 
        new THREE.Float32BufferAttribute(positions, 3)
      );
    }

    return true;
  }

  public getDamage(): number {
    return this.damage;
  }

  public getType(): BulletType {
    return this.type;
  }

  public dispose(): void {
    try {
      // Remove from scene if needed
      if (this.mesh.parent) {
        this.mesh.parent.remove(this.mesh);
      }

      // Dispose missile trail if exists
      if (this.mesh.children.length > 0) {
        const trail = this.mesh.children[0] as THREE.Points;
        if (trail && trail.geometry) {
          trail.geometry.dispose();
        }
        if (trail && trail.material) {
          if (Array.isArray(trail.material)) {
            trail.material.forEach(m => m.dispose());
          } else {
            trail.material.dispose();
          }
        }

        // Clear children
        while (this.mesh.children.length > 0) {
          this.mesh.remove(this.mesh.children[0]);
        }
      }

      // Dispose main geometry and material
      if (this.mesh.geometry) this.mesh.geometry.dispose();

      if (this.mesh.material) {
        if (Array.isArray(this.mesh.material)) {
          this.mesh.material.forEach(m => m.dispose());
        } else {
          this.mesh.material.dispose();
        }
      }

      this.isActive = false;
    } catch (error) {
      console.warn("Error disposing bullet:", error);
    }
  }

  // Helper method to add missile trail
  private addMissileTrail(): void {
    // Create trail points
    const trailGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(15); // 5 points × 3 coordinates
    trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    // Trail material
    const trailMaterial = new THREE.PointsMaterial({
      color: 0xff6600,
      size: 0.2,
      transparent: true,
      opacity: 0.7
    });

    // Create points object
    const trail = new THREE.Points(trailGeometry, trailMaterial);
    this.mesh.add(trail);
  }

  // Static method to clean up shared resources when no longer needed
  public static disposeSharedResources(): void {
    Object.values(Bullet.geometries).forEach(geometry => geometry.dispose());
    Object.values(Bullet.materials).forEach(material => material.dispose());
    Bullet.geometries = {} as any;
    Bullet.materials = {} as any;
  }
}