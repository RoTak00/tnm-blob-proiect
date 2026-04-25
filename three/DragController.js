import * as THREE from "three";

export class DragController {
  constructor(options = {}) {
    this.stiffness = options.stiffness ?? 250;
    this.damping = options.damping ?? 25;
    this.maxDistance = options.maxDistance ?? 3;
    this.affectedRange = options.affectedRange ?? 7;

    this.active = false;
    this.body = null;
    this.pointIndex = -1;
    this.mouseWorld = new THREE.Vector2();
  }

  begin(bodies, mouseWorld) {
    const hit = this.findClosestBodyPoint(bodies, mouseWorld);

    if (!hit.body) return;

    this.active = true;
    this.body = hit.body;
    this.pointIndex = hit.pointIndex;
    this.mouseWorld.copy(mouseWorld);
  }

  move(mouseWorld) {
    if (!this.active) return;
    this.mouseWorld.copy(mouseWorld);
  }

  end() {
    this.active = false;
    this.body = null;
    this.pointIndex = -1;
  }

  apply() {
    if (!this.active || !this.body || this.pointIndex < 0) return;

    const points = this.body.points;
    const count = points.length;

    const affectedRange = Math.min(this.affectedRange, Math.floor(count / 5)); // points on each side

    for (let offset = -affectedRange; offset <= affectedRange; offset++) {
      const index = (this.pointIndex + offset + count) % count;
      const point = points[index];

      const distanceFromGrab = Math.abs(offset);
      const weight = 1 - distanceFromGrab / (affectedRange + 1);

      const delta = new THREE.Vector2().subVectors(
        this.mouseWorld,
        point.position,
      );

      point.force.addScaledVector(delta, this.stiffness * weight);
      point.force.addScaledVector(point.velocity, -this.damping * weight);
    }
  }

  findClosestBodyPoint(bodies, mouseWorld) {
    let closestBody = null;
    let closestPointIndex = -1;
    let closestDistanceSq = this.maxDistance * this.maxDistance;

    for (const body of bodies) {
      for (let i = 0; i < body.points.length; i++) {
        const distanceSq =
          body.points[i].position.distanceToSquared(mouseWorld);

        if (distanceSq < closestDistanceSq) {
          closestDistanceSq = distanceSq;
          closestBody = body;
          closestPointIndex = i;
        }
      }
    }

    return {
      body: closestBody,
      pointIndex: closestPointIndex,
    };
  }
}
