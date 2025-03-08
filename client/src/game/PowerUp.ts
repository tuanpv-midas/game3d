import * as THREE from 'three';
import { BulletType } from './Weapon';
import { Car } from './Car';

export enum PowerUpType {
  HEALTH = 'health',
  ARMOR = 'armor',
  EXPLOSIVE_AMMO = 'explosive_ammo',
  LASER = 'laser',
  MISSILE = 'missile'
}

export class PowerUp {
  public mesh: THREE.Mesh;
  private type: PowerUpType;
  private rotationSpeed: number;

  constructor(position: THREE.Vector3, type: PowerUpType) {
    this.type = type;
    this.rotationSpeed = Math.PI;

    // Create different meshes based on type
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;

    switch(type) {
      case PowerUpType.HEALTH:
        geometry = new THREE.BoxGeometry(1, 1, 1);
        material = new THREE.MeshPhongMaterial({ 
          color: 0x00ff00,
          emissive: 0x00ff00,
          emissiveIntensity: 0.5
        });
        break;
      case PowerUpType.ARMOR:
        geometry = new THREE.OctahedronGeometry(0.7);
        material = new THREE.MeshPhongMaterial({ 
          color: 0x0066ff,
          specular: 0x3399ff,
          shininess: 80
        });
        break;
      default: // Weapon power-ups
        geometry = new THREE.TetrahedronGeometry(0.7);
        material = new THREE.MeshPhongMaterial({ 
          color: 0xff0000,
          emissive: 0xff0000,
          emissiveIntensity: 0.5
        });
    }

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.mesh.position.y = 1; // Float above ground

    // Add glow effect
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: material.color,
      transparent: true,
      opacity: 0.3
    });
    const glowMesh = new THREE.Mesh(geometry.clone().scale(1.5, 1.5, 1.5), glowMaterial);
    this.mesh.add(glowMesh);
  }

  public update(delta: number) {
    // Rotate the power-up
    this.mesh.rotation.y += this.rotationSpeed * delta;
    
    // Bob up and down
    this.mesh.position.y = 1 + Math.sin(Date.now() * 0.002) * 0.2;
  }

  public apply(car: Car) {
    switch(this.type) {
      case PowerUpType.HEALTH:
        car.heal(50);
        break;
      case PowerUpType.ARMOR:
        car.addArmor(25);
        break;
      case PowerUpType.EXPLOSIVE_AMMO:
        car.setBulletType(BulletType.EXPLOSIVE);
        break;
      case PowerUpType.LASER:
        car.setBulletType(BulletType.LASER);
        break;
      case PowerUpType.MISSILE:
        car.setBulletType(BulletType.MISSILE);
        break;
    }
  }

  public dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    const glowMesh = this.mesh.children[0] as THREE.Mesh;
    glowMesh.geometry.dispose();
    (glowMesh.material as THREE.Material).dispose();
  }
}
