import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const stage = document.getElementById('stage');

if (!stage) {
  document.body.innerHTML = `
    <div style="padding:24px;color:white;background:#071426;font-family:sans-serif">
      <h2>未找到校园渲染容器</h2>
      <p>请检查 index.html 是否包含 id="stage" 的元素。</p>
    </div>
  `;
  throw new Error('Missing #stage element');
}

// ===============================
// 1. 场景初始化
// ===============================

const scene = new THREE.Scene();
scene.background = new THREE.Color('#071426');
scene.fog = new THREE.FogExp2('#071426', 0.006);

const camera = new THREE.PerspectiveCamera(
  48,
  stage.clientWidth / Math.max(stage.clientHeight, 1),
  0.1,
  1500
);

camera.position.set(0, 95, 175);
camera.lookAt(0, 12, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance'
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
renderer.setSize(stage.clientWidth, stage.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

stage.appendChild(renderer.domElement);

renderer.domElement.style.display = 'block';
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
renderer.domElement.style.touchAction = 'none';

scene.add(new THREE.AmbientLight(0x9bcaff, 2));

const light = new THREE.PointLight(0x4fcfff, 1500, 500);
light.position.set(0, 100, 60);
scene.add(light);

// 所有建筑放在一个组里，方便旋转
const campus = new THREE.Group();
scene.add(campus);

// ===============================
// 2. 粒子生成工具
// ===============================

const particles = [];

function addParticles(points, color, size = 0.8, opacity = 0.9) {
  if (!points.length) return null;

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(points.length * 3);

  points.forEach((p, i) => {
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
  });

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

  const cloud = new THREE.Points(geometry, material);
  cloud.frustumCulled = false;
  campus.add(cloud);

  particles.push(cloud);
  return cloud;
}

// 建筑线框粒子
function buildingParticles(cx, cz, width, depth, height, color) {
  const points = [];

  // 建筑竖向轮廓
  const corners = [
    [-width / 2, -depth / 2],
    [width / 2, -depth / 2],
    [width / 2, depth / 2],
    [-width / 2, depth / 2]
  ];

  for (const [x, z] of corners) {
    for (let y = 0; y <= height; y += 1.3) {
      points.push({
        x: cx + x,
        y,
        z: cz + z
      });
    }
  }

  // 建筑横向楼层
  for (let y = 2; y < height; y += 3.5) {
    for (let x = -width / 2; x <= width / 2; x += 1.6) {
      points.push({ x: cx + x, y, z: cz - depth / 2 });
      points.push({ x: cx + x, y, z: cz + depth / 2 });
    }

    for (let z = -depth / 2; z <= depth / 2; z += 1.6) {
      points.push({ x: cx - width / 2, y, z: cz + z });
      points.push({ x: cx + width / 2, y, z: cz + z });
    }
  }

  // 建筑表面稀疏粒子
  for (let i = 0; i < width * depth * height / 30; i++) {
    const side = Math.floor(Math.random() * 4);
    let x = 0;
    let z = 0;

    if (side === 0) {
      x = (Math.random() - 0.5) * width;
      z = -depth / 2;
    } else if (side === 1) {
      x = (Math.random() - 0.5) * width;
      z = depth / 2;
    } else if (side === 2) {
      x = -width / 2;
      z = (Math.random() - 0.5) * depth;
    } else {
      x = width / 2;
      z = (Math.random() - 0.5) * depth;
    }

    points.push({
      x: cx + x,
      y: Math.random() * height,
      z: cz + z
    });
  }

  return addParticles(points, color, 0.72, 0.85);
}

// ===============================
// 3. 校园地面与环形道路
// ===============================

function makeRing(radius, tubeRadius, color, y = 0) {
  const points = [];

  for (let i = 0; i < 900; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = radius + (Math.random() - 0.5) * tubeRadius;

    points.push({
      x: Math.cos(a) * r,
      y: y + (Math.random() - 0.5) * 0.35,
      z: Math.sin(a) * r
    });
  }

  addParticles(points, color, 0.65, 0.8);
}

makeRing(66, 1.2, 0x28bfff, 0.3);
makeRing(48, 0.8, 0x458cff, 0.15);
makeRing(30, 0.5, 0x56dfff, 0.1);

// 地面网格
const groundPoints = [];

for (let x = -100; x <= 100; x += 4) {
  for (let z = -100; z <= 100; z += 4) {
    if (Math.random() > 0.32) continue;

    groundPoints.push({
      x,
      y: -0.1,
      z
    });
  }
}

addParticles(groundPoints, 0x2465a9, 0.45, 0.48);

// ===============================
// 4. 校园建筑群
// ===============================

// 左侧教学楼
buildingParticles(-39, -17, 24, 15, 24, 0x4ebcff);
buildingParticles(-39, 5, 24, 15, 30, 0x68d6ff);

// 右侧教学楼
buildingParticles(39, -18, 25, 16, 28, 0x36aaff);
buildingParticles(40, 7, 25, 16, 22, 0x63dfff);

// 后方建筑
buildingParticles(-18, -43, 25, 15, 20, 0x4ba9ff);
buildingParticles(18, -43, 25, 15, 23, 0x4ba9ff);

// 两侧低层建筑
buildingParticles(-63, 5, 12, 23, 13, 0x398fff);
buildingParticles(63, 5, 12, 23, 15, 0x398fff);

// ===============================
// 5. 中央未来感高塔
// ===============================

const towerPoints = [];

for (let y = 0; y <= 52; y += 0.8) {
  const radius = 8 - y * 0.075;

  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2;

    towerPoints.push({
      x: Math.cos(a) * radius,
      y,
      z: Math.sin(a) * radius
    });
  }
}

// 塔身螺旋线
for (let i = 0; i < 1600; i++) {
  const t = i / 1600;
  const y = t * 52;
  const radius = 8 - y * 0.075;
  const a = t * Math.PI * 22;

  towerPoints.push({
    x: Math.cos(a) * radius,
    y,
    z: Math.sin(a) * radius
  });
}

addParticles(towerPoints, 0x7deaff, 0.85, 1);

// 塔顶光点
const topPoints = [];

for (let i = 0; i < 180; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = Math.random() * 3;

  topPoints.push({
    x: Math.cos(a) * r,
    y: 52 + Math.random() * 8,
    z: Math.sin(a) * r
  });
}

addParticles(topPoints, 0xffffff, 1.25, 1);

// ===============================
// 6. 揽月湖：水面与波纹
// ===============================

const lakePoints = [];

for (let i = 0; i < 2600; i++) {
  const x = (Math.random() - 0.5) * 36;
  const z = (Math.random() - 0.5) * 24;

  lakePoints.push({
    x: x + 2,
    y: 0.15,
    z: z + 24
  });
}

const lakeCloud = addParticles(
  lakePoints,
  0x26bfff,
  0.65,
  0.58
);

const waveGroups = [];

for (let k = 0; k < 4; k++) {
  const points = [];

  for (let i = 0; i < 160; i++) {
    const a = (i / 160) * Math.PI * 2;

    points.push({
      x: 2 + Math.cos(a) * (3 + k * 3),
      y: 0.4,
      z: 24 + Math.sin(a) * (2 + k * 2)
    });
  }

  const wave = addParticles(points, 0x7be9ff, 0.7, 0.8);

  if (wave) {
    waveGroups.push({
      object: wave,
      index: k,
      base: points
    });
  }
}

// ===============================
// 7. 漂浮星尘
// ===============================

const stars = [];

for (let i = 0; i < 1700; i++) {
  stars.push({
    x: (Math.random() - 0.5) * 260,
    y: Math.random() * 100 + 5,
    z: (Math.random() - 0.5) * 260
  });
}

const starCloud = new THREE.BufferGeometry();

const starPositions = new Float32Array(stars.length * 3);

stars.forEach((p, i) => {
  starPositions[i * 3] = p.x;
  starPositions[i * 3 + 1] = p.y;
  starPositions[i * 3 + 2] = p.z;
});

starCloud.setAttribute(
  'position',
  new THREE.BufferAttribute(starPositions, 3)
);

const starMaterial = new THREE.PointsMaterial({
  color: 0x75bfff,
  size: 0.65,
  transparent: true,
  opacity: 0.68,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const starField = new THREE.Points(starCloud, starMaterial);
scene.add(starField);

// ===============================
// 8. 鼠标与手机触摸控制
// ===============================

let isDragging = false;
let lastX = 0;
let lastY = 0;

let rotationY = 0;
let rotationX = -0.15;
let targetRotationY = 0;
let targetRotationX = -0.15;

let zoom = 1;
let targetZoom = 1;

renderer.domElement.addEventListener('pointerdown', event => {
  isDragging = true;
  lastX = event.clientX;
  lastY = event.clientY;

  renderer.domElement.setPointerCapture?.(event.pointerId);
});

renderer.domElement.addEventListener('pointermove', event => {
  if (!isDragging) return;

  const dx = event.clientX - lastX;
  const dy = event.clientY - lastY;

  targetRotationY += dx * 0.006;
  targetRotationX += dy * 0.004;

  targetRotationX = THREE.MathUtils.clamp(
    targetRotationX,
    -0.8,
    0.45
  );

  lastX = event.clientX;
  lastY = event.clientY;
});

function stopDragging() {
  isDragging = false;
}

renderer.domElement.addEventListener('pointerup', stopDragging);
renderer.domElement.addEventListener('pointercancel', stopDragging);
renderer.domElement.addEventListener('lostpointercapture', stopDragging);

// 双指缩放
let lastPinchDistance = 0;

renderer.domElement.addEventListener(
  'touchmove',
  event => {
    if (event.touches.length !== 2) return;

    event.preventDefault();

    const dx = event.touches[0].clientX - event.touches[1].clientX;
    const dy = event.touches[0].clientY - event.touches[1].clientY;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (lastPinchDistance > 0) {
      targetZoom *= distance / lastPinchDistance;
      targetZoom = THREE.MathUtils.clamp(targetZoom, 0.55, 1.8);
    }

    lastPinchDistance = distance;
  },
  { passive: false }
);

renderer.domElement.addEventListener('touchend', () => {
  lastPinchDistance = 0;
});

renderer.domElement.addEventListener('wheel', event => {
  targetZoom *= event.deltaY > 0 ? 0.93 : 1.07;
  targetZoom = THREE.MathUtils.clamp(targetZoom, 0.55, 1.8);
}, { passive: true });

// ===============================
// 9. 重置视角按钮
// ===============================

const resetButton = document.getElementById('resetView');

if (resetButton) {
  resetButton.addEventListener('click', () => {
    targetRotationY = 0;
    targetRotationX = -0.15;
    targetZoom = 1;
  });
}

// 自动环绕开关
const autoOrbit = document.getElementById('autoOrbit');

let orbitEnabled = true;

if (autoOrbit) {
  autoOrbit.addEventListener('change', () => {
    orbitEnabled = autoOrbit.checked;
  });
}

// ===============================
// 10. 动画循环
// ===============================

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();

  // 自动环绕
  if (orbitEnabled && !isDragging) {
    targetRotationY += 0.0018;
  }

  rotationY += (targetRotationY - rotationY) * 0.07;
  rotationX += (targetRotationX - rotationX) * 0.07;
  zoom += (targetZoom - zoom) * 0.08;

  campus.rotation.y = rotationY;
  campus.rotation.x = rotationX;
  campus.scale.setScalar(zoom);

  // 星尘缓慢运动
  starField.rotation.y = elapsed * 0.008;

  // 湖面波纹扩张
  waveGroups.forEach((group, i) => {
    const scale = 1 + ((elapsed * 0.28 + i * 0.25) % 1) * 0.16;

    group.object.scale.set(scale, 1, scale);

    group.object.material.opacity =
      0.3 + (1 - ((elapsed * 0.28 + i * 0.25) % 1)) * 0.5;
  });

  // 建筑粒子轻微闪烁
  particles.forEach((cloud, i) => {
    cloud.material.opacity =
      0.65 + Math.sin(elapsed * 1.5 + i * 0.7) * 0.12;
  });

  renderer.render(scene, camera);
}

animate();

// ===============================
// 11. 自适应屏幕
// ===============================

function resize() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;

  if (!width || !height) return;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

window.addEventListener('resize', resize);

// 更新可选的粒子数量显示
const metric = document.getElementById('particleMetric');

if (metric) {
  const total = particles.reduce((sum, cloud) => {
    return sum + cloud.geometry.attributes.position.count;
  }, 0);

  metric.textContent = total.toLocaleString();
}

console.log('未来概念校园：粒子场景初始化完成。');