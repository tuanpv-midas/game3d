import * as THREE from 'three';

export class Bullet {
  public mesh: THREE.Mesh;
  public velocity: THREE.Vector3;
  public position: THREE.Vector3;
  public distanceTraveled: number;
  private speed: number;
  private startPosition: THREE.Vector3;

  constructor(position: THREE.Vector3, direction: THREE.Vector3, turretPosition: THREE.Vector3) {
    const geometry = new THREE.SphereGeometry(0.1);
    const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    this.mesh = new THREE.Mesh(geometry, material);
    
    this.position = turretPosition;
    this.mesh.position.copy(this.position);
    this.startPosition = position.clone();
    
    this.speed = 50;
    this.velocity = direction.normalize().multiplyScalar(this.speed);
    this.distanceTraveled = 0;
  }

  public update(delta: number) {
    // Update position
    this.position.add(this.velocity.clone().multiplyScalar(delta));
    this.mesh.position.copy(this.position);
    
    // Calculate distance traveled
    this.distanceTraveled = this.position.distanceTo(this.startPosition);
  }

  public dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
