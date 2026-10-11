// ======================================================
// 商丘工学院 · AI 未来概念校园
// Three.js 粒子校园 / 实时交互版本
// ======================================================

const stage = document.getElementById('stage');
const loadError = document.getElementById('loadError');

function showError(message) {
  if (loadError) {
    loadError.hidden = false;
    loadError.textContent = message;
  }
}

if (!stage) {
  showError('没有找到三维场景容器 #stage，请检查 index.html。');
  throw new Error('Missing #stage');
}

let THREE;

try {
  THREE = await import(
    'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'
  );
} catch (error) {
  console.error('Three.js 加载失败：', error);

  showError(
    'Three.js 加载失败。\n\n' +
    '请检查网络连接，确认可以访问 jsdelivr.net，' +
    '再刷新网页。\n\n' +
    '具体错误：' +
    (error?.message || '未知错误')
  );

  throw error;
}

// ======================================================
// 1. 场景初始化
// ======================================================

const scene = new THREE.Scene();

scene.background = new THREE.Color('#061426');

scene.fog = new THREE.FogExp2(
  '#061426',
  0.0031
);

const camera = new THREE.PerspectiveCamera(
  45,
  1,
  0.1,
  1200
);

camera.position.set(0, 64, 132);
camera.lookAt(0, 12, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance'
});

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio || 1, 1.7)
);

renderer.setSize(
  Math.max(stage.clientWidth, 1),
  Math.max(stage.clientHeight, 1)
);

renderer.outputColorSpace = THREE.SRGBColorSpace;

stage.appendChild(renderer.domElement);

renderer.domElement.style.display = 'block';
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
renderer.domElement.style.touchAction = 'none';

// 基础光照
scene.add(
  new THREE.AmbientLight(0x7abaff, 1.6)
);

const keyLight = new THREE.PointLight(
  0x48d9ff,
  1600,
  380
);

keyLight.position.set(0, 85, 30);
scene.add(keyLight);

const fillLight = new THREE.PointLight(
  0x337cff,
  1000,
  340
);

fillLight.position.set(-65, 35, -25);
scene.add(fillLight);

// 所有校园建筑统一放在一个组里
const campus = new THREE.Group();

scene.add(campus);

// 当前模式
let currentMode = 'ai';

// 自动环绕
let autoOrbitEnabled = true;

// 当前相机轨道旋转
let rotationY = 0;
let targetRotationY = 0;

let rotationX = -0.20;
let targetRotationX = -0.20;

let zoom = 1;
let targetZoom = 1;

// 粒子系统记录
const clouds = [];
const flowSystems = [];
const animatedRings = [];
const allConnections = [];

let activeParticleCount = 0;

// ======================================================
// 2. 模式配置
// ======================================================

const MODES = {
  ai: {
    name: 'AI 智慧教学',
    short: 'AI',
    number: '01',
    label: 'INTELLIGENT EDUCATION',
    color: 0x6deaff,
    cssColor: '#6deaff',

    role: 'teaching',

    status: '智慧教学系统已启动',

    detail:
      '教学建筑正在接入粒子数据网络。',

    toast:
      'AI 教学已启动 · 教学楼粒子正在响应'
  },

  manage: {
    name: '数字孪生',
    short: 'TWIN',
    number: '02',
    label: 'DIGITAL TWIN',

    color: 0x8cbcff,
    cssColor: '#8cbcff',

    role: 'management',

    status: '数字孪生正在扫描校园',

    detail:
      '建筑轮廓、楼层结构与场景粒子正在同步响应。',

    toast:
      '数字孪生已启动 · 建筑扫描与粒子脉冲已激活'
  },

  life: {
    name: '智慧校园生活',
    short: 'LIFE',
    number: '03',
    label: 'SMART CAMPUS LIFE',

    color: 0x70e9ff,
    cssColor: '#70e9ff',

    role: 'life',

    status: '校园生活空间已连接',

    detail:
      '揽月湖与校园公共空间正在产生联动波纹。',

    toast:
      '智慧生活已启动 · 湖面波纹与空间脉冲已激活'
  },

  energy: {
    name: '绿色能源网络',
    short: 'ENERGY',
    number: '04',
    label: 'GREEN ENERGY NETWORK',

    color: 0x70ffd0,
    cssColor: '#70ffd0',

    role: 'energy',

    status: '绿色能源网络已激活',

    detail:
      '绿色能量粒子正在校园建筑与能源路径之间传输。',

    toast:
      '绿色能源已启动 · 能量路径正在发光'
  },

  transport: {
    name: '智慧交通调度',
    short: 'MOVE',
    number: '05',
    label: 'INTELLIGENT TRANSPORT',

    color: 0xffce83,
    cssColor: '#ffce83',

    role: 'transport',

    status: '智慧交通系统已激活',

    detail:
      '道路光流正在环形校园路径中持续运动。',

    toast:
      '智慧交通已启动 · 校园道路光流已激活'
  }
};

// ======================================================
// 3. 粒子材质与建筑生成工具
// ======================================================

function addParticleCloud(
  points,
  color,
  size,
  opacity,
  role = 'general',
  options = {}
) {
  if (!points.length) return null;

  const positions = new Float32Array(
    points.length * 3
  );

  for (let i = 0; i < points.length; i++) {
    positions[i * 3] = points[i].x;
    positions[i * 3 + 1] = points[i].y;
    positions[i * 3 + 2] = points[i].z;
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3)
  );

  const material = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity,

    blending: THREE.AdditiveBlending,

    depthWrite: false,
    sizeAttenuation: true
  });

  const pointsObject = new THREE.Points(
    geometry,
    material
  );

  pointsObject.frustumCulled = false;

  campus.add(pointsObject);

  const basePositions = positions.slice();

  pointsObject.userData = {
    role,
    basePositions,
    originalColor: color,
    originalOpacity: opacity,
    originalSize: size,

    phase: Math.random() * Math.PI * 2,

    waveStrength: options.waveStrength ?? 0.10
  };

  clouds.push(pointsObject);

  activeParticleCount += points.length;

  return pointsObject;
}

// 生成建筑表面粒子
function createBuilding(options) {
  const {
    x,
    z,
    width,
    depth,
    height,
    color,
    role = 'general',
    density = 1
  } = options;

  const points = [];

  const left = x - width / 2;
  const right = x + width / 2;

  const front = z - depth / 2;
  const back = z + depth / 2;

  // --------------------------------------------------
  // 建筑四条竖向外轮廓
  // --------------------------------------------------

  const corners = [
    [left, front],
    [right, front],
    [right, back],
    [left, back]
  ];

  for (const [cx, cz] of corners) {
    for (let y = 0; y <= height; y += 0.65) {
      points.push({
        x: cx,
        y,
        z: cz
      });
    }
  }

  // --------------------------------------------------
  // 建筑立面网格与窗格
  // --------------------------------------------------

  const horizontalStep = Math.max(
    0.9,
    1.5 / density
  );

  const verticalStep = Math.max(
    0.85,
    1.35 / density
  );

  // 前后立面
  for (
    let px = left;
    px <= right;
    px += horizontalStep
  ) {
    for (
      let py = 0;
      py <= height;
      py += verticalStep
    ) {
      points.push({
        x: px,
        y: py,
        z: front
      });

      points.push({
        x: px,
        y: py,
        z: back
      });
    }
  }

  // 左右立面
  for (
    let pz = front;
    pz <= back;
    pz += horizontalStep
  ) {
    for (
      let py = 0;
      py <= height;
      py += verticalStep
    ) {
      points.push({
        x: left,
        y: py,
        z: pz
      });

      points.push({
        x: right,
        y: py,
        z: pz
      });
    }
  }

  // --------------------------------------------------
  // 每层楼的环形横向结构
  // --------------------------------------------------

  for (
    let y = 2.2;
    y < height;
    y += 3.2
  ) {
    for (
      let px = left;
      px <= right;
      px += 0.62
    ) {
      points.push({
        x: px,
        y,
        z: front
      });

      points.push({
        x: px,
        y,
        z: back
      });
    }

    for (
      let pz = front;
      pz <= back;
      pz += 0.62
    ) {
      points.push({
        x: left,
        y,
        z: pz
      });

      points.push({
        x: right,
        y,
        z: pz
      });
    }
  }

  // --------------------------------------------------
  // 密集立面内部粒子
  // --------------------------------------------------

  const surfaceCount = Math.floor(
    width * depth * height * 1.25 * density
  );

  for (let i = 0; i < surfaceCount; i++) {
    const side = Math.floor(
      Math.random() * 4
    );

    let px;
    let pz;

    if (side === 0) {
      px = left + Math.random() * width;
      pz = front;
    } else if (side === 1) {
      px = left + Math.random() * width;
      pz = back;
    } else if (side === 2) {
      px = left;
      pz = front + Math.random() * depth;
    } else {
      px = right;
      pz = front + Math.random() * depth;
    }

    const py = Math.random() * height;

    points.push({
      x: px,
      y: py,
      z: pz
    });
  }

  // --------------------------------------------------
  // 顶部轮廓与屋顶粒子
  // --------------------------------------------------

  for (
    let px = left;
    px <= right;
    px += 0.5
  ) {
    points.push({
      x: px,
      y: height,
      z: front
    });

    points.push({
      x: px,
      y: height,
      z: back
    });
  }

  for (
    let pz = front;
    pz <= back;
    pz += 0.5
  ) {
    points.push({
      x: left,
      y: height,
      z: pz
    });

    points.push({
      x: right,
      y: height,
      z: pz
    });
  }

  // 屋顶散布粒子
  const roofCount = Math.floor(
    width * depth * 1.5
  );

  for (let i = 0; i < roofCount; i++) {
    points.push({
      x: left + Math.random() * width,
      y: height + Math.random() * 0.35,
      z: front + Math.random() * depth
    });
  }

  const cloud = addParticleCloud(
    points,
    color,
    0.78,
    0.88,
    role,
    {
      waveStrength: 0.10
    }
  );

  return cloud;
}

// ======================================================
// 4. 环形粒子道路
// ======================================================

function createRingParticles(
  radius,
  count,
  color,
  role = 'general',
  options = {}
) {
  const points = [];

  const verticalRadius = options.verticalRadius ?? 0.6;

  for (let i = 0; i < count; i++) {
    const angle =
      Math.random() * Math.PI * 2;

    const r =
      radius + (Math.random() - 0.5) * 0.7;

    points.push({
      x: Math.cos(angle) * r,
      y: (Math.random() - 0.5) * verticalRadius,
      z: Math.sin(angle) * r
    });
  }

  return addParticleCloud(
    points,
    color,
    options.size ?? 0.65,
    options.opacity ?? 0.8,
    role
  );
}

// 地面网格粒子
function createGround() {
  const points = [];

  for (
    let x = -100;
    x <= 100;
    x += 2.8
  ) {
    for (
      let z = -100;
      z <= 100;
      z += 2.8
    ) {
      if (Math.random() > 0.42) continue;

      points.push({
        x,
        y: -0.22,
        z
      });
    }
  }

  addParticleCloud(
    points,
    0x28639b,
    0.38,
    0.45,
    'general'
  );
}

createGround();

// 三条大型环形道路
createRingParticles(
  64,
  2100,
  0x269fe0,
  'transport',
  {
    size: 0.70,
    opacity: 0.78
  }
);

createRingParticles(
  48,
  1700,
  0x367fff,
  'transport',
  {
    size: 0.65,
    opacity: 0.72
  }
);

createRingParticles(
  30,
  1200,
  0x46d5ff,
  'transport',
  {
    size: 0.65,
    opacity: 0.75
  }
);

// ======================================================
// 5. 校园建筑
// ======================================================

// 左侧教学楼群
createBuilding({
  x: -35,
  z: -14,
  width: 24,
  depth: 16,
  height: 24,
  color: 0x66d8ff,
  role: 'teaching',
  density: 1.1
});

createBuilding({
  x: -35,
  z: 8,
  width: 24,
  depth: 17,
  height: 31,
  color: 0x47bfff,
  role: 'teaching',
  density: 1.1
});

// 右侧教学楼群
createBuilding({
  x: 35,
  z: -13,
  width: 24,
  depth: 17,
  height: 28,
  color: 0x62d8ff,
  role: 'teaching',
  density: 1.1
});

createBuilding({
  x: 35,
  z: 10,
  width: 24,
  depth: 17,
  height: 23,
  color: 0x42acff,
  role: 'teaching',
  density: 1.1
});

// 后方科研建筑
createBuilding({
  x: -17,
  z: -40,
  width: 23,
  depth: 15,
  height: 21,
  color: 0x49c5ff,
  role: 'management',
  density: 1.0
});

createBuilding({
  x: 17,
  z: -40,
  width: 23,
  depth: 15,
  height: 25,
  color: 0x57bfff,
  role: 'management',
  density: 1.0
});

// 两侧低层公共建筑
createBuilding({
  x: -57,
  z: 8,
  width: 12,
  depth: 22,
  height: 13,
  color: 0x389aff,
  role: 'life',
  density: 1.0
});

createBuilding({
  x: 57,
  z: 8,
  width: 12,
  depth: 22,
  height: 15,
  color: 0x4baeff,
  role: 'life',
  density: 1.0
});

// ======================================================
// 6. 中央高塔
// ======================================================

function createCentralTower() {
  const points = [];

  const height = 53;

  // 塔身环形层
  for (
    let y = 0;
    y <= height;
    y += 0.48
  ) {
    const radius =
      8.2 - (y / height) * 4.9;

    const count = 110;

    for (let i = 0; i < count; i++) {
      const a =
        (i / count) * Math.PI * 2;

      points.push({
        x: Math.cos(a) * radius,
        y,
        z: Math.sin(a) * radius
      });
    }
  }

  // 塔身连续螺旋
  for (let i = 0; i < 4400; i++) {
    const t = i / 4400;

    const y = t * height;

    const radius =
      8.2 - t * 4.9;

    const a =
      t * Math.PI * 26;

    points.push({
      x: Math.cos(a) * radius,
      y,
      z: Math.sin(a) * radius
    });
  }

  // 塔顶光点
  for (let i = 0; i < 420; i++) {
    const a =
      Math.random() * Math.PI * 2;

    const r = Math.random() * 3.8;

    points.push({
      x: Math.cos(a) * r,
      y: height + Math.random() * 9,
      z: Math.sin(a) * r
    });
  }

  addParticleCloud(
    points,
    0x9aeeff,
    0.90,
    0.98,
    'teaching',
    {
      waveStrength: 0.12
    }
  );
}

createCentralTower();

// ======================================================
// 7. 揽月湖
// ======================================================

function createLake() {
  const points = [];

  const lakeX = 3;
  const lakeZ = 25;

  const lakeWidth = 37;
  const lakeDepth = 23;

  for (let i = 0; i < 4200; i++) {
    const angle =
      Math.random() * Math.PI * 2;

    const r = Math.sqrt(
      Math.random()
    );

    const x =
      Math.cos(angle) * r * lakeWidth;

    const z =
      Math.sin(angle) * r * lakeDepth;

    points.push({
      x: lakeX + x,
      y: 0.22 + Math.random() * 0.3,
      z: lakeZ + z
    });
  }

  addParticleCloud(
    points,
    0x2bafff,
    0.65,
    0.70,
    'life',
    {
      waveStrength: 0.15
    }
  );

  // 水面环形波纹
  for (let ring = 0; ring < 5; ring++) {
    const ringPoints = [];

    const radius = 3.0 + ring * 2.8;

    for (let i = 0; i < 160; i++) {
      const a =
        (i / 160) * Math.PI * 2;

      ringPoints.push({
        x: lakeX + Math.cos(a) * radius,
        y: 0.62,
        z: lakeZ + Math.sin(a) * radius * 0.72
      });
    }

    const cloud = addParticleCloud(
      ringPoints,
      0x75eaff,
      0.78,
      0.8,
      'life'
    );

    if (cloud) {
      animatedRings.push({
        cloud,
        base: cloud.userData.basePositions.slice(),
        phase: ring * 0.7
      });
    }
  }
}

createLake();

// ======================================================
// 8. 网络连接线
// ======================================================

// 用大量线段粒子表现建筑之间的连接
function createConnection(
  start,
  end,
  role,
  color
) {
  const points = [];

  const distance = Math.hypot(
    end.x - start.x,
    end.y - start.y,
    end.z - start.z
  );

  const count = Math.max(
    60,
    Math.floor(distance * 12)
  );

  for (let i = 0; i <= count; i++) {
    const t = i / count;

    const arc =
      Math.sin(t * Math.PI) * 2.8;

    points.push({
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t + arc,
      z: start.z + (end.z - start.z) * t
    });
  }

  const cloud = addParticleCloud(
    points,
    color,
    0.54,
    0.58,
    role,
    {
      waveStrength: 0.02
    }
  );

  if (cloud) {
    allConnections.push({
      cloud,
      role
    });
  }
}

// 高塔连接教学楼
createConnection(
  { x: 0, y: 24, z: 0 },
  { x: -35, y: 15, z: -14 },
  'teaching',
  0x56dfff
);

createConnection(
  { x: 0, y: 26, z: 0 },
  { x: 35, y: 14, z: -13 },
  'teaching',
  0x56dfff
);

createConnection(
  { x: 0, y: 20, z: 0 },
  { x: -17, y: 14, z: -40 },
  'management',
  0x78b9ff
);

createConnection(
  { x: 0, y: 20, z: 0 },
  { x: 17, y: 15, z: -40 },
  'management',
  0x78b9ff
);

// 建筑与能源网络连接
createConnection(
  { x: -35, y: 10, z: 5 },
  { x: 3, y: 2, z: 25 },
  'energy',
  0x76ffd5
);

createConnection(
  { x: 35, y: 10, z: 5 },
  { x: 3, y: 2, z: 25 },
  'energy',
  0x76ffd5
);

// ======================================================
// 9. 道路能量流：沿路径运动的粒子
// ======================================================

function createFlowPath(
  points,
  role,
  color,
  count = 100
) {
  const geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(
    count * 3
  );

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      positions,
      3
    )
  );

  const material = new THREE.PointsMaterial({
    color,
    size: 1.25,
    transparent: true,
    opacity: 0.95,

    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const flow = new THREE.Points(
    geometry,
    material
  );

  flow.frustumCulled = false;

  campus.add(flow);

  flowSystems.push({
    flow,
    points,
    role,
    count,
    speed: 0.19 + Math.random() * 0.13,
    offset: Math.random()
  });

  activeParticleCount += count;

  return flow;
}

function makeCircularPath(radius, count, y = 0.8) {
  const points = [];

  for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI * 2;

    points.push({
      x: Math.cos(a) * radius,
      y,
      z: Math.sin(a) * radius
    });
  }

  return points;
}

createFlowPath(
  makeCircularPath(64, 1000, 0.9),
  'transport',
  0xffcf83,
  110
);

createFlowPath(
  makeCircularPath(48, 1000, 0.95),
  'transport',
  0xffe2aa,
  90
);

createFlowPath(
  [
    { x: 0, y: 3, z: 0 },
    { x: -17, y: 3, z: -40 },
    { x: -35, y: 3, z: -14 },
    { x: 0, y: 3, z: 0 },
    { x: 35, y: 3, z: -13 },
    { x: 17, y: 3, z: -40 }
  ],
  'energy',
  0x6dffd0,
  90
);

createFlowPath(
  [
    { x: -35, y: 8, z: 8 },
    { x: -20, y: 6, z: 8 },
    { x: 0, y: 5, z: 0 },
    { x: 20, y: 6, z: 8 },
    { x: 35, y: 8, z: 8 }
  ],
  'teaching',
  0x8aecff,
  80
);

// ======================================================
// 10. 漂浮星尘
// ======================================================

const stars = [];

for (let i = 0; i < 1800; i++) {
  stars.push({
    x: (Math.random() - 0.5) * 240,
    y: Math.random() * 90 + 4,
    z: (Math.random() - 0.5) * 240
  });
}

const starPositions = new Float32Array(
  stars.length * 3
);

stars.forEach((p, i) => {
  starPositions[i * 3] = p.x;
  starPositions[i * 3 + 1] = p.y;
  starPositions[i * 3 + 2] = p.z;
});

const starGeometry = new THREE.BufferGeometry();

starGeometry.setAttribute(
  'position',
  new THREE.BufferAttribute(
    starPositions,
    3
  )
);

const starMaterial = new THREE.PointsMaterial({
  color: 0x5b9ed9,
  size: 0.48,
  transparent: true,
  opacity: 0.65,
  depthWrite: false,

  blending: THREE.AdditiveBlending
});

const starField = new THREE.Points(
  starGeometry,
  starMaterial
);

starField.frustumCulled = false;

scene.add(starField);

// ======================================================
// 11. 点击扩散波
// ======================================================

const pulseSystems = [];

function createPulse(position) {
  const geometry = new THREE.BufferGeometry();

  const count = 240;

  const positions = new Float32Array(
    count * 3
  );

  const angles = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    angles[i] =
      (i / count) * Math.PI * 2;

    positions[i * 3] =
      position.x + Math.cos(angles[i]) * 0.1;

    positions[i * 3 + 1] =
      position.y + 0.3;

    positions[i * 3 + 2] =
      position.z + Math.sin(angles[i]) * 0.1;
  }

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      positions,
      3
    )
  );

  const material = new THREE.PointsMaterial({
    color: MODES[currentMode].color,
    size: 1.05,
    transparent: true,
    opacity: 1,

    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const ring = new THREE.Points(
    geometry,
    material
  );

  ring.frustumCulled = false;

  campus.add(ring);

  pulseSystems.push({
    ring,
    geometry,
    angles,
    position: position.clone(),
    age: 0,
    duration: 1.5
  });
}

// ======================================================
// 12. 模式切换：控制真实粒子
// ======================================================

const modeMetricText = document.getElementById('metricMode');
const modeMetricLabel = document.getElementById('metricModeLabel');

const modeTitleElement = document.getElementById('modeTitle');
const modeEyebrowElement = document.getElementById('modeEyebrow');

const responseText = document.getElementById('responseText');
const responseDetail = document.getElementById('responseDetail');

const responseProgressBar =
  document.getElementById('responseProgressBar');

const responsePercent =
  document.getElementById('responsePercent');

const globalStatus = document.getElementById('globalStatus');

let modeChangeTime = 0;

function isHighlightedRole(role, mode) {
  if (mode === 'manage') {
    return [
      'teaching',
      'management',
      'life',
      'energy',
      'transport',
      'general'
    ].includes(role);
  }

  if (mode === 'ai') {
    return [
      'teaching',
      'general'
    ].includes(role);
  }

  if (mode === 'life') {
    return [
      'life',
      'general'
    ].includes(role);
  }

  if (mode === 'energy') {
    return [
      'energy',
      'general'
    ].includes(role);
  }

  if (mode === 'transport') {
    return [
      'transport',
      'general'
    ].includes(role);
  }

  return true;
}

function switchMode(mode) {
  if (!MODES[mode]) return;

  currentMode = mode;
  modeChangeTime = clock.getElapsedTime();

  const config = MODES[mode];

  // 同步左右面板的所有按钮
  document.querySelectorAll('[data-mode]').forEach(button => {
    const isActive =
      button.dataset.mode === mode;

    button.classList.toggle(
      'active',
      isActive
    );

    button.setAttribute(
      'aria-pressed',
      String(isActive)
    );
  });

  // 当前模式标题
  if (modeTitleElement) {
    modeTitleElement.textContent =
      config.name;
  }

  if (modeEyebrowElement) {
    modeEyebrowElement.textContent =
      `CAMPUS MODE / ${config.number}`;
  }

  if (modeMetricText) {
    modeMetricText.textContent =
      config.short;
  }

  if (modeMetricLabel) {
    modeMetricLabel.textContent =
      config.label;
  }

  if (responseText) {
    responseText.textContent =
      config.status;
  }

  if (responseDetail) {
    responseDetail.textContent =
      config.detail;
  }

  if (globalStatus) {
    globalStatus.textContent =
      config.label;
  }

  if (responseProgressBar) {
    responseProgressBar.style.width =
      '100%';
  }

  if (responsePercent) {
    responsePercent.textContent =
      '100%';
  }

  // 更新场景标注的强调色
  document.querySelectorAll('.scene-callout').forEach(el => {
    el.classList.remove('mode-highlight');
  });

  const highlightMap = {
    ai: '.callout-tower',
    manage: '.callout-data',
    life: '.callout-green',
    energy: '.callout-green',
    transport: '.callout-data'
  };

  const targetCallout = document.querySelector(
    highlightMap[mode]
  );

  targetCallout?.classList.add(
    'mode-highlight'
  );

  // 使模式变化对建筑粒子产生明显影响
  clouds.forEach(cloud => {
    const data = cloud.userData;

    const active = isHighlightedRole(
      data.role,
      mode
    );

    data.targetOpacity = active
      ? Math.min(1, data.originalOpacity * 1.15)
      : Math.max(0.20, data.originalOpacity * 0.48);

    data.targetSize = active
      ? data.originalSize * 1.4
      : data.originalSize * 0.72;

    if (active) {
      data.targetColor = config.color;
    } else {
      data.targetColor = data.originalColor;
    }
  });

  // 网络连接也响应模式
  allConnections.forEach(item => {
    const active = isHighlightedRole(
      item.role,
      mode
    );

    item.cloud.material.opacity =
      active ? 0.95 : 0.15;

    item.cloud.material.size =
      active ? 0.85 : 0.42;

    if (active) {
      item.cloud.material.color.setHex(
        config.color
      );
    } else {
      item.cloud.material.color.setHex(
        0x28628b
      );
    }
  });

  // 动态数据流响应模式
  flowSystems.forEach(system => {
    const active = isHighlightedRole(
      system.role,
      mode
    );

    system.flow.material.opacity =
      active ? 1 : 0.06;

    system.flow.material.size =
      active ? 1.5 : 0.65;

    system.flow.material.color.setHex(
      active ? config.color : 0x244963
    );
  });

  // 给建筑产生一个明显的全局脉冲
  createPulse(
    new THREE.Vector3(0, 0.6, 0)
  );

  showToast(config.toast);

  console.log(
    `Campus mode changed: ${mode}`
  );
}

// ======================================================
// 13. 模块按钮绑定
// ======================================================

document.querySelectorAll('[data-mode]').forEach(button => {
  button.addEventListener('click', () => {
    switchMode(button.dataset.mode);
  });
});

// ======================================================
// 14. 可收纳面板
// ======================================================

const panelToggle =
  document.getElementById('panelToggle');

const panelToggleText =
  document.getElementById('panelToggleText');

const panelBackdrop =
  document.getElementById('panelBackdrop');

function openPanels() {
  document.body.classList.add('panel-open');

  panelToggle?.setAttribute(
    'aria-expanded',
    'true'
  );

  if (panelToggleText) {
    panelToggleText.textContent = '收起面板';
  }
}

function closePanels() {
  document.body.classList.remove('panel-open');

  panelToggle?.setAttribute(
    'aria-expanded',
    'false'
  );

  if (panelToggleText) {
    panelToggleText.textContent = '交互中心';
  }
}

function togglePanels() {
  if (document.body.classList.contains('panel-open')) {
    closePanels();
  } else {
    openPanels();
  }
}

panelToggle?.addEventListener(
  'click',
  togglePanels
);

panelBackdrop?.addEventListener(
  'click',
  closePanels
);

document.querySelectorAll('[data-close-panels]').forEach(button => {
  button.addEventListener(
    'click',
    closePanels
  );
});

document.getElementById('closePanelBottom')?.addEventListener(
  'click',
  closePanels
);

// ESC 收起面板
window.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closePanels();
  }
});

// ======================================================
// 15. 消息提示
// ======================================================

const toastElement =
  document.getElementById('interactionToast');

let toastTimer = null;

function showToast(message) {
  if (!toastElement) return;

  toastElement.textContent = message;
  toastElement.classList.add('show');

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toastElement.classList.remove('show');
  }, 2400);
}

// ======================================================
// 16. 自动环绕和视角复位
// ======================================================

const orbitButton =
  document.getElementById('autoOrbit');

const orbitState =
  document.getElementById('orbitState');

function updateOrbitButton() {
  orbitButton?.classList.toggle(
    'on',
    autoOrbitEnabled
  );

  orbitButton?.setAttribute(
    'aria-pressed',
    String(autoOrbitEnabled)
  );

  if (orbitState) {
    orbitState.textContent =
      autoOrbitEnabled ? 'ON' : 'OFF';
  }
}

orbitButton?.addEventListener('click', () => {
  autoOrbitEnabled = !autoOrbitEnabled;

  updateOrbitButton();

  showToast(
    autoOrbitEnabled
      ? '自动环绕已开启'
      : '自动环绕已暂停'
  );
});

document.getElementById('resetView')?.addEventListener(
  'click',
  () => {
    targetRotationY = 0;
    targetRotationX = -0.20;
    targetZoom = 1;

    campus.position.set(0, 0, 0);

    showToast('三维视角已复位');
  }
);

// ======================================================
// 17. 鼠标与手机触摸旋转
// ======================================================

const raycaster = new THREE.Raycaster();

const pointer = new THREE.Vector2();

const horizontalPlane = new THREE.Plane(
  new THREE.Vector3(0, 1, 0),
  0
);

let pointerDown = false;

let pointerStartX = 0;
let pointerStartY = 0;

let lastPointerX = 0;
let lastPointerY = 0;

let pointerMoved = false;

renderer.domElement.addEventListener(
  'pointerdown',
  event => {
    pointerDown = true;
    pointerMoved = false;

    pointerStartX = event.clientX;
    pointerStartY = event.clientY;

    lastPointerX = event.clientX;
    lastPointerY = event.clientY;

    try {
      renderer.domElement.setPointerCapture(
        event.pointerId
      );
    } catch (_) {
      // 某些移动浏览器不支持时忽略
    }
  }
);

renderer.domElement.addEventListener(
  'pointermove',
  event => {
    if (!pointerDown) return;

    const dx =
      event.clientX - lastPointerX;

    const dy =
      event.clientY - lastPointerY;

    const totalMovement = Math.hypot(
      event.clientX - pointerStartX,
      event.clientY - pointerStartY
    );

    if (totalMovement > 5) {
      pointerMoved = true;
    }

    if (pointerMoved) {
      targetRotationY += dx * 0.006;

      targetRotationX += dy * 0.0035;

      targetRotationX =
        THREE.MathUtils.clamp(
          targetRotationX,
          -0.75,
          0.40
        );
    }

    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
  }
);

function finishPointer(event) {
  if (!pointerDown) return;

  pointerDown = false;

  if (!pointerMoved) {
    createClickPulse(
      event.clientX,
      event.clientY
    );
  }
}

renderer.domElement.addEventListener(
  'pointerup',
  finishPointer
);

renderer.domElement.addEventListener(
  'pointercancel',
  () => {
    pointerDown = false;
  }
);

// 点击画面的位置，产生局部波纹
function createClickPulse(clientX, clientY) {
  const rect =
    renderer.domElement.getBoundingClientRect();

  pointer.x =
    ((clientX - rect.left) / rect.width) * 2 - 1;

  pointer.y =
    -((clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const worldPoint = new THREE.Vector3();

  const hit = raycaster.ray.intersectPlane(
    horizontalPlane,
    worldPoint
  );

  if (!hit) return;

  const localPoint = campus.worldToLocal(
    worldPoint.clone()
  );

  // 避免在远离校园的位置生成波纹
  const distance = Math.hypot(
    localPoint.x,
    localPoint.z
  );

  if (distance > 120) return;

  createPulse(localPoint);

  showToast('场景已响应 · 粒子脉冲已触发');
}

// 双指缩放
let previousPinchDistance = 0;

renderer.domElement.addEventListener(
  'touchmove',
  event => {
    if (event.touches.length !== 2) return;

    event.preventDefault();

    const dx =
      event.touches[0].clientX -
      event.touches[1].clientX;

    const dy =
      event.touches[0].clientY -
      event.touches[1].clientY;

    const distance = Math.hypot(dx, dy);

    if (previousPinchDistance > 0) {
      targetZoom *=
        distance / previousPinchDistance;

      targetZoom =
        THREE.MathUtils.clamp(
          targetZoom,
          0.60,
          1.80
        );
    }

    previousPinchDistance = distance;
  },
  {
    passive: false
  }
);

renderer.domElement.addEventListener(
  'touchend',
  () => {
    previousPinchDistance = 0;
  }
);

// 鼠标滚轮缩放
renderer.domElement.addEventListener(
  'wheel',
  event => {
    targetZoom *=
      event.deltaY > 0 ? 0.94 : 1.06;

    targetZoom =
      THREE.MathUtils.clamp(
        targetZoom,
        0.60,
        1.80
      );
  },
  {
    passive: true
  }
);

// ======================================================
// 18. 动画更新
// ======================================================

const clock = new THREE.Clock();

let lastMetricUpdate = 0;

function animateBuildings(elapsed) {
  clouds.forEach((cloud, index) => {
    const data = cloud.userData;

    const position =
      cloud.geometry.attributes.position;

    const base =
      data.basePositions;

    const modeAge =
      elapsed - modeChangeTime;

    const transitionPulse =
      Math.max(
        0,
        1 - modeAge / 1.5
      );

    // 平滑切换颜色、亮度与尺寸
    if (data.targetColor !== undefined) {
      cloud.material.color.lerp(
        new THREE.Color(data.targetColor),
        0.075
      );
    }

    if (data.targetOpacity !== undefined) {
      cloud.material.opacity +=
        (data.targetOpacity -
          cloud.material.opacity) * 0.10;
    }

    if (data.targetSize !== undefined) {
      cloud.material.size +=
        (data.targetSize -
          cloud.material.size) * 0.10;
    }

    const roleActive = isHighlightedRole(
      data.role,
      currentMode
    );

    const responseStrength =
      roleActive ? 1 : 0.45;

    const frequency =
      0.85 + (index % 5) * 0.15;

    // 建筑立面产生轻微粒子起伏。
    // 不改变建筑整体结构，但让响应更容易看见。
    for (
      let i = 0;
      i < position.count;
      i++
    ) {
      const j = i * 3;

      const bx = base[j];
      const by = base[j + 1];
      const bz = base[j + 2];

      const wave =
        Math.sin(
          elapsed * 2.0 +
          by * 0.12 +
          data.phase
        );

      const verticalResponse =
        Math.sin(
          elapsed * frequency +
          by * 0.18 +
          data.phase
        );

      const scanPhase =
        ((by / 55) - elapsed * 0.42) % 1;

      let scan = 0;

      if (scanPhase > -0.025 && scanPhase < 0.025) {
        scan = 1;
      }

      const pulseBoost =
        transitionPulse * 1.5;

      position.array[j] =
        bx +
        Math.sin(elapsed + bz * 0.08) *
        data.waveStrength *
        responseStrength;

      position.array[j + 1] =
        by +
        verticalResponse *
        0.06 *
        responseStrength;

      position.array[j + 2] =
        bz +
        wave *
        data.waveStrength *
        responseStrength;

      // 扫描模式下，竖向位置不同的粒子会产生亮度变化
      if (currentMode === 'manage') {
        const brightness =
          Math.max(0, 1 - Math.abs(scanPhase) * 35);

        cloud.material.opacity =
          Math.min(
            1,
            data.originalOpacity * 0.88 +
            brightness * 0.35 +
            pulseBoost * 0.10
          );
      }
    }

    position.needsUpdate = true;
  });
}

function animateFlows(elapsed) {
  flowSystems.forEach(system => {
    const { flow, points, count } = system;

    const position =
      flow.geometry.attributes.position;

    const pathLength = points.length;

    const pathPosition = t => {
      const clamped =
        ((t % 1) + 1) % 1;

      const scaled =
        clamped * (pathLength - 1);

      const i = Math.floor(scaled);
      const next =
        Math.min(i + 1, pathLength - 1);

      const blend =
        scaled - i;

      return new THREE.Vector3(
        THREE.MathUtils.lerp(
          points[i].x,
          points[next].x,
          blend
        ),

        THREE.MathUtils.lerp(
          points[i].y,
          points[next].y,
          blend
        ),

        THREE.MathUtils.lerp(
          points[i].z,
          points[next].z,
          blend
        )
      );
    };

    for (let i = 0; i < count; i++) {
      const t =
        elapsed * system.speed +
        system.offset +
        i / count;

      const p = pathPosition(t);

      const j = i * 3;

      position.array[j] = p.x;
      position.array[j + 1] = p.y;
      position.array[j + 2] = p.z;
    }

    position.needsUpdate = true;
  });
}

function animateWater(elapsed) {
  animatedRings.forEach(item => {
    const position =
      item.cloud.geometry.attributes.position;

    const base = item.base;

    for (let i = 0; i < position.count; i++) {
      const j = i * 3;

      const bx = base[j];
      const by = base[j + 1];
      const bz = base[j + 2];

      const wave =
        Math.sin(
          elapsed * 2 +
          item.phase +
          i * 0.07
        );

      position.array[j] = bx;
      position.array[j + 1] =
        by + wave * 0.12;

      position.array[j + 2] = bz;
    }

    position.needsUpdate = true;

    if (currentMode === 'life') {
      item.cloud.material.opacity =
        0.65 +
        0.30 *
        (0.5 + 0.5 * Math.sin(
          elapsed * 2.2 + item.phase
        ));
    } else {
      item.cloud.material.opacity =
        0.42 +
        0.16 *
        (0.5 + 0.5 * Math.sin(
          elapsed + item.phase
        ));
    }
  });
}

function animatePulses(delta) {
  for (
    let i = pulseSystems.length - 1;
    i >= 0;
    i--
  ) {
    const pulse = pulseSystems[i];

    pulse.age += delta;

    const t = THREE.MathUtils.clamp(
      pulse.age / pulse.duration,
      0,
      1
    );

    const radius =
      0.8 + t * 18;

    const position =
      pulse.geometry.attributes.position;

    for (
      let p = 0;
      p < pulse.angles.length;
      p++
    ) {
      const angle = pulse.angles[p];

      const j = p * 3;

      position.array[j] =
        pulse.position.x +
        Math.cos(angle) * radius;

      position.array[j + 1] =
        pulse.position.y +
        Math.sin(angle * 5 + pulse.age * 5) * 0.3;

      position.array[j + 2] =
        pulse.position.z +
        Math.sin(angle) * radius;
    }

    position.needsUpdate = true;

    pulse.ring.material.opacity =
      Math.max(0, 1 - t);

    pulse.ring.material.size =
      1.4 - t * 0.7;

    if (t >= 1) {
      campus.remove(pulse.ring);

      pulse.geometry.dispose();
      pulse.ring.material.dispose();

      pulseSystems.splice(i, 1);
    }
  }
}

function updateModeResponse(elapsed) {
  // 短暂脉冲结束后，让进度条保持稳定。
  const age =
    elapsed - modeChangeTime;

  const progress =
    Math.min(
      100,
      Math.round(80 + Math.min(age, 1.5) / 1.5 * 20)
    );

  if (responseProgressBar) {
    responseProgressBar.style.width =
      `${progress}%`;
  }

  if (responsePercent) {
    responsePercent.textContent =
      `${progress}%`;
  }
}

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(
    clock.getDelta(),
    0.04
  );

  const elapsed =
    clock.elapsedTime;

  // 自动环绕
  if (autoOrbitEnabled && !pointerDown) {
    targetRotationY += delta * 0.055;
  }

  rotationY +=
    (targetRotationY - rotationY) * 0.08;

  rotationX +=
    (targetRotationX - rotationX) * 0.08;

  zoom +=
    (targetZoom - zoom) * 0.08;

  campus.rotation.y = rotationY;
  campus.rotation.x = rotationX;

  campus.scale.setScalar(zoom);

  // 背景星尘缓慢环绕
  starField.rotation.y =
    elapsed * 0.006;

  animateBuildings(elapsed);
  animateFlows(elapsed);
  animateWater(elapsed);
  animatePulses(delta);

  updateModeResponse(elapsed);

  // 页面上的粒子数量显示真实统计值
  if (
    elapsed - lastMetricUpdate > 0.5
  ) {
    lastMetricUpdate = elapsed;

    const metric =
      document.getElementById('particleMetric');

    if (metric) {
      metric.textContent =
        activeParticleCount.toLocaleString();
    }
  }

  renderer.render(
    scene,
    camera
  );
}

// ======================================================
// 19. 自适应大小
// ======================================================

function resize() {
  const width =
    Math.max(stage.clientWidth, 1);

  const height =
    Math.max(stage.clientHeight, 1);

  camera.aspect = width / height;

  camera.updateProjectionMatrix();

  renderer.setSize(
    width,
    height
  );
}

window.addEventListener(
  'resize',
  resize
);

// 首次打开页面的模式
switchMode('ai');

updateOrbitButton();

resize();

// 初始欢迎提示
setTimeout(() => {
  showToast(
    '校园粒子系统已启动 · 点击建筑可触发粒子波'
  );
}, 1000);

// 开始动画
animate();

console.log(
  'SQIST FUTURE CAMPUS / 初始化完成',
  {
    particleCount: activeParticleCount,
    buildings: 9,
    modes: Object.keys(MODES)
  }
);