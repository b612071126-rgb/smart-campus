// 商丘工学院 AI 未来概念校园
// Three.js 粒子数字孪生核心模块

async function loadThree() {
  try {
    return await import(
      "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"
    );
  } catch (e) {
    try {
      return await import(
        "https://unpkg.com/three@0.160.0/build/three.module.js"
      );
    } catch (e2) {
      throw new Error(
        "Three.js 加载失败。请确认网络可访问 cdn.jsdelivr.net 或 unpkg.com，然后刷新页面。"
      );
    }
  }
}


const loadError = document.querySelector("#loadError");
const stage = document.querySelector("#stage");

function fail(message) {
  loadError.hidden = false;
  loadError.textContent = message;
}

try {
  const THREE = await loadThree();
  init(THREE);
} catch (e) {
  console.error(e);
  fail(e?.message || String(e));
}


function init(THREE) {
  /* =========================================
     1. 场景与镜头
  ========================================= */

  const scene = new THREE.Scene();

  scene.background = new THREE.Color("#020b18");

  scene.fog = new THREE.FogExp2(
    "#04182d",
    0.0077
  );

  const camera = new THREE.PerspectiveCamera(
    42,
    innerWidth / innerHeight,
    0.1,
    220
  );

  const target = new THREE.Vector3(0, 7.4, 0);

  let azimuth = 0.72;
  let polar = 1.05;
  let distance = 47;

  const initialView = {
    azimuth,
    polar,
    distance,
    target: target.clone()
  };

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });

  renderer.setSize(innerWidth, innerHeight);

  renderer.setPixelRatio(
    Math.min(devicePixelRatio, 1.65)
  );

  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  renderer.domElement.setAttribute(
    "aria-label",
    "拖动旋转校园，滚轮缩放，点击建筑触发粒子响应"
  );

  stage.appendChild(renderer.domElement);


  /* =========================================
     2. 光照
  ========================================= */

  const ambient = new THREE.HemisphereLight(
    0x8deeff,
    0x071426,
    1.1
  );

  scene.add(ambient);

  const key = new THREE.DirectionalLight(
    0xa7eeff,
    1.5
  );

  key.position.set(12, 30, 17);
  scene.add(key);

  const rim = new THREE.PointLight(
    0x087fff,
    65,
    70
  );

  rim.position.set(-14, 13, -6);
  scene.add(rim);


  /* =========================================
     3. 颜色系统
  ========================================= */

  const C = {
    cyan: new THREE.Color("#6ceeff"),
    ice: new THREE.Color("#d8fcff"),
    blue: new THREE.Color("#168fd3"),
    deepBlue: new THREE.Color("#0a3c83"),
    gold: new THREE.Color("#ffdb91"),
    green: new THREE.Color("#5ef2bb"),
    violet: new THREE.Color("#a69bff"),
    white: new THREE.Color("#f0ffff")
  };


  /* =========================================
     4. 智慧校园交互模式
  ========================================= */

  const modes = {
    ai: {
      label: "AI 智慧教学",
      metric: "AI +",

      focus: [0, 11, 0],
      from: [-13, 5, 1],
      to: [0, 11, 0],

      status: "正在分析：学习资源与教学空间",

      detail:
        "学习画像 → 资源匹配 → 个性化学习路径",

      color: C.cyan,

      toast:
        "AI 教学已激活 · 粒子流正在匹配学习资源"
    },

    manage: {
      label: "智慧校园管理",
      metric: "TWIN",

      focus: [10, 3, -7],
      from: [10, 3, -7],
      to: [0, 7, 0],

      status: "正在同步：校园数字孪生数据",

      detail:
        "空间感知 → 状态映射 → 校园协同调度",

      color: C.violet,

      toast:
        "数字孪生已连接 · 校园状态正在同步"
    },

    life: {
      label: "智慧校园生活",
      metric: "LIFE",

      focus: [-10, 3, 6],
      from: [-10, 3, 6],
      to: [0, 7, 0],

      status: "正在联动：校园生活服务节点",

      detail:
        "服务请求 → 场景识别 → 便捷服务响应",

      color: C.green,

      toast:
        "智慧生活已激活 · 服务粒子正在联动"
    },

    energy: {
      label: "绿色能源网络",
      metric: "ECO",

      focus: [8, 1, 14],
      from: [8, 1, 14],
      to: [0, 8, 0],

      status: "正在优化：能源与光伏网络",

      detail:
        "能源监测 → 用能预测 → 低碳调度",

      color: C.green,

      toast:
        "绿色能源已激活 · 能量粒子正在优化流动"
    },

    transport: {
      label: "智慧交通调度",
      metric: "MOVE",

      focus: [-17, 1, -8],
      from: [-17, 1, -8],
      to: [0, 1, 0],

      status: "正在计算：人车路径与通行效率",

      detail:
        "路径采集 → 拥堵分析 → 动态路线推荐",

      color: C.gold,

      toast:
        "智慧交通已激活 · 路径粒子开始动态调度"
    }
  };


  let currentMode = "ai";

  let autoRotate = true;

  let dragging = false;
  let moved = false;

  let downX = 0;
  let downY = 0;

  let lastX = 0;
  let lastY = 0;

  let pointerActive = 0;

  const pointerWorld = new THREE.Vector3(0, 4, 0);

  let pulseAge = 100;

  const pulseCenter = new THREE.Vector3();

  let toastTimer = null;


  /* =========================================
     5. 粒子几何生成器
  ========================================= */

  const rand = (a, b) =>
    a + Math.random() * (b - a);

  const pick = arr =>
    arr[Math.floor(Math.random() * arr.length)];

  const targetPositions = [];
  const startPositions = [];
  const colors = [];
  const sizes = [];


  function pushPoint(
    x,
    y,
    z,
    color = C.cyan,
    size = 1.0
  ) {
    targetPositions.push(x, y, z);

    // 粒子从远处散布，随后聚合到目标位置。
    const r = rand(13, 39);
    const a = Math.random() * Math.PI * 2;
    const h = rand(-0.65, 0.65);

    startPositions.push(
      x + Math.cos(a) * r,
      y + h * r,
      z + Math.sin(a) * r
    );

    const cc = color.clone().multiplyScalar(
      rand(0.7, 1.28)
    );

    colors.push(cc.r, cc.g, cc.b);

    sizes.push(
      size * rand(0.65, 1.3)
    );
  }


  function particleLine(
    a,
    b,
    spacing = 0.20,
    color = C.cyan,
    size = 0.9
  ) {
    const A = new THREE.Vector3(...a);
    const B = new THREE.Vector3(...b);

    const length = A.distanceTo(B);

    const n = Math.max(
      2,
      Math.ceil(length / spacing)
    );

    for (let i = 0; i <= n; i++) {
      const t = i / n;

      const p = A.clone().lerp(B, t);

      pushPoint(
        p.x,
        p.y,
        p.z,
        color,
        size
      );
    }
  }


  function particlePolyline(
    points,
    spacing = 0.2,
    color = C.cyan,
    size = 0.9,
    closed = false
  ) {
    for (let i = 0; i < points.length - 1; i++) {
      particleLine(
        points[i],
        points[i + 1],
        spacing,
        color,
        size
      );
    }

    if (closed && points.length > 2) {
      particleLine(
        points[points.length - 1],
        points[0],
        spacing,
        color,
        size
      );
    }
  }


  function particleCircle(
    cx,
    cy,
    cz,
    rx,
    rz,
    spacing = 0.19,
    color = C.cyan,
    size = 0.8,
    start = 0,
    end = Math.PI * 2
  ) {
    const len =
      (end - start) *
      Math.sqrt((rx * rx + rz * rz) / 2);

    const n = Math.max(
      30,
      Math.ceil(len / spacing)
    );

    for (let i = 0; i <= n; i++) {
      const a =
        start + (end - start) * i / n;

      pushPoint(
        cx + Math.cos(a) * rx,
        cy + Math.sin(a) * 0.035,
        cz + Math.sin(a) * rz,
        color,
        size
      );
    }
  }


  /* =========================================
     6. 粒子化建筑
  ========================================= */

  function particleBox(
    x,
    z,
    w,
    d,
    h,
    floors = 3,
    style = "building"
  ) {
    const base = 0.16;
    const top = h;

    const corners = [
      [-w / 2, -d / 2],
      [w / 2, -d / 2],
      [w / 2, d / 2],
      [-w / 2, d / 2]
    ];

    // 建筑底部、屋顶和四角骨架。
    for (let i = 0; i < 4; i++) {
      const [x1, z1] = corners[i];
      const [x2, z2] = corners[(i + 1) % 4];

      particleLine(
        [x + x1, base, z + z1],
        [x + x2, base, z + z2],
        0.18,
        C.ice,
        0.85
      );

      particleLine(
        [x + x1, top, z + z1],
        [x + x2, top, z + z2],
        0.16,
        C.ice,
        1.0
      );

      particleLine(
        [x + x1, base, z + z1],
        [x + x1, top, z + z1],
        0.19,
        C.cyan,
        0.9
      );
    }

    // 楼层轮廓。
    for (let f = 1; f < floors; f++) {
      const y =
        base + (top - base) * f / floors;

      const c = f % 2 === 0 ? C.cyan : C.blue;

      particlePolyline(
        corners.map(([xx, zz]) => [
          x + xx,
          y,
          z + zz
        ]),
        0.22,
        c,
        0.65,
        true
      );

      // 楼层边缘的亮点。
      for (let k = 0; k < 12; k++) {
        const t = k / 11;

        pushPoint(
          x - w / 2 + w * t,
          y,
          z + d / 2 + 0.03,
          f % 2 === 0 ? C.ice : C.blue,
          0.9
        );
      }
    }

    // 立面窗格。
    const cols = Math.max(
      5,
      Math.floor(w / 0.72)
    );

    const rows = Math.max(
      2,
      floors * 2
    );

    for (let row = 0; row < rows; row++) {
      const y =
        base + 0.45 +
        (top - base - 0.7) * (row + 0.5) / rows;

      for (let col = 0; col < cols; col++) {
        const xx =
          x - w / 2 + 0.35 +
          (w - 0.7) * (col + 0.5) / cols;

        particleLine(
          [xx, y - 0.14, z + d / 2 + 0.04],
          [xx, y + 0.14, z + d / 2 + 0.04],
          0.11,
          (row + col) % 4 === 0
            ? C.cyan
            : C.blue,
          0.56
        );

        if (col % 2 === 0) {
          particleLine(
            [xx - 0.12, y, z + d / 2 + 0.045],
            [xx + 0.12, y, z + d / 2 + 0.045],
            0.1,
            C.ice,
            0.46
          );
        }
      }
    }

    // 屋顶的光伏板轮廓。
    for (let row = 0; row < 3; row++) {
      particleLine(
        [
          x - w * 0.33,
          top + 0.08,
          z - d * 0.31 + row * d * 0.31
        ],
        [
          x + w * 0.33,
          top + 0.08,
          z - d * 0.31 + row * d * 0.31
        ],
        0.16,
        C.cyan,
        0.7
      );
    }

    // 屋顶绿化粒子。
    for (let i = 0; i < 42; i++) {
      const xx = x + rand(-w * 0.43, w * 0.43);
      const zz = z + rand(-d * 0.38, d * 0.38);

      const rr = rand(0.08, 0.34);

      const color = pick([
        C.green,
        C.green,
        C.cyan
      ]);

      for (let j = 0; j < 4; j++) {
        pushPoint(
          xx + rand(-rr, rr),
          top + 0.15 + rand(0, rr * 1.25),
          zz + rand(-rr, rr),
          color,
          rand(0.45, 0.9)
        );
      }
    }
  }


  /* =========================================
     7. 中央智慧教学塔
  ========================================= */

  const towerHeight = 22.5;
  const floors = 13;

  for (let f = 0; f < floors; f++) {
    const y = 0.65 + f * 1.66;

    const t = f / (floors - 1);

    const r = 4.55 - t * 1.2;

    const angle = f * 0.085;

    const pts = [];

    // 八边形楼层。
    for (let i = 0; i < 8; i++) {
      const a =
        Math.PI / 8 +
        i * Math.PI / 4 +
        angle;

      pts.push([
        Math.cos(a) * r,
        y,
        Math.sin(a) * r
      ]);
    }

    particlePolyline(
      pts,
      0.15,
      f % 3 === 0 ? C.ice : C.cyan,
      f % 3 === 0 ? 1.12 : 0.85,
      true
    );

    // 内部能量环。
    particleCircle(
      0,
      y + 0.13,
      0,
      r * 0.56,
      r * 0.56,
      0.23,
      f % 4 === 0 ? C.gold : C.blue,
      0.57
    );

    // 结构支撑梁。
    for (let i = 0; i < 8; i += 2) {
      const a =
        Math.PI / 8 +
        i * Math.PI / 4 +
        angle;

      particleLine(
        [
          Math.cos(a) * r * 0.2,
          y,
          Math.sin(a) * r * 0.2
        ],
        [
          Math.cos(a) * r,
          y,
          Math.sin(a) * r
        ],
        0.18,
        C.ice,
        0.52
      );
    }

    // 每层露台的植被粒子。
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2;

      const rr = rand(r * 0.55, r * 0.94);

      const x = Math.cos(a) * rr;
      const z = Math.sin(a) * rr;

      for (let j = 0; j < 5; j++) {
        pushPoint(
          x + rand(-0.22, 0.22),
          y + 0.16 + rand(0, 0.55),
          z + rand(-0.2, 0.2),
          pick([C.green, C.green, C.ice]),
          rand(0.42, 0.85)
        );
      }
    }
  }

  // 塔体竖向外骨架。
  for (let i = 0; i < 8; i++) {
    const a =
      Math.PI / 8 +
      i * Math.PI / 4;

    const x = Math.cos(a) * 4.5;
    const z = Math.sin(a) * 4.5;

    particleLine(
      [x, 0.3, z],
      [x, towerHeight, z],
      0.13,
      i % 2 === 0 ? C.ice : C.cyan,
      1.0
    );
  }

  // 塔体正面窗格与结构光线。
  for (let f = 0; f < 12; f++) {
    const y = 0.8 + f * 1.67;

    for (let col = 0; col < 9; col++) {
      const x = -2.65 + col * 0.66;

      particleLine(
        [x, y, -2.6],
        [x, y + 0.67, -2.6],
        0.12,
        col % 3 === 0 ? C.cyan : C.blue,
        0.56
      );
    }

    particleLine(
      [-2.8, y, -2.62],
      [2.8, y, -2.62],
      0.1,
      C.ice,
      0.75
    );
  }

  // 塔顶天线与光环。
  for (let i = 0; i < 9; i++) {
    const a = i * Math.PI * 2 / 9;

    particleLine(
      [
        Math.cos(a) * 0.7,
        towerHeight,
        Math.sin(a) * 0.7
      ],
      [
        Math.cos(a) * 0.95,
        towerHeight + 1.4 + ((i % 3) * 0.35),
        Math.sin(a) * 0.95
      ],
      0.1,
      i % 2 ? C.cyan : C.ice,
      1.2
    );
  }

  particleCircle(
    0,
    towerHeight + 0.25,
    0,
    2.1,
    2.1,
    0.11,
    C.ice,
    1.2
  );

  particleLine(
    [0, towerHeight + 0.3, 0],
    [0, towerHeight + 4.8, 0],
    0.12,
    C.cyan,
    1.2
  );


  /* =========================================
     8. 周围校园建筑群
  ========================================= */

  const buildings = [
    {
      x: -10,
      z: -5,
      w: 8.3,
      d: 5.0,
      h: 4.3,
      f: 3,
      mode: "life"
    },
    {
      x: 10,
      z: -6,
      w: 8.2,
      d: 5.0,
      h: 4.6,
      f: 3,
      mode: "manage"
    },
    {
      x: -10,
      z: 6,
      w: 7.6,
      d: 4.6,
      h: 3.6,
      f: 2,
      mode: "ai"
    },
    {
      x: 10,
      z: 6,
      w: 8.0,
      d: 4.8,
      h: 4.0,
      f: 3,
      mode: "energy"
    },
    {
      x: 0,
      z: -12,
      w: 8.5,
      d: 4.2,
      h: 3.2,
      f: 2,
      mode: "manage"
    },
    {
      x: 0,
      z: 12,
      w: 7.6,
      d: 4.2,
      h: 3.0,
      f: 2,
      mode: "life"
    }
  ];

  for (const b of buildings) {
    particleBox(
      b.x,
      b.z,
      b.w,
      b.d,
      b.h,
      b.f
    );
  }


  /* =========================================
     9. 校园道路与环形通道
  ========================================= */

  for (let i = 0; i < 4; i++) {
    particleCircle(
      0,
      0.02,
      0,
      13 + i * 3.65,
      10 + i * 3.1,
      0.145,
      i === 0 ? C.gold : C.cyan,
      i === 0 ? 1.0 : 0.65
    );
  }

  for (let a = 0; a < 12; a++) {
    const angle = a * Math.PI / 6;

    const r0 = 5.8;
    const r1 = 25;

    particleLine(
      [
        Math.cos(angle) * r0,
        0.02,
        Math.sin(angle) * r0
      ],
      [
        Math.cos(angle) * r1,
        0.02,
        Math.sin(angle) * r1
      ],
      0.21,
      a % 3 === 0 ? C.ice : C.blue,
      0.45
    );

    for (let s = 0; s < 7; s++) {
      const r = 8 + s * 2.3;

      pushPoint(
        Math.cos(angle) * r,
        0.1,
        Math.sin(angle) * r,
        a % 2 ? C.cyan : C.gold,
        rand(0.8, 1.4)
      );
    }
  }


  /* =========================================
     10. 操场
  ========================================= */

  function ellipseLine(
    cx,
    cy,
    cz,
    rx,
    rz,
    spacing,
    color,
    size = 0.7
  ) {
    const circumference =
      2 * Math.PI *
      Math.sqrt((rx * rx + rz * rz) / 2);

    const n = Math.ceil(
      circumference / spacing
    );

    for (let i = 0; i <= n; i++) {
      const a = 2 * Math.PI * i / n;

      pushPoint(
        cx + Math.cos(a) * rx,
        cy,
        cz + Math.sin(a) * rz,
        color,
        size
      );
    }
  }

  ellipseLine(
    -17, 0.12, -8,
    6.4, 3.0,
    0.12, C.gold, 0.7
  );

  ellipseLine(
    -17, 0.13, -8,
    5.7, 2.45,
    0.13, C.ice, 0.5
  );

  ellipseLine(
    -17, 0.14, -8,
    4.9, 1.9,
    0.15, C.cyan, 0.7
  );

  particleLine(
    [-21.4, 0.15, -8],
    [-12.6, 0.15, -8],
    0.15,
    C.ice,
    0.6
  );

  particleLine(
    [-17, 0.15, -9.9],
    [-17, 0.15, -6.1],
    0.15,
    C.ice,
    0.5
  );


  /* =========================================
     11. 绿色景观粒子
  ========================================= */

  for (let i = 0; i < 82; i++) {
    const a = rand(0, Math.PI * 2);

    const r = rand(12, 25);

    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    if (Math.hypot(x, z) < 7.5) {
      continue;
    }

    if (
      x < -10 &&
      z < -4 &&
      z > -13
    ) {
      continue;
    }

    for (let j = 0; j < 14; j++) {
      const yy = rand(0.15, 1.8);
      const spread = rand(0.08, 0.42);

      const c = pick([
        C.green,
        C.green,
        C.green,
        C.cyan
      ]);

      pushPoint(
        x + rand(-spread, spread),
        yy,
        z + rand(-spread, spread),
        c,
        rand(0.35, 0.85)
      );
    }

    particleLine(
      [x, 0.05, z],
      [x, 0.5, z],
      0.2,
      C.gold,
      0.3
    );
  }


  /* =========================================
     12. 空间星尘
  ========================================= */

  for (let i = 0; i < 750; i++) {
    const a = rand(0, Math.PI * 2);

    const r = rand(35, 67);
    const y = rand(5, 37);

    pushPoint(
      Math.cos(a) * r,
      y,
      Math.sin(a) * r,
      pick([C.blue, C.cyan, C.ice]),
      rand(0.25, 0.8)
    );
  }


  /* =========================================
     13. 创建 GPU 粒子系统
  ========================================= */

  const count = targetPositions.length / 3;

  document.querySelector(
    "#particleMetric"
  ).textContent = count.toLocaleString("en-US");

  const geo = new THREE.BufferGeometry();

  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      targetPositions,
      3
    )
  );

  geo.setAttribute(
    "aStart",
    new THREE.Float32BufferAttribute(
      startPositions,
      3
    )
  );

  geo.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(
      colors,
      3
    )
  );

  geo.setAttribute(
    "aSize",
    new THREE.Float32BufferAttribute(
      sizes,
      1
    )
  );

  geo.attributes.position.setUsage(
    THREE.StaticDrawUsage
  );


  const particleMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexColors: true,
    blending: THREE.AdditiveBlending,

    uniforms: {
      uTime: {
        value: 0
      },

      uAssemble: {
        value: 0
      },

      uPointer: {
        value: new THREE.Vector3(0, 4, 0)
      },

      uPointerActive: {
        value: 0
      },

      uFocus: {
        value: new THREE.Vector3(0, 11, 0)
      },

      uPulseCenter: {
        value: new THREE.Vector3()
      },

      uPulseAge: {
        value: 100
      }
    },

    vertexShader: `
      attribute vec3 aStart;
      attribute float aSize;
      attribute vec3 color;

      uniform float uTime;
      uniform float uAssemble;

      uniform vec3 uPointer;
      uniform float uPointerActive;

      uniform vec3 uFocus;
      uniform vec3 uPulseCenter;
      uniform float uPulseAge;

      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        float a = clamp(uAssemble, 0.0, 1.0);

        a = a * a * (3.0 - 2.0 * a);

        vec3 p = mix(aStart, position, a);

        float idle = a;

        p += vec3(
          sin(uTime * .52 + position.y * .73),
          cos(uTime * .44 + position.x * .55),
          sin(uTime * .5 + position.z * .64)
        ) * .045 * idle;

        vec3 mouseDelta = p - uPointer;

        float md = length(mouseDelta);

        float reaction =
          exp(-md * md * .20) * uPointerActive;

        if (md > .001) {
          p += normalize(mouseDelta) * reaction * 1.45;
        }

        float distFocus = distance(p, uFocus);

        float focusGlow = exp(-distFocus * .20);

        float distPulse = distance(p, uPulseCenter);

        float radius = uPulseAge * 7.2;

        float wave =
          exp(-pow((distPulse - radius) * .8, 2.0))
          * exp(-max(uPulseAge, 0.0) * .45);

        if (uPulseAge < 3.4 && distPulse > .001) {
          p += normalize(p - uPulseCenter) * wave * .42;
        }

        vec4 mv = modelViewMatrix * vec4(p, 1.0);

        gl_Position = projectionMatrix * mv;

        gl_PointSize = clamp(
          aSize * (190.0 / max(1.0, -mv.z)),
          .8,
          7.8
        );

        vColor = color * (
          1.0 +
          focusGlow * .68 +
          wave * 1.8 +
          reaction * .35
        );

        vAlpha = (
          .55 +
          .35 * sin(
            uTime * 1.5 +
            position.x * 1.7 +
            position.z
          )
        ) * (
          .86 +
          focusGlow * .28 +
          wave * .8
        );
      }
    `,

    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec2 uv = gl_PointCoord - .5;

        float d = length(uv);

        float alpha = 1.0 - smoothstep(.06, .5, d);

        float core = 1.0 - smoothstep(0.0, .18, d);

        gl_FragColor = vec4(
          vColor,
          alpha * vAlpha + core * .22
        );

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  });


  const campusParticles = new THREE.Points(
    geo,
    particleMat
  );

  scene.add(campusParticles);


  /* =========================================
     14. 沿曲线流动的数据粒子
  ========================================= */

  const flowCount = 2100;

  const flowGeo = new THREE.BufferGeometry();

  const phases = new Float32Array(flowCount);
  const flowSizes = new Float32Array(flowCount);
  const flowColors = new Float32Array(flowCount * 3);

  for (let i = 0; i < flowCount; i++) {
    phases[i] = Math.random();

    flowSizes[i] = rand(0.5, 1.75);

    const c = Math.random() < 0.12
      ? C.gold
      : C.cyan;

    flowColors[i * 3] = c.r;
    flowColors[i * 3 + 1] = c.g;
    flowColors[i * 3 + 2] = c.b;
  }

  flowGeo.setAttribute(
    "aPhase",
    new THREE.BufferAttribute(phases, 1)
  );

  flowGeo.setAttribute(
    "aSize",
    new THREE.BufferAttribute(flowSizes, 1)
  );

  flowGeo.setAttribute(
    "color",
    new THREE.BufferAttribute(flowColors, 3)
  );


  const flowMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexColors: true,
    blending: THREE.AdditiveBlending,

    uniforms: {
      uTime: {
        value: 0
      },

      uFrom: {
        value: new THREE.Vector3(-13, 5, 1)
      },

      uTo: {
        value: new THREE.Vector3(0, 11, 0)
      },

      uBend: {
        value: 7
      }
    },

    vertexShader: `
      attribute float aPhase;
      attribute float aSize;
      attribute vec3 color;

      uniform float uTime;
      uniform vec3 uFrom;
      uniform vec3 uTo;
      uniform float uBend;

      varying float vAlpha;
      varying vec3 vColor;

      void main() {
        float t = fract(aPhase + uTime * .105);

        vec3 mid = (uFrom + uTo) * .5
          + vec3(0.0, uBend, 0.0);

        mid.x += sin(aPhase * 47.0) * 2.4;

        mid.z += cos(aPhase * 33.0) * 2.4;

        vec3 p =
          (1.0 - t) * (1.0 - t) * uFrom
          + 2.0 * (1.0 - t) * t * mid
          + t * t * uTo;

        p.y += sin(
          uTime * 1.4 + aPhase * 75.0
        ) * .18;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);

        gl_Position = projectionMatrix * mv;

        gl_PointSize = clamp(
          aSize * (240.0 / max(1.0, -mv.z)),
          1.0,
          6.2
        );

        vAlpha =
          smoothstep(0.0, .15, t)
          * (1.0 - smoothstep(.82, 1.0, t))
          * .95;

        vColor = color * (
          1.1 + .35 * sin(t * 6.283 + uTime)
        );
      }
    `,

    fragmentShader: `
      varying float vAlpha;
      varying vec3 vColor;

      void main() {
        float d = length(gl_PointCoord - .5);

        float a = 1.0 - smoothstep(.03, .5, d);

        gl_FragColor = vec4(
          vColor,
          a * vAlpha
        );

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  });


  const flowingData = new THREE.Points(
    flowGeo,
    flowMat
  );

  // 粒子位置由 Shader 计算，而非 geometry.position。
  // 关闭视锥裁剪，避免 Three.js 因缺少普通位置属性而将数据流误裁掉。
  flowingData.frustumCulled = false;

  scene.add(flowingData);


  /* =========================================
     15. 漂浮全息轨道
  ========================================= */

  const orbitPositions = [];
  const orbitColors = [];
  const orbitSizes = [];

  for (let ring = 0; ring < 6; ring++) {
    const rx = 8.5 + ring * 3.6;
    const rz = 6.5 + ring * 2.8;

    const y = 2.2 + ring * 3.0;

    const n = ring < 2 ? 380 : 300;

    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;

      const x = Math.cos(a) * rx;
      const z = Math.sin(a) * rz;

      orbitPositions.push(
        x,
        y + Math.sin(a * 2 + ring) * 0.25,
        z
      );

      const c =
        ring % 3 === 0
          ? C.ice
          : (ring % 2 === 0 ? C.cyan : C.blue);

      orbitColors.push(c.r, c.g, c.b);

      orbitSizes.push(
        ring === 0 ? 1.15 : 0.7
      );
    }
  }


  const orbitGeo = new THREE.BufferGeometry();

  orbitGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      orbitPositions,
      3
    )
  );

  orbitGeo.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(
      orbitColors,
      3
    )
  );

  orbitGeo.setAttribute(
    "aSize",
    new THREE.Float32BufferAttribute(
      orbitSizes,
      1
    )
  );


  const orbitMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexColors: true,
    blending: THREE.AdditiveBlending,

    uniforms: {
      uTime: {
        value: 0
      }
    },

    vertexShader: `
      attribute float aSize;
      attribute vec3 color;

      uniform float uTime;

      varying vec3 vColor;

      void main() {
        vec3 p = position;

        float ang = uTime * .045;

        float x =
          p.x * cos(ang) -
          p.z * sin(ang);

        float z =
          p.x * sin(ang) +
          p.z * cos(ang);

        p.x = x;
        p.z = z;

        p.y += sin(
          uTime * .9 + p.x * .2
        ) * .055;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);

        gl_Position = projectionMatrix * mv;

        gl_PointSize = clamp(
          aSize * 210.0 / max(1.0, -mv.z),
          .8,
          4.0
        );

        vColor = color * (
          .85 +
          .15 * sin(uTime * 1.7 + position.x)
        );
      }
    `,

    fragmentShader: `
      varying vec3 vColor;

      void main() {
        float d = length(gl_PointCoord - .5);

        float a = 1.0 - smoothstep(.05, .5, d);

        gl_FragColor = vec4(
          vColor,
          a * .7
        );

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  });


  const orbitPoints = new THREE.Points(
    orbitGeo,
    orbitMat
  );

  scene.add(orbitPoints);


  /* =========================================
     16. 透明交互区域
  ========================================= */

  const hitAreas = [];

  function addHit(mode, position, size) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(size, 10, 8),

      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
    );

    mesh.position.set(...position);

    mesh.userData.mode = mode;

    scene.add(mesh);

    hitAreas.push(mesh);
  }

  addHit("ai", [0, 10, 0], 5.1);
  addHit("manage", [10, 3, -6], 5.0);
  addHit("life", [-10, 2.5, 6], 4.8);
  addHit("energy", [8, 1, 14], 5.0);
  addHit("transport", [-17, 1, -8], 5.2);


  /* =========================================
     17. 鼠标射线与空间交互
  ========================================= */

  const raycaster = new THREE.Raycaster();

  const ndc = new THREE.Vector2();

  const tempPoint = new THREE.Vector3();


  function setRayFromEvent(e) {
    const rect =
      renderer.domElement.getBoundingClientRect();

    ndc.x =
      ((e.clientX - rect.left) / rect.width) * 2 - 1;

    ndc.y =
      -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(ndc, camera);
  }


  function planePoint(e, y = 3.8) {
    setRayFromEvent(e);

    const p = new THREE.Plane(
      new THREE.Vector3(0, 1, 0),
      -y
    );

    return (
      raycaster.ray.intersectPlane(p, tempPoint)?.clone()
      || null
    );
  }


  function showToast(message) {
    const el = document.querySelector(
      "#interactionToast"
    );

    el.textContent = message;

    el.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      el.classList.remove("show");
    }, 2300);
  }


  /* =========================================
     18. 模式切换
  ========================================= */

  function setMode(mode, announce = true) {
    if (!modes[mode]) return;

    currentMode = mode;

    const m = modes[mode];

    particleMat.uniforms.uFocus.value.set(
      ...m.focus
    );

    flowMat.uniforms.uFrom.value.set(
      ...m.from
    );

    flowMat.uniforms.uTo.value.set(
      ...m.to
    );

    flowMat.uniforms.uBend.value =
      mode === "transport"
        ? 2.5
        : (mode === "energy" ? 4.3 : 7.5);

    // 同步左右两侧的功能菜单。
    document
      .querySelectorAll("[data-mode]")
      .forEach(el => {
        el.classList.toggle(
          "active",
          el.dataset.mode === mode
        );
      });

    document.querySelector(
      "#responseText"
    ).textContent = m.status;

    document.querySelector(
      "#responseDetail"
    ).textContent = m.detail;

    document.querySelector(
      "#metricMode"
    ).innerHTML =
      m.metric.replace(" ", " <i>") +
      (m.metric.includes(" ") ? "</i>" : "");

    document.querySelector(
      "#globalStatus"
    ).textContent =
      m.label.toUpperCase() + " · LIVE DATA FLOW";

    if (announce) {
      showToast(m.toast);
    }

    const cycle = document.querySelectorAll(
      ".cycle-step"
    );

    cycle.forEach((el, i) => {
      el.classList.toggle("current", i === 0);
    });

    // 系统响应流程开始新一轮循环。
    window.__cycleBase = performance.now();

    pulseCenter.set(...m.focus);

    pulseAge = 0;
  }


  document
    .querySelectorAll("[data-mode]")
    .forEach(el => {
      el.addEventListener("click", () => {
        setMode(el.dataset.mode);
      });
    });


  /* =========================================
     19. 视角控制
  ========================================= */

  renderer.domElement.addEventListener(
    "pointerdown",
    e => {
      if (e.button !== 0) return;

      dragging = true;
      moved = false;

      downX = lastX = e.clientX;
      downY = lastY = e.clientY;

      renderer.domElement.setPointerCapture?.(
        e.pointerId
      );
    }
  );


  renderer.domElement.addEventListener(
    "pointermove",
    e => {
      if (dragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;

        if (
          Math.abs(e.clientX - downX) +
          Math.abs(e.clientY - downY) > 4
        ) {
          moved = true;
        }

        if (moved) {
          azimuth -= dx * 0.006;

          polar = THREE.MathUtils.clamp(
            polar + dy * 0.004,
            0.38,
            1.48
          );
        }

        lastX = e.clientX;
        lastY = e.clientY;
      }

      const hit = planePoint(e);

      if (hit) {
        pointerWorld.copy(hit);

        pointerActive = 1;

        particleMat.uniforms.uPointer.value.copy(
          pointerWorld
        );

        particleMat.uniforms.uPointerActive.value = 1;
      }
    }
  );


  renderer.domElement.addEventListener(
    "pointerleave",
    () => {
      pointerActive = 0;

      particleMat.uniforms.uPointerActive.value = 0;
    }
  );


  renderer.domElement.addEventListener(
    "pointerup",
    e => {
      dragging = false;

      if (moved) return;

      setRayFromEvent(e);

      const hits = raycaster.intersectObjects(
        hitAreas,
        false
      );

      if (hits.length) {
        const mode = hits[0].object.userData.mode;

        setMode(mode, true);

        triggerPulse(hits[0].point);
      } else {
        const p = planePoint(e, 2.0);

        if (p) {
          triggerPulse(p);

          showToast(
            "校园感知触发 · 粒子脉冲正在传播"
          );
        }
      }
    }
  );


  renderer.domElement.addEventListener(
    "pointercancel",
    () => {
      dragging = false;
    }
  );


  renderer.domElement.addEventListener(
    "wheel",
    e => {
      distance = THREE.MathUtils.clamp(
        distance + e.deltaY * 0.035,
        33,
        75
      );
    },
    { passive: true }
  );


  /* =========================================
     20. 点击后扩散的粒子脉冲
  ========================================= */

  const pulseRings = [];


  function triggerPulse(p) {
    pulseCenter.copy(p);

    pulseAge = 0;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(
        0.8,
        0.025,
        5,
        64
      ),

      new THREE.MeshBasicMaterial({
        color: 0x62edff,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );

    ring.rotation.x = Math.PI / 2;

    ring.position.set(
      p.x,
      0.13,
      p.z
    );

    scene.add(ring);

    ring.userData.age = 0;

    pulseRings.push(ring);
  }


  /* =========================================
     21. 自动环绕与复位按钮
  ========================================= */

  document.querySelector(
    "#autoOrbit"
  ).addEventListener("click", e => {
    autoRotate = !autoRotate;

    e.currentTarget.classList.toggle(
      "on",
      autoRotate
    );

    e.currentTarget.querySelector(
      "b"
    ).textContent = autoRotate ? "ON" : "OFF";

    showToast(
      autoRotate
        ? "自动环绕已开启"
        : "自动环绕已暂停 · 可手动调整视角"
    );
  });


  document.querySelector(
    "#resetView"
  ).addEventListener("click", () => {
    azimuth = initialView.azimuth;

    polar = initialView.polar;

    distance = initialView.distance;

    target.copy(initialView.target);

    autoRotate = false;

    const btn = document.querySelector("#autoOrbit");

    btn.classList.remove("on");

    btn.querySelector("b").textContent = "OFF";

    showToast(
      "视角已复位 · 拖动即可重新观察校园"
    );
  });


  /* =========================================
     22. 主动画循环
  ========================================= */

  const clock = new THREE.Clock();

  let elapsed = 0;


  function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(
      clock.getDelta(),
      0.04
    );

    elapsed += dt;

    // 主建筑粒子逐渐聚合。
    particleMat.uniforms.uTime.value = elapsed;

    particleMat.uniforms.uAssemble.value =
      Math.min(1, elapsed / 5.6);

    // 鼠标扰动。
    particleMat.uniforms.uPointerActive.value =
      pointerActive;

    // 粒子脉冲计时。
    particleMat.uniforms.uPulseAge.value =
      pulseAge;

    // 数据流与全息轨道时间。
    flowMat.uniforms.uTime.value = elapsed;

    orbitMat.uniforms.uTime.value = elapsed;

    pulseAge += dt;


    // 感知、分析、决策、响应的循环。
    if (window.__cycleBase) {
      const step = Math.floor(
        (performance.now() - window.__cycleBase) / 520
      ) % 4;

      document
        .querySelectorAll(".cycle-step")
        .forEach((el, i) => {
          el.classList.toggle(
            "current",
            i === step
          );
        });
    }


    // 更新正在扩散的点击脉冲。
    for (let i = pulseRings.length - 1; i >= 0; i--) {
      const r = pulseRings[i];

      r.userData.age += dt;

      const t = r.userData.age;

      r.scale.setScalar(
        1 + t * 3.8
      );

      r.material.opacity = Math.max(
        0,
        0.8 - t * 0.42
      );

      if (t > 2.0) {
        scene.remove(r);

        r.geometry.dispose();
        r.material.dispose();

        pulseRings.splice(i, 1);
      }
    }


    // 自动旋转镜头。
    if (autoRotate && !dragging) {
      azimuth += dt * 0.018;
    }

    const sinP = Math.sin(polar);

    camera.position.set(
      target.x + Math.sin(azimuth) * distance * sinP,

      target.y + Math.cos(polar) * distance,

      target.z + Math.cos(azimuth) * distance * sinP
    );

    camera.lookAt(target);

    renderer.render(scene, camera);
  }


  // 初始启动。
  setMode("ai", false);

  animate();


  /* =========================================
     23. 屏幕尺寸变化
  ========================================= */

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      innerWidth,
      innerHeight
    );

    renderer.setPixelRatio(
      Math.min(devicePixelRatio, 1.65)
    );
  });
}