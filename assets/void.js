/* ============================================================
   深空背景（首页不要，其余四页都要）
   ------------------------------------------------------------
   为什么是一个独立文件：站内转场只换 <main>，body 上的东西跨页常驻。
   所以背景只搭一次，然后监听 <main data-route> 自己切"亮 / 不亮"。

   三层视差 = 空间感的来源：
     远 —— 黑洞本体（位移最小）
     中 —— 预糊的暖色辉光（位移中）
     近 —— 星尘 canvas（位移最大，还会自己飘）
   鼠标给方向，滚动给纵深，外加一层极慢的呼吸漂移（没有鼠标时也在动）。
   ============================================================ */
(function () {
  'use strict';

  var main = document.querySelector('main');
  if (!main) return;

  var REDUCED = /reduced=1/.test(location.search);
  var TOUCH = window.matchMedia && window.matchMedia('(hover:none)').matches;

  /* ---------- 搭场景 ---------- */
  var root = document.createElement('div');
  root.className = 'void';
  root.id = 'void';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML =
    '<div class="void-dolly" id="voidDolly">' +
      '<div class="void-media" id="voidMedia">' +
        '<video class="void-video" id="voidVideo" muted playsinline loop preload="auto"' +
        ' poster="assets/bg/void-loop-poster.jpg" aria-hidden="true"></video>' +
      '</div>' +
      '<canvas class="void-stars" id="voidStars"></canvas>' +
    '</div>' +
    '<div class="void-pull" id="voidPull"></div>' +
    '<div class="void-scrim"></div>';
  document.body.insertBefore(root, document.body.firstChild);

  var dolly = document.getElementById('voidDolly');
  var media = document.getElementById('voidMedia');
  var video = document.getElementById('voidVideo');
  var pull = document.getElementById('voidPull');
  var canvas = document.getElementById('voidStars');
  var ctx = canvas.getContext('2d');

  /* 手机用 720 原片（文件小一截），桌面用 1080 放大版 */
  if (video) {
    var small = window.matchMedia && window.matchMedia('(max-width:680px)').matches;
    video.src = 'assets/bg/' + (small ? 'void-loop-720.mp4' : 'void-loop-1080.mp4');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
  }

  /* ---------- 星尘 ---------- */
  var stars = [];
  var w = 0, h = 0, dpr = 1;

  function buildStars() {
    var n = Math.max(38, Math.min(110, Math.round(w * h / 26000)));
    stars = [];
    for (var i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.45 + Math.random() * 1.35,
        a: 0.16 + Math.random() * 0.6,
        v: (Math.random() * 4 + 1.2) * (Math.random() < 0.5 ? 1 : -1) * 0.12,
        tw: 0.00035 + Math.random() * 0.0009,
        ph: Math.random() * Math.PI * 2
      });
    }
  }

  function sizeCanvas() {
    var cw = canvas.clientWidth || window.innerWidth;
    var ch = canvas.clientHeight || window.innerHeight;
    /* 尺寸没变就别重建：转场只换 main，背景是常驻的，星位不该每页重置 */
    if (cw === w && ch === h && canvas.width) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    w = cw; h = ch;
    buildStars();
  }

  function drawStars(t) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffe9d2';
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var a = s.a * (0.55 + 0.45 * Math.sin(t * s.tw + s.ph));
      ctx.globalAlpha = a > 0 ? a : 0;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- 运动状态 ---------- */
  var tx = 0, ty = 0;          /* 鼠标目标（-1..1） */
  var cx = 0, cy = 0;          /* 平滑后的值 */
  var px = -2000, py = -2000;  /* 鼠标像素位置（给光斑） */
  var lx = -2000, ly = -2000;
  var lastT = 0, raf = null;
  var active = false;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function apply(t) {
    var sc = window.scrollY || 0;
    var dx = Math.sin(t * 0.00011) * 6;
    var dy = Math.cos(t * 0.00008) * 5;
    /* 每层自己限位：视频外层只留了 8% 的余量，滚太远会露边 */
    var syImg = clamp(sc * 0.022, 0, 62) + dy;
    var syStars = clamp(sc * 0.055, 0, 96);

    media.style.transform =
      'translate3d(' + (cx * -10 + dx).toFixed(2) + 'px,' + (cy * -7 + syImg).toFixed(2) + 'px,0) scale(1.035)';

    canvas.style.transform =
      'translate3d(' + (cx * -44).toFixed(2) + 'px,' + (cy * -30 + syStars).toFixed(2) + 'px,0)';

    pull.style.transform = 'translate3d(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px,0)';
  }

  function frame(t) {
    if (!active) { raf = null; return; }
    raf = requestAnimationFrame(frame);
    if (lastT) {
      var dt = Math.min(64, t - lastT);
      var k = 1 - Math.pow(0.0009, dt / 1000);
      cx += (tx - cx) * k;
      cy += (ty - cy) * k;
      lx += (px - lx) * (1 - Math.pow(0.00002, dt / 1000));
      ly += (py - ly) * (1 - Math.pow(0.00002, dt / 1000));
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.x += s.v * dt * 0.06;
        if (s.x > w + 4) s.x = -4;
        else if (s.x < -4) s.x = w + 4;
      }
      drawStars(t);
      apply(t);
    }
    lastT = t;
  }

  function start() {
    if (active || REDUCED) return;
    if (!root.classList.contains('on')) return;
    active = true;
    lastT = 0;
    if (!w || !h) sizeCanvas();
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function stop() {
    active = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  /* ---------- 鼠标：给场景一个"看的方向" ---------- */
  if (!REDUCED && !TOUCH) {
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      px = e.clientX;
      py = e.clientY;
      if (lx < -1000) { lx = px; ly = py; }
      start();
    }, { passive: true });
  }

  /* ---------- 滚动也要动：滚动条不动时帧循环会停，这里重新拉起来 ---------- */
  window.addEventListener('scroll', function () {
    if (root.classList.contains('on')) start();
  }, { passive: true });

  /* ---------- 窗口变化 ---------- */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (!root.classList.contains('on')) return;
      sizeCanvas();
      if (REDUCED) drawStars(0);
    }, 160);
  });

  /* ---------- 路由：首页不出现，其余页淡入 ---------- */
  var lastRoute = main.getAttribute('data-route');

  function playVideo() {
    if (!video || REDUCED) return;
    video.preload = 'auto';
    try {
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    } catch (err) {}
  }

  function pauseVideo() {
    if (video && !video.paused) video.pause();
  }

  function sync(arrive) {
    var route = main.getAttribute('data-route') || '';
    var on = route !== '' && route !== 'home';
    document.body.classList.toggle('is-space', on);
    root.classList.toggle('on', on);

    if (on) {
      sizeCanvas();
      if (REDUCED) {
        drawStars(0);
      } else {
        start();
        playVideo();
      }
      if (arrive) {
        /* 从黑幕里"推近"到场景：只做一次，幅度小，不能抢转场 */
        if (dolly.getAnimations) {
          var a = dolly.getAnimations();
          for (var i = 0; i < a.length; i++) a[i].cancel();
        }
        dolly.animate(
          [{ transform: 'scale(1.05)' }, { transform: 'scale(1)' }],
          { duration: 1200, easing: 'cubic-bezier(.16,1,.3,1)' }
        );
      }
    } else {
      stop();
      pauseVideo();
    }
  }

  if (window.MutationObserver) {
    new MutationObserver(function () {
      var route = main.getAttribute('data-route');
      if (route === lastRoute) return;
      lastRoute = route;
      sync(true);
    }).observe(main, { attributes: true, attributeFilter: ['data-route'] });
  }

  sync(false);

  /* ---------- 切到后台就停帧停视频，回来再接上 ---------- */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      stop();
      pauseVideo();
    } else if (root.classList.contains('on')) {
      start();
      playVideo();
    }
  });
})();

