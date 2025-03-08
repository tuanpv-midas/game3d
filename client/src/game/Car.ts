import * as THREE from 'three';
import { Bullet } from './Bullet';
import { Terrain } from './Terrain';

export class Car {
  public mesh: THREE.Group;
  private body: THREE.Mesh;
  private wheels: THREE.Mesh[];
  private turret: THREE.Mesh;
  private bullets: Bullet[];

  public velocity: THREE.Vector3;
  public acceleration: number;
  public maxSpeed: number;
  public turnSpeed: number;

  constructor() {
    this.mesh = new THREE.Group();
    this.bullets = [];

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
    this.acceleration = 10;
    this.maxSpeed = 20;
    this.turnSpeed = 2;
  }

  public update(delta: number) {
    // Apply velocity to position
    this.mesh.position.add(this.velocity.clone().multiplyScalar(delta));

    // Apply friction
    this.velocity.multiplyScalar(0.95);
  }

  public shoot() {
    const bullet = new Bullet(
      this.mesh.position.clone(),
      this.mesh.getWorldDirection(new THREE.Vector3()),
      this.turret.getWorldPosition(new THREE.Vector3())
    );
    this.bullets.push(bullet);
  }

  public updateBullets(delta: number, terrain: Terrain) {
    this.bullets = this.bullets.filter(bullet => {
      bullet.update(delta);

      // Check terrain collision
      if (terrain.checkCollision(bullet.position)) {
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

  public dispose() {
    this.bullets.forEach(bullet => bullet.dispose());
    this.bullets = [];
  }
}