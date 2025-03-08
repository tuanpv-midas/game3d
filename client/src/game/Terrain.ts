import * as THREE from 'three';

export class Terrain {
  public mesh: THREE.Group;
  private obstacles: THREE.Mesh[];

  constructor() {
    this.mesh = new THREE.Group();
    this.obstacles = [];

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
    const groundMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x55aa55,
      side: THREE.DoubleSide 
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.mesh.add(ground);

    // Add random obstacles
    this.addObstacles();
  }

  private addObstacles() {
    // Add various obstacles
    for (let i = 0; i < 20; i++) {
      const size = 2 + Math.random() * 4;
      const height = 2 + Math.random() * 6;
      
      const geometry = new THREE.BoxGeometry(size, height, size);
      const material = new THREE.MeshPhongMaterial({ color: 0x808080 });
      const obstacle = new THREE.Mesh(geometry, material);
      
      // Random position (-100 to 100)
      obstacle.position.set(
        (Math.random() - 0.5) * 200,
        height / 2,
        (Math.random() - 0.5) * 200
      );
      
      obstacle.castShadow = true;
      obstacle.receiveShadow = true;
      
      this.obstacles.push(obstacle);
      this.mesh.add(obstacle);
    }
  }

  public checkCollision(position: THREE.Vector3): boolean {
    // Simple collision check with obstacles
    for (const obstacle of this.obstacles) {
      const bounds = new THREE.Box3().setFromObject(obstacle);
      if (bounds.containsPoint(position)) {
        return true;
      }
    }
    return false;
  }
}
