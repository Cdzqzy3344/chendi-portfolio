/* =====================================================================
   首页粒子：陈镝（文字） → 蓝色人脸（图像）
   参考 blackman99.github.io/me/zh 的 #engine 粒子形变：
   每颗粒子独立延迟 + 半途湍流 + 鼠标视差 + 加色发光；
   两套目标位置（文字 / 图像）用 uMorph 0→1 混合，滚动驱动。
   ===================================================================== */
(function () {
  'use strict';

  var REDUCED = /reduced=1/.test(location.search);
  var isMobile = window.matchMedia('(max-width: 680px)').matches;
  var COUNT = isMobile ? 16000 : 32000;
  var IMG_SRC = 'assets/hero/blue-faces.jpg';
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  var canvas, hero, h1, line, chip, stage;
  var titleBlock = null;
  var cdPoints, cdGeom, cdMat, cdUniforms;
  var cdAspect = 1;
  var renderer, scene, camera, points, material, geom;
  var uniforms;
  var targetMorph = 0;
  var morphHoldUntil = 0;
  var cloudFade = false;
  var revealFade = false;
  var revealHoldUntil = 0;
  var cloudStartAt = 0;
  var morph = 0;
  var time = 0;
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  var started = false;
  var bootSeq = 0;
  var renderGen = 0;
  var bound = false;
  var frameDrawn = 0;
  var readyResolve = null;

  /* ---------- 只采样标题；上下两条小字保留为 DOM 实字 ---------- */
  function textRange(el) {
    var r = document.createRange();
    r.selectNodeContents(el);
    return r.getBoundingClientRect();
  }

  function blockRect() {
    /* 不用 hero.getBoundingClientRect().top：SPA 回首页时 sticky 有 1s 左右没咬合，
       会返回 -scrollY，粒子就按屏幕外的位置算头像，随后再跳回来。
       这里直接按 sticky 规则算：hero 在 stage 里 clamp 到 0 .. stageH-heroH。 */
    var sr = stage.getBoundingClientRect();
    var heroH = hero.offsetHeight || window.innerHeight || 1;
    var heroTop = Math.min(Math.max(sr.top, 0), Math.max(0, sr.height - heroH));
    var info = h1.parentElement;
    var tr = textRange(h1);
    return {
      left: sr.left + info.offsetLeft + h1.offsetLeft,
      top: heroTop + info.offsetTop + h1.offsetTop,
      width: Math.max(1, tr.width),
      height: Math.max(1, h1.offsetHeight)
    };
  }

  function sampleBlock() {
    var base = blockRect();
    var pad = 24;
    var block = {
      left: base.left - pad,
      top: base.top - pad,
      width: base.width + pad * 2,
      height: base.height + pad * 2
    };
    var hb = h1.getBoundingClientRect();
    var tr = textRange(h1);
    var drawY = pad;
    var scale = 2;
    var c = document.createElement('canvas');
    c.width = Math.ceil(block.width * scale);
    c.height = Math.ceil(block.height * scale);
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.scale(scale, scale);
    ctx.textBaseline = 'top';

    var hs = getComputedStyle(h1);
    ctx.font = hs.fontStyle + ' ' + hs.fontWeight + ' ' + hs.fontSize + ' ' + hs.fontFamily;
    ctx.fillStyle = '#fff';
    ctx.fillText(h1.textContent.trim(), pad, drawY);

    var data = ctx.getImageData(0, 0, c.width, c.height).data;
    var pts = [];
    for (var y = 0; y < c.height; y += 1) {
      for (var x = 0; x < c.width; x += 1) {
        if (data[(y * c.width + x) * 4 + 3] > 90) {
          pts.push({
            x: (x + 0.5) / c.width,
            y: 1 - (y + 0.5) / c.height,
            z: (Math.random() - 0.5) * 0.035,
            chip: false,
            sub: false
          });
        }
      }
    }
    return { pts: pts, block: block };
  }

  /* ---------- CD 采样：C / D 两个字母，蓝白渐变 ---------- */
  function sampleCD() {
    var c = document.createElement('canvas');
    c.width = 720;
    c.height = 340;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var size = 190;
    var family = '"Arial Black","Microsoft YaHei",sans-serif';
    ctx.font = '900 ' + size + 'px ' + family;
    var gap = size * 0.26;
    var cw = ctx.measureText('C').width;
    var dw = ctx.measureText('D').width;
    var total = cw + gap + dw;
    var x0 = (c.width - total) / 2;
    ctx.fillStyle = '#fff';
    ctx.fillText('C', x0 + cw / 2, c.height / 2);
    ctx.fillText('D', x0 + cw + gap + dw / 2, c.height / 2);

    var data = ctx.getImageData(0, 0, c.width, c.height).data;
    var raw = [];
    var minX = c.width, maxX = 0, minY = c.height, maxY = 0;
    for (var y = 0; y < c.height; y += 1) {
      for (var x = 0; x < c.width; x += 1) {
        if (data[(y * c.width + x) * 4 + 3] > 128) {
          raw.push([x, y]);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    var spanX = Math.max(1, maxX - minX);
    var spanY = Math.max(1, maxY - minY);
    var pts = new Array(raw.length);
    for (var i = 0; i < raw.length; i += 1) {
      var nx = (raw[i][0] - minX) / spanX;
      var ny = 1 - (raw[i][1] - minY) / spanY;
      var t = Math.min(1, Math.max(0, ny));
      pts[i] = {
        x: nx - 0.5,
        y: ny - 0.5,
        z: (Math.random() - 0.5) * 0.02,
        r: Math.random(),
        c: [
          0.30 + 0.72 * t,
          0.52 + 0.44 * t,
          0.88 + 0.12 * t
        ]
      };
    }
    return { pts: pts, aspect: spanX / spanY };
  }

  /* ---------- 图像采样：取蓝色人像的颜色 + 亮度 ---------- */
  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  }

  function sampleImage(img) {
    var W = 560;
    var H = Math.round(W * img.naturalHeight / img.naturalWidth);
    var c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, W, H);
    var data = ctx.getImageData(0, 0, W, H).data;
    var pts = [];
    var weights = [];
    var total = 0;
    for (var y = 0; y < H; y += 1) {
      for (var x = 0; x < W; x += 1) {
        var i = (y * W + x) * 4;
        var r = data[i], g = data[i + 1], b = data[i + 2];
        var l = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        if (l < 0.012) continue;
        /* 亮部密、暗部稀；暗部给保底权重，右侧深色剪影也留出粒子 */
        var w = Math.pow(l, 1.0) + 0.14;
        pts.push({
          x: x / (W - 1),
          y: 1 - y / (H - 1),
          z: 0.01 + Math.pow(l, 0.7) * 0.16 + Math.random() * 0.008,
          r: r, g: g, b: b, l: l
        });
        total += w;
        weights.push(total);
      }
    }
    return { pts: pts, weights: weights, total: total };
  }

  function pickImage(sample) {
    var r = Math.random() * sample.total;
    var lo = 0, hi = sample.weights.length - 1;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (sample.weights[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    return sample.pts[lo];
  }

  /* ---------- 颜色 ---------- */
  var BEIGE = [0.96, 0.94, 0.89];
  var LIME = [0.78, 0.95, 0.42];
  var WHITE = [1.0, 0.99, 0.95];
  var RED = [0.92, 0.30, 0.30];

  function titleColor(t, rand) {
    var r = Math.random();
    if (r < 0.055) return WHITE;
    if (r < 0.12) return LIME;
    if (r < 0.135) return RED;
    var k = t * 0.45 + rand * 0.25;
    return [
      BEIGE[0] + (LIME[0] - BEIGE[0]) * k,
      BEIGE[1] + (LIME[1] - BEIGE[1]) * k,
      BEIGE[2] + (LIME[2] - BEIGE[2]) * k
    ];
  }

  function imageColor(m) {
    var boost = 1.0 + Math.pow(m.l, 0.75) * 0.85;
    return [
      Math.min(1, (m.r / 255) * boost + 0.03),
      Math.min(1, (m.g / 255) * boost + 0.05),
      Math.min(1, (m.b / 255) * boost + 0.12)
    ];
  }

  /* ---------- 屏幕矩形 → NDC ---------- */
  function toNDC(rect) {
    var hr = hero.getBoundingClientRect();
    var x = rect.left - hr.left;
    var y = rect.top - hr.top;
    return {
      cx: ((x + rect.width / 2) / hr.width) * 2 - 1,
      cy: 1 - ((y + rect.height / 2) / hr.height) * 2,
      sx: (rect.width / hr.width) * 2,
      sy: (rect.height / hr.height) * 2
    };
  }

  /* ---------- 着色器 ---------- */
  var vertexShader = [
    'attribute vec3 aImage;',
    'attribute vec2 aCloud;',
    'attribute float aR;',
    'attribute vec3 aColorA;',
    'attribute vec3 aColorB;',
    'uniform float uMorph, uTime, uSize, uDpr, uCloud, uCloudFace;',
    'uniform vec2 uTitleCenter, uTitleSize, uImageCenter, uImageSize, uMouse;',
    'varying vec3 vColor;',
    'varying float vA;',
    'void main(){',
    '  float m = clamp(uMorph, 0.0, 1.0);',
    '  float st = clamp((m - aR * 0.35) / 0.65, 0.0, 1.0);',
    '  st = st * st * (3.0 - 2.0 * st);',
    '  vec2 cloud = aCloud * vec2(1.05, 0.82);',
    '  vec2 p0 = mix(uTitleCenter + position.xy * uTitleSize, cloud, uCloud);',
    '  vec2 p1 = uImageCenter + aImage.xy * uImageSize;',
    '  vec2 p = mix(p0, p1, st);',
    '  float z = mix(position.z, aImage.z, st);',
    '  float k = sin(st * 3.14159265);',
    '  p += k * 0.06 * vec2(',
    '    sin(aR * 91.0 + uTime * 0.9 + p.y * 17.0),',
    '    cos(aR * 57.0 + uTime * 0.7 + p.x * 19.0)',
    '  );',
    '  p += uMouse * (0.004 + z * 0.12);',
    '  p += 0.0025 * vec2(sin(uTime * 1.3 + aR * 40.0), cos(uTime * 1.1 + aR * 30.0));',
    '  gl_Position = vec4(p, 0.0, 1.0);',
    '  gl_PointSize = uSize * (0.55 + aR * 0.95) * (1.0 + z * 1.6) * (1.0 + st * 0.35) * uDpr;',
    '  vColor = mix(aColorA, aColorB, st);',
    '  vColor += vec3(0.16) * pow(aR, 0.6) * (1.0 - st);',
    '  vec2 iv = aImage.xy * 2.0;',
    '  float edge = 1.0 - smoothstep(0.70, 1.12, length(iv));',
    '  vA = (0.58 + 0.42 * k) * mix(1.0, edge, st) * (1.0 + st * 0.18);',
    '}'
  ].join('\n');

  var fragmentShader = [
    'precision mediump float;',
    'uniform float uReveal;',
    'varying vec3 vColor;',
    'varying float vA;',
    'void main(){',
    '  vec2 c = gl_PointCoord - 0.5;',
    '  float d = dot(c, c) * 4.0;',
    '  if (d > 1.0) discard;',
    '  float a = 1.0 - d;',
    '  a *= a;',
    '  gl_FragColor = vec4(vColor * a * vA * uReveal, 1.0);',
    '}'
  ].join('\n');

  var cdVertexShader = [
    'attribute vec3 aColor;',
    'attribute float aR;',
    'attribute vec2 aStart;',
    'uniform vec2 uCenter, uSize, uStartCenter, uStartSize;',
    'uniform float uOpacity, uAssemble, uTime, uDpr, uPoint;',
    'varying vec3 vColor;',
    'varying float vA;',
    'void main(){',
    '  vec2 target = uCenter + position.xy * uSize;',
    '  vec2 start = uStartCenter + aStart * uStartSize;',
    '  float a = clamp((uAssemble - aR * 0.35) / 0.65, 0.0, 1.0);',
    '  a = smoothstep(0.0, 1.0, a);',
    '  vec2 p = mix(start, target, a);',
    '  p += 0.028 * sin(a * 3.14159) * vec2(sin(aR * 20.0), cos(aR * 17.0));',
    '  p += 0.002 * vec2(sin(uTime * 1.2 + aR * 40.0), cos(uTime * 1.0 + aR * 30.0));',
    '  gl_Position = vec4(p, 0.0, 1.0);',
    '  gl_PointSize = uPoint * (0.6 + aR * 0.8) * (0.65 + a * 0.45) * uDpr;',
    '  vColor = aColor;',
    '  vA = uOpacity * (0.55 + 0.45 * aR) * smoothstep(0.0, 0.3, a);',
    '}'
  ].join('\n');

  var cdFragmentShader = [
    'precision mediump float;',
    'varying vec3 vColor;',
    'varying float vA;',
    'void main(){',
    '  vec2 c = gl_PointCoord - 0.5;',
    '  float d = dot(c, c) * 4.0;',
    '  if (d > 1.0) discard;',
    '  float a = 1.0 - d;',
    '  a *= a;',
    '  gl_FragColor = vec4(vColor * a * vA, 1.0);',
    '}'
  ].join('\n');

  /* ---------- 初始化 ---------- */
  function buildGeometry(textPts, imageSample) {
    var n = COUNT;
    var pos = new Float32Array(n * 3);
    var img = new Float32Array(n * 3);
    var cld = new Float32Array(n * 2);
    var rnd = new Float32Array(n);
    var ca = new Float32Array(n * 3);
    var cb = new Float32Array(n * 3);

    for (var i = 0; i < n; i++) {
      var t = textPts[(Math.random() * textPts.length) | 0];
      var m = pickImage(imageSample);
      var tc = t.chip ? LIME : (t.sub ? (Math.random() < 0.16 ? WHITE : BEIGE) : titleColor(t.x, Math.random()));
      var ic = imageColor(m);
      var r = Math.random();

      pos[i * 3] = t.x - 0.5;
      pos[i * 3 + 1] = t.y - 0.5;
      pos[i * 3 + 2] = t.z;

      img[i * 3] = m.x - 0.5;
      img[i * 3 + 1] = m.y - 0.5;
      img[i * 3 + 2] = m.z;

      cld[i * 2] = (Math.random() * 2 - 1) * 1.3;
      cld[i * 2 + 1] = (Math.random() * 2 - 1) * 1.05;
      rnd[i] = r;
      ca[i * 3] = tc[0]; ca[i * 3 + 1] = tc[1]; ca[i * 3 + 2] = tc[2];
      cb[i * 3] = ic[0]; cb[i * 3 + 1] = ic[1]; cb[i * 3 + 2] = ic[2];
    }

    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aImage', new THREE.BufferAttribute(img, 3));
    g.setAttribute('aCloud', new THREE.BufferAttribute(cld, 2));
    g.setAttribute('aR', new THREE.BufferAttribute(rnd, 1));
    g.setAttribute('aColorA', new THREE.BufferAttribute(ca, 3));
    g.setAttribute('aColorB', new THREE.BufferAttribute(cb, 3));
    return g;
  }

  function buildCDGeometry(sample) {
    var n = isMobile ? 1600 : 3000;
    var pos = new Float32Array(n * 3);
    var col = new Float32Array(n * 3);
    var rnd = new Float32Array(n);
    var start = new Float32Array(n * 2);
    for (var i = 0; i < n; i += 1) {
      var p = sample.pts[(Math.random() * sample.pts.length) | 0];
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
      col[i * 3] = p.c[0];
      col[i * 3 + 1] = p.c[1];
      col[i * 3 + 2] = p.c[2];
      rnd[i] = p.r;
      start[i * 2] = Math.random() - 0.5;
      start[i * 2 + 1] = Math.random() - 0.5;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aR', new THREE.BufferAttribute(rnd, 1));
    g.setAttribute('aStart', new THREE.BufferAttribute(start, 2));
    return g;
  }

  function updateTargets() {
    if (!geom || !uniforms) return;
    var H = hero.offsetHeight || window.innerHeight || 1;
    var block = blockRect();
    var asp = 0.909;
    var lift = Math.min(110 * (H / 774), Math.max(0, block.top - 24));
    var faceTop = block.top - lift;
    var faceH = Math.min(330 * (H / 774), H - faceTop - 24);
    faceH = Math.max(120, faceH);
    var faceW = faceH * asp;
    if (faceW > block.width) {
      faceW = block.width;
      faceH = faceW / asp;
    }
    var imageRect = {
      left: block.left + (block.width - faceW) / 2,
      top: faceTop,
      width: faceW,
      height: faceH
    };
    var m = toNDC(imageRect);
    if (cdUniforms && cdGeom) {
      var maxH = H - (imageRect.top + imageRect.height) - 18;
      var cdH = Math.min(faceH / 3, maxH);
      var cdW = cdH * Math.max(0.5, cdAspect);
      var cdRect = {
        left: imageRect.left + (imageRect.width - cdW) / 2,
        top: imageRect.top + imageRect.height + 12,
        width: cdW,
        height: cdH
      };
      var cc = toNDC(cdRect);
      cdUniforms.uCenter.value.set(cc.cx, cc.cy);
      cdUniforms.uSize.value.set(cc.sx, cc.sy);
      cdUniforms.uStartCenter.value.set(m.cx, m.cy - m.sy * 0.15);
      cdUniforms.uStartSize.value.set(m.sx * 0.55, m.sy * 0.55);
    }

    var tb = {
      left: block.left - 24,
      top: block.top - 24,
      width: titleBlock ? titleBlock.width : block.width + 48,
      height: titleBlock ? titleBlock.height : block.height + 48
    };
    var tn = toNDC(tb);
    uniforms.uTitleCenter.value.set(tn.cx, tn.cy);
    uniforms.uTitleSize.value.set(tn.sx, tn.sy);
    uniforms.uImageCenter.value.set(m.cx, m.cy);
    uniforms.uImageSize.value.set(m.sx, m.sy);
    uniforms.uSize.value = 2.4 * (H / 800);
  }

  function resize() {
    var hr = hero.getBoundingClientRect();
    if (!renderer || hr.width < 2 || hr.height < 2) return;
    /* 窗口改尺寸后 h1 字号会变，粒子标题的归一化尺寸必须跟着重取，
       否则旧尺寸会盖到副标题上（用户报的「改窗口有时出现图一」） */
    if (h1 && titleBlock) {
      var nb = blockRect();
      titleBlock = { width: nb.width + 48, height: nb.height + 48 };
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(hr.width, hr.height, false);
    dpr = renderer.getPixelRatio();
    uniforms.uDpr.value = dpr;
    if (cdUniforms) cdUniforms.uDpr.value = dpr;
    updateTargets();
  }

  function updateScroll() {
    if (!started || !stage || !hero) return;
    if (REDUCED) {
      targetMorph = 0;
      hero.style.setProperty('--hero-p', '0');
      return;
    }
    var r = stage.getBoundingClientRect();
    var total = stage.offsetHeight - window.innerHeight;
    var p = total > 0 ? -r.top / total : 0;
    p = Math.max(0, Math.min(1, p));
    /* 变脸在前 75% 就完成，剩下 25% 留给头像停留——
       否则 p=1 正好是下一屏压进来的瞬间，脸刚出来就被滑走 */
    targetMorph = Math.min(1, p / 0.75);
    hero.style.setProperty('--hero-p', p.toFixed(3));
    updateTargets();
  }

  function startLoop() {
    var gen = ++renderGen;
    function loop() {
      if (!started || gen !== renderGen) return;
      requestAnimationFrame(loop);
      time += 0.016;
      if (revealFade && performance.now() > revealHoldUntil) {
        uniforms.uReveal.value += (1 - uniforms.uReveal.value) * 0.05;
        if (uniforms.uReveal.value > 0.995) { uniforms.uReveal.value = 1; revealFade = false; }
      }
      if (cloudFade && performance.now() > cloudStartAt) {
        uniforms.uCloud.value += (0 - uniforms.uCloud.value) * 0.018;
        if (uniforms.uCloud.value < 0.15) {
          uniforms.uCloud.value = 0;
          cloudFade = false;
          hero.classList.add('hero-text-in');
        }
      }
      if (performance.now() > morphHoldUntil) {
        var mr = (uniforms && uniforms.uCloud.value > 0) ? 0.02 : 0.075;
        morph += (targetMorph - morph) * mr;
      }
      if (uniforms && uniforms.uCloud.value > 0 && morph > 0.985) uniforms.uCloud.value = 0;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      uniforms.uMorph.value = REDUCED ? 0 : morph;
      uniforms.uTime.value = time;
      uniforms.uMouse.value.set(mouse.x, mouse.y);
      if (cdUniforms) {
        cdUniforms.uTime.value = time;
        cdUniforms.uAssemble.value = Math.max(0, Math.min(1, (morph - 0.50) * 2.0));
        cdUniforms.uOpacity.value = Math.max(0, Math.min(1, (morph - 0.35) * 2.2));
      }
      renderer.render(scene, camera);
      frameDrawn++;
      if (frameDrawn >= 3 && readyResolve) { readyResolve(); readyResolve = null; }
    }
    if (REDUCED) {
      uniforms.uMorph.value = 0;
      renderer.render(scene, camera);
    } else {
      loop();
    }
  }

  function onScroll() { updateScroll(); }
  function onResize() { resize(); }
  function onPointer(e) {
    if (REDUCED) return;
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = 1 - (e.clientY / window.innerHeight) * 2;
  }

  function teardown() {
    started = false;
    bootSeq += 1;
    renderGen += 1;
    if (readyResolve) { readyResolve(); readyResolve = null; }
    if (bound) {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
      bound = false;
    }
    if (scene && points) scene.remove(points);
    if (geom) { geom.dispose(); geom = null; }
    if (material) { material.dispose(); material = null; }
    if (scene && cdPoints) scene.remove(cdPoints);
    if (cdGeom) { cdGeom.dispose(); cdGeom = null; }
    if (cdMat) { cdMat.dispose(); cdMat = null; }
    cdPoints = null;
    cdUniforms = null;
    cdAspect = 1;
    if (renderer) {
      try {
        renderer.dispose();
        if (renderer.forceContextLoss) renderer.forceContextLoss();
      } catch (err) {}
      renderer = null;
    }
    scene = null;
    camera = null;
    points = null;
    uniforms = null;
    if (hero) {
      hero.classList.remove('has-particles');
      hero.classList.remove('hero-particles-failed');
    }
    titleBlock = null;
    canvas = null;
    hero = null;
    h1 = null;
    line = null;
    chip = null;
    stage = null;
    targetMorph = 0;
    morph = 0;
    time = 0;
    mouse.x = mouse.y = mouse.tx = mouse.ty = 0;
  }

  function boot() {
    var nextHero = document.querySelector('.hero');
    var nextCanvas = document.getElementById('heroParticles');
    if (!nextHero || !nextCanvas || !window.THREE) { teardown(); return; }
    if (hero === nextHero && canvas === nextCanvas && started) {
      resize();
      updateScroll();
      return;
    }
    teardown();
    hero = nextHero;
    canvas = nextCanvas;
    h1 = document.getElementById('heroName');
    line = document.querySelector('.hero-line');
    chip = document.querySelector('.hero-chip');
    stage = document.getElementById('heroStage');
    if (!h1 || !stage) { teardown(); return; }
    isMobile = window.matchMedia('(max-width: 680px)').matches;
    COUNT = isMobile ? 16000 : 32000;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var seq = ++bootSeq;
    frameDrawn = 0;
    window.__heroReady = new Promise(function (res) { readyResolve = res; });
    loadImage(IMG_SRC).then(function (img) {
      if (seq !== bootSeq || hero !== nextHero || canvas !== nextCanvas) return;
      init(img);
    }).catch(function () {
      if (hero) hero.classList.add('hero-particles-failed');
    });
  }

  window.__initHeroParticles = boot;

  /* 回首页时由 transition 在黑幕抬起前调用：把 morph 归零，让头像从粒子重新汇集一次 */
  /* 回首页：头像已经直接到位，只做透明度渐显，不聚合、不跳 */
  window.__heroReplayMorph = function () {
    var c = document.getElementById('heroParticles');
    if (!c) return;
    c.style.transition = 'none';
    c.style.opacity = '0';
    clearTimeout(c.__fadeTimer);
    c.__fadeTimer = setTimeout(function () {
      c.style.transition = 'opacity 1s ease';
      c.style.opacity = '1';
    }, 650);
  };

  function init(img) {
    var blockSample = sampleBlock();
    titleBlock = blockSample.block;
    var textPts = blockSample.pts;
    var imageSample = sampleImage(img);
    if (!textPts.length || !imageSample.pts.length) return;

    geom = buildGeometry(textPts, imageSample);

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance'
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(dpr);

    scene = new THREE.Scene();
    camera = new THREE.Camera();

    uniforms = {
      uMorph: { value: 0 },
      uCloud: { value: 0 },
      uCloudFace: { value: 0 },
      uReveal: { value: 1 },
      uTime: { value: 0 },
      uSize: { value: 2.0 },
      uDpr: { value: dpr },
      uTitleCenter: { value: new THREE.Vector2(0, 0) },
      uTitleSize: { value: new THREE.Vector2(0.5, 0.3) },
      uImageCenter: { value: new THREE.Vector2(0, 0) },
      uImageSize: { value: new THREE.Vector2(0.7, 0.8) },
      uMouse: { value: new THREE.Vector2(0, 0) }
    };

    material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false
    });

    points = new THREE.Points(geom, material);
    points.frustumCulled = false;
    scene.add(points);

    var cdSample = sampleCD();
    cdAspect = cdSample.aspect;
    cdGeom = buildCDGeometry(cdSample);
    cdUniforms = {
      uCenter: { value: new THREE.Vector2(0, 0) },
      uSize: { value: new THREE.Vector2(0.2, 0.1) },
      uStartCenter: { value: new THREE.Vector2(0, 0) },
      uStartSize: { value: new THREE.Vector2(0.3, 0.25) },
      uAssemble: { value: 0 },
      uOpacity: { value: 0 },
      uTime: { value: 0 },
      uDpr: { value: dpr },
      uPoint: { value: 3.0 }
    };
    cdMat = new THREE.ShaderMaterial({
      uniforms: cdUniforms,
      vertexShader: cdVertexShader,
      fragmentShader: cdFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false
    });
    cdPoints = new THREE.Points(cdGeom, cdMat);
    cdPoints.frustumCulled = false;
    scene.add(cdPoints);

    var hr = hero.getBoundingClientRect();
    renderer.setSize(hr.width, hr.height, false);
    updateTargets();

    hero.classList.add('has-particles');
    started = true;

    updateScroll();
    /* 从内页回首页会落在底部（p=1）：直接给到最终形态，
       不再从文字 morph 一遍——那 0.5s 就是用户看到的「卡一下」 */
    morph = targetMorph;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    bound = true;
    /* 首屏三行（粒子标题 + 剪辑师 + 副标题）在片头完全退场后一起淡入；否则幕布自上而下先露标题再露小字 */
    function ungateHero() { document.body.classList.remove('hero-intro'); }
    if (document.body.classList.contains('splash-on')) {
      var ungateTimer = setInterval(function () {
        if (document.body.classList.contains('ready') && !document.body.classList.contains('splash-on')) {
          clearInterval(ungateTimer);
          setTimeout(ungateHero, 80);
        }
      }, 100);
      setTimeout(function () { clearInterval(ungateTimer); ungateHero(); }, 6000);
    } else {
      setTimeout(ungateHero, 300);
    }
    startLoop();
    [0, 120, 380, 720, 1200].forEach(function (ms) {
      setTimeout(function () {
        if (started && stage) updateScroll();
      }, ms);
    });
  }

  boot();
})();




























