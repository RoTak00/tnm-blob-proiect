import * as THREE from "three";
import { SoftBodyPoint } from "./SoftBodyPoint.js";
import { ShapeFactory } from "./ShapeFactory.js";
import { cross2D } from "./utils.js";

export class SoftBody {
  constructor(options = {}) {
    this.center = options.center ?? new THREE.Vector2(0, 0);
    this.shape = options.shape ?? ShapeFactory.circle();

    this.shapeStiffness = options.shapeStiffness ?? 150;
    this.gravity = options.gravity ?? new THREE.Vector2(0, -20);
    this.bounce = options.bounce ?? 0.8;
    this.friction = options.friction ?? 35;

    this.points = [];
    this.positions = new Float32Array(this.shape.length * 3);

    this.shapeDamping = options.shapeDamping ?? 8;

    this.rotation = options.rotation ?? 0; // radians

    this.filled = options.filled ?? false;
    this.fillColor = options.fillColor ?? 0xffffff;
    this.fillOpacity = options.fillOpacity ?? 1;

    this.showPoints = options.showPoints ?? true;

    this.panicWindow = options.panicWindow ?? 3;

    this.stats = {
      speed: 0,
      force: 0,
      stress: 0,
      panic: 0,
    };

    this.panicSamples = [];

    this.createPoints();
    this.createObjects();
    this.updateVisual();
  }

  createPoints() {
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);

    for (const local of this.shape) {
      // rotate local shape
      const rotatedLocal = new THREE.Vector2(
        local.x * cos - local.y * sin,
        local.x * sin + local.y * cos,
      );

      const position = new THREE.Vector2().addVectors(
        this.center,
        rotatedLocal,
      );

      this.points.push(new SoftBodyPoint(position, rotatedLocal));
    }
  }

  createObjects() {
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3),
    );

    this.line = new THREE.LineLoop(
      this.geometry,
      new THREE.LineBasicMaterial({ color: 0xffffff }),
    );

    this.pointGeometry = new THREE.BufferGeometry();
    this.pointGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3),
    );

    this.pointMesh = new THREE.Points(
      this.pointGeometry,
      new THREE.PointsMaterial({
        color: 0xffaa33,
        size: 8,
        sizeAttenuation: false,
      }),
    );

    this.fillGeometry = new THREE.BufferGeometry();

    const fillIndices = [];
    const triangles = THREE.ShapeUtils.triangulateShape(this.shape, []);
    for (const tri of triangles) {
      fillIndices.push(tri[0], tri[1], tri[2]);
    }

    this.fillGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3),
    );

    this.fillGeometry.setIndex(fillIndices);

    this.fillMesh = new THREE.Mesh(
      this.fillGeometry,
      new THREE.MeshBasicMaterial({
        color: this.fillColor,
        transparent: true,
        opacity: this.fillOpacity,
        side: THREE.DoubleSide,
      }),
    );
  }

  addToScene(scene) {
    if (this.filled) {
      scene.add(this.fillMesh);
    }

    scene.add(this.line);
    if (this.showPoints) {
      scene.add(this.pointMesh);
    }
  }

  resetForces() {
    for (const point of this.points) {
      point.force.set(0, 0);
    }
  }

  getCenterOfMass() {
    const center = new THREE.Vector2(0, 0);

    for (const point of this.points) {
      center.add(point.position);
    }

    return center.divideScalar(this.points.length);
  }

  addShapeMatchingForce() {
    const center = this.getCenterOfMass();

    let dotSum = 0;
    let crossSum = 0;

    for (const point of this.points) {
      const r = new THREE.Vector2().subVectors(point.position, center);
      const q = point.original;

      dotSum += r.dot(q);
      crossSum += cross2D(r, q);
    }

    const angle = -Math.atan2(crossSum, dotSum);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    for (const point of this.points) {
      const q = point.original;

      const rotated = new THREE.Vector2(
        q.x * cos - q.y * sin,
        q.x * sin + q.y * cos,
      );

      const target = new THREE.Vector2().addVectors(center, rotated);
      const delta = new THREE.Vector2().subVectors(target, point.position);

      point.force.addScaledVector(delta, this.shapeStiffness);
    }
  }

  integrate(dt) {
    for (const point of this.points) {
      point.force.addScaledVector(this.gravity, point.mass);

      const acceleration = point.force.clone().divideScalar(point.mass);

      point.velocity.addScaledVector(acceleration, dt);
      point.position.addScaledVector(point.velocity, dt);
    }
  }

  solveWallCollisions(bounds, dt) {
    for (const point of this.points) {
      if (point.position.x < bounds.left) {
        point.position.x = bounds.left;
        if (point.velocity.x < 0) point.velocity.x *= -this.bounce;
      }

      if (point.position.x > bounds.right) {
        point.position.x = bounds.right;
        if (point.velocity.x > 0) point.velocity.x *= -this.bounce;
      }

      if (point.position.y < bounds.bottom) {
        point.position.y = bounds.bottom;

        if (point.velocity.y < 0) {
          point.velocity.y *= -this.bounce;
          point.velocity.x *= Math.exp(-this.friction * dt);
        }
      }

      if (point.position.y > bounds.top) {
        point.position.y = bounds.top;
        if (point.velocity.y > 0) point.velocity.y *= -this.bounce;
      }
    }
  }

  applyShapeDamping(dt) {
    const center = this.getCenterOfMass();

    const centerVelocity = new THREE.Vector2(0, 0);

    for (const point of this.points) {
      centerVelocity.add(point.velocity);
    }

    centerVelocity.divideScalar(this.points.length);

    let angularVelocityNumerator = 0;
    let angularVelocityDenominator = 0;

    for (const point of this.points) {
      const r = new THREE.Vector2().subVectors(point.position, center);
      const relativeVelocity = new THREE.Vector2().subVectors(
        point.velocity,
        centerVelocity,
      );

      angularVelocityNumerator += cross2D(r, relativeVelocity);
      angularVelocityDenominator += r.lengthSq();
    }

    if (angularVelocityDenominator === 0) return;

    const angularVelocity =
      angularVelocityNumerator / angularVelocityDenominator;

    const dampingFactor = 1 - Math.exp(-this.shapeDamping * dt);

    for (const point of this.points) {
      const r = new THREE.Vector2().subVectors(point.position, center);

      const rotationalVelocity = new THREE.Vector2(
        -angularVelocity * r.y,
        angularVelocity * r.x,
      );

      const targetVelocity = new THREE.Vector2().addVectors(
        centerVelocity,
        rotationalVelocity,
      );

      point.velocity.lerp(targetVelocity, dampingFactor);
    }
  }

  updateVisual() {
    for (let i = 0; i < this.points.length; i++) {
      const index = i * 3;
      const position = this.points[i].position;

      this.positions[index] = position.x;
      this.positions[index + 1] = position.y;
      this.positions[index + 2] = 0;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.pointGeometry.attributes.position.needsUpdate = true;
    this.fillGeometry.attributes.position.needsUpdate = true;
  }

  computeSpeed() {
    const centerVelocity = new THREE.Vector2(0, 0);

    for (const point of this.points) {
      centerVelocity.add(point.velocity);
    }

    centerVelocity.divideScalar(this.points.length);

    return centerVelocity.length();
  }
  computeForce() {
    let totalForce = 0;

    for (const point of this.points) {
      totalForce += point.force.length();
    }

    return totalForce / this.points.length;
  }

  computeStress() {
    const center = this.getCenterOfMass();

    let dotSum = 0;
    let crossSum = 0;

    for (const point of this.points) {
      const r = new THREE.Vector2().subVectors(point.position, center);
      const q = point.original;

      dotSum += r.dot(q);
      crossSum += cross2D(r, q);
    }

    const angle = -Math.atan2(crossSum, dotSum);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    let totalError = 0;
    let totalReference = 0;

    for (const point of this.points) {
      const q = point.original;

      const rotated = new THREE.Vector2(
        q.x * cos - q.y * sin,
        q.x * sin + q.y * cos,
      );

      const target = new THREE.Vector2().addVectors(center, rotated);

      totalError += point.position.distanceTo(target);
      totalReference += q.length();
    }

    return totalError / Math.max(totalReference, 0.0001);
  }

  updateStats(dt) {
    this.stats.speed = this.computeSpeed();
    this.stats.force = this.computeForce();
    this.stats.stress = this.computeStress();

    const instantPanic =
      this.stats.speed + this.stats.force + this.stats.stress;

    this.panicSamples.push({
      age: 0,
      value: instantPanic,
    });

    let panicSum = 0;

    for (const sample of this.panicSamples) {
      sample.age += dt;
    }

    this.panicSamples = this.panicSamples.filter(
      (sample) => sample.age <= this.panicWindow,
    );

    for (const sample of this.panicSamples) {
      panicSum += sample.value;
    }

    this.stats.panic = panicSum / Math.max(this.panicSamples.length, 1);
  }
}
