import * as THREE from "three";
import { SoftBody } from "./SoftBody.js";
import { ShapeFactory } from "./ShapeFactory.js";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const fpsEl = document.createElement("div");
fpsEl.style.position = "fixed";
fpsEl.style.top = "10px";
fpsEl.style.left = "10px";
fpsEl.style.color = "#fff";
fpsEl.style.fontFamily = "monospace";
fpsEl.style.fontSize = "14px";
fpsEl.style.background = "rgba(0,0,0,0.5)";
fpsEl.style.padding = "4px 8px";
fpsEl.style.borderRadius = "4px";
fpsEl.innerText = "FPS: 0";
document.body.appendChild(fpsEl);

const scene = new THREE.Scene();

const viewHeight = 20;
const aspect = window.innerWidth / window.innerHeight;

const camera = new THREE.OrthographicCamera(
  (-viewHeight * aspect) / 2,
  (viewHeight * aspect) / 2,
  viewHeight / 2,
  -viewHeight / 2,
  0.1,
  100,
);

camera.position.z = 10;

const bodies = [
  new SoftBody({
    shape: ShapeFactory.oval(64, 3, 5),
    rotation: Math.PI / 4,
    center: new THREE.Vector2(-5, 4),
    shapeStiffness: 300,
    bounce: 0.9,
    filled: true,
    fillColor: 0xff0000,
    showPoints: false,
  }),
];

for (const body of bodies) {
  body.addToScene(scene);
}

window.addEventListener("resize", () => {
  const aspect = window.innerWidth / window.innerHeight;

  camera.left = (-viewHeight * aspect) / 2;
  camera.right = (viewHeight * aspect) / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

let lastTime = performance.now();
let fps = 0;
let frames = 0;
let fpsTime = 0;

function animate(now) {
  requestAnimationFrame(animate);

  let dt = (now - lastTime) / 1000;
  lastTime = now;

  frames++;
  fpsTime += dt;

  if (fpsTime >= 0.5) {
    fps = frames / fpsTime;
    fpsEl.innerText = "FPS: " + fps.toFixed(1);

    frames = 0;
    fpsTime = 0;
  }

  dt = Math.min(dt, 0.033);

  const bounds = {
    left: camera.left,
    right: camera.right,
    bottom: camera.bottom,
    top: camera.top,
  };

  const substeps = 4;
  const subDt = dt / substeps;

  for (let i = 0; i < substeps; i++) {
    for (const body of bodies) {
      body.update(subDt, bounds);
    }
  }

  for (const body of bodies) {
    body.updateVisual();
  }

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);
