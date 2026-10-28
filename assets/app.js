/* 陈镝 · 作品集 —— 交互逻辑 */
(function () {
  'use strict';

  /* 截图/调试用：?noscroll=1 关掉平滑滚动并把首屏定高，保证整页截图不被 100vh 撑爆 */
  if (/noscroll/.test(location.search)) {
    document.documentElement.style.scrollBehavior = 'auto';
    document.body.classList.add('flat-hero');
  }

  /* ---------- 动效策略：默认全开；?reduced=1 才减弱 ---------- */
  /* 作品集站上动效就是内容，所以不跟随系统的"减少动画"设置，改成显式开关 */
  var REDUCED = /reduced=1/.test(location.search);
  if (REDUCED) document.documentElement.classList.add('reduced');

  /* ---------- nav 滚过首屏后变实 ---------- */
  var nav = document.querySelector('.nav');
  var hero = document.querySelector('.hero');
  function onScroll() {
    var threshold = hero ? hero.offsetHeight * 0.82 : 60;
    var solid = window.scrollY > threshold;
    if (solid) nav.classList.add('solid');
    else nav.classList.remove('solid');
    /* 菜单按钮是 fixed 的，不跟 nav 一起缩；用同名的 html 类让它跟着「陈镝」上移 6px */
    document.documentElement.classList.toggle('nav-solid', solid);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 卡片 ---------- */
  function card(w) {
    var el = document.createElement('article');
    el.className = 'work rv' + (w.portrait ? ' portrait' : '');
    el.innerHTML =
      '<div class="work-media">' +
        '<img src="' + w.cover + '" alt="' + w.title + '" loading="lazy">' +
        '<div class="work-play"><span></span></div>' +
      '</div>' +
      '<div class="work-meta">' +
        '<div><h3>' + w.title + '</h3>' +
          '<span class="dur">' + w.durLabel + '</span></div>' +
      '</div>';
    el.addEventListener('click', function () { openPlayer(w.video, w.title); });
    return el;
  }

  function fill(grid, list) {
    if (!grid) return;
    list.forEach(function (w) { grid.appendChild(card(w)); });
  }

  /* ---------- 胶片条 ---------- */
  (function () {
    var strip = document.getElementById('filmStrip');
    var trackEl = document.getElementById('filmTrack');
    if (!strip || !trackEl) return;

    WORKS.filter(function (w) { return w.feat; }).forEach(function (w) {
      var it = document.createElement('div');
      it.className = 'film-item';
      it.innerHTML = '<img src="' + w.cover + '" alt=""><span>' + w.title + '</span>';
      it.addEventListener('click', function () { openPlayer(w.video, w.title); });
      trackEl.appendChild(it);
    });

    var hint = document.createElement('div');
    hint.className = 'film-hint';
    hint.textContent = '按住加速 →';
    strip.appendChild(hint);

    var offset = 0, maxShift = 0, drag = null, holdTimer = null, accel = false, raf = null;

    function apply() { trackEl.style.transform = 'translateX(' + offset + 'px)'; }
    function clamp() {
      if (offset > 0) offset = 0;
      if (offset < -maxShift) offset = -maxShift;
    }
    function measure() {
      maxShift = Math.max(0, trackEl.scrollWidth - strip.clientWidth + 30);
    }
    function accelLoop() {
      if (!accel) return;
      offset -= 7;
      clamp(); apply();
      raf = requestAnimationFrame(accelLoop);
    }

    measure();
    window.addEventListener('resize', measure);

    strip.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, o: offset, moved: false };
      holdTimer = setTimeout(function () { accel = true; accelLoop(); }, 420);
      try { strip.setPointerCapture(e.pointerId); } catch (err) {}
    });

    strip.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      if (Math.abs(dx) > 6) {
        drag.moved = true;
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        if (accel) { accel = false; cancelAnimationFrame(raf); }
        offset = drag.o + dx;
        clamp(); apply();
      }
    });

    function end() {
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      accel = false;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      drag = null;
    }
    strip.addEventListener('pointerup', end);
    strip.addEventListener('pointercancel', end);
    strip.addEventListener('pointerleave', end);
  })();

  /* ---------- 精选：目录式列表 ---------- */
  function gname(key) {
    for (var i = 0; i < GROUPS.length; i++) { if (GROUPS[i].key === key) return GROUPS[i].name; }
    return '';
  }
  function renderPageContent() {
  /* 非首轮（转场进来）：数字直接给终值，不重放滚动动画 */
  if (window.__booted) {
    var ns = document.querySelectorAll('.num[data-n]');
    for (var ni = 0; ni < ns.length; ni++) ns[ni].textContent = ns[ni].getAttribute('data-n');

  }
  window.__booted = true;
  var reel = document.getElementById('reelList');
  if (reel) {
    WORKS.filter(function (w) { return w.feat; }).forEach(function (w, i) {
      var row = document.createElement('div');
      row.className = 'reel-row';
      row.setAttribute('data-cursor', '播放');
      var no = i < 9 ? '0' + (i + 1) : '' + (i + 1);
      /* 每段文字都套三层同样的内容（.rl 里三个 <i>），外层 overflow:hidden 只露一层。
         进场时把 .rl 往上滚两格 → 文字真的"滚了几圈"才落到正位。
         三层内容一样，所以滚完和没滚看起来是同一帧，落地不会跳。 */
      var roll = function (t) {
        return '<span class="rl"><i>' + t + '</i><i>' + t + '</i><i>' + t + '</i></span>';
      };
      var html =
        '<span class="reel-no">' + no + '</span>' +   /* 编号不滚，跟着行一起出来 */
        '<span class="reel-main">' +
          '<span class="reel-title">' + roll(w.title) + '</span>' +
          '<span class="reel-sub">' + roll(gname(w.group)) + '</span>' +
        '</span>' +
        '<span class="reel-date">' + roll(w.durLabel) + '</span>';
      html += '<img class="reel-poster" src="' + w.cover + '" alt="">';
      row.innerHTML = html;
      row.addEventListener('click', function () { openPlayer(w.video, w.title); });
      reel.appendChild(row);
    });
  }

  /* ---------- 按类型分区 ---------- */
  var typeNav = document.getElementById('typeNav');
  var typeSections = document.getElementById('typeSections');
  var reelIndex = 0;

  /* 散落画布：大小差异要大、位置要不对称、角度要看得见 */
  function slotsFor(n) {
    if (n === 1) return [{ l: 22, t: 8, w: 40, r: -4 }];
    if (n === 2) return [
      { l: 7,  t: 6,  w: 38, r: -6 },
      { l: 56, t: 40, w: 24, r: 5 }
    ];
    if (n === 3) return [
      { l: 4,  t: 4,  w: 36, r: -6 },
      { l: 44, t: 0,  w: 24, r: 4 },
      { l: 68, t: 46, w: 20, r: -3 }
    ];
    if (n === 4) return [
      { l: 3,  t: 2,  w: 34, r: -6 },
      { l: 43, t: 1,  w: 21, r: 5 },
      { l: 72, t: 24, w: 18, r: -4 },
      { l: 15, t: 53, w: 26, r: 4 }
    ];
    return [
      { l: 2,  t: 2,  w: 30, r: -6 },
      { l: 35, t: 0,  w: 21, r: 4 },
      { l: 60, t: 10, w: 17, r: -5 },
      { l: 80, t: 34, w: 16, r: 6 },
      { l: 8,  t: 55, w: 24, r: 4 },
      { l: 38, t: 52, w: 27, r: -4 }
    ].slice(0, n);
  }

  if (typeNav && typeSections) GROUPS.forEach(function (g) {
    var list = WORKS.filter(function (w) { return w.group === g.key; });
    if (!list.length) return;

    var chip = document.createElement('a');
    chip.className = 'type-chip';
    chip.href = '#type-' + g.key;
    chip.innerHTML = g.name;
    typeNav.appendChild(chip);

    var block = document.createElement('div');
    block.className = 'type-block';
    block.id = 'type-' + g.key;
    block.innerHTML =
      '<div class="type-head rv">' +
        '<span class="type-name">' + g.name + '</span>' +
        '<span class="type-en">' + g.en + '</span>' +
      '</div>';
    var slots = slotsFor(list.length);
    var board = document.createElement('div');
    board.className = 'board';
    board.style.height = (list.length <= 3 ? 400 : list.length === 4 ? 600 : 640) + 'px';

    var canvas = document.createElement('div');
    canvas.className = 'board-canvas';
    board.appendChild(canvas);

    /* 空间状态：位移 + 整块倾斜统一输出 */
    var st = { dx: 0, dy: 0, rx: 0 };
    function applyCanvas() {
      canvas.style.transform = 'translate(' + st.dx + 'px,' + st.dy + 'px) rotateX(' + st.rx.toFixed(2) + 'deg)';
    }
    board._st = st;
    board._applyCanvas = applyCanvas;

    var hint = document.createElement('div');
    hint.className = 'board-hint';
    hint.textContent = 'DRAG';
    board.appendChild(hint);

    block.appendChild(board);
    typeSections.appendChild(block);

    list.forEach(function (w, i) {
      var s = slots[i] || slots[0];
      var it = document.createElement('div');
      it.className = 'board-item';
      it.style.left = s.l + '%';
      it.style.top = s.t + '%';
      it.style.width = s.w + '%';
      it.style.setProperty('--rot', s.r + 'deg');
      /* 按宽度分配深度：大卡片浮在前面，小卡片退到后面 */
      var depth = s.w >= 28 ? 150 : (s.w >= 22 ? 36 : -120);
      it.style.setProperty('--z', depth + 'px');
      it.style.zIndex = (i % 3) + 1;
      it.innerHTML = '<div class="board-move"><div class="board-inner"><div class="board-tilt">' +
        '<img src="' + w.cover + '" alt="">' +
        '<span>' + w.title + ' · ' + w.durLabel + '</span>' +
        '</div></div></div>';

      var move = it.firstChild;
      var inner = move.firstChild;
      var tilt = inner.firstChild;

      /* 呼吸：6～9.6 秒一圈，幅度 ±6% */
      var dur = 6.0 + (i % 5) * 0.9;
      inner.style.animationDuration = dur.toFixed(1) + 's';
      inner.style.animationDelay = '-' + (i * 1.4).toFixed(1) + 's';

      /* 鼠标在封面上的位置 → 立体倾斜（悬浮板） */
      it.addEventListener('pointermove', function (e) {
        if (it.classList.contains('dragging')) return;
        var r = it.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.transform = 'perspective(900px) rotateY(' + (px * 16).toFixed(2) +
          'deg) rotateX(' + (-py * 16).toFixed(2) + 'deg) translateZ(14px)';
      });
      it.addEventListener('pointerleave', function () {
        tilt.style.transform = '';
      });

      /* 单张卡片可拖；松手没拖过就直接播放 */
      (function () {
        var sx = 0, sy = 0, ol = 0, ot = 0, down = false, moved = false;
        it.addEventListener('pointerdown', function (e) {
          if (e.pointerType === 'touch') {
            e.stopPropagation();
            e.preventDefault();
            down = true; moved = false;
            sx = e.clientX; sy = e.clientY;
            var tr = it.getBoundingClientRect(), tb = canvas.getBoundingClientRect();
            ol = tr.left - tb.left; ot = tr.top - tb.top;
            try { it.setPointerCapture(e.pointerId); } catch (err) {}
            return;
          }
          e.stopPropagation();
          e.preventDefault();
          down = true; moved = false;
          sx = e.clientX; sy = e.clientY;
          var r = it.getBoundingClientRect(), br = canvas.getBoundingClientRect();
          ol = r.left - br.left; ot = r.top - br.top;
          try { it.setPointerCapture(e.pointerId); } catch (err) {}
        });
        it.addEventListener('pointermove', function (e) {
          if (!down) return;
          var mx = e.clientX - sx, my = e.clientY - sy;
          if (!moved && (Math.abs(mx) > 4 || Math.abs(my) > 4)) {
            moved = true;
            it.style.left = ol + 'px';
            it.style.top = ot + 'px';
            it.classList.add('dragging');
          }
          if (moved) {
            it.style.left = (ol + mx) + 'px';
            it.style.top = (ot + my) + 'px';
          }
        });
        function up() {
          if (!down) return;
          down = false;
          it.classList.remove('dragging');
          if (!moved) openPlayer(w.video, w.title);
        }
        it.addEventListener('pointerup', up);
        it.addEventListener('pointercancel', function () {
          down = false;
          it.classList.remove('dragging');
        });
      })();

      canvas.appendChild(it);
    });

    /* 空白处拖动整块画布（移动超过阈值才捕获指针，否则点不开卡片） */
    (function () {
      var sx = 0, sy = 0, ox = 0, oy = 0;
      var down = false, grabbed = false;
      board.addEventListener('pointerdown', function (e) {
        down = true; grabbed = false;
        sx = e.clientX; sy = e.clientY;
        ox = st.dx; oy = st.dy;
      });
      board.addEventListener('pointermove', function (e) {
        if (!down) return;
        var mx = e.clientX - sx, my = e.clientY - sy;
        if (!grabbed) {
          if (Math.abs(mx) <= 6 && Math.abs(my) <= 6) return;
          grabbed = true;
          board.style.cursor = 'grabbing';
          try { board.setPointerCapture(e.pointerId); } catch (err) {}
        }
        st.dx = ox + mx; st.dy = oy + my;
        applyCanvas();
      });
      function stop() {
        down = false;
        if (grabbed) {
          grabbed = false;
          board.style.cursor = 'grab';
          try { board.releasePointerCapture && board.releasePointerCapture(0); } catch (err) {}
        }
      }
      board.addEventListener('pointerup', stop);
      board.addEventListener('pointercancel', stop);
      board.style.cursor = 'grab';
    })();
  });

  }   /* renderPageContent 结束 */

  renderPageContent();
  window.__renderPage = renderPageContent;
  observeReveal();

  /* ---------- 播放层 ---------- */
  var player = document.getElementById('player');
  var pvideo = document.getElementById('playerVideo');

  /* 仿 pacomepertant 的进度条：暂停 / 静音 / 5 格胶片 */
  var vpBar = document.createElement('div');
  vpBar.className = 'vp-bar';
  vpBar.innerHTML =
    '<button class="vp-btn vp-play" type="button" aria-label="暂停">' +
      '<svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="5" width="3.4" height="14" rx="1"/><rect x="13.6" y="5" width="3.4" height="14" rx="1"/></svg>' +
      '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' +
    '</button>' +
    '<button class="vp-btn vp-mute" type="button" aria-label="静音">' +
      '<svg class="i-vol" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
      '<svg class="i-mute" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
    '</button>' +
    '<div class="vp-film" id="vpFilm" role="slider" aria-label="播放进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
      '<div class="vp-shade" id="vpShade"></div>' +
    '</div>';
  player.appendChild(vpBar);
  var vpFilm = document.getElementById('vpFilm');
  var vpShade = document.getElementById('vpShade');
  var vpPlay = vpBar.querySelector('.vp-play');
  var vpMute = vpBar.querySelector('.vp-mute');
  var vpSeeking = false;

  function syncBar() {
    var d = pvideo.duration;
    var r = d ? Math.min(1, Math.max(0, pvideo.currentTime / d)) : 0;
    vpShade.style.transform = 'translateX(' + (r * 100).toFixed(3) + '%)';
    vpFilm.setAttribute('aria-valuenow', String(Math.round(r * 100)));
  }
  function syncPlay() {
    var playing = !pvideo.paused && !pvideo.ended;
    vpPlay.classList.toggle('is-paused', !playing);
    vpPlay.setAttribute('aria-label', playing ? '暂停' : '播放');
  }
  function syncMute() {
    var muted = pvideo.muted || pvideo.volume === 0;
    vpMute.classList.toggle('is-muted', muted);
    vpMute.setAttribute('aria-label', muted ? '取消静音' : '静音');
  }
  function togglePlay() {
    if (pvideo.paused || pvideo.ended) {
      if (pvideo.ended) pvideo.currentTime = 0;
      var p = pvideo.play();
      if (p && p.catch) p.catch(function () {});
    } else {
      pvideo.pause();
    }
  }
  function seekTo(ratio) {
    if (!pvideo.duration) return;
    pvideo.currentTime = Math.min(1, Math.max(0, ratio)) * pvideo.duration;
    syncBar();
  }
  function seekEvent(e) {
    var r = vpFilm.getBoundingClientRect();
    if (!r.width) return;
    seekTo((e.clientX - r.left) / r.width);
  }

  function openPlayer(src) {
    var bgmAudio = document.getElementById('bgm');
    if (bgmAudio && !bgmAudio.paused) {
      player.__bgmResume = true;
      bgmAudio.pause();
    } else if (!player.classList.contains('open')) {
      player.__bgmResume = false;
    }
    var file = src.split('/').pop().replace(/\.mp4(\?.*)?$/i, '');
    pvideo.poster = 'assets/covers/' + file + '.jpg';
    pvideo.src = src;
    var strip = 'assets/videos/strips/' + file + '.jpg';
    vpFilm.style.backgroundImage = 'url("' + strip + '")';
    player.classList.add('open');
    document.body.classList.add('player-open');
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
    syncBar(); syncPlay(); syncMute();
    var p = pvideo.play();
    if (p && p.catch) p.catch(function () {});
  }

  function closePlayer() {
    var wasOpen = player.classList.contains('open');
    var resumeBgm = wasOpen && player.__bgmResume;
    player.__bgmResume = false;
    player.classList.remove('open');
    document.body.classList.remove('player-open');
    pvideo.pause();
    pvideo.removeAttribute('src');
    pvideo.load();
    document.body.style.overflow = '';
    if (lenis) lenis.start();
    if (resumeBgm) {
      var bgmAudio = document.getElementById('bgm');
      if (bgmAudio && bgmAudio.paused) {
        var bp = bgmAudio.play();
        if (bp && bp.catch) bp.catch(function () {});
      }
    }
  }

  pvideo.addEventListener('timeupdate', syncBar);
  pvideo.addEventListener('durationchange', syncBar);
  pvideo.addEventListener('play', syncPlay);
  pvideo.addEventListener('pause', syncPlay);
  pvideo.addEventListener('ended', syncPlay);
  pvideo.addEventListener('volumechange', syncMute);
  pvideo.addEventListener('click', togglePlay);
  vpPlay.addEventListener('click', togglePlay);
  vpMute.addEventListener('click', function () {
    if (pvideo.muted) {
      pvideo.muted = false;
      if (pvideo.volume === 0) pvideo.volume = 1;
    } else {
      pvideo.muted = true;
    }
    syncMute();
  });
  vpFilm.addEventListener('pointerdown', function (e) {
    vpSeeking = true;
    if (vpFilm.setPointerCapture) vpFilm.setPointerCapture(e.pointerId);
    seekEvent(e);
    e.preventDefault();
  });
  vpFilm.addEventListener('pointermove', function (e) {
    if (vpSeeking) seekEvent(e);
  });
  vpFilm.addEventListener('pointerup', function () { vpSeeking = false; });
  vpFilm.addEventListener('pointercancel', function () { vpSeeking = false; });

  /* ---------- 作品放大层：点卡片飞到中央 ---------- */
  var zoom = document.getElementById('zoom');
  var zoomImg = document.getElementById('zoomImg');
  var zoomTitle = document.getElementById('zoomTitle');
  var zoomVideo = '';

  function openZoom(cover, title, video) {
    if (!zoom) return;
    zoomImg.src = cover;
    zoomTitle.textContent = title;
    zoomVideo = video || '';
    zoom.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeZoom() {
    if (!zoom) return;
    zoom.classList.remove('open');
    document.body.style.overflow = '';
  }
  if (zoom) {
    zoom.addEventListener('click', function (e) {
      if (e.target === zoomImg && zoomVideo) {
        closeZoom();
        openPlayer(zoomVideo, zoomTitle.textContent);
        return;
      }
      closeZoom();
    });
  }

  player.addEventListener('click', function (e) {
    if (e.target === player || e.target.classList.contains('player-close')) closePlayer();
  });
  document.addEventListener('keydown', function (e) {
    if (!player.classList.contains('open')) return;
    if (e.key === 'Escape') { closePlayer(); return; }
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.key === 'm' || e.key === 'M') { pvideo.muted = !pvideo.muted; }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); pvideo.currentTime = Math.max(0, pvideo.currentTime - 5); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); pvideo.currentTime = Math.min(pvideo.duration || 0, pvideo.currentTime + 5); }
  });

  /* ---------- 右上角菜单 ---------- */
  var menuToggle = document.getElementById('menuToggle');
  if (menuToggle) {
    var menuScrim = document.createElement('div');
    menuScrim.className = 'menu-scrim';
    var menuSheet = document.createElement('div');
    menuSheet.className = 'menu-sheet';
    menuSheet.id = 'menuSheet';
    menuSheet.setAttribute('aria-hidden', 'true');
    menuSheet.innerHTML =
      '<button class="menu-close" id="menuClose" type="button" aria-label="关闭菜单">' +
        '<span>关闭</span>' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
      '</button>' +
      '<div class="menu-inner">' +
        '<div class="menu-links">' +
          '<a href="works.html" data-route="works" style="--i:0"><span>精选</span></a>' +
          '<a href="all.html" data-route="all" style="--i:1"><span>全部</span></a>' +
          '<a href="about.html" data-route="about" style="--i:2"><span>关于</span></a>' +
          '<a href="contact.html" data-route="contact" style="--i:3"><span>联系</span></a>' +
        '</div>' +
        '<div class="menu-foot">' +
          '<div><small>WECHAT</small>CDZQZY3344</div>' +
          '<a class="menu-arrow" href="contact.html" aria-label="联系我">→</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(menuScrim);
    document.body.appendChild(menuSheet);
    document.body.appendChild(menuToggle);
    document.body.classList.add('menu-ready');

    var menuClose = document.getElementById('menuClose');
    var menuLinks = menuSheet.querySelectorAll('.menu-links a');
    var menuOpen = false;
    menuSheet.inert = true;

    function setMenuRoute() {
      var mainEl = document.querySelector('main');
      var route = mainEl ? mainEl.getAttribute('data-route') : '';
      menuLinks.forEach(function (a) {
        var on = a.getAttribute('data-route') === route;
        a.classList.toggle('is-current', on);
        if (on) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
    }

    /* 当前项的缩进必须在菜单展开前就位，否则圆点出来了、文字还在往右滑 */
    function applyMenuRouteInstant() {
      var i;
      for (i = 0; i < menuLinks.length; i++) menuLinks[i].style.transition = 'none';
      setMenuRoute();
      void menuSheet.offsetWidth;
      for (i = 0; i < menuLinks.length; i++) menuLinks[i].style.transition = '';
    }

    function openMenu() {
      if (menuOpen) return;
      menuOpen = true;
      applyMenuRouteInstant();
      menuSheet.inert = false;
      document.body.classList.add('menu-open');
      document.body.style.overflow = 'hidden';
      if (lenis) lenis.stop();
      menuToggle.setAttribute('aria-expanded', 'true');
      menuSheet.setAttribute('aria-hidden', 'false');
      menuSheet.classList.add('open');
      menuScrim.classList.add('open');
      menuClose.focus({ preventScroll: true });
    }

    function closeMenu() {
      if (!menuOpen) return;
      menuOpen = false;
      document.body.classList.remove('menu-open');
      document.body.style.overflow = '';
      if (lenis) lenis.start();
      menuToggle.setAttribute('aria-expanded', 'false');
      menuSheet.setAttribute('aria-hidden', 'true');
      menuSheet.classList.remove('open');
      menuScrim.classList.remove('open');
      menuSheet.inert = true;
      menuToggle.focus({ preventScroll: true });
    }

    /* 菜单按钮 hover：复刻原站 MenuButton 的 GSAP 字母弹跳 */
    if (window.gsap) {
      var menuLetters = menuToggle.querySelectorAll('.letter');
      var menuHoverTl = window.gsap.timeline({ paused: true });
      menuHoverTl.to(menuLetters, {
        rotation: function () { return window.gsap.utils.random(-15, 15); },
        scale: function () { return window.gsap.utils.random(1.15, 1.4); },
        fontWeight: 600,
        duration: 0.25,
        ease: 'power2.out',
        stagger: 0.05
      }).to(menuLetters, {
        rotation: 0,
        scale: 1,
        fontWeight: 500,
        duration: 0.25,
        ease: 'elastic.out(1, 0.8)',
        stagger: 0.05
      });
      menuToggle.addEventListener('mouseenter', function () { menuHoverTl.restart(); });
    }

    menuToggle.addEventListener('click', function () {
      if (!menuOpen) openMenu();
    });
    menuClose.addEventListener('click', closeMenu);
    menuScrim.addEventListener('click', closeMenu);
    menuLinks.forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
    var menuArrow = menuSheet.querySelector('.menu-arrow');
    if (menuArrow) menuArrow.addEventListener('click', closeMenu);
    var brandEl = document.querySelector('.brand');
    if (brandEl) brandEl.addEventListener('click', closeMenu);
    window.addEventListener('popstate', closeMenu);
    document.addEventListener('keydown', function (e) {
      if (menuOpen && e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
      }
    });
  }

  /* ---------- 进场淡入 ---------- */
  function observeReveal() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.rv').forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });
  }
  observeReveal();

  /* ---------- 联系方式一点即复制 ---------- */
  document.querySelectorAll('[data-copy]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      var text = el.getAttribute('data-copy');
      var label = el.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () {});
      }
      el.textContent = '已复制　' + text;
      setTimeout(function () { el.textContent = label; }, 1500);
    });
  });

  /* ---------- 首屏视频 ---------- */
  var heroVideo = document.querySelector('.hero-video');
  if (heroVideo) {
    heroVideo.muted = true;
    var tryPlay = heroVideo.play();
    if (tryPlay && tryPlay.catch) {
      tryPlay.catch(function () {
        document.addEventListener('click', function once() {
          heroVideo.play();
          document.removeEventListener('click', once);
        }, { once: true });
      });
    }
  }

  /* ---------- 首屏时间轴：能拖，拖完继续播 ---------- */
  (function () {
    var track = document.getElementById('scrubTrack');
    var fill = document.getElementById('scrubFill');
    var head = document.getElementById('scrubHead');
    var nowEl = document.getElementById('scrubNow');
    var durEl = document.getElementById('scrubDur');
    if (!heroVideo || !track) return;

    var dragging = false;

    function fmt(s) {
      s = Math.max(0, s || 0);
      var m = Math.floor(s / 60), r = Math.floor(s % 60);
      return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
    }

    function paint() {
      var d = heroVideo.duration;
      if (!d) return;
      var p = heroVideo.currentTime / d;
      if (fill) fill.style.width = (p * 100) + '%';
      if (head) head.style.left = (p * 100) + '%';
      if (nowEl) nowEl.textContent = fmt(heroVideo.currentTime);
      if (durEl) durEl.textContent = fmt(d);
    }

    function seekTo(clientX) {
      var r = track.getBoundingClientRect();
      var x = (clientX - r.left) / r.width;
      x = Math.min(1, Math.max(0, x));
      if (heroVideo.duration) heroVideo.currentTime = x * heroVideo.duration;
      paint();
    }

    heroVideo.addEventListener('timeupdate', paint);
    heroVideo.addEventListener('loadedmetadata', paint);
    heroVideo.addEventListener('durationchange', paint);

    track.addEventListener('pointerdown', function (e) {
      dragging = true;
      heroVideo.pause();
      try { track.setPointerCapture(e.pointerId); } catch (err) {}
      seekTo(e.clientX);
      e.preventDefault();
    });
    track.addEventListener('pointermove', function (e) {
      if (dragging) { seekTo(e.clientX); e.preventDefault(); }
    });
    track.addEventListener('pointerup', function (e) {
      if (!dragging) return;
      dragging = false;
      try { track.releasePointerCapture(e.pointerId); } catch (err) {}
      var p = heroVideo.play();
      if (p && p.catch) p.catch(function () {});
    });
    track.addEventListener('pointercancel', function () {
      dragging = false;
      var p = heroVideo.play();
      if (p && p.catch) p.catch(function () {});
    });

    paint();
  })();

  /* ---------- 背景两层网格做视差 ---------- */
  (function () {
    var far = document.getElementById('bgGridFar');
    var near = document.getElementById('bgGridNear');
    var root = document.documentElement;
    var raf = null, mx = 0, my = 0;
    document.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        root.style.setProperty('--mx', mx + 'px');
        root.style.setProperty('--my', my + 'px');
        if (far) far.style.transform = 'translate(' + (-mx * 0.012) + 'px,' + (-my * 0.012) + 'px)';
        if (near) near.style.transform = 'translate(' + (-mx * 0.05) + 'px,' + (-my * 0.05) + 'px)';
        raf = null;
      });
    });
  })();

  /* ---------- 背景光跟随鼠标 ---------- */
  (function () {
    var root = document.documentElement;
    var raf = null, mx = 0, my = 0;
    document.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!raf) {
        raf = requestAnimationFrame(function () {
          root.style.setProperty('--mx', mx + 'px');
          root.style.setProperty('--my', my + 'px');
          raf = null;
        });
      }
    });
  })();

  /* ---------- 数字滚动 ---------- */
  (function () {
    var nums = document.querySelectorAll('.num');
    if (!nums.length) return;
    if (!('IntersectionObserver' in window)) {
      nums.forEach(function (el) { el.textContent = el.getAttribute('data-n'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var target = parseInt(el.getAttribute('data-n'), 10) || 0;
        var cur = 0, step = Math.max(1, Math.round(target / 34));
        var timer = setInterval(function () {
          cur += step;
          if (cur >= target) { cur = target; clearInterval(timer); }
          el.textContent = cur;
        }, 26);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- 区块标题从左边推进来 ---------- */
  (function () {
    if (!('IntersectionObserver' in window)) return;
    var heads = document.querySelectorAll('.sec-head, .type-head, .about-grid, .contact h2, .contact .pull');
    if (!heads.length) return;
    heads.forEach(function (el) { el.classList.add('slide-rv'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -70px 0px' });
    heads.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- 画布卡片随滚动做视差 ---------- */
  (function () {
    var raf = null;
    function run() {
      raf = null;
      var vh = window.innerHeight;
      var boards = document.querySelectorAll('.board');
      for (var b = 0; b < boards.length; b++) {
        var board = boards[b];
        var r = board.getBoundingClientRect();
        if (r.bottom < -120 || r.top > vh + 120) continue;
        var mid = (r.top + r.height / 2) - vh / 2;
        var items = board.querySelectorAll('.board-item');
        for (var i = 0; i < items.length; i++) {
          var sp = 0.035 + (i % 4) * 0.032;
          var py = -mid * sp;
          py = Math.max(-62, Math.min(62, py));
          /* 沿 Z 轴游动：画布在下方时卡片退远，滚到中间归位，继续往上冲近 */
          var zk = 0.09 + (i % 3) * 0.05;
          var dz = -mid * zk;
          dz = Math.max(-175, Math.min(175, dz));
          /* 直接写 wrapper 的 transform：不通过 CSS 变量，避免整棵子树重算样式 */
          var mv = items[i].firstChild;
          if (mv && mv.className === 'board-move') {
            mv.style.transform = 'translate3d(0,' + py.toFixed(1) + 'px,' + dz.toFixed(1) + 'px)';
          }
        }
        /* 整块空间随滚动倾斜：滚到上面往后仰，滚到下面往前俯 */
        if (board._st) {
          var p = mid / (vh / 2);
          p = Math.max(-1.2, Math.min(1.2, p));
          board._st.rx = p * 9;
          board._applyCanvas();
        }
      }
    }
    window.addEventListener('scroll', function () {
      if (!raf) raf = requestAnimationFrame(run);
    }, { passive: true });
    run();
  })();

  /* ---------- 背景音乐：右下角唱片 ---------- */
  (function () {
    var music = document.getElementById('music');
    var bgm = document.getElementById('bgm');
    var btn = document.getElementById('musicBtn');
    var bar = document.getElementById('miBar');
    var fill = document.getElementById('miFill');
    var timeEl = document.getElementById('miTime');
    if (!music || !bgm || !btn) return;

    bgm.volume = 0.5;

  /* Python http.server 不支持 Range，音频 seekable 恒为 0，拖进度会弹回 0。
     整首取成 blob 再喂给 audio：blob 自带随机访问，任何服务器都能拖。 */
  var bgmRaw = bgm.getAttribute('src');
  if (bgmRaw && /^https?:/.test(location.protocol)) {
    fetch(bgmRaw, { credentials: 'same-origin' }).then(function (r) {
      return r.ok ? r.blob() : null;
    }).then(function (b) {
      if (!b) return;
      var wasPlaying = !bgm.paused;
      var at = bgm.currentTime || 0;
      bgm.src = URL.createObjectURL(b);
      bgm.load();
      bgm.addEventListener('loadedmetadata', function once() {
        try { bgm.currentTime = Math.min(at, bgm.duration || at); } catch (err) {}
        paint();
        if (wasPlaying && !document.body.classList.contains('player-open')) { var pp = bgm.play(); if (pp && pp.catch) pp.catch(function () {}); }
      }, { once: true });
    }).catch(function () {});
  }

    function fmt(s) {
      s = Math.max(0, s || 0);
      var m = Math.floor(s / 60), r = Math.floor(s % 60);
      return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
    }
    function paint() {
      var d = bgm.duration || 0;
      if (fill) fill.style.width = (d ? (bgm.currentTime / d) * 100 : 0) + '%';
      if (timeEl) timeEl.textContent = fmt(bgm.currentTime) + ' / ' + fmt(d);
    }

    var musicWrap = document.getElementById('musicWrap');
    var mqMobile = window.matchMedia('(max-width:680px)');
    var closeTimer = 0;

    function armClose() {
      clearTimeout(closeTimer);
      if (!mqMobile.matches) return;
      if (!music.classList.contains('is-open')) return;
      closeTimer = setTimeout(function () { setMusicOpen(false); }, 4000);
    }
    function setMusicOpen(on) {
      music.classList.toggle('is-open', !!on);
      if (!on && musicWrap) musicWrap.classList.remove('vol-open', 'vol-wanted');
      armClose();
    }
    function toggleBgm() {
      if (document.body.classList.contains('player-open')) return;
      if (bgm.paused) {
        var p = bgm.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        bgm.pause();
      }
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (mqMobile.matches) {
        if (!music.classList.contains('is-open')) { setMusicOpen(true); return; }
        toggleBgm();
        armClose();
        return;
      }
      toggleBgm();
    });
    music.addEventListener('pointerdown', function () { armClose(); });
    music.addEventListener('pointermove', function () { armClose(); });
    document.addEventListener('pointerdown', function (e) {
      if (!music.classList.contains('is-open')) return;
      if (music.contains(e.target)) return;
      setMusicOpen(false);
    });
    if (mqMobile.addEventListener) {
      mqMobile.addEventListener('change', function () { if (!mqMobile.matches) setMusicOpen(false); });
    }

    bgm.addEventListener('timeupdate', paint);
    bgm.addEventListener('loadedmetadata', paint);
    bgm.addEventListener('durationchange', paint);
    bgm.addEventListener('play', function () { music.classList.add('playing'); });
    bgm.addEventListener('pause', function () { music.classList.remove('playing'); });

    if (bar) {
      var seeking = false;
      function seekTo2(clientX) {
        var r = bar.getBoundingClientRect();
        var x = (clientX - r.left) / r.width;
        if (bgm.duration) bgm.currentTime = Math.max(0, Math.min(1, x)) * bgm.duration;
        paint();
      }
      bar.addEventListener('pointerdown', function (e) {
        seeking = true;
        try { bar.setPointerCapture(e.pointerId); } catch (err) {}
        seekTo2(e.clientX);
        e.preventDefault();
      });
      bar.addEventListener('pointermove', function (e) {
        if (seeking) seekTo2(e.clientX);
      });
      bar.addEventListener('pointerup', function (e) {
        seeking = false;
        try { bar.releasePointerCapture(e.pointerId); } catch (err) {}
      });
      bar.addEventListener('pointercancel', function () { seeking = false; });
    }

    /* 音量：小喇叭点开竖条 */
    var volBtn = document.getElementById('miVolBtn');
    var slider = document.getElementById('miVSlider');
    var vFill = document.getElementById('miVFill');

    function paintVol() {
      if (vFill) vFill.style.height = (bgm.volume * 100) + '%';
    }
    function setVol(clientY) {
      if (!slider) return;
      var r = slider.getBoundingClientRect();
      var x = 1 - (clientY - r.top) / r.height;
      bgm.volume = Math.max(0, Math.min(1, x));
      paintVol();
    }
    if (volBtn) {
      volBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var wrap = document.getElementById('musicWrap');
        if (!wrap) return;
        var want = !wrap.classList.contains('vol-wanted');
        wrap.classList.toggle('vol-wanted', want);
        wrap.classList.toggle('vol-open', want);
      });
    }
    if (slider) {
      var volDown = false;
      slider.addEventListener('pointerdown', function (e) {
        volDown = true;
        try { slider.setPointerCapture(e.pointerId); } catch (err) {}
        setVol(e.clientY);
        e.preventDefault();
      });
      slider.addEventListener('pointermove', function (e) {
        if (volDown) setVol(e.clientY);
      });
      slider.addEventListener('pointerup', function () { volDown = false; });
      slider.addEventListener('pointercancel', function () { volDown = false; });
    }
    paintVol();

    /* 鼠标从喇叭移到竖条时不消失：用延时判断，不依赖 CSS hover */
    var wrapEl = document.getElementById('musicWrap');
    var hideTimer = null;
    function keepOpen() {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      if (wrapEl) wrapEl.classList.add('vol-open');
    }
    function maybeClose() {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        if (wrapEl) wrapEl.classList.remove('vol-open');
        hideTimer = null;
      }, 220);
    }
    if (wrapEl) {
      wrapEl.addEventListener('mouseenter', function () {
        if (wrapEl.classList.contains('vol-wanted')) keepOpen();
      });
      wrapEl.addEventListener('mouseleave', maybeClose);
    }
    if (slider) {
      slider.addEventListener('mouseenter', keepOpen);
      slider.addEventListener('mouseleave', maybeClose);
    }

    paint();
  })();

  /* ---------- 左下角时间码（每秒走） ---------- */
  (function () {
    var el = document.getElementById('tcText');
    if (!el) return;
    function tick() {
      var now = new Date();
      /* 固定北京时间（UTC+8），不跟电脑时区走 */
      var utc = now.getTime() + now.getTimezoneOffset() * 60000;
      var bj = new Date(utc + 8 * 3600000);
      function p(n) { return (n < 10 ? '0' : '') + n; }
      el.textContent = p(bj.getHours()) + ':' + p(bj.getMinutes()) + ':' + p(bj.getSeconds());
    }
    tick();
    setInterval(tick, 1000);
  })();

  /* 首屏信息层不再做整层滚动视差/淡出：小字的退出统一由粒子模块的 --hero-p 渐隐，
     避免小字随视差上移撞上「陈镝」，也避免和粒子的淡出叠成两个时间线。 */

  /* ---------- 视差位移：滚动时元素沿 Y 反向/正向移动 ---------- */
  (function () {
    if (REDUCED) return;
    var items = [].slice.call(document.querySelectorAll('[data-parallax]'));
    if (!items.length) return;
    var raf = null;
    function run() {
      raf = null;
      var vh = window.innerHeight;
      for (var i = 0; i < items.length; i++) {
        var el = items[i];
        var r = el.getBoundingClientRect();
        if (r.bottom < -240 || r.top > vh + 240) continue;
        var k = parseFloat(el.getAttribute('data-parallax')) || 0;
        var p = (r.top + r.height / 2 - vh / 2) / vh;
        var tf = 'translate3d(0,' + (p * k).toFixed(1) + 'px,0)';
        var sc = el.getAttribute('data-scale');
        if (sc) tf += ' scale(' + sc + ')';
        el.style.transform = tf;
      }
    }
    window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(run); }, { passive: true });
    window.addEventListener('resize', function () { if (!raf) raf = requestAnimationFrame(run); });
    run();
  })();

  /* ---------- 平滑滚动：Lenis ---------- */
  var lenis = null;
  window.__getLenis = function () { return lenis; };
  (function () {
    if (!window.Lenis) return;
    if (/noscroll/.test(location.search)) return;
    if (REDUCED) return;
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, touchMultiplier: 1.5, smoothWheel: true });
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  })();

  /* ---------- 页内锚点：#type-xxx 这类跳转 ----------
     拆成多页之后 #jump 遮罩已经不存在了，所以改成事件委托 + lenis 平滑滚动：
     ① 委托到 document，无刷转场换过 DOM 之后依然有效
     ② 不依赖任何遮罩元素，找不到就退回原生 smooth scroll */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.length < 2) return;
    var target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    var y = target.getBoundingClientRect().top + window.scrollY - 64;
    if (lenis) {
      lenis.scrollTo(y, { duration: 0.9 });
    } else {
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  });

  /* ---------- 进场遮罩：loading → hero ---------- */
  (function () {
    var splash = document.getElementById('splash');
    if (!splash) return;
    var fill = document.getElementById('splashFill');
    var pct = document.getElementById('splashPct');
    var qs = location.search;
    var reduce = REDUCED;
    var skip = /nosplash|noscroll|splash=0/.test(qs);

    var p = 0, target = 14, t0 = Date.now(), done = false, raf = null;

    function setPct(v) {
      if (fill) fill.style.width = v.toFixed(1) + '%';
      if (pct) pct.textContent = (v < 10 ? '0' : '') + Math.floor(v);
    }
    function bump(v) { if (v > target) target = Math.min(97, v); }
    function reveal(instant) {
      if (done) return;
      done = true;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      setPct(100);
      /* 片头幕布拉开前，等 hero 粒子画出第一帧；否则会先看到空的 hero 底 */
      var ready = window.__heroReady || Promise.resolve();
      Promise.race([
        ready,
        new Promise(function (res) { setTimeout(res, instant ? 0 : 1200); })
      ]).then(function () {
        document.body.classList.add('splash-done');
        var hold = instant ? 0 : 240;
        var travel = instant ? 0 : 760;
        setTimeout(function () {
          document.body.classList.remove('splash-on');
          document.body.classList.add('ready', 'splash-gone');
          document.dispatchEvent(new CustomEvent('cd:ready'));
        }, hold + travel);
      });
    }
    function tick() {
      p += Math.max(0.7, (target - p) * 0.14);
      if (p > 97) p = 97;
      setPct(p);
      if (p >= 96 && Date.now() - t0 > 820) { reveal(false); return; }
      raf = requestAnimationFrame(tick);
    }

    if (skip) {
      document.body.classList.remove('splash-on');
      document.body.classList.add('ready', 'splash-gone');
      return;
    }

    document.body.classList.add('splash-on');
    document.addEventListener('DOMContentLoaded', function () { bump(48); });
    setTimeout(function () { bump(58); }, 240);
    setTimeout(function () { bump(72); }, 640);
    window.addEventListener('load', function () { bump(86); });
    var hv = document.getElementById('heroVideo');
    if (hv) {
      if (hv.readyState >= 2) bump(76);
      hv.addEventListener('loadeddata', function () { bump(76); });
      hv.addEventListener('canplay', function () { bump(90); });
    }
    setTimeout(function () { reveal(true); }, 4800);
    tick();
  })();

  /* ---------- 精选：盘旋（2026-10-25 重写：照 pacomepertant.com 的真实实现） ----------

     它不是"一根柱子"，它是一条螺旋线。四条公式就是全部：

       角度 θ = b × 0.89          ← 0.89 = 卡宽 1.78 ÷ 半径 2，正好是这张卡在圆周上
                                    占掉的弧长 → 相邻两张"边对边贴死"：不开缝、也不叠
       高度 y = b × 0.50          ← 卡高的一半 → 上下叠压一半，连成一条瓦片带
       半径 R = 2（恒定）          ← 圆柱面，不是圆锥
       朝向 rotation.y = -θ+π/2   ← 法线永远朝外（径向）

     整条线靠一个浮点 scrollOffset 推进，每张卡 k = (序号 - scrollOffset) mod 18，
     所以是连续滑行，没有整数步进、没有翻页 → 不"一卡一卡"。
     18 × 0.89 ≈ 2.55 圈，两端都出了画 → 环绕那一跳看不见。

     弯曲不在几何里（几何只有 8×8 段），在顶点着色器：
       viewPosition.x += worldY² × 0.1   // 屏幕空间横向剪切：越高越往右甩，卡片被切成平行四边形
     正反面一次 draw：gl_FrontFacing 分流，背面 9 tap 盒式模糊（不用第二套模糊图，也就没有切换时机）
     入场不是缩放，是 SDF 圆角矩形从中心长出来（uRevealProgress）

     ★ 改参数前先读这段：卡宽变了 ANGLE 必须跟着变（ANGLE = 卡宽/半径），
       否则要么开缝、要么穿模。竖向 VGAP 保持 = 卡高 × 0.5，与角度互不影响。
  */
  window.__initSpiral = function () {
    var stage = document.getElementById('spiralStage');
    var sw = document.getElementById('viewSwitch');
    if (!stage || !sw) return;
    /* 用 DOM 元素本身判断：无刷转场会把整个 main 换掉，旧 canvas 随之消失，必须允许重建 */
    if (window.__spiralStage === stage) return;
    window.__spiralStage = stage;

    var SP = null, rafId = null, loadingTh = false;

    stage.innerHTML = '';

    var FEAT = WORKS.filter(function (w) { return w.feat; });
    /* 9 条精选 ×3 = 27 槽（禹："滚动从上往下滚，多滚几圈"）。
       槽数 = 一次环绕要滚多少格才回到原点，所以它直接决定"能往下滚多久"。
       16≈见一次重复太快，27 槽要滚 27 格才重复，手感长了一倍多。
       竖向环绕点也随之更远（±13 格 ≈ ±6.1），永远在画外，比 18 槽更安全。 */
    var SLOTS = FEAT.concat(FEAT).concat(FEAT);

    var CARD_W = 1.78, CARD_H = 1.0;   /* 世界单位；1.78:1 = 封面 1400×788 的比例，不裁 */
    var RADIUS = 2;
    var ANGLE = CARD_W / RADIUS;       /* 0.89 —— 卡宽在圆周上占的弧长 */
    var VGAP = CARD_H * 0.5;           /* 竖向步进 = 半个卡高 */
    var Y0 = -0.4;                     /* 竖向基准偏移，让环绕点在上下都留出余量 */
    var COUNT = SLOTS.length;
    var CENTER = Math.floor(COUNT / 2);
    var FOV_D = 35, FOV_M = 52;   /* 手机竖屏横向视野窄，fov 放大一点才装得下整环 */
    /* 相机远近：参考站是 z=8。但那是全屏画布，这里舞台只有 1320×880，
       照抄 z=8 环只占到 53% 宽，四周全是空的（禹："没铺满，显得有点小"）。
       拉近到 6.6 让卡片溢出画框，才叫铺满。手机屏幕更窄，稍微退一点。 */
    /* 手机不能再近：进环那张卡的顶边 y=-4.4，fov 52 下要 z>7.2 才在画外，
       z=8 只剩 0.38 的余量，再拉近就会在手机屏顶上露出接缝。 */
    var CAM_Z_D = 6.6, CAM_Z_M = 8.0;

    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function sstep(a, b, x) {
      var t = (x - a) / (b - a);
      t = t < 0 ? 0 : (t > 1 ? 1 : t);
      return t * t * (3 - 2 * t);
    }

    /* three 只在这张视图第一次被打开时才下载（594KB，不拖累首屏） */
    function loadThree(cb) {
      if (window.THREE) return cb();
      if (loadingTh) return;
      loadingTh = true;
      var s = document.createElement('script');
      s.src = 'assets/vendor/three.min.js';
      s.onload = function () { loadingTh = false; cb(); };
      s.onerror = function () { loadingTh = false; };
      document.head.appendChild(s);
    }

    /* ---------- 顶点：弓背 + 屏幕空间剪切 ---------- */
    var VERT = [
      'varying vec2 vUv;',
      '#define PI 3.14159265359',
      'uniform float uScrollSpeed;',
      'void main() {',
      '  vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;',
      '  vec3 p = position;',
      '  p.z = sin(uv.x * PI) * 0.2;',
      '  vec4 vp = viewMatrix * modelMatrix * vec4(p, 1.0);',
      '  vp.x += wp.y * wp.y * 0.1;',
      '  vp.x += sin(uv.y * PI) * uScrollSpeed * 2.0;',
      '  gl_Position = projectionMatrix * vp;',
      '  vUv = uv;',
      '}'
    ].join('\n');

    /* ---------- 片元：正面清楚 / 背面 9tap 模糊 / SDF 圆角 + 展开 ----------
       ★ 三个坑都在这儿：
       1) 朝向别用 gl_FrontFacing —— 实测（WARP / 部分驱动）恒为 true，背面永远是清楚的。
          改成 JS 里算好（法线·视线），用 uniform uBack 传进来，顺带能平滑过渡。
       2) 采样不能放在「按片元变化的 if」里 —— 隐式 LOD 在非一致控制流下未定义。
          uBack 是 uniform，分支对整张卡成立，这是安全的。
       3) 光靠 9 tap 在清晰图上拉半径，会看成几层鬼影 + 彩边（试过，糊成拉丝）。
          所以背面直接取 covers/blur/ 那张预先糊好的图，一次采样，零开销。 */
    var FRAG = [
      'uniform sampler2D uTexture;',
      'uniform sampler2D uBlurTex;',
      'uniform float uColorStrength;',
      'uniform float uZoom;',
      'uniform vec2 uPan;',
      'uniform vec2 uPlaneSizes;',
      'uniform vec2 uImageSizes;',
      'uniform float uRevealProgress;',
      'uniform float uBack;',
      'varying vec2 vUv;',
      'float roundedRectSDF(vec2 uv, vec2 size, float radius) {',
      '  vec2 d = abs(uv - 0.5) - size * 0.5 + radius;',
      '  return length(max(d, 0.0)) - radius;',
      '}',
      'void main() {',
      '  vec2 ratio = vec2(',
      '    min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),',
      '    min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)',
      '  );',
      '  vec2 uv = vec2(vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,',
      '                vUv.y * ratio.y + (1.0 - ratio.y) * 0.5);',
      '  vec2 t = (uv - 0.5) / uZoom + 0.5 + uPan;',
      '  vec3 col = texture2D(uTexture, t).rgb;',
      '  if (uBack > 0.01) {',
      /* 背面直接用 assets/covers/blur/ 里预先糊好的那张（一次采样）。
         实测：在清晰图上做 9 tap 会看成几层鬼影 + 彩边（半径一大，3×3 只有三个采样位置），
         预糊图既是真的模糊、又零开销，叠任何采样只会更糟。 */
      '    vec3 b = texture2D(uBlurTex, t).rgb;',
      '    col = mix(col, b, uBack);',
      '  }',
      '  col = mix(col, vec3(0.0), uColorStrength);',
      '  float reveal = clamp(uRevealProgress, 0.0, 1.0);',
      '  float radius = 0.05 * reveal;',
      '  float sdf = roundedRectSDF(vUv, vec2(reveal), radius);',
      /* 边缘羽化：正面轻微羽化，背面羽化得更宽。
         卡是矩形、环上一圈都正对镜头，所以一张"几乎全黑"的卡（比如纯黑书法卡）
         没有任何可见内容去界定边界，边框就是一条刀切线 —— 禹两次说"界限过于分明"。
         0.011 ≈ 卡宽的 2%（450px 卡上是 10px），够化开又还是硬边的观感。 */
      '  float soft = mix(0.011, 0.048, uBack);',
      '  float alpha = 1.0 - smoothstep(-soft, soft, sdf);',
      '  alpha *= smoothstep(0.1, 1.0, uRevealProgress);',
      '  gl_FragColor = vec4(col, alpha);',
      '}'
    ].join('\n');

    /* 9 件作品各出现 2 次，间距 9 槽 —— 一屏约 10 张，重复基本看不见。
       第 2 张仍给一点点不同裁切，万一两张同时上屏也不至于像复制粘贴 */
    var CROP = [
      { zoom: 1.00, pan: [0, 0] },
      { zoom: 1.12, pan: [0.04, -0.02] },
      { zoom: 1.22, pan: [-0.05, 0.03] }
    ];

    function makeCard(i, w, tex, blur, copy) {
      var c = CROP[copy % CROP.length];
      var mat = new THREE.ShaderMaterial({
        uniforms: {
          uTexture: { value: tex },
          uBlurTex: { value: blur || tex },
          uColorStrength: { value: 0 },
          uZoom: { value: c.zoom },
          uPan: { value: new THREE.Vector2(c.pan[0], c.pan[1]) },
          uPlaneSizes: { value: new THREE.Vector2(CARD_W, CARD_H) },
          uImageSizes: { value: new THREE.Vector2(1400, 788) },
          uRevealProgress: { value: 0 },
          uScrollSpeed: { value: 0 },
          uBack: { value: 0 }
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        side: THREE.DoubleSide
      });
      var m = new THREE.Mesh(SP.geo, mat);
      m.scale.set(CARD_W, CARD_H, 1);
      m.userData = { i: i, w: w, hover: 0, hoverTarget: 0, hidden: 1, hiddenTarget: 1, dir: 1.5 };
      return m;
    }

    /* ---------- 每帧：位置 / 朝向 / uniform ---------- */
    function updatePlane(m, dt, vel) {
      var u = m.userData;
      /* 盒式指数逼近：dt 是毫秒，×0.2 ≈ 每 16.6ms 走 15% */
      u.hover += (u.hoverTarget - u.hover) * (1 - Math.pow(u.hoverTarget ? 0.91 : 0.93, dt * 0.2));
      u.hidden += (u.hiddenTarget - u.hidden) * (1 - Math.pow(0.95, dt * 0.2));

      var n = ((u.i - SP.scroll.offset) % COUNT + COUNT) % COUNT;
      var b = n - CENTER;
      var th = b * ANGLE;
      var r = RADIUS * (1 - u.hidden / 2);   /* 藏起来时半径收到一半，像收起 */

      m.position.set(Math.cos(th) * r, (b * VGAP + Y0) * (SP.yScale || 1) - u.hidden * u.dir, Math.sin(th) * r);
      m.rotation.y = -th + Math.PI / 2;      /* 法线朝外，不跟相机 */

      var mu = m.material.uniforms;
      mu.uColorStrength.value = 0.55 * u.hover;
      mu.uZoom.value = 1 + 0.05 * u.hover;
      mu.uRevealProgress.value = (1 - u.hover * 0.05) * (1 - u.hidden);
      /* 夹一下：参考站里这一项原样直出，速度一旦冲上去整张卡会被横着拉出丝 */
      mu.uScrollSpeed.value = clamp(vel, -0.45, 0.45);

      /* 朝向：法线（=径向）· 指向相机的向量。
         > 0 是正面，< 0 是转过背了 → 背面走 9tap 模糊。
         在 CPU 算而不是在 shader 里 if，是为了让采样处于"常量分支"，mip 才是对的 */
      var nx = Math.sin(m.rotation.y), nz = Math.cos(m.rotation.y);
      var cx = -m.position.x, cy = -m.position.y, cz = SP.camera.position.z - m.position.z;
      var dl = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1;
      var facing = (nx * cx + nz * cz) / dl;
      mu.uBack.value = 1 - sstep(-0.12, 0.30, facing);
    }

    /* ---------- 射线：只认朝向相机那一面 ---------- */
    function hitPlane(cx, cy) {
      var el = SP.renderer.domElement;
      var r = el.getBoundingClientRect();
      var v = new THREE.Vector2(
        ((cx - r.left) / r.width) * 2 - 1,
        -((cy - r.top) / r.height) * 2 + 1
      );
      SP.ray.setFromCamera(v, SP.camera);
      var hits = SP.ray.intersectObjects(SP.planes, false);
      for (var k = 0; k < hits.length; k++) {
        var o = hits[k].object;
        if (o.userData.hidden > 0.01) continue;
        var nrm = hits[k].face.normal.clone().transformDirection(o.matrixWorld);
        if (nrm.dot(SP.ray.ray.direction) < 0) return o;
      }
      return null;
    }

    function updateHover() {
      /* 直接用归一化坐标打射线，省一次 getBoundingClientRect */
      SP.ray.setFromCamera(SP.mouse, SP.camera);
      var hits = SP.ray.intersectObjects(SP.planes, false);
      var found = null;
      for (var k = 0; k < hits.length; k++) {
        var o = hits[k].object;
        if (o.userData.hidden > 0.01) continue;
        var nrm = hits[k].face.normal.clone().transformDirection(o.matrixWorld);
        if (nrm.dot(SP.ray.ray.direction) < 0) { found = o; break; }
      }
      if (found === SP.hovered) return;
      if (SP.hovered) SP.hovered.userData.hoverTarget = 0;
      SP.hovered = found;
      if (found) found.userData.hoverTarget = 1;
      stage.style.cursor = found ? 'pointer' : '';
    }

    /* ---------- 展开 / 收起 ---------- */
    function resetAll() {
      for (var i = 0; i < SP.planes.length; i++) {
        var u = SP.planes[i].userData;
        u.hidden = 1; u.hiddenTarget = 1; u.dir = 1.5;
        u.hover = 0; u.hoverTarget = 0;
      }
      SP.hovered = null;
    }
    function revealAll() {
      SP.planes.forEach(function (m, i) {
        setTimeout(function () {
          m.userData.dir = -1.5;
          m.userData.hiddenTarget = 0;
        }, (i % 4) * 50);
      });
    }
    function hideAll() {
      SP.planes.forEach(function (m, i) {
        setTimeout(function () {
          m.userData.dir = 1.5;
          m.userData.hiddenTarget = 1;
        }, (i % 4) * 30);
      });
    }

    /* ---------- 建场景 ---------- */
    function init() {
      if (SP || !window.THREE) return;
      var W = stage.clientWidth || 1200, H = stage.clientHeight || 700;

      var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(W, H);
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.className = 'sp-canvas';
      stage.insertBefore(renderer.domElement, stage.firstChild);

      var scene = new THREE.Scene();
      /* 参考站同一组：半径 2、相机 z = 8（距离÷半径 = 4），fov 35（手机 45） */
      var camera = new THREE.PerspectiveCamera(W < 900 ? FOV_M : FOV_D, W / H, 0.1, 100);
      camera.position.set(0, 0, W < 900 ? CAM_Z_M : CAM_Z_D);
      scene.add(camera);

      var geo = new THREE.PlaneGeometry(1, 1, 8, 8);
      var loader = new THREE.TextureLoader();
      var texCache = {}, planes = [];

      SP = {
        renderer: renderer, scene: scene, camera: camera, geo: geo,
        planes: planes, hovered: null,
        yScale: 1,
        ray: new THREE.Raycaster(),
        mouse: new THREE.Vector2(0, 0),
        hasMouse: false, last: 0, dragMoved: false, drag: null,
        scroll: { easing: 0.1, minSpeed: 0.002, dir: 1, vel: 0, target: 0, offset: 0 }
      };

      function tex(url) {
        if (texCache[url]) return texCache[url];
        var t = loader.load(url, function (tt) {
          planes.forEach(function (m) {
            if (m.material.uniforms.uTexture.value === tt) {
              m.material.uniforms.uImageSizes.value.set(tt.image.width, tt.image.height);
            }
          });
        });
        texCache[url] = t;
        return t;
      }

      /* 背面用的预先糊好的图；缺文件就退回清晰图（宁可没糊，也别整块变黑） */
      function blurTex(url) {
        var bu = url.replace('/covers/', '/covers/blur/');
        if (texCache[bu]) return texCache[bu];
        var t = loader.load(bu, null, null, function () {
          planes.forEach(function (m) {
            if (m.material.uniforms.uBlurTex.value === t) {
              m.material.uniforms.uBlurTex.value = m.material.uniforms.uTexture.value;
            }
          });
        });
        texCache[bu] = t;
        return t;
      }

      SLOTS.forEach(function (w, i) {
        /* copy = 这件作品是第几遍出现（0/1），决定裁切 */
        var m = makeCard(i, w, tex(w.cover), blurTex(w.cover), Math.floor(i / FEAT.length));
        scene.add(m);
        planes.push(m);
      });

      var el = renderer.domElement;

      /* 滚轮：每 1 点 deltaY 只加 0.00015，累计夹在 ±2，松手自然衰减 —— 手感的全部 */
      el.addEventListener('wheel', function (e) {
        e.preventDefault();
        SP.scroll.target = clamp(SP.scroll.target + e.deltaY * 0.00015, -2, 2);
        SP.scroll.dir = e.deltaY > 0 ? 1 : -1;
      }, { passive: false });

      el.addEventListener('pointerdown', function (e) {
        SP.drag = { down: true, moved: false, x0: e.clientX, x: e.clientX, pid: e.pointerId };
      });

      el.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'touch') {
          var r = el.getBoundingClientRect();
          SP.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
          SP.mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
          SP.hasMouse = true;
        }
        var d = SP.drag;
        if (!d || !d.down) return;
        if (!d.moved) {
          if (Math.abs(e.clientX - d.x0) <= 6) return;
          d.moved = true;
          try { el.setPointerCapture(e.pointerId); } catch (err) {}
          stage.classList.add('dragging');
        }
        var dx = e.clientX - d.x;
        d.x = e.clientX;
        SP.scroll.target = clamp(SP.scroll.target + dx * 0.0015, -2, 2);
        SP.scroll.dir = dx > 0 ? 1 : -1;
      });

      function endDrag() {
        var d = SP.drag;
        if (!d) return;
        d.down = false;
        if (d.moved) { SP.dragMoved = true; stage.classList.remove('dragging'); }
      }
      el.addEventListener('pointerup', endDrag);
      el.addEventListener('pointercancel', endDrag);

      var spY0 = 0, spX0 = 0;
      stage.addEventListener('touchstart', function (e) {
        spY0 = e.touches[0].clientY;
        spX0 = e.touches[0].clientX;
      }, { passive: true });
      stage.addEventListener('touchend', function (e) {
        /* 手机回到 dg：盘旋里上下滑不翻页，只转环 */
        if (window.matchMedia('(max-width: 680px)').matches) return;
        if (!e.changedTouches[0]) return;
        var dy = spY0 - e.changedTouches[0].clientY;
        var dx = spX0 - e.changedTouches[0].clientX;
        if (Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx) * 1.2 && window.__flipPage) {
          window.__flipPage(dy > 0 ? 1 : -1);
        }
      }, { passive: true });


      el.addEventListener('pointerleave', function () {
        SP.hasMouse = false;
        if (SP.hovered) { SP.hovered.userData.hoverTarget = 0; SP.hovered = null; }
        stage.style.cursor = '';
      });

      el.addEventListener('click', function (e) {
        if (SP.dragMoved) { SP.dragMoved = false; return; }
        var o = hitPlane(e.clientX, e.clientY);
        if (o) openPlayer(o.userData.w.video, o.userData.w.title);
      });

      if (window.__spiralResize) window.removeEventListener('resize', window.__spiralResize);
      window.__spiralResize = function () {
        if (!SP) return;
        var w = stage.clientWidth || 1200, h = stage.clientHeight || 700;
        SP.camera.aspect = w / h;
        SP.camera.fov = w < 900 ? FOV_M : FOV_D;
        SP.camera.position.z = w < 900 ? CAM_Z_M : CAM_Z_D;
        SP.yScale = 1;
        SP.camera.updateProjectionMatrix();
        SP.renderer.setSize(w, h);
      };
      window.addEventListener('resize', window.__spiralResize);

      window.__spiral = {
        get offset() { return SP.scroll.offset; },
        /* 调试用：只挪位置，不碰速度 —— 速度是 uScrollSpeed，喂大了会把卡片横着拉出丝 */
        set offset(v) { SP.scroll.offset = v; SP.scroll.vel = 0; },
        get pos() { return SP.scroll.offset; },
        set pos(v) { SP.scroll.offset = v; SP.scroll.vel = 0; },
        get vel() { return SP.scroll.vel; },
        get planes() { return SP.planes; },
        get camera() { return SP.camera; },
        /* 跳到某处并当场算一帧位置（验收用） */
        seek: function (o) {
          SP.scroll.offset = o;
          SP.scroll.vel = 0;
          for (var i = 0; i < SP.planes.length; i++) updatePlane(SP.planes[i], 16.6, 0);
        },
        reveal: revealAll, hide: hideAll
      };

      /* 建好就进场 */
      resetAll();
      revealAll();
      start();
    }

    function frame(t) {
      rafId = null;
      if (!SP || !document.body.classList.contains('view-spiral')) return;
      var dt = SP.last ? Math.min(50, t - SP.last) : 16.6;
      SP.last = t;

      var S = SP.scroll;
      S.vel += (S.target - S.vel) * S.easing;      /* 弹簧追目标 */
      S.offset += S.vel;                           /* 连续滑行 —— 不"一卡一卡"就在这一行 */
      if (Math.abs(S.target) < S.minSpeed) S.target = S.dir * S.minSpeed;  /* 永不停：静止也在漂 */
      S.target *= 0.9;                             /* 松手衰减 */

      for (var i = 0; i < SP.planes.length; i++) updatePlane(SP.planes[i], dt, S.vel);
      if (SP.hasMouse) updateHover();

      SP.renderer.render(SP.scene, SP.camera);
      rafId = requestAnimationFrame(frame);
    }

    function start() {
      if (!SP || rafId) return;
      SP.last = 0;
      rafId = requestAnimationFrame(frame);
    }

    /* ---------- 列表 / 盘旋 切换（绑在当前按钮上，转场换了 DOM 自然重绑） ---------- */
    sw.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.vs-btn') : null;
      if (!btn || !sw.contains(btn)) return;
      var on = btn.getAttribute('data-view') === 'spiral';
      if (document.body.classList.contains('view-spiral') === on) return;
      document.body.classList.toggle('view-spiral', on);
      [].forEach.call(sw.querySelectorAll('.vs-btn'), function (b) {
        b.classList.toggle('is-on', b === btn);
      });
      if (!on) {
        if (SP) resetAll();          /* 收起来；下次进来重新长出来 */
        /* 列表这边也用同一套"从中心长出来"，切来切去才是一个语言 */
        var rows = document.querySelectorAll('#reelList .reel-row');
        if (window.__playRow) {
          /* 第 4 个参数 force=true：每次切回列表都重播一遍（行本身只进不退，见 transition.js） */
          [].forEach.call(rows, function (r) { r.__rowDone = false; window.__playRow(r, 0, true, true); });
        }
        return;
      }
      loadThree(function () {
        init();
        if (!SP) return;
        resetAll();
        revealAll();
        start();
      });
    });

    /* 转场只换 main，body 上的 view-spiral 会跨页保留 → 按钮状态要跟上 */
    [].forEach.call(sw.querySelectorAll('.vs-btn'), function (b) {
      b.classList.toggle('is-on',
        (b.getAttribute('data-view') === 'spiral') === document.body.classList.contains('view-spiral'));
    });

    /* 如果切走之前正停在盘旋视图，回来要自动接上 */
    if (document.body.classList.contains('view-spiral')) {
      setTimeout(function () {
        if (!window.THREE) loadThree(function () { init(); });
        else init();
      }, 60);
    }
  };
  window.__initSpiral();
})();