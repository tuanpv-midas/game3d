import * as THREE from 'three';
import { Bullet } from './Bullet';
import { Terrain } from './Terrain';
import { HealthSystem } from './Health';
import { WeaponSystem, BulletType } from './WeaponSystem';

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

    // Enhanced physics parameters for better control
    this.acceleration = 22; // Slightly increased for even better responsiveness
    this.maxSpeed = 32;     // Higher top speed
    this.turnSpeed = 3.5;   // Better turning capability
    this.friction = 0.975;  // Slightly less friction for smoother movement
    this.brakeForce = 0.8;  // Stronger braking
    this.turnFriction = 0.92; // Better grip in turns
    this.currentSpeed = 0;
    this.driftFactor = 0.85; // Improved drift mechanics
    this.wheelRotation = 0;
    this.collisionRecoveryTime = 0;
  }

  

  public getBullets(): Bullet[] {
    return this.bullets;
  }

  public update(delta: number) {
    if (!this.healthSystem.isAlive()) return;

    // Update weapon system if available
    if (this.weaponSystem && typeof this.weaponSystem.update === 'function') {
      this.weaponSystem.update(delta);
    }

    // Calculate current speed
    this.currentSpeed = this.velocity.length();

    // Apply velocity to position with collision check
    const nextPosition = this.mesh.position.clone().add(this.velocity.clone().multiplyScalar(delta));

    // Collision recovery with better bounce-back
    if (this.collisionRecoveryTime > 0) {
      this.collisionRecoveryTime -= delta;
      this.velocity.multiplyScalar(0.93); // Improved recovery slowdown
    }

    // Enhanced dynamic friction system based on speed, turning, and terrain
    let currentFriction = this.friction;
    
    // Calculate normalized speed factor (0-1)
    const speedFactor = Math.min(this.currentSpeed / this.maxSpeed, 1);
    
    // Determine if car is turning by checking if A or D keys are pressed
    const isTurning = this.velocity.length() > 0.5 && 
                     (Math.abs(this.mesh.rotation.y - this.mesh.rotation.y) > 0.01);
    
    // Apply progressive friction for better control at various speeds
    if (speedFactor > 0.4) {
      // More friction as speed increases for stability
      currentFriction *= 1 - (speedFactor - 0.4) * 0.05;
    }
    
    // Enhanced turning friction with proper drift mechanics
    if (isTurning) {
      if (speedFactor < 0.5) {
        // Low speed turns - more grip
        currentFriction *= this.turnFriction;
      } else if (speedFactor > 0.7) {
        // High speed turns - controlled drift
        currentFriction *= this.driftFactor;
        
        // Apply slight lateral force for realistic drift
        const direction = this.mesh.getWorldDirection(new THREE.Vector3());
        const lateralDirection = direction.clone().cross(new THREE.Vector3(0, 1, 0));
        this.velocity.add(lateralDirection.multiplyScalar(0.01 * speedFactor));
      }
    }
    
    // Apply enhanced friction
    this.velocity.multiplyScalar(currentFriction);
    
    // Velocity damping at very low speeds to prevent endless sliding
    if (this.currentSpeed < 0.5) {
      this.velocity.multiplyScalar(0.9);
    }

    // More realistic wheel rotation with varied speeds for each wheel
    const wheelRotationSpeed = this.currentSpeed * 2.2;
    this.wheelRotation += wheelRotationSpeed * delta;
    
    // Update wheels with improved physics
    this.wheels.forEach((wheel, index) => {
      // Base rotation from movement
      wheel.rotation.x = this.wheelRotation;
      
      // Enhanced wheel steering
      if (index < 2) { // Front wheels
        // Smoother steering angle based on velocity and direction
        const steeringAngle = Math.min(Math.max(
          -this.mesh.rotation.y * 0.8, // Max steering angle
          -0.3
        ), 0.3);
        
        wheel.rotation.y = steeringAngle;
      }
      
      // Add bounce effect to wheels based on speed
      wheel.position.y = -0.3 + Math.sin(this.wheelRotation * 0.5) * 0.02 * speedFactor;
    });

    // Update position if no collision
    this.mesh.position.copy(nextPosition);
  }

  public shoot(): void {
    if (!this.healthSystem.isAlive() || !this.weaponSystem.canFire()) return;
    
    // Ensure weapon system has reference to scene
    if (this.mesh.parent && !this.weaponSystem.scene) {
      this.weaponSystem.setScene(this.mesh.parent);
    }
    
    // Get proper direction from the turret (not the car body)
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.turret.quaternion);
    
    // Get accurate turret position
    const turretPosition = new THREE.Vector3();
    this.turret.getWorldPosition(turretPosition);
    
    // Fire with adjusted position for better visual appearance
    const bullet = this.weaponSystem.fire(
      this.mesh.position.clone(),
      direction,
      turretPosition
    );

    if (bullet) {
      this.bullets.push(bullet);
      
      // Enhanced recoil effect based on bullet type
      const recoilStrength = bullet.getType() === BulletType.MISSILE ? 0.8 : 
                             bullet.getType() === BulletType.EXPLOSIVE ? 0.6 : 0.3;
      
      this.velocity.sub(direction.multiplyScalar(recoilStrength));
      
      // Add subtle rotational recoil for heavier weapons
      if (bullet.getType() === BulletType.MISSILE || bullet.getType() === BulletType.EXPLOSIVE) {
        const randomRecoil = (Math.random() - 0.5) * 0.02;
        this.mesh.rotation.y += randomRecoil;
      }
    }
  }

  public updateBullets(delta: number, terrain: Terrain) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      
      // Update bullet - if it returns false, it's no longer active
      if (!bullet.update(delta)) {
        this.recycleInactiveBullet(bullet);
        this.bullets.splice(i, 1);
        continue;
      }

      // Check terrain collision
      if (terrain.checkCollision(bullet.position)) {
        // Create explosion effect for explosive ammo
        if (bullet.getType() === BulletType.EXPLOSIVE) {
          this.createExplosion(bullet.position.clone());
        }
        this.recycleInactiveBullet(bullet);
        this.bullets.splice(i, 1);
      }
    }
  }
  
  private recycleInactiveBullet(bullet: Bullet): void {
    try {
      // Recycle the bullet through the weapon system
      if (this.weaponSystem) {
        this.weaponSystem.recycleBullet(bullet);
      } else {
        // Fallback if weapon system not available
        if (bullet.mesh.parent) {
          bullet.mesh.parent.remove(bullet.mesh);
        }
        bullet.dispose();
      }
    } catch (error) {
      console.warn("Error recycling bullet:", error);
    }
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