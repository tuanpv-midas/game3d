import * as THREE from 'three';
import { BulletType } from './Weapon';

export class Bullet {
  public mesh: THREE.Mesh;
  public velocity: THREE.Vector3;
  public position: THREE.Vector3;
  public distanceTraveled: number;
  private speed: number;
  private startPosition: THREE.Vector3;
  private type: BulletType;
  private damage: number;

  constructor(
    position: THREE.Vector3, 
    direction: THREE.Vector3, 
    turretPosition: THREE.Vector3,
    type: BulletType = BulletType.NORMAL,
    damage: number = 10
  ) {
    this.type = type;
    this.damage = damage;

    // Create different bullet meshes based on type
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;

    switch(type) {
      case BulletType.EXPLOSIVE:
        geometry = new THREE.SphereGeometry(0.2);
        material = new THREE.MeshPhongMaterial({ color: 0xff6600 });
        this.speed = 40;
        break;
      case BulletType.LASER:
        geometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5);
        material = new THREE.MeshPhongMaterial({ 
          color: 0x00ff00,
          emissive: 0x00ff00,
          emissiveIntensity: 2
        });
        this.speed = 80;
        break;
      case BulletType.MISSILE:
        geometry = new THREE.ConeGeometry(0.15, 0.5);
        material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        this.speed = 30;
        break;
      default: // Normal bullet
        geometry = new THREE.SphereGeometry(0.1);
        material = new THREE.MeshPhongMaterial({ color: 0xffff00 });
        this.speed = 50;
    }

    this.mesh = new THREE.Mesh(geometry, material);

    this.position = turretPosition;
    this.mesh.position.copy(this.position);
    this.startPosition = position.clone();

    this.velocity = direction.normalize().multiplyScalar(this.speed);
    this.distanceTraveled = 0;

    // Add trail effect for missiles
    if (type === BulletType.MISSILE) {
      const trail = new THREE.Points(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)]),
        new THREE.PointsMaterial({ color: 0xff4400, size: 0.2 })
      );
      this.mesh.add(trail);
    }
  }

  public update(delta: number) {
    // Update position
    this.position.add(this.velocity.clone().multiplyScalar(delta));
    this.mesh.position.copy(this.position);

    // Calculate distance traveled
    this.distanceTraveled = this.position.distanceTo(this.startPosition);

    // Update missile trail
    if (this.type === BulletType.MISSILE) {
      const trail = this.mesh.children[0] as THREE.Points;
      const positions = [];
      for (let i = 0; i < 5; i++) {
        positions.push(
          this.position.x - this.velocity.x * i * 0.05,
          this.position.y - this.velocity.y * i * 0.05,
          this.position.z - this.velocity.z * i * 0.05
        );
      }
      trail.geometry.setAttribute('position', 
        new THREE.Float32BufferAttribute(positions, 3)
      );
    }
  }

  public getDamage(): number {
    return this.damage;
  }

  public getType(): BulletType {
    return this.type;
  }

  public dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    if (this.type === BulletType.MISSILE) {
      const trail = this.mesh.children[0] as THREE.Points;
      trail.geometry.dispose();
      (trail.material as THREE.Material).dispose();
    }
  }
}