import * as THREE from "three";

export class ShapeFactory {
  static circle(pointCount = 24, radius = 3) {
    return this.oval(pointCount, radius, radius);
  }

  static triangleEquilateral(radius = 3, pointsPerEdge = 8) {
    return this.triangle(radius, 60, pointsPerEdge);
  }

  static square(size = 5, pointsPerEdge = 8) {
    return this.rectangle(size, size, pointsPerEdge);
  }

  static rectangle(width = 6, height = 3, pointsPerEdge = 8) {
    const w = width / 2;
    const h = height / 2;

    const vertices = [
      new THREE.Vector2(-w, -h),
      new THREE.Vector2(w, -h),
      new THREE.Vector2(w, h),
      new THREE.Vector2(-w, h),
    ];

    return this.samplePolygon(vertices, pointsPerEdge);
  }

  static oval(pointCount = 32, radiusX = 4, radiusY = 2) {
    const points = [];

    for (let i = 0; i < pointCount; i++) {
      const angle = (i / pointCount) * Math.PI * 2;

      points.push(
        new THREE.Vector2(Math.cos(angle) * radiusX, Math.sin(angle) * radiusY),
      );
    }

    return points;
  }

  static triangle(height = 5, smallAngleDeg = 35, pointsPerEdge = 8) {
    const halfAngle = THREE.MathUtils.degToRad(smallAngleDeg / 2);
    const halfBase = Math.tan(halfAngle) * height;

    const centroidOffsetY = height / 3;

    const vertices = [
      new THREE.Vector2(0, height - centroidOffsetY),
      new THREE.Vector2(halfBase, -centroidOffsetY),
      new THREE.Vector2(-halfBase, -centroidOffsetY),
    ];

    return this.samplePolygon(vertices, pointsPerEdge);
  }

  static samplePolygon(vertices, pointsPerEdge = 8) {
    const points = [];

    for (let i = 0; i < vertices.length; i++) {
      const a = vertices[i];
      const b = vertices[(i + 1) % vertices.length];

      for (let j = 0; j < pointsPerEdge; j++) {
        const t = j / pointsPerEdge;

        points.push(
          new THREE.Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t),
        );
      }
    }

    return points;
  }
}
