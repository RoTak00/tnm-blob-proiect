import * as THREE from "three";
import { SoftBody } from "./SoftBody.js";
import { ShapeFactory } from "./ShapeFactory.js";
import { DragController } from "./DragController.js";

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
fpsEl.style.zIndex = "10";
fpsEl.innerText = "FPS: 0";
document.body.appendChild(fpsEl);

const panelEl = document.createElement("div");
panelEl.style.position = "fixed";
panelEl.style.top = "10px";
panelEl.style.right = "10px";
panelEl.style.width = "360px";
panelEl.style.padding = "12px";
panelEl.style.borderRadius = "8px";
panelEl.style.background = "rgba(0,0,0,0.65)";
panelEl.style.color = "#fff";
panelEl.style.fontFamily = "sans-serif";
panelEl.style.fontSize = "12px";
panelEl.style.zIndex = "10";
panelEl.style.display = "grid";
panelEl.style.gap = "8px";
panelEl.style.maxHeight = "calc(100vh - 20px)";
panelEl.style.overflow = "hidden";
document.body.appendChild(panelEl);

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

const SHAPE_CONFIG = {
  circle: {
    builder: (params) => ShapeFactory.circle(params.pointCount, params.radius),
    controls: [
      { key: "pointCount", label: "Point Count", min: 3, max: 128, step: 1 },
      {
        key: "radius",
        label: "Radius",
        min: 0.5,
        max: 10,
        step: 0.05,
      },
    ],
  },
  oval: {
    builder: (params) =>
      ShapeFactory.oval(params.pointCount, params.radiusX, params.radiusY),
    controls: [
      { key: "pointCount", label: "Point Count", min: 3, max: 128, step: 1 },
      {
        key: "radiusX",
        label: "Horizontal Radius",
        min: 0.5,
        max: 10,
        step: 0.1,
      },
      {
        key: "radiusY",
        label: "Vertical Radius",
        min: 0.5,
        max: 10,
        step: 0.1,
      },
    ],
  },
  square: {
    builder: (params) => ShapeFactory.square(params.size, params.pointsPerEdge),
    controls: [
      { key: "size", label: "Width", min: 1, max: 10, step: 0.1 },
      {
        key: "pointsPerEdge",
        label: "Points per Edge",
        min: 1,
        max: 64,
        step: 1,
      },
    ],
  },
  rectangle: {
    builder: (params) =>
      ShapeFactory.rectangle(params.width, params.height, params.pointsPerEdge),
    controls: [
      { key: "width", label: "Width", min: 1, max: 10, step: 0.1 },
      { key: "height", label: "Height", min: 1, max: 10, step: 0.1 },
      {
        key: "pointsPerEdge",
        label: "Points per Edge",
        min: 1,
        max: 64,
        step: 1,
      },
    ],
  },
  triangle: {
    builder: (params) =>
      ShapeFactory.triangle(
        params.height,
        params.smallAngleDeg,
        params.pointsPerEdge,
      ),
    controls: [
      {
        key: "height",
        label: "Height",
        min: 1,
        max: 10,
        step: 0.1,
      },
      {
        key: "smallAngleDeg",
        label: "Tip Angle",
        min: 2,
        max: 178,
        step: 1,
      },
      {
        key: "pointsPerEdge",
        label: "Points per Edge",
        min: 1,
        max: 64,
        step: 1,
      },
    ],
  },
};

const COMMON_CONTROLS = [
  { key: "rotation", label: "Rotation", min: -3.14, max: 3.14, step: 0.01 },
  {
    key: "shapeStiffness",
    label: "Stiffness",
    min: 5,
    max: 1000,
    step: 1,
  },
  { key: "shapeDamping", label: "Damping", min: 1, max: 30, step: 0.1 },
  { key: "bounce", label: "Bounce", min: 0, max: 1.2, step: 0.01 },
  { key: "friction", label: "Friction", min: 0, max: 100, step: 0.5 },
  { key: "gravityY", label: "Gravity", min: -60, max: 0, step: 0.5 },
];

const controlState = {
  selectedShape: "circle",
  simulationSpeed: 1,
  shapeParams: {
    circle: { pointCount: 24, radius: 4 },
    oval: { pointCount: 24, radiusX: 3, radiusY: 5 },
    square: { size: 6, pointsPerEdge: 8 },
    rectangle: { width: 6, height: 4, pointsPerEdge: 8 },
    triangle: { height: 5, smallAngleDeg: 35, pointsPerEdge: 8 },
  },
  common: {
    rotation: Math.PI / 4,
    shapeStiffness: 150,
    shapeDamping: 8,
    bounce: 0.5,
    friction: 35,
    gravityY: -20,
    filled: true,
    fillColor: "#ffaa33",
  },
};

let bodies = [];
let dynamicControlsContainer = null;

function createBody(shapeKey) {
  const shapeConfig = SHAPE_CONFIG[shapeKey];
  const shapeParams = controlState.shapeParams[shapeKey];

  return new SoftBody({
    shape: shapeConfig.builder(shapeParams),
    rotation: controlState.common.rotation,
    center: new THREE.Vector2(0, 0),
    shapeStiffness: controlState.common.shapeStiffness,
    shapeDamping: controlState.common.shapeDamping,
    gravity: new THREE.Vector2(0, controlState.common.gravityY),
    bounce: controlState.common.bounce,
    friction: controlState.common.friction,
    filled: controlState.common.filled,
    showPoints: !controlState.common.filled,
    fillColor: controlState.common.fillColor,
    fillOpacity: controlState.common.filled ? 0.8 : 0,
  });
}

function resetBody() {
  for (const body of bodies) {
    scene.remove(body.line);
    scene.remove(body.pointMesh);
    scene.remove(body.fillMesh);
  }

  const newBody = createBody(controlState.selectedShape);
  bodies = [newBody];

  for (const body of bodies) {
    body.addToScene(scene);
  }
}

function createControl(labelText, initialValue, min, max, step, onInput) {
  const wrapper = document.createElement("label");
  wrapper.style.display = "grid";
  wrapper.style.gap = "4px";

  const top = document.createElement("div");
  top.style.display = "flex";
  top.style.justifyContent = "space-between";
  top.style.alignItems = "center";
  top.style.gap = "8px";

  const label = document.createElement("span");
  label.innerText = labelText;

  const numberInput = document.createElement("input");
  numberInput.type = "number";
  numberInput.min = String(min);
  numberInput.max = String(max);
  numberInput.step = String(step);
  numberInput.value = String(initialValue);
  numberInput.style.width = "72px";
  numberInput.style.background = "#1e1e1e";
  numberInput.style.color = "#fff";
  numberInput.style.border = "1px solid #666";
  numberInput.style.borderRadius = "4px";
  numberInput.style.padding = "2px 4px";
  numberInput.style.fontSize = "12px";

  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(initialValue);

  function applyValue(rawValue) {
    let numeric = Number(rawValue);

    if (!Number.isFinite(numeric)) return;

    input.value = String(numeric);
    numberInput.value = String(numeric);

    onInput(numeric);
  }

  input.addEventListener("input", () => {
    applyValue(input.value);
  });

  numberInput.addEventListener("change", () => {
    applyValue(numberInput.value);
  });

  numberInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      numberInput.blur();
    }
  });

  top.appendChild(label);
  top.appendChild(numberInput);
  wrapper.appendChild(top);
  wrapper.appendChild(input);

  return wrapper;
}

function createCheckboxControl(labelText, initialValue, onInput) {
  const wrapper = document.createElement("label");
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.justifyContent = "space-between";
  wrapper.style.gap = "8px";

  const label = document.createElement("span");
  label.innerText = labelText;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = Boolean(initialValue);
  input.addEventListener("change", () => {
    onInput(input.checked);
  });

  wrapper.appendChild(label);
  wrapper.appendChild(input);
  return wrapper;
}

function createColorControl(labelText, initialValue, onInput) {
  const wrapper = document.createElement("label");
  wrapper.style.display = "grid";
  wrapper.style.gap = "4px";

  const label = document.createElement("span");
  label.innerText = labelText;

  const input = document.createElement("input");
  input.type = "color";
  input.value = initialValue;
  input.style.width = "100%";
  input.style.height = "28px";
  input.style.border = "1px solid #666";
  input.style.borderRadius = "4px";
  input.style.background = "#1e1e1e";
  input.addEventListener("input", () => {
    onInput(input.value);
  });

  wrapper.appendChild(label);
  wrapper.appendChild(input);
  return wrapper;
}

function createLiveMetric(labelText, initialValue = 0) {
  return {
    labelText,
    currentValue: Number(initialValue),
    valueCell: null,
    setValue(numeric) {
      this.currentValue = Number(numeric);
      if (this.valueCell) {
        this.valueCell.innerText = this.currentValue.toFixed(2);
      }
    },
  };
}

const liveMetrics = {
  speed: null,
  forta: null,
  stress: null,
  panic: null,
};

function getLiveStatsForMusic() {
  const body = bodies[0];
  if (!body) {
    return { speed: 0, forta: 0, stress: 0, panic: 0 };
  }

  const speed = body.stats.speed;
  const forta = body.stats.force;
  const stress = body.stats.stress;
  const panic = body.stats.panic;

  return { speed, forta, stress, panic };
}

function publishMusicParams() {
  const live = getLiveStatsForMusic();
  const payload = {
    object: controlState.selectedShape,
    speed: live.speed,
    forta: live.forta,
    stress: live.stress,
    panic: live.panic,
  };

  window.musicParams = payload;
  window.dispatchEvent(new CustomEvent("music-params", { detail: payload }));

  if (
    liveMetrics.speed &&
    liveMetrics.forta &&
    liveMetrics.stress &&
    liveMetrics.panic
  ) {
    liveMetrics.speed.setValue(live.speed);
    liveMetrics.forta.setValue(live.forta);
    liveMetrics.stress.setValue(live.stress);
    liveMetrics.panic.setValue(live.panic);
  }
}

function rebuildDynamicControls() {
  dynamicControlsContainer.innerHTML = "";

  const shapeTitle = document.createElement("div");
  shapeTitle.style.fontWeight = "700";
  shapeTitle.innerText = "Shape Parameters";
  shapeTitle.style.gridColumn = "1 / -1";
  dynamicControlsContainer.appendChild(shapeTitle);

  const shapeControls = SHAPE_CONFIG[controlState.selectedShape].controls;
  for (const cfg of shapeControls) {
    dynamicControlsContainer.appendChild(
      createControl(
        cfg.label,
        controlState.shapeParams[controlState.selectedShape][cfg.key],
        cfg.min,
        cfg.max,
        cfg.step,
        (value) => {
          controlState.shapeParams[controlState.selectedShape][cfg.key] = value;
          resetBody();
          publishMusicParams();
        },
      ),
    );
  }

  const commonTitle = document.createElement("div");
  commonTitle.style.fontWeight = "700";
  commonTitle.innerText = "Common Parameters";
  commonTitle.style.gridColumn = "1 / -1";
  dynamicControlsContainer.appendChild(commonTitle);

  dynamicControlsContainer.appendChild(
    createControl(
      "Simulation Speed",
      controlState.simulationSpeed,
      0.2,
      3,
      0.01,
      (value) => {
        controlState.simulationSpeed = value;
      },
    ),
  );

  for (const cfg of COMMON_CONTROLS) {
    dynamicControlsContainer.appendChild(
      createControl(
        cfg.label,
        controlState.common[cfg.key],
        cfg.min,
        cfg.max,
        cfg.step,
        (value) => {
          controlState.common[cfg.key] = value;
          resetBody();
          publishMusicParams();
        },
      ),
    );
  }

  const filledControl = createCheckboxControl(
    "Filled",
    controlState.common.filled,
    (value) => {
      controlState.common.filled = value;
      resetBody();
      rebuildDynamicControls();
      publishMusicParams();
    },
  );
  filledControl.style.gridColumn = "1 / -1";
  dynamicControlsContainer.appendChild(filledControl);

  if (controlState.common.filled) {
    const fillColorControl = createColorControl(
      "Body Colour",
      controlState.common.fillColor,
      (value) => {
        controlState.common.fillColor = value;
        resetBody();
        publishMusicParams();
      },
    );
    fillColorControl.style.gridColumn = "1 / -1";
    dynamicControlsContainer.appendChild(fillColorControl);
  }
}

function createControlPanel() {
  const title = document.createElement("div");
  title.innerText = "Control Panel";
  title.style.fontWeight = "700";
  panelEl.appendChild(title);

  const objectLabel = document.createElement("label");
  objectLabel.style.display = "grid";
  objectLabel.style.gap = "4px";
  objectLabel.innerText = "Blob Type";

  const objectSelect = document.createElement("select");
  objectSelect.style.padding = "4px";
  objectSelect.style.borderRadius = "4px";
  objectSelect.style.border = "1px solid #666";
  objectSelect.style.background = "#1e1e1e";
  objectSelect.style.color = "#fff";

  for (const key of Object.keys(SHAPE_CONFIG)) {
    const option = document.createElement("option");
    option.value = key;
    option.innerText = key;
    objectSelect.appendChild(option);
  }

  objectSelect.value = controlState.selectedShape;
  objectSelect.addEventListener("change", () => {
    controlState.selectedShape = objectSelect.value;
    resetBody();
    rebuildDynamicControls();
    publishMusicParams();
  });

  objectLabel.appendChild(objectSelect);
  panelEl.appendChild(objectLabel);

  const resetBtn = document.createElement("button");
  resetBtn.innerText = "Reset";
  resetBtn.style.padding = "6px 8px";
  resetBtn.style.borderRadius = "4px";
  resetBtn.style.border = "1px solid #666";
  resetBtn.style.background = "#292929";
  resetBtn.style.color = "#fff";
  resetBtn.style.cursor = "pointer";
  resetBtn.addEventListener("click", () => {
    resetBody();
    publishMusicParams();
  });
  panelEl.appendChild(resetBtn);

  liveMetrics.speed = createLiveMetric("Speed", 0);
  liveMetrics.forta = createLiveMetric("Force", 0);
  liveMetrics.stress = createLiveMetric("Stress", 0);
  liveMetrics.panic = createLiveMetric("Panic", 0);

  const liveTableTitle = document.createElement("div");
  liveTableTitle.style.fontWeight = "700";
  liveTableTitle.innerText = "Feedback Metrics";
  panelEl.appendChild(liveTableTitle);

  const liveTable = document.createElement("table");
  liveTable.style.width = "100%";
  liveTable.style.borderCollapse = "collapse";
  liveTable.style.background = "rgba(255,255,255,0.04)";
  liveTable.style.border = "1px solid rgba(255,255,255,0.2)";

  const liveMetricsArray = [
    liveMetrics.speed,
    liveMetrics.forta,
    liveMetrics.stress,
    liveMetrics.panic,
  ];

  for (const metric of liveMetricsArray) {
    const row = document.createElement("tr");
    row.style.borderBottom = "1px solid rgba(255,255,255,0.14)";

    const labelCell = document.createElement("td");
    labelCell.innerText = metric.labelText;
    labelCell.style.padding = "6px 8px";

    const valueCell = document.createElement("td");
    valueCell.innerText = metric.currentValue.toFixed(2);
    valueCell.style.padding = "6px 8px";
    valueCell.style.textAlign = "right";
    valueCell.style.fontFamily = "monospace";

    metric.valueCell = valueCell;

    row.appendChild(labelCell);
    row.appendChild(valueCell);
    liveTable.appendChild(row);
  }

  panelEl.appendChild(liveTable);

  const controlsTableTitle = document.createElement("div");
  controlsTableTitle.style.fontWeight = "700";
  controlsTableTitle.style.marginTop = "4px";
  controlsTableTitle.innerText = "Parameter Table";
  panelEl.appendChild(controlsTableTitle);

  const controlsTable = document.createElement("div");
  controlsTable.style.background = "rgba(255,255,255,0.04)";
  controlsTable.style.border = "1px solid rgba(255,255,255,0.2)";
  controlsTable.style.borderRadius = "4px";
  controlsTable.style.padding = "8px";
  controlsTable.style.display = "grid";
  controlsTable.style.gap = "6px";
  panelEl.appendChild(controlsTable);

  dynamicControlsContainer = document.createElement("div");
  dynamicControlsContainer.style.display = "grid";
  dynamicControlsContainer.style.gridTemplateColumns = "1fr 1fr";
  dynamicControlsContainer.style.gap = "6px 10px";
  controlsTable.appendChild(dynamicControlsContainer);

  const musicControl = createCheckboxControl("Music", musicEnabled, (value) => {
    setMusicEnabled(value);
  });

  musicControl.style.gridColumn = "1 / -1";
  panelEl.appendChild(musicControl);

  rebuildDynamicControls();
}

function resetMusic() {
  if (!musicLoaded) return;

  if (bgMusic.isPlaying) {
    bgMusic.stop();
  }

  if (musicEnabled) {
    bgMusic.play();
  }
}

function setMusicEnabled(enabled) {
  musicEnabled = enabled;

  if (!musicLoaded) return;

  if (musicEnabled) {
    if (!bgMusic.isPlaying) {
      bgMusic.play();
    }
  } else {
    if (bgMusic.isPlaying) {
      bgMusic.stop();
    }
  }
}

const listener = new THREE.AudioListener();
camera.add(listener);

const bgMusic = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();

let musicEnabled = false;
let musicLoaded = false;

audioLoader.load("/music/pd_music.wav", function (buffer) {
  bgMusic.setBuffer(buffer);
  bgMusic.setLoop(true);
  bgMusic.setVolume(0.5);
  musicLoaded = true;
});

createControlPanel();

resetBody();
publishMusicParams();

const dragController = new DragController();

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
  const subDt = (dt * controlState.simulationSpeed) / substeps;

  for (let i = 0; i < substeps; i++) {
    for (const body of bodies) {
      body.resetForces();
      body.addShapeMatchingForce();
    }

    dragController.apply();

    for (const body of bodies) {
      body.integrate(subDt);
      body.applyShapeDamping(subDt);
      body.solveWallCollisions(bounds, subDt);
      body.updateStats(subDt);
    }
  }

  for (const body of bodies) {
    body.updateVisual();
  }

  publishMusicParams();

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);

function getMouseWorld(event) {
  const rect = renderer.domElement.getBoundingClientRect();

  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  const world = new THREE.Vector3(x, y, 0).unproject(camera);

  return new THREE.Vector2(world.x, world.y);
}

renderer.domElement.addEventListener("pointerdown", (event) => {
  const world = getMouseWorld(event);
  dragController.begin(bodies, new THREE.Vector2(world.x, world.y));
});

renderer.domElement.addEventListener("pointermove", (event) => {
  const world = getMouseWorld(event);
  dragController.move(new THREE.Vector2(world.x, world.y));
});

renderer.domElement.addEventListener("pointerup", () => {
  dragController.end();
});

renderer.domElement.addEventListener("pointerleave", () => {
  dragController.end();
});
