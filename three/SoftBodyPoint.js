import * as THREE from "three";

export class SoftBodyPoint {
  constructor(position, original) {
    this.position = position.clone();
    this.original = original.clone();

    this.velocity = new THREE.Vector2(0, 0);
    this.force = new THREE.Vector2(0, 0);

    this.mass = 1;
  }
}
