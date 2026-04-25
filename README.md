# Soft Body Simulation

## Run the project

Because the project uses JavaScript modules, you must run it through a local server (not `file://`).

From the project folder:

```bash
python3 -m http.server 8000
```

Then open:

```
http://localhost:8000
```

---

## Project structure

```
project/
  index.html
  main.js
  ShapeFactory.js
  SoftBody.js
  SoftBodyPoint.js
  utils.js
```

---

## Creating shapes

Shapes are generated using `ShapeFactory`.

---

### Circle

```js
ShapeFactory.circle(pointCount, radius);
```

Example:

```js
shape: ShapeFactory.circle(24, 2.5);
```

| Parameter  | Meaning          |
| ---------- | ---------------- |
| pointCount | Number of points |
| radius     | Circle radius    |

---

### Oval

```js
ShapeFactory.oval(pointCount, radiusX, radiusY);
```

Example:

```js
shape: ShapeFactory.oval(24, 2.5, 5);
```

| Parameter  | Meaning           |
| ---------- | ----------------- |
| pointCount | Number of points  |
| radiusX    | Horizontal radius |
| radiusY    | Vertical radius   |

---

### Square

```js
ShapeFactory.square(size, pointsPerEdge);
```

Example:

```js
shape: ShapeFactory.square(4, 8);
```

| Parameter     | Meaning         |
| ------------- | --------------- |
| size          | Width/height    |
| pointsPerEdge | Points per edge |

Total points:

```
4 * pointsPerEdge
```

### Rectangle

```js
ShapeFactory.rectangle(width, height, pointsPerEdge);
```

Example:

```js
shape: ShapeFactory.rectangle(4, 6, 8);
```

| Parameter     | Meaning                   |
| ------------- | ------------------------- |
| width         | Width                     |
| height        | Height                    |
| pointsPerEdge | Points per rectangle edge |

Total points:

```
4 * pointsPerEdge
```

---

### Triangle

```js
ShapeFactory.triangle(radius, smallAngle, pointsPerEdge);
```

Example:

```js
shape: ShapeFactory.triangle(3, 25, 8);
```

| Parameter     | Meaning                              |
| ------------- | ------------------------------------ |
| radius        | Distance from center to corner       |
| smallAngle    | The angle of the top of the triangle |
| pointsPerEdge | Points per edge                      |

Total points:

```
3 * pointsPerEdge
```

---

### Equilateral Triangle

```js
ShapeFactory.triangleEquilateral(radius, pointsPerEdge);
```

Example:

```js
shape: ShapeFactory.triangleEquilateral(3, 8);
```

| Parameter     | Meaning                        |
| ------------- | ------------------------------ |
| radius        | Distance from center to corner |
| pointsPerEdge | Points per edge                |

Total points:

```
3 * pointsPerEdge
```

---

## Creating a soft body

```js
const body = new SoftBody({
  shape: ShapeFactory.circle(24, 2.5),
  center: new THREE.Vector2(0, 4),
  shapeStiffness: 80,
  shapeDamping: 8,
  gravity: new THREE.Vector2(0, -20),
  bounce: 0.5,
  friction: 8,
});
```

Add to scene:

```js
body.addToScene(scene);
```

---

## SoftBody parameters

| Parameter      | Meaning                                | Example                     |
| -------------- | -------------------------------------- | --------------------------- |
| shape          | Shape points                           | `ShapeFactory.circle(...)`  |
| center         | Initial position                       | `new THREE.Vector2(0, 4)`   |
| rotation       | Initial rotation                       | `Math.PI / 4`               |
| shapeStiffness | Shape recovery strength                | `80`                        |
| shapeDamping   | Internal damping                       | `8`                         |
| gravity        | Gravity force                          | `new THREE.Vector2(0, -20)` |
| bounce         | Bounce on walls                        | `0.5`                       |
| friction       | Floor friction                         | `8`                         |
| filled         | Show the body as a filled block ?      | `true`                      |
| fillColor      | The color with which to fill the block | `0xff0000`                  |
| fillOpacity    | The Opacity of the fill color          | `0.5       `                |
| showPoints     | Show the point mesh of the body        | `true`                      |

---

## Tuning

### More rigid

```js
shapeStiffness: 150,
shapeDamping: 15,
```

### More soft / jelly

```js
shapeStiffness: 40,
shapeDamping: 3,
```

### Strong gravity

```js
gravity: new THREE.Vector2(0, -40),
```

### No gravity

```js
gravity: new THREE.Vector2(0, 0),
```

---

## Multiple bodies

```js
const bodies = [
  new SoftBody({
    shape: ShapeFactory.circle(24, 2.5),
    center: new THREE.Vector2(-5, 4),
  }),

  new SoftBody({
    shape: ShapeFactory.square(4, 8),
    center: new THREE.Vector2(0, 4),
  }),

  new SoftBody({
    shape: ShapeFactory.triangle(3, 8),
    center: new THREE.Vector2(5, 4),
  }),
];

for (const body of bodies) {
  body.addToScene(scene);
}
```
