// 粒子文字模块
// 将 Canvas 绘制出的文字采样为粒子，再逐渐聚合成文字。

function makeParticleTypography(canvas, lines, opts = {}) {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;

  const off = document.createElement("canvas");

  off.width = W;
  off.height = H;

  const ox = off.getContext("2d");

  ox.clearRect(0, 0, W, H);

  // 在离屏画布上绘制待转换的文字。
  for (const line of lines) {
    ox.font = line.font;
    ox.textBaseline = "alphabetic";
    ox.fillStyle = "#fff";

    ox.fillText(
      line.text,
      line.x,
      line.y
    );
  }

  const pixels = ox.getImageData(
    0,
    0,
    W,
    H
  ).data;

  const dots = [];

  const step = opts.step || 3;

  // 对文字进行采样。
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const alpha = pixels[(y * W + x) * 4 + 3];

      if (
        alpha > 60 &&
        Math.random() > (opts.skip || 0.08)
      ) {
        const lineIndex = lines.findIndex(
          line => y >= line.minY && y <= line.maxY
        );

        dots.push({
          tx: x,
          ty: y,
          line: lineIndex,

          // 粒子的初始散布位置。
          x: Math.random() * W,
          y: Math.random() * H,

          phase: Math.random() * Math.PI * 2,

          size: 0.45 + Math.random() * (opts.maxSize || 1.2),

          tone: Math.random()
        });
      }
    }
  }

  const colors = opts.colors || [
    "#e7fcff",
    "#5feaff",
    "#a9f8ff"
  ];

  const start = performance.now();

  function draw(now) {
    const t = (now - start) / 1000;

    ctx.clearRect(0, 0, W, H);

    // 极淡的 HUD 横向扫描线。
    ctx.save();

    ctx.globalAlpha = 0.10;
    ctx.strokeStyle = "#4acbe9";
    ctx.lineWidth = 0.7;

    for (let y = 18; y < H; y += 38) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    ctx.restore();

    // 绘制粒子。
    for (const p of dots) {
      const delay =
        (p.tx / W) * 0.18 +
        (p.ty / H) * 0.12;

      const f = Math.max(
        0,
        Math.min(1, (t - delay) / 1.1)
      );

      // 缓动聚合。
      const ease = 1 - Math.pow(1 - f, 3);

      const drift = (1 - ease) * 0.18;

      const x =
        p.x +
        (p.tx - p.x) * ease +
        Math.sin(t * 1.15 + p.phase) * (0.45 + drift * 4);

      const y =
        p.y +
        (p.ty - p.y) * ease +
        Math.cos(t * 0.9 + p.phase) * (0.4 + drift * 3);

      const tw =
        0.68 +
        0.32 * Math.sin(t * 2 + p.phase);

      ctx.globalAlpha = 0.58 + 0.42 * tw;

      ctx.fillStyle =
        p.tone > 0.9
          ? "#ffdfa1"
          : colors[
              Math.min(
                colors.length - 1,
                Math.floor(p.tone * colors.length)
              )
            ];

      ctx.shadowBlur = p.tone > 0.9 ? 7 : 3.5;
      ctx.shadowColor = ctx.fillStyle;

      ctx.beginPath();

      ctx.arc(
        x,
        y,
        p.size * tw,
        0,
        Math.PI * 2
      );

      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}


// 左侧主标题。
makeParticleTypography(
  document.querySelector("#heroParticleText"),
  [
    {
      text: "智慧校园",
      x: 0,
      y: 86,
      font: '700 77px "Microsoft YaHei","Noto Sans SC",sans-serif',
      minY: 0,
      maxY: 98
    },
    {
      text: "未来已来",
      x: 0,
      y: 172,
      font: '500 76px "Microsoft YaHei","Noto Sans SC",sans-serif',
      minY: 100,
      maxY: 185
    }
  ],
  {
    step: 3,
    skip: 0.04,
    maxSize: 1.05,

    colors: [
      "#e7fcff",
      "#66eaff",
      "#a4f8ff"
    ]
  }
);


// 右下角署名。
makeParticleTypography(
  document.querySelector("#signatureParticles"),
  [
    {
      text: "商丘工学院",
      x: 36,
      y: 76,
      font: '700 59px "Microsoft YaHei","Noto Sans SC",sans-serif',
      minY: 0,
      maxY: 90
    },
    {
      text: "AI 未来概念校园",
      x: 36,
      y: 147,
      font: '500 52px "Microsoft YaHei","Noto Sans SC",sans-serif',
      minY: 91,
      maxY: 162
    },
    {
      text: "智建 1 班 · 李镇圳",
      x: 87,
      y: 195,
      font: '500 27px "Microsoft YaHei","Noto Sans SC",sans-serif',
      minY: 163,
      maxY: 219
    }
  ],
  {
    step: 3,
    skip: 0.06,
    maxSize: 0.9,

    colors: [
      "#c9faff",
      "#56e8ff",
      "#a6f6ff"
    ]
  }
);