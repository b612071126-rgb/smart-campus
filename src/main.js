import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

/* =========================================================
   SQIST FUTURE CAMPUS
   Mobile-friendly particle campus
   Modes: AI / Digital Twin / Green Energy / Smart Transport
========================================================= */

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const stage = $("#stage");
const errorBox = $("#loadError");

if (!stage) {
  throw new Error("找不到 #stage，请检查 index.html");
}

const isMobile = matchMedia("(max-width: 760px)").matches;

const CONFIG = {
  // 手机端优先保证流畅度
  buildingParticles: isMobile ? 22000 : 36000,
  groundParticles: isMobile ? 7000 : 12000,
  stars: isMobile ? 1000 : 1800,
  pixelRatio: Math.min(devicePixelRatio || 1, isMobile ? 1.35 : 1.8)
};

const MODES = {
  ai: {
    index: "01",
    name: "AI 智慧教学",
    metric: "AI",
    detail: "INTELLIGENT EDUCATION",
    color: new THREE.Color("#47dfff"),
    secondary: new THREE.Color("#a1f5ff"),
    background: new THREE.Color("#031226"),
    message: "正在感知：教学空间与学习资源",
    response: "数据流连接教学中心，智能节点正在响应",
    speed: 1.35
  },

  manage: {
    index: "02",
    name: "数字孪生",
    metric: "TWIN",
    detail: "DIGITAL TWIN",
    color: new THREE.Color("#55caff"),
    secondary: new THREE.Color("#9ae8ff"),
    background: new THREE.Color("#041426"),
    message: "正在扫描：校园建筑与空间结构",
    response: "数字网格已启动，建筑空间正在实时映射",
    speed: 0.8
  },

  life: {
    index: "03",
    name: "智慧校园生活",
    metric: "LIFE",
    detail: "SMART CAMPUS LIFE",
    color: new THREE.Color("#63dfdc"),
    secondary: new THREE.Color("#b6fff0"),
    background: new THREE.Color("#031b24"),
    message: "正在连接：生活服务与校园空间",
    response: "生活服务节点已连接，空间交互正在运行",
    speed: 0.95
  },

  energy: {
    index: "04",
    name: "绿色能源网络",
    metric: "GREEN",
    detail: "GREEN ENERGY NETWORK",
    color: new THREE.Color("#54ffb4"),
    secondary: new THREE.Color("#b6ff9b"),
    background: new THREE.Color("#031b19"),
    message: "正在优化：校园能源与绿色网络",
    response: "绿色能量流正在建筑与能源节点间传输",
    speed: 1.15
  },

  transport: {
    index: "05",
    name: "智慧交通调度",
    metric: "MOVE",
    detail: "SMART TRANSPORT",
    color: new THREE.Color("#ffd477"),
    secondary: new THREE.Color("#fff0b1"),
    background: new THREE.Color("#1b1420"),
    message: "正在计算：校园交通与协同路径",
    response: "路径网络已激活，交通节点正在协同调度",
    speed: 1.45
  }
};

let currentMode = "ai";
let autoOrbit = true;
let isDragging = false;
let previousX = 0;
let previousY = 0;
let pointerMoved = false;
let lastPointerTime = 0;
let pulseStrength = 0;
let scanStrength = 0;
let targetRotationY = 0;
let targetRotationX = -0.12;
let toastTimer = 0;
let frameCount = 0;
let lastMetricTime = 0;
let elapsed = 0;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#031226");
scene.fog = new THREE.FogExp2("#031226", 0.013);

const camera = new THREE.PerspectiveCamera(
  42,
  innerWidth / innerHeight,
  0.1,
  400
);

camera.position.set(0, 5.5, 20);

const renderer = new THREE.WebGLRenderer({
  antialias: !isMobile,
  alpha: false,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(CONFIG.pixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

stage.appendChild(renderer.domElement);

renderer.domElement.style.width = "100%";
renderer.domElement.style.height = "100%";
renderer.domElement.style.display = "block";
renderer.domElement.style.touchAction = "pan-y";

const world = new THREE.Group();
scene.add(world);

const buildingGroup = new THREE.Group();
world.add(buildingGroup);

const effectGroup = new THREE.Group();
world.add(effectGroup);

const groundGroup = new THREE.Group();
world.add(groundGroup);

const clock = new THREE.Clock();

/* ------------------ Lighting ------------------ */

scene.add(new THREE.AmbientLight("#477b9a", 0.55));

const keyLight = new THREE.PointLight("#42cfff", 22, 45);
keyLight.position.set(2, 10, 5);
scene.add(keyLight);

const fillLight = new THREE.PointLight("#1676b8", 15, 40);
fillLight.position.set(-10, 4, -5);
scene.add(fillLight);

/* ------------------ Helpers ------------------ */

function random(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function showToast(message) {
  const toast = $("#interactionToast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("visible");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("visible");
  }, 2300);
}

function createPoints(positions, colors, size = 0.035, opacity = 0.8) {
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );

  geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colors, 3)
  );

  const material = new THREE.PointsMaterial({
    size,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });

  const points = new THREE.Points(geometry, material);

  points.frustumCulled = false;

  return points;
}

function addLine(points, color, opacity = 0.35) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false
  });

  const line = new THREE.Line(geometry, material);

  effectGroup.add(line);

  return line;
}

/* ------------------ Campus buildings ------------------ */

const buildings = [];

function addBuilding({
  x,
  z,
  width,
  depth,
  height,
  name,
  type = "box"
}) {
  const group = new THREE.Group();

  group.position.set(x, 0, z);
  buildingGroup.add(group);

  const positions = [];
  const colors = [];
  const count = Math.max(
    900,
    Math.floor(
      CONFIG.buildingParticles *
      (width * depth * height) /
      10000
    )
  );

  const baseColor = new THREE.Color("#174e70");
  const brightColor = new THREE.Color("#67dcff");

  function addParticle(px, py, pz, edge = false) {
    positions.push(px, py, pz);

    let color;

    if (edge) {
      color = brightColor.clone().multiplyScalar(random(0.55, 1.0));
    } else {
      color = baseColor.clone().lerp(
        brightColor,
        Math.pow(Math.random(), 2) * 0.55
      );
    }

    colors.push(color.r, color.g, color.b);
  }

  if (type === "tower") {
    // 中央塔楼：锥形粒子结构
    for (let i = 0; i < count; i++) {
      const y = random(0, height);
      const t = y / height;
      const radius = width * (0.46 - t * 0.29);

      const angle = random(0, Math.PI * 2);
      const r = radius * Math.sqrt(Math.random());

      const px = Math.cos(angle) * r;
      const pz = Math.sin(angle) * r;

      const nearEdge = Math.random() < 0.23;

      addParticle(px, y, pz, nearEdge);
    }

    // 塔楼水平结构环
    for (let y = 0.25; y < height; y += 0.22) {
      const t = y / height;
      const radius = width * (0.46 - t * 0.29);

      const ringPoints = [];

      for (let i = 0; i <= 100; i++) {
        const angle = i / 100 * Math.PI * 2;

        ringPoints.push(
          new THREE.Vector3(
            Math.cos(angle) * radius,
            y,
            Math.sin(angle) * radius
          )
        );
      }

      const ring = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(ringPoints),
        new THREE.LineBasicMaterial({
          color: "#45d8ff",
          transparent: true,
          opacity: 0.38,
          depthWrite: false
        })
      );

      group.add(ring);
    }

  } else {
    // 周边建筑：优先分布在六个表面
    // 避免大量填满内部而形成纯白实体

    const faceCount = Math.floor(count * 0.83);

    for (let i = 0; i < faceCount; i++) {
      const face = Math.floor(Math.random() * 6);

      const px = random(-width / 2, width / 2);
      const py = random(0.05, height);
      const pz = random(-depth / 2, depth / 2);

      let fx = px;
      let fy = py;
      let fz = pz;

      switch (face) {
        case 0:
          fx = width / 2;
          break;
        case 1:
          fx = -width / 2;
          break;
        case 2:
          fz = depth / 2;
          break;
        case 3:
          fz = -depth / 2;
          break;
        case 4:
          fy = height;
          break;
        case 5:
          fy = 0.05;
          break;
      }

      const isEdge =
        Math.abs(fx) > width * 0.46 ||
        Math.abs(fz) > depth * 0.46 ||
        fy > height * 0.94;

      addParticle(fx, fy, fz, isEdge && Math.random() < 0.65);
    }

    // 稀疏的内部结构点
    for (let i = faceCount; i < count; i++) {
      addParticle(
        random(-width * 0.42, width * 0.42),
        random(0.05, height),
        random(-depth * 0.42, depth * 0.42),
        false
      );
    }

    // 建筑竖向轮廓
    const corners = [
      [-width / 2, -depth / 2],
      [width / 2, -depth / 2],
      [width / 2, depth / 2],
      [-width / 2, depth / 2]
    ];

    for (const [cx, cz] of corners) {
      addLine(
        [
          new THREE.Vector3(cx, 0, cz),
          new THREE.Vector3(cx, height, cz)
        ],
        "#54dfff",
        0.48
      );
    }

    // 顶部轮廓
    const top = corners.map(
      ([cx, cz]) => new THREE.Vector3(cx, height, cz)
    );

    top.push(top[0].clone());

    addLine(top, "#71e7ff", 0.62);
  }

  const points = createPoints(
    positions,
    colors,
    type === "tower" ? 0.037 : 0.029,
    0.73
  );

  group.add(points);

  // 底部发光轮廓
  const baseShape = new THREE.Shape();

  baseShape.moveTo(-width / 2, -depth / 2);
  baseShape.lineTo(width / 2, -depth / 2);
  baseShape.lineTo(width / 2, depth / 2);
  baseShape.lineTo(-width / 2, depth / 2);
  baseShape.closePath();

  const baseGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-width / 2, 0.06, -depth / 2),
    new THREE.Vector3(width / 2, 0.06, -depth / 2),
    new THREE.Vector3(width / 2, 0.06, depth / 2),
    new THREE.Vector3(-width / 2, 0.06, depth / 2),
    new THREE.Vector3(-width / 2, 0.06, -depth / 2)
  ]);

  const baseLine = new THREE.Line(
    baseGeometry,
    new THREE.LineBasicMaterial({
      color: "#3cbbec",
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    })
  );

  group.add(baseLine);

  const building = {
    group,
    points,
    name,
    x,
    z,
    width,
    depth,
    height,
    baseOpacity: 0.73,
    baseColor,
    type
  };

  buildings.push(building);

  return building;
}

/* ------------------ Layout ------------------ */

// 中央塔楼
addBuilding({
  x: 0,
  z: 0,
  width: 3.4,
  depth: 3.4,
  height: 10.5,
  name: "AI 智慧教学中心",
  type: "tower"
});

// 周边建筑
addBuilding({
  x: -5.4,
  z: 0.3,
  width: 4.2,
  depth: 3.7,
  height: 4.8,
  name: "西侧教学楼"
});

addBuilding({
  x: 5.3,
  z: 0.2,
  width: 4.1,
  depth: 3.6,
  height: 4.3,
  name: "东侧教学楼"
});

addBuilding({
  x: -4.2,
  z: -5.0,
  width: 3.8,
  depth: 3.5,
  height: 5.5,
  name: "实验教学中心"
});

addBuilding({
  x: 4.4,
  z: -5.0,
  width: 4.0,
  depth: 3.4,
  height: 4.9,
  name: "智慧科研中心"
});

addBuilding({
  x: -6.0,
  z: 5.0,
  width: 3.7,
  depth: 3.2,
  height: 3.5,
  name: "校园服务中心"
});

addBuilding({
  x: 5.9,
  z: 5.0,
  width: 3.8,
  depth: 3.2,
  height: 3.7,
  name: "综合管理中心"
});

/* ------------------ Ground particle field ------------------ */

const groundPositions = [];
const groundColors = [];

for (let i = 0; i < CONFIG.groundParticles; i++) {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.sqrt(Math.random()) * 12.5;

  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const y = random(-0.12, 0.12);

  groundPositions.push(x, y, z);

  const c = new THREE.Color("#2375a8").lerp(
    new THREE.Color("#71eaff"),
    Math.random() * 0.35
  );

  groundColors.push(c.r, c.g, c.b);
}

const groundPoints = createPoints(
  groundPositions,
  groundColors,
  0.028,
  0.58
);

groundGroup.add(groundPoints);

/* ------------------ Ground rings ------------------ */

const groundRings = [];

for (let i = 0; i < 5; i++) {
  const radius = 3.1 + i * 2.05;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.012, radius + 0.012, 160),
    new THREE.MeshBasicMaterial({
      color: "#37c8f6",
      transparent: true,
      opacity: 0.24 - i * 0.025,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );

  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.015 + i * 0.003;

  groundGroup.add(ring);
  groundRings.push(ring);
}

/* ------------------ Data links ------------------ */

const dataLinks = [];

function createDataLink(a, b) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(a.x, 0.2, a.z),
    new THREE.Vector3(0, 4.8, 0),
    new THREE.Vector3(b.x, 0.2, b.z)
  ]);

  const material = new THREE.LineBasicMaterial({
    color: "#44d8ff",
    transparent: true,
    opacity: 0.25,
    depthWrite: false
  });

  const line = new THREE.Line(geometry, material);

  effectGroup.add(line);
  dataLinks.push(line);
}

for (let i = 1; i < buildings.length; i++) {
  createDataLink(buildings[0], buildings[i]);
}

/* ------------------ Moving data particles ------------------ */

const dataParticles = [];
const dataMaterial = new THREE.MeshBasicMaterial({
  color: "#79edff"
});

const dataGeometry = new THREE.SphereGeometry(0.055, 6, 6);

for (let i = 0; i < 22; i++) {
  const dot = new THREE.Mesh(dataGeometry, dataMaterial);

  dot.userData = {
    path: Math.floor(Math.random() * dataLinks.length),
    progress: Math.random(),
    speed: random(0.15, 0.48)
  };

  effectGroup.add(dot);
  dataParticles.push(dot);
}

/* ------------------ Scanning wave ------------------ */

const scanRing = new THREE.Mesh(
  new THREE.RingGeometry(0.15, 0.23, 128),
  new THREE.MeshBasicMaterial({
    color: "#79f2ff",
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false
  })
);

scanRing.rotation.x = -Math.PI / 2;
scanRing.position.y = 0.12;
scanRing.visible = false;

effectGroup.add(scanRing);

/* ------------------ Star field ------------------ */

const starPositions = [];
const starColors = [];

for (let i = 0; i < CONFIG.stars; i++) {
  starPositions.push(
    random(-36, 36),
    random(0, 26),
    random(-36, 20)
  );

  const c = new THREE.Color("#72bfff").multiplyScalar(
    random(0.3, 0.85)
  );

  starColors.push(c.r, c.g, c.b);
}

const stars = createPoints(
  starPositions,
  starColors,
  0.045,
  0.72
);

scene.add(stars);

/* ------------------ Interaction pulse ------------------ */

const pulseRings = [];

function triggerPulse(x = 0, z = 0) {
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.23, 96),
      new THREE.MeshBasicMaterial({
        color: MODES[currentMode].color,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );

    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.2 + i * 0.015, z);

    ring.userData = {
      scale: 1,
      speed: 2.2 + i * 0.75,
      life: 1
    };

    effectGroup.add(ring);
    pulseRings.push(ring);
  }

  pulseStrength = 1;
}

/* ------------------ Mode switching ------------------ */

function updateModeUI(mode) {
  const config = MODES[mode];
  if (!config) return;

  $$("[data-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  const metricMode = $("#metricMode");

  if (metricMode) {
    metricMode.innerHTML =
      `${config.metric} <i>+</i>`;
  }

  const status = $("#globalStatus");

  if (status) {
    status.textContent = "SMART CAMPUS DIGITAL TWIN";
  }

  const responseText = $("#responseText");

  if (responseText) {
    responseText.textContent = config.message;
  }

  const responseDetail = $("#responseDetail");

  if (responseDetail) {
    responseDetail.textContent = config.response;
  }

  const steps = $$(".cycle-step");

  steps.forEach((step, index) => {
    step.classList.toggle("current", index === 0);
  });

  showToast(`${config.name} · 场景已切换`);
}

function setMode(mode) {
  if (!MODES[mode]) return;

  currentMode = mode;

  const config = MODES[mode];

  updateModeUI(mode);

  scene.background.lerp(config.background, 0.8);
  scene.fog.color.copy(config.background);

  scanStrength = 1;

  triggerPulse(0, 0);

  buildings.forEach((building, index) => {
    const color = config.color.clone();

    building.points.material.color.set("#ffffff");

    const attr = building.points.geometry.getAttribute("color");

    const base = building.baseColor;

    for (let i = 0; i < attr.count; i++) {
      const r = attr.getX(i);
      const g = attr.getY(i);
      const b = attr.getZ(i);

      const original = new THREE.Color(r, g, b);

      // 模式变化主要改变色相，不再把粒子全部变成白色
      const mixed = original
        .lerp(color, mode === "energy" ? 0.62 : 0.38);

      attr.setXYZ(i, mixed.r, mixed.g, mixed.b);
    }

    attr.needsUpdate = true;

    building.points.material.opacity =
      mode === "manage" ? 0.82 : 0.73;

    building.points.material.size =
      mode === "manage" ? 0.034 : 0.029;
  });

  dataMaterial.color.copy(config.color);

  dataLinks.forEach((link) => {
    link.material.color.copy(config.color);

    link.material.opacity =
      mode === "manage" ? 0.42 : 0.32;
  });

  groundRings.forEach((ring) => {
    ring.material.color.copy(config.color);
  });

  groundPoints.material.color.copy(config.color);

  if (mode === "manage") {
    showToast("数字孪生启动 · 建筑扫描中");
  }

  if (mode === "ai") {
    showToast("AI 教学启动 · 数据流正在传输");
  }

  if (mode === "energy") {
    showToast("绿色能源启动 · 能量网络正在运行");
  }
}

$$("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
  });
});

/* ------------------ Panel collapse ------------------ */

let panelCollapsed = false;

function setupPanelToggle() {
  let toggle = $("#panelToggle");

  if (!toggle) {
    toggle = document.createElement("button");

    toggle.id = "panelToggle";
    toggle.type = "button";
    toggle.className = "panel-toggle";
    toggle.textContent = "☰ 交互中心";
    toggle.setAttribute("aria-expanded", "true");

    document.body.appendChild(toggle);
  }

  const style = document.createElement("style");

  style.textContent = `
    .panel-toggle {
      position: fixed;
      z-index: 1000;
      top: 18%;
      right: 3.2%;
      padding: 13px 16px;
      color: #a7f2ff;
      background: rgba(4, 24, 43, 0.88);
      border: 1px solid rgba(102, 224, 255, .7);
      border-radius: 8px;
      font: 600 14px/1.2 system-ui, sans-serif;
      letter-spacing: 1px;
      box-shadow: 0 0 18px rgba(40, 194, 255, .12);
      backdrop-filter: blur(10px);
    }

    .panel-toggle:active {
      background: rgba(24, 104, 139, .85);
      box-shadow: 0 0 24px rgba(40, 224, 255, .5);
    }

    body.panels-collapsed .left-panel,
    body.panels-collapsed .right-panel {
      opacity: 0;
      pointer-events: none;
      transform: translateX(16px);
    }

    .left-panel,
    .right-panel {
      transition: opacity .25s ease, transform .25s ease;
    }

    body.panels-collapsed .scene-callout {
      opacity: .45;
    }

    @media(max-width:760px) {
      .panel-toggle {
        top: 20%;
        right: 3%;
        font-size: 12px;
        padding: 12px 13px;
      }

      body.panels-collapsed .left-panel,
      body.panels-collapsed .right-panel {
        display: none;
      }
    }
  `;

  document.head.appendChild(style);

  toggle.addEventListener("click", () => {
    panelCollapsed = !panelCollapsed;

    document.body.classList.toggle(
      "panels-collapsed",
      panelCollapsed
    );

    toggle.setAttribute(
      "aria-expanded",
      String(!panelCollapsed)
    );

    toggle.textContent = panelCollapsed
      ? "☰ 展开交互"
      : "☰ 交互中心";

    showToast(
      panelCollapsed
        ? "控制面板已收起"
        : "控制面板已展开"
    );
  });
}

setupPanelToggle();

/* ------------------ Auto orbit ------------------ */

const autoButton = $("#autoOrbit");

if (autoButton) {
  autoButton.addEventListener("click", () => {
    autoOrbit = !autoOrbit;

    autoButton.classList.toggle("on", autoOrbit);

    const state = autoButton.querySelector("b");

    if (state) {
      state.textContent = autoOrbit ? "ON" : "OFF";
    }

    showToast(
      autoOrbit ? "自动环绕已启动" : "自动环绕已暂停"
    );
  });
}

/* ------------------ Reset view ------------------ */

const resetButton = $("#resetView");

if (resetButton) {
  resetButton.addEventListener("click", () => {
    targetRotationY = 0;
    targetRotationX = -0.12;

    camera.position.set(0, 5.5, 20);

    triggerPulse(0, 0);

    showToast("视角已复位");
  });
}

/* ------------------ Mouse and touch controls ------------------ */

renderer.domElement.addEventListener("pointerdown", (event) => {
  isDragging = true;
  pointerMoved = false;

  previousX = event.clientX;
  previousY = event.clientY;

  lastPointerTime = performance.now();
});

window.addEventListener("pointerup", () => {
  isDragging = false;
});

window.addEventListener("pointermove", (event) => {
  if (!isDragging) return;

  const dx = event.clientX - previousX;
  const dy = event.clientY - previousY;

  if (Math.abs(dx) + Math.abs(dy) > 3) {
    pointerMoved = true;
  }

  targetRotationY += dx * 0.004;
  targetRotationX += dy * 0.002;

  targetRotationX = clamp(
    targetRotationX,
    -0.75,
    0.35
  );

  previousX = event.clientX;
  previousY = event.clientY;

  lastPointerTime = performance.now();
});

renderer.domElement.addEventListener("wheel", (event) => {
  camera.position.z += event.deltaY * 0.012;

  camera.position.z = clamp(
    camera.position.z,
    12,
    32
  );
}, { passive: true });

renderer.domElement.addEventListener("click", (event) => {
  if (pointerMoved) return;

  const rect = renderer.domElement.getBoundingClientRect();

  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  const raycaster = new THREE.Raycaster();

  raycaster.setFromCamera(
    new THREE.Vector2(x, y),
    camera
  );

  const targets = buildings.map((b) => b.points);

  const hits = raycaster.intersectObjects(targets, true);

  if (hits.length > 0) {
    const object = hits[0].object;

    const building = buildings.find((b) =>
      b.group === object.parent
    );

    if (building) {
      triggerPulse(building.x, building.z);

      building.points.material.opacity = 1;

      showToast(`已选中：${building.name}`);

      return;
    }
  }

  triggerPulse(
    random(-4, 4),
    random(-4, 4)
  );

  showToast("校园粒子响应 · 能量波正在扩散");
});

/* ------------------ Responsive camera ------------------ */

function updateCameraLayout() {
  const mobile = innerWidth < 760;

  camera.aspect = innerWidth / innerHeight;

  camera.fov = mobile ? 48 : 42;

  camera.position.z = mobile ? 24 : 20;
  camera.position.y = mobile ? 6.4 : 5.5;

  camera.updateProjectionMatrix();

  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(
    Math.min(
      devicePixelRatio || 1,
      mobile ? 1.35 : 1.8
    )
  );
}

window.addEventListener("resize", updateCameraLayout);

/* ------------------ Loading status ------------------ */

function updateCycle() {
  const steps = $$(".cycle-step");

  if (!steps.length) return;

  const activeIndex = Math.floor(elapsed * 0.8) % steps.length;

  steps.forEach((step, index) => {
    step.classList.toggle(
      "current",
      index === activeIndex
    );
  });
}

/* ------------------ Animation loop ------------------ */

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);

  elapsed += dt;
  frameCount++;

  const config = MODES[currentMode];

  // 场景自动环绕
  if (autoOrbit && !isDragging) {
    targetRotationY += dt * 0.07 * config.speed;
  }

  world.rotation.y +=
    (targetRotationY - world.rotation.y) * 0.035;

  world.rotation.x +=
    (targetRotationX - world.rotation.x) * 0.035;

  // 建筑粒子微弱呼吸，不再整体闪白
  buildings.forEach((building, index) => {
    const wave =
      0.04 * Math.sin(elapsed * 1.8 + index * 0.8);

    building.points.material.opacity =
      (currentMode === "manage" ? 0.8 : 0.7) + wave;

    building.points.rotation.y =
      Math.sin(elapsed * 0.15 + index) * 0.012;
  });

  // 地面粒子缓慢转动
  groundPoints.rotation.y += dt * 0.008;

  // 环形扫描
  groundRings.forEach((ring, index) => {
    ring.material.opacity =
      0.14 +
      0.08 * Math.sin(elapsed * 1.5 + index * 0.7);
  });

  // 数据流沿连接线移动
  dataParticles.forEach((dot) => {
    const link = dataLinks[dot.userData.path];

    if (!link) return;

    dot.userData.progress +=
      dt * dot.userData.speed * config.speed * 0.15;

    if (dot.userData.progress > 1) {
      dot.userData.progress = 0;
    }

    const attr = link.geometry.getAttribute("position");

    const a = new THREE.Vector3(
      attr.getX(0),
      attr.getY(0),
      attr.getZ(0)
    );

    const b = new THREE.Vector3(
      attr.getX(1),
      attr.getY(1),
      attr.getZ(1)
    );

    const c = new THREE.Vector3(
      attr.getX(2),
      attr.getY(2),
      attr.getZ(2)
    );

    const t = dot.userData.progress;

    if (t < 0.5) {
      dot.position.lerpVectors(a, b, t * 2);
    } else {
      dot.position.lerpVectors(b, c, (t - 0.5) * 2);
    }
  });

  // 扫描环由小到大扩散
  if (scanStrength > 0) {
    scanStrength = Math.max(0, scanStrength - dt * 0.32);

    scanRing.visible = true;

    const scale = 1 + (1 - scanStrength) * 10;

    scanRing.scale.setScalar(scale);

    scanRing.material.opacity = scanStrength * 0.8;
  } else {
    scanRing.visible = false;
  }

  // 点击产生的脉冲环
  for (let i = pulseRings.length - 1; i >= 0; i--) {
    const ring = pulseRings[i];

    ring.userData.scale += dt * ring.userData.speed;
    ring.userData.life -= dt * 0.6;

    ring.scale.setScalar(ring.userData.scale);

    ring.material.opacity = Math.max(
      0,
      ring.userData.life
    );

    if (ring.userData.life <= 0) {
      effectGroup.remove(ring);

      ring.geometry.dispose();
      ring.material.dispose();

      pulseRings.splice(i, 1);
    }
  }

  pulseStrength = Math.max(0, pulseStrength - dt);

  stars.rotation.y += dt * 0.003;

  updateCycle();

  // 每秒更新一次粒子数量，避免频繁操作 DOM
  if (elapsed - lastMetricTime > 1) {
    lastMetricTime = elapsed;

    const metric = $("#particleMetric");

    if (metric) {
      const total =
        CONFIG.buildingParticles +
        CONFIG.groundParticles;

      metric.textContent = total.toLocaleString("en-US");
    }
  }

  renderer.render(scene, camera);
}

/* ------------------ Start ------------------ */

try {
  setMode("ai");
  updateCameraLayout();

  animate();

  showToast("未来校园已启动 · 点击建筑体验粒子交互");

} catch (error) {
  console.error(error);

  if (errorBox) {
    errorBox.hidden = false;
    errorBox.textContent =
      "场景启动失败：" + error.message;
  }
}