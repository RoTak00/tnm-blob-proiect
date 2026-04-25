import * as THREE from "three";

export class ShapeFactory {
  static circle(pointCount = 24, radius = 3) {
    const points = [];

    for (let i = 0; i < pointCount; i++) {
      const angle = (i / pointCount) * Math.PI * 2;

      points.push(
        new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius),
      );
    }

    return points;
  }

  static triangle(radius = 3, pointsPerEdge = 8) {
    const vertices = this.circle(3, radius);
    return this.samplePolygon(vertices, pointsPerEdge);
  }

  static square(size = 5, pointsPerEdge = 8) {
    const h = size / 2;

    const vertices = [
      new THREE.Vector2(-h, -h),
      new THREE.Vector2(h, -h),
      new THREE.Vector2(h, h),
      new THREE.Vector2(-h, h),
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
