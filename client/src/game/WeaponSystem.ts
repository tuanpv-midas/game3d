class WeaponSystem {
  private lastFireTime: number;
  private cooldown: number;
  private bulletType: BulletType;
  private damage: number;
  private heatingLevel: number;
  private overheated: boolean;
  private bulletPool: Bullet[];
  private maxPoolSize: number;
  private coolingRate: number;
  private autoRecovery: boolean;
  private scene: THREE.Object3D | null;

  constructor() {
    this.lastFireTime = 0;
    this.cooldown = 0.5; // Base cooldown
    this.bulletType = BulletType.NORMAL;
    this.damage = 10;
    this.heatingLevel = 0;
    this.overheated = false;
    this.bulletPool = [];
    this.maxPoolSize = 50;
    this.coolingRate = 0.05;
    this.autoRecovery = true;
    this.scene = null;
  }

  public setScene(scene: THREE.Object3D) {
    this.scene = scene;
  }

  public canFire(): boolean {
    if (this.overheated) return false;

    const currentTime = performance.now() / 1000;
    return currentTime - this.lastFireTime >= this.cooldown;
  }

  public fire(position: THREE.Vector3, direction: THREE.Vector3, turretPosition: THREE.Vector3): Bullet | null {
    if (!this.canFire()) return null;

    this.lastFireTime = performance.now() / 1000;

    // Update heating system
    this.heatingLevel += 0.2;
    if (this.heatingLevel >= 1) {
      this.overheated = true;
      setTimeout(() => {
        this.overheated = false;
        this.heatingLevel = 0;
      }, 3000); // 3 seconds cooldown when overheated
    }

    // Try to reuse bullet from pool first
    let bullet: Bullet | null = this.getBulletFromPool();

    if (!bullet) {
      // Create new bullet if pool is empty
      bullet = new Bullet(position, direction, turretPosition, this.bulletType, this.damage);

      // Add to scene
      if (this.scene) {
        this.scene.add(bullet.mesh);
      }
    } else {
      // Reset and reuse existing bullet
      bullet.reset(position, direction, turretPosition, this.bulletType, this.damage);
      bullet.mesh.visible = true;
    }

    return bullet;
  }

  private getBulletFromPool(): Bullet | null {
    for (let i = 0; i < this.bulletPool.length; i++) {
      if (!this.bulletPool[i].isActive) {
        return this.bulletPool[i];
      }
    }
    return null;
  }

  public recycleBullet(bullet: Bullet): void {
    // Remove from scene if needed
    if (bullet.mesh.parent) {
      bullet.mesh.parent.remove(bullet.mesh);
    }

    // Don't exceed pool size
    if (this.bulletPool.length < this.maxPoolSize) {
      // Reset the bullet to reuse later
      bullet.reset(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), BulletType.NORMAL, 10);
      this.bulletPool.push(bullet);
    } else {
      // If pool is full, dispose bullet properly
      bullet.dispose();
    }
  }

  public update(delta: number): void {
    // Automatic cooling when not firing
    if (this.autoRecovery && this.heatingLevel > 0 && !this.overheated) {
      const currentTime = performance.now() / 1000;
      const timeSinceLastFire = currentTime - this.lastFireTime;

      if (timeSinceLastFire > this.cooldown * 2) {
        this.heatingLevel = Math.max(0, this.heatingLevel - this.coolingRate * delta);
      }
    }
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

  public getHeatLevel(): number {
    return this.heatingLevel;
  }

  public isOverheated(): boolean {
    return this.overheated;
  }

  public getBulletType(): BulletType {
    return this.bulletType;
  }

  public dispose(): void {
    // Clean up bullet pool
    this.bulletPool.forEach(bullet => {
      if (this.scene) {
        this.scene.remove(bullet.mesh);
      }
      bullet.dispose();
    });
    this.bulletPool = [];
  }
}