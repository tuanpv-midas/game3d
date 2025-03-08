import * as THREE from 'three';
import { Bullet } from './Bullet';

export enum BulletType {
  NORMAL = 'normal',
  EXPLOSIVE = 'explosive',
  LASER = 'laser',
  MISSILE = 'missile'
}

export class WeaponSystem {
  private lastFireTime: number;
  private cooldown: number;
  private bulletType: BulletType;
  private damage: number;

  constructor() {
    this.lastFireTime = 0;
    this.cooldown = 0.5; // 0.5 seconds between shots
    this.bulletType = BulletType.NORMAL;
    this.damage = 10;
  }

  public canFire(): boolean {
    const currentTime = performance.now() / 1000;
    return currentTime - this.lastFireTime >= this.cooldown;
  }

  public fire(position: THREE.Vector3, direction: THREE.Vector3, turretPosition: THREE.Vector3): Bullet | null {
    if (!this.canFire()) return null;

    this.lastFireTime = performance.now() / 1000;
    
    const bullet = new Bullet(position, direction, turretPosition, this.bulletType, this.damage);
    return bullet;
  }

  public setBulletType(type: BulletType) {
    this.bulletType = type;
    
    // Adjust damage and cooldown based on bullet type
    switch(type) {
      case BulletType.NORMAL:
        this.damage = 10;
        this.cooldown = 0.5;
        break;
      case BulletType.EXPLOSIVE:
        this.damage = 30;
        this.cooldown = 1.5;
        break;
      case BulletType.LASER:
        this.damage = 15;
        this.cooldown = 0.2;
        break;
      case BulletType.MISSILE:
        this.damage = 40;
        this.cooldown = 2.0;
        break;
    }
  }

  public getCooldownProgress(): number {
    const currentTime = performance.now() / 1000;
    const timeSinceLastFire = currentTime - this.lastFireTime;
    return Math.min(1, timeSinceLastFire / this.cooldown);
  }

  public getBulletType(): BulletType {
    return this.bulletType;
  }
}
