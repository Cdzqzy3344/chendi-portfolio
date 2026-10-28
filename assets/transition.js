/* ============================================================
   无刷页面转场
   原理：拦链接 → 三条黑幕扫入 → fetch 目标页 → 只换 <main> →
        滚回顶部 → 重建本页内容 → 黑幕扫出 → 新标题浮入
   为什么不用 location.href：整页刷新会把动画直接杀掉，跨页就没有连续性
   ============================================================ */
var PAGE_SEQ = ['index.html', 'works.html', 'all.html', 'about.html', 'contact.html'];

/* 转场黑幕上的页名：纯黑幕太素，给一张"片头卡" */
var PAGE_NAME = {
  'index.html':   { en: 'HOME',     cn: '陈镝' },
  'works.html':   { en: 'SELECTED', cn: '精选作品' },
  'all.html':     { en: 'ALL WORK', cn: '全部作品' },
  'about.html':   { en: 'ABOUT',    cn: '关于' },
  'contact.html': { en: 'CONTACT',  cn: '联系' }
};

(function () {
  var tr = document.getElementById('tr');
  var main = document.querySelector('main');
  if (!tr || !main || !window.fetch || !window.history.pushState) return;

  var bars = tr.querySelectorAll('i');
  for (var bi = 0; bi < bars.length; bi++) {
    var bimg = document.createElement('img');
    bimg.src = 'assets/bg/transition-blackhole-hd.jpg';
    bimg.alt = '';
    bars[bi].appendChild(bimg);
  }
  var busy = false;
  var pendingHash = '';
  var coverAt = 0;
  var lastFile = (location.pathname.split('/').pop() || 'index.html');

  var EASE = 'cubic-bezier(.76,0,.24,1)';
  var BAR_MS = 480;      /* 单条扫过时长 */
  var STAGGER = 24;      /* 三条错峰 */
  var HOLD_MS = 420;      /* 全黑停顿——没有这一拍会显得赶 */
  var TITLE_OUT = 170;   /* 旧标题上移淡出 */
  var TITLE_IN = 420;    /* 新标题进入 */

  function animateBars(fromY, toY) {
    var jobs = [];
    for (var i = 0; i < bars.length; i++) {
      jobs.push(bars[i].animate(
        [{ transform: 'translateY(' + fromY + '%)' },
         { transform: 'translateY(' + toY + '%)' }],
        { duration: BAR_MS, delay: i * STAGGER, easing: EASE, fill: 'forwards' }
      ).finished);
    }
    return Promise.all(jobs);
  }

  function clearBars() {
    for (var i = 0; i < bars.length; i++) {
      var anims = bars[i].getAnimations();
      for (var j = 0; j < anims.length; j++) anims[j].cancel();
    }
  }

  /* 揭开黑幕前先把新页的图等一等：不等的话，黑幕一扫开就是空白，
     接着图片一张张蹦出来 —— 视觉上就是"转场完了又刷新了一下" */
  function waitImages(root, ms) {
    var imgs = [].slice.call(root.querySelectorAll('img'));
    var jobs = [];
    for (var i = 0; i < imgs.length; i++) {
      (function (im) {
        if (im.complete && im.naturalWidth) return;
        jobs.push(new Promise(function (res) {
          im.addEventListener('load', res, { once: true });
          im.addEventListener('error', res, { once: true });
        }));
      })(imgs[i]);
    }
    if (!jobs.length) return Promise.resolve();
    return Promise.race([
      Promise.all(jobs),
      new Promise(function (res) { setTimeout(res, ms); })
    ]);
  }

  /* 回首页时等 hero 视频有第一帧再揭幕：否则黑幕一开，看到的是空底/上一页的深空底 */
  function waitHeroFrame(root, ms) {
    var v = root.querySelector('video.hero-video');
    if (!v) return Promise.resolve();
    if (v.readyState >= 2) return Promise.resolve();
    return new Promise(function (res) {
      var done = false;
      function fin() {
        if (done) return;
        done = true;
        clearTimeout(t);
        v.removeEventListener('loadeddata', fin);
        res();
      }
      var t = setTimeout(fin, ms);
      v.addEventListener('loadeddata', fin, { once: true });
    });
  }

  /* 等首页粒子标题画出第一帧，避免黑幕揭开时只看到空 hero 底 */
  function waitHeroReady(root, ms) {
    if (!root.querySelector('#heroStage')) return Promise.resolve();
    var p = window.__heroReady || Promise.resolve();
    return Promise.race([p, new Promise(function (res) { setTimeout(res, ms); })]);
  }

  /* 去子页时等深空视频有一帧再揭幕：否则黑幕抬完，背景还在解码 */
  function waitVoidFrame(root, ms) {
    var route = root.getAttribute ? root.getAttribute('data-route') : '';
    if (!route || route === 'home') return Promise.resolve();
    var v = document.querySelector('.void-video');
    if (!v) return Promise.resolve();
    if (v.readyState >= 2) return Promise.resolve();
    return new Promise(function (res) {
      var done = false;
      function fin() {
        if (done) return;
        done = true;
        clearTimeout(t);
        v.removeEventListener('loadeddata', fin);
        res();
      }
      var t = setTimeout(fin, ms);
      v.addEventListener('loadeddata', fin, { once: true });
    });
  }

  function headOf(root) {
    if (root.getAttribute('data-route') === 'home') return null;
    return root.querySelector('.sec-head h2, .about h2, .contact h2, h1, h2');
  }

  function slideTitle(root, out, dir) {
    var t = headOf(root);
    if (!t) return Promise.resolve();
    var dy = 20 * (dir === -1 ? -1 : 1);
    var frames = out
      ? [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(' + (-dy) + 'px)' }]
      : [{ opacity: 0, transform: 'translateY(' + dy + 'px)' }, { opacity: 1, transform: 'translateY(0)' }];
    return t.animate(frames, {
      duration: out ? TITLE_OUT : TITLE_IN,
      easing: EASE, fill: 'forwards'
    }).finished;
  }


  /* 黑幕上的"片头卡"：全黑那一拍浮现目标页名字 */
  var labelEl = document.createElement('div');
  labelEl.className = 'tr-label';
  labelEl.innerHTML = '<i></i><span></span>';
  document.body.appendChild(labelEl);

  var labelEn = labelEl.querySelector('i');
  var labelCn = labelEl.querySelector('span');

  function showLabel(href) {
    var n = PAGE_NAME[href.split('#')[0]];
    if (!n) return;
    labelEn.textContent = n.en;
    labelCn.textContent = n.cn;
    labelEl.animate(
      [{ opacity: 0, transform: 'translateY(-50%) scale(.985)' },
       { opacity: 1, transform: 'translateY(-50%) scale(1)' }],
      { duration: 240, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'both' }
    );
  }
  function hideLabel() {
    labelEl.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 170, easing: 'ease-in', fill: 'both' }
    );
  }

  function markNav(href) {
    var hashIdx = href.indexOf('#');
    var path = hashIdx > -1 ? href.slice(0, hashIdx) : href;
    var hash = hashIdx > -1 ? href.slice(hashIdx) : '';
    var links = document.querySelectorAll('.nav a');
    for (var i = 0; i < links.length; i++) {
      var h = links[i].getAttribute('href') || '';
      var hi = h.indexOf('#');
      var p = hi > -1 ? h.slice(0, hi) : h;
      var hh = hi > -1 ? h.slice(hi) : '';
      links[i].classList.toggle('is-on', p === path && hh === hash);
    }
  }

  /* 直接打开某一页时也要点亮导航 */
  markNav((location.pathname.split('/').pop() || 'index.html') + location.hash);


/* ============================================================
   转场后的内容进场：各区块从左右两侧交替滑入、错峰汇聚
   —— 用 WAAPI，fill:both 保证结束状态是"到位"
   ============================================================ */
var ENTER_SEL = '.sec-head, .type-block, .reel-row, .stats-grid, .contact-film, .about-grid > *, .hero-info, .rv';
var enterIO = null;
var EASE_OUT = 'cubic-bezier(.23,1,.32,1)';
var EASE_IN = 'cubic-bezier(.5,0,.9,.3)';

function sideOf(el, idx, dir) {
  return (idx % 2 === 0 ? -46 : 46) * (dir === -1 ? -1 : 1);
}

function killAnims(el) {
  var a = el.getAnimations ? el.getAnimations() : [];
  for (var i = 0; i < a.length; i++) a[i].cancel();
}

/* 列表行：和盘旋卡片同一套语言 —— 从自己中心长出来。
   盘旋那边是 SDF 圆角矩形展开，这里用 clip-path: inset 从中间往两边打开，
   眼睛看到的是同一种"长出来"，比左右滑入统一。 */
function rowIndexOf(el) {
  var i = 0, n = el;
  while ((n = n.previousElementSibling)) i++;
  return i;
}

window.__playRow = function (el, delay, show, force) {
  if (!el.animate) return;
  /* 手机不做行进场：460ms 的 clip-path + 560ms 的文字滚动，在手机上看就是
     "页面先缺一块、卡一下才完整"。直接给完成态，翻页时整页一开始就是全的。 */
  if (window.matchMedia('(max-width: 680px)').matches) { el.__rowDone = true; return; }
  /* ★★ 行只进不退，且只播一次。
     之前行是可逆的：滚出视口 → playExit（opacity 0 + clip），滚回来 → playEnter。
     但 row 的 clip-path 会让 IntersectionObserver 在边界上反复判"进了/出了"，
     实测一行卡在视口底边时会每 200ms 来回切一次 → 整行 + 3 段文字不停重播，
     手机上看就是"一直在闪"。改成一次性进场，问题根除，观感也更对：
     往下翻不该反复重播已经看过的行。 */
  if (!show) return;
  if (el.__rowDone && !force) return;
  el.__rowDone = true;
  var closed = 'inset(50% 42% 50% 42% round 6px)';
  var open = 'inset(0% 0% 0% 0% round 0px)';
  var d = (delay || 0) + rowIndexOf(el) * 30;
  /* ★ fill 必须是 backwards，不能是 none：
     none 在「延迟还没开始」的那段时间里用的是元素本来的样式 = 整行亮着，
     等延迟到点才突然变成透明的，看起来就是"先显示一遍，再重播一次进场"。
     backwards 让延迟期间就停在第一帧，到点直接张开。 */
  el.animate(
    show ? [{ opacity: 0, clipPath: closed }, { opacity: 1, clipPath: open }]
         : [{ opacity: 1, clipPath: open }, { opacity: 0, clipPath: closed }],
    {
      duration: show ? 460 : 300,
      delay: d,
      easing: show ? EASE_OUT : EASE_IN,
      fill: show ? 'backwards' : 'both'
    }
  );

  /* ---- 第二拍：行张开之后，文字自己滚进来 ----
     每段文字外面是个"只露一行"的遮罩，里面 .rl 装了三份同样的字；
     把 .rl 往上滚两格（-66.6667% 是它自身 3 行高的 2/3）→ 文字滚了两圈才停。
     三份内容一样，所以落地那一帧和没滚是同一帧，收尾不会跳。
     延迟 = 行的延迟 + 230，每一行的字都紧跟着自己那一行。 */
  var tx = el.querySelectorAll('.rl'), k;
  for (k = 0; k < tx.length; k++) {
    var running = tx[k].getAnimations ? tx[k].getAnimations() : [];
    for (var q = 0; q < running.length; q++) running[q].cancel();
    if (!show) continue;
    tx[k].animate(
      [
        { transform: 'translateY(0%)' },
        { transform: 'translateY(-66.6667%)' }
      ],
      { duration: 560, delay: d + 230, easing: 'cubic-bezier(.16,.84,.28,1)', fill: 'none' }
    );
  }
};

function playEnter(el, idx, dir, delay) {
  el.__entered = true;
  el.style.opacity = '';
  el.style.transform = '';
  if (el.classList.contains('rv')) el.classList.add('in');
  killAnims(el);
  /* 行自己有错峰，别再叠区块那一层 delay，否则越靠后越晚才出现 */
  if (el.classList.contains('reel-row')) { window.__playRow(el, 0, true); return; }
  var from = sideOf(el, idx, dir);
  el.animate(
    [
      { opacity: 0, transform: 'translateX(' + from + 'px)' },
      { opacity: 1, transform: 'translateX(0)' }
    ],
    { duration: 480, delay: delay || 0, easing: EASE_OUT, fill: 'both' }
  );
}

/* 怎么来的怎么退：从哪一侧进来，就往哪一侧退回去 */
function playExit(el, idx, dir) {
  if (!el.__entered) return;
  el.__entered = false;
  var to = sideOf(el, idx, dir);
  el.style.opacity = '';
  el.style.transform = '';
  if (el.classList.contains('rv')) el.classList.add('in');
  killAnims(el);
  if (el.classList.contains('reel-row')) return;   /* 行不做退场动画，退了就会跟 IO 打架 */
  el.animate(
    [
      { opacity: 1, transform: 'translateX(0)' },
      { opacity: 0, transform: 'translateX(' + to + 'px)' }
    ],
    { duration: 380, easing: EASE_IN, fill: 'both' }
  );
}

/* 收集要动的区块：去掉"祖先也在清单里"的元素，避免父子同时位移；
   用过滤后的顺序编号，保证相邻两块一定一左一右 */
function collectBlocks(root) {
  var all = [].slice.call(root.querySelectorAll(ENTER_SEL));
  return all.filter(function (el) {
    for (var i = 0; i < all.length; i++) {
      if (all[i] !== el && all[i].contains(el)) return false;
    }
    return true;
  });
}

/* 关键：视口里的立即进场；视口外的等滚到再进场；滚出去则按原路退回
   —— 动画可逆，往回滚还能再看一遍 */
function settlePage(root) {
  var rvs = root.querySelectorAll('.rv');
  for (var r = 0; r < rvs.length; r++) rvs[r].classList.add('in');
  var items = collectBlocks(root);
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (!it) continue;
    killAnims(it);
    it.style.opacity = '';
    it.style.transform = '';
    it.style.clipPath = '';
    it.classList.add('in');
    var rls = it.querySelectorAll ? it.querySelectorAll('.rl') : [];
    for (var q = 0; q < rls.length; q++) {
      killAnims(rls[q]);
      rls[q].style.transform = '';
    }
  }
}

function enterBlocks(root, dir) {
  var items = collectBlocks(root);

  if (enterIO) { enterIO.disconnect(); enterIO = null; }

  /* 内部的 .rv 一律标 .in：它们自己不再做位移，交给父级块统一带 */
  var rvs = root.querySelectorAll('.rv');
  for (var r = 0; r < rvs.length; r++) rvs[r].classList.add('in');

  /* 手机不做区块/行的错峰进场：翻页黑幕一抬起来，整页就是完成态。
     手机上 480~560ms 的位移+clip-path 只会让人先看到"缺一块"的页面。 */
  if (window.matchMedia('(max-width: 680px)').matches) {
    for (var m = 0; m < items.length; m++) {
      var it = items[m];
      it.style.opacity = '';
      it.style.transform = '';
      it.style.clipPath = '';
      it.classList.add('in');
      killAnims(it);
      var rls = it.querySelectorAll ? it.querySelectorAll('.rl') : [];
      for (var q = 0; q < rls.length; q++) {
        killAnims(rls[q]);
        rls[q].style.transform = '';
      }
    }
    return;
  }

  enterIO = new IntersectionObserver(function (entries) {
    for (var k = 0; k < entries.length; k++) {
      var en = entries[k];
      var el = en.target;
      if (en.isIntersecting) {
        if (!el.__entered) playEnter(el, el.__enterIdx || 0, el.__enterDir || 1, 0);
      } else {
        playExit(el, el.__enterIdx || 0, el.__enterDir || 1);
      }
    }
  }, { threshold: 0, rootMargin: '0px 0px -2% 0px' });

  var order = 0;
  for (var i = 0; i < items.length; i++) {
    (function (el, idx) {
      el.__enterIdx = idx;
      el.__enterDir = dir;
      var r = el.getBoundingClientRect();
      var inView = r.bottom > 0 && r.top < window.innerHeight;
      if (inView) {
        playEnter(el, idx, dir, Math.min(order, 5) * 70);
        order++;
      } else {
        /* 视口外的先按住，等滚到再进 */
        el.style.opacity = '0';
        el.style.transform = 'translateX(' + sideOf(el, idx, dir) + 'px)';
      }
      enterIO.observe(el);
    })(items[i], i);
  }
}

  function dirOf(href) {
    var from = (location.pathname.split('/').pop() || 'index.html');
    var to = href.split('#')[0];
    var a = PAGE_SEQ.indexOf(from), b = PAGE_SEQ.indexOf(to);
    if (a < 0 || b < 0 || a === b) return 1;
    return b > a ? 1 : -1;
  }

  function go(href, push, dir) {
    dir = dir === -1 ? -1 : 1;
    if (busy) return;
    busy = true;
    window.__transiting = true;
    document.documentElement.classList.add('is-transitioning');
    /* 进出首页的转场里不许露出深空底：旧页/新页在幕布缝隙里一闪，就是用户看到的“底背景” */
    function isHome(u) {
      u = String(u || '').split('#')[0].split('?')[0];
      return /(^|\/)index\.html$/.test(u) || /\/$/.test(u);
    }
    var lenis = window.__getLenis ? window.__getLenis() : null;
    if (lenis) lenis.stop();
    /* 兜底：万一动画没完成（比如中途切到后台），地址栏也要跟上 */
    var pushFallback = setTimeout(function () {
      if (push) { try { history.pushState({ href: href }, '', href); } catch (err) {} }
      window.__transiting = false;
    }, 1500);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

    slideTitle(main, true, dir);

    animateBars(dir === 1 ? 101 : -101, 0).then(function () {
      /* solid backdrop: covers the 1px grid rounding seams while fully dark */
      tr.classList.add('is-solid');
      coverAt = performance.now();
      document.documentElement.classList.toggle('via-home', isHome(href));
      showLabel(href);
      return fetch(href, { credentials: 'same-origin' });
    }).then(function (res) {
      return res.text();
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var next = doc.querySelector('main');
      if (!next) { location.href = href; return; }

      main.innerHTML = next.innerHTML;
      main.setAttribute('data-route', next.getAttribute('data-route') || '');
      document.title = doc.title;

      window.__stage = 'before-render';
      if (window.__renderPage) window.__renderPage();
      window.__stage = 'after-render';

      /* 先把滚动落到新页位置，再初始化粒子：
         否则从内页回首页时，粒子会拿"上一页的 scrollY"去算头像位置，
         等下一帧 scrollTo(0) 才归位——就是回首页那下明显的卡顿/跳位。 */
      var landY = 0;
      if (dir === -1) {
        landY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      }
      /* 先把 lenis 放行再落位：stop 状态下 scrollTo 不生效，hero 的 sticky 也要等下一帧才咬合，
         咬合前 init 粒子会拿 -1393 的 block.top 算头像，随后才跳到正确位置 = 用户看到的「跳一下」 */
      if (lenis) lenis.start();
      if (lenis) lenis.scrollTo(landY, { immediate: true });
      window.scrollTo(0, landY);
      if (main.querySelector('.hero')) main.querySelector('.hero').getBoundingClientRect();

      return new Promise(function (res) {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            if (window.__initSpiral) window.__initSpiral();
            if (window.__initHeroParticles) window.__initHeroParticles();
            /* SPA 重建 hero 后视频要重新 play，否则回首页是暂停帧 */
            var hv = main.querySelector('.hero-video');
            if (hv) {
              hv.muted = true;
              try { var hp = hv.play(); if (hp && hp.catch) hp.catch(function () {}); } catch (err) {}
            }
            if (window.__initAboutWords) window.__initAboutWords();
            if (lenis) lenis.stop();
            markNav(href);
            res();
          });
        });
      }).then(function () {
        /* 这里不要提前标 .in：要让内容"从无到有"地进场，
           提前标了就会先看见字、随后又播一遍动画（禹报的第 1 条） */

        /* 锚点留到转场结束后再落位，否则会被 lenis 复位掉 */
        pendingHash = href.indexOf('#') > -1 ? href.slice(href.indexOf('#')) : '';

        return waitVoidFrame(main, 900).then(function () {
          return waitHeroReady(main, 1200);
        }).then(function () {
          return waitHeroFrame(main, 900);
        }).then(function () {
          return waitImages(main, 300);
        }).then(function () {
          var left = Math.max(0, 650 - (performance.now() - coverAt));
          return new Promise(function (r) { setTimeout(r, left); });
        });
      });
    }).then(function () {
      hideLabel();
      /* 回首页：黑幕还没抬，把粒子 morph 归零，揭幕时头像从粒子汇集而成 */
      if (main.getAttribute('data-route') === 'home' && window.__heroReplayMorph) window.__heroReplayMorph();
      window.dispatchEvent(new Event('cursorreset'));
      /* 黑幕开始扫的同时，内容从左右两侧交替入场 —— 黑幕移开的那一刻正好"汇聚"成型 */
      enterBlocks(main, dir);
      return new Promise(function (r) { setTimeout(r, 90); }).then(function () {
        /* 背景图留到黑幕完全退场再撤，揭幕过程缝隙里也是照片不是黑 */
        return animateBars(0, dir === 1 ? -101 : 101);
      });
    }).then(function () {
      tr.classList.remove('is-solid');
      clearBars();
      document.documentElement.classList.remove('via-home');
      document.documentElement.classList.remove('is-transitioning');
      return Promise.resolve().then(function () {
        if (lenis) lenis.start();   /* 必须先把 lenis 放行，它在 stop 状态下不接受 scrollTo */
        if (pendingHash) {
          var target = document.querySelector(pendingHash);
          if (target) {
            var y = target.getBoundingClientRect().top + window.scrollY - 64;
            if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
            setTimeout(function () {
              if (Math.abs(window.scrollY - y) > 8) window.scrollTo(0, y);
            }, 80);
          }
          pendingHash = '';
        }
        busy = false;
        window.__transiting = false;
        clearTimeout(pushFallback);
        lastFile = href.split('#')[0];
        if (push) history.pushState({ href: href }, '', href);
      });
      /* 兜底：标题动画万一没触发，也别把 busy 卡死 */
      setTimeout(function () { if (busy) { busy = false; if (lenis) lenis.start(); } }, 900);
    }).catch(function () {
      clearBars();
      tr.classList.remove('is-solid');
      document.documentElement.classList.remove('is-transitioning');
      document.documentElement.classList.remove('via-home');
      busy = false;
      window.__transiting = false;
      window.__transiting = false;
      if (lenis) lenis.start();
      location.href = href;
    });
  }

  document.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href) return;
    if (href.charAt(0) === '#' || a.target === '_blank') return;
    if (/^(https?:|mailto:|tel:)/.test(href)) return;
    e.preventDefault();
    go(href, true, dirOf(href));
  });

  window.addEventListener('popstate', function () {
    var file = location.pathname.split('/').pop() || 'index.html';
    var a = PAGE_SEQ.indexOf(lastFile), b = PAGE_SEQ.indexOf(file);
    var dir = (a >= 0 && b >= 0 && b < a) ? -1 : 1;
    go(file + location.hash, false, dir);
  });

  /* 暴露给外部：万一要手动转场 */
  window.__go = go;
})();

/* ============================================================
   滑到底 / 滑到顶 再滑一下 = 翻到下一 / 上一页
   触发条件：已经到边界 + 同方向累计滚动超过阈值 + 冷却时间已过
   ============================================================ */
(function () {
  var SEQ = PAGE_SEQ;
  var ACC = 0;            /* 同方向累计 */
  var NEED = 60;          /* 需要再滑多少才翻页（一次滚轮约 100，所以一下就该翻） */
  var HITS = 0;           /* 连续同方向事件数，触控板小 delta 靠它累计 */
  var COOL = 750;         /* 两次翻页最小间隔 */
  var last = 0;

  function curIndex() {
    var f = (location.pathname.split('/').pop() || 'index.html');
    for (var i = 0; i < SEQ.length; i++) if (SEQ[i] === f) return i;
    return -1;
  }

  function atBottom() {
    var doc = document.documentElement;
    return window.scrollY + window.innerHeight >= doc.scrollHeight - 24;
  }
  function atTop() {
    return window.scrollY <= 2;
  }

  function flip(dir) {
    if (busyNow()) return;
    var i = curIndex();
    if (i < 0) return;
    var j = i + dir;
    if (j < 0 || j >= SEQ.length) return;      /* 到头就停，不循环 */
    if (window.__go) window.__go(SEQ[j], true, dir);
  }

  function busyNow() {
    /* 转场进行中不响应，否则会连跳两页 */
    if (window.__transiting) return true;
    if (performance.now() - last < COOL) return true;
    return false;
  }

  function onWheel(e) {
    if (busyNow()) { ACC = 0; HITS = 0; return; }
    var d = e.deltaY;
    var wantNext = d > 0 && atBottom();
    var wantPrev = d < 0 && atTop();
    if (!wantNext && !wantPrev) { ACC = 0; HITS = 0; return; }
    /* 盘旋视图内部滚动不翻页 */
    if (e.target && e.target.closest && e.target.closest('[data-lenis-prevent]')) { ACC = 0; return; }

    ACC += d; HITS++;
    if ((ACC > NEED && HITS >= 1) || HITS >= 3) {
      if (ACC > 0 && wantNext) { ACC = 0; HITS = 0; flip(1); last = performance.now(); }
    }
    if (ACC < -NEED || (HITS >= 3 && wantPrev)) {
      if (ACC < 0 && wantPrev) { ACC = 0; HITS = 0; flip(-1); last = performance.now(); }
    }
  }
  window.addEventListener('wheel', onWheel, { passive: true });

  /* 触屏：手指上滑 = 看下面 = 想翻下一页 */
  var ty = 0, tAcc = 0;
  window.addEventListener('touchstart', function (e) {
    ty = e.touches[0].clientY; tAcc = 0;
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (busyNow()) return;
    var y = e.touches[0].clientY;
    var dy = ty - y;      /* 正数 = 手指上滑 */
    ty = y;
    if ((dy > 0 && atBottom()) || (dy < 0 && atTop())) {
      if (e.target.closest && e.target.closest('[data-lenis-prevent]')) return;
      tAcc += dy;
      if (tAcc > 110) { tAcc = 0; flip(1); last = performance.now(); }
      else if (tAcc < -110) { tAcc = 0; flip(-1); last = performance.now(); }
    } else {
      tAcc = 0;
    }
  }, { passive: true });

  window.__flipPage = function (dir) {
    if (busyNow()) return;
    flip(dir);
    last = performance.now();
  };
  window.__flipDbg = function () { return { bottom: atBottom(), top: atTop(), i: curIndex(), acc: ACC, trans: !!window.__transiting }; };
  /* 让转场模块能读到"正在转场" */
  window.__pageSeq = SEQ;
})();
/* ============================================================
   滚到底 / 到顶时，提示"继续滚动可以翻页"
   没有这个提示，用户根本不知道还能往下翻
   ============================================================ */
(function () {
  var NAMES = {
    'index.html': '首页',
    'works.html': '精选作品',
    'all.html': '全部作品',
    'about.html': '关于',
    'contact.html': '联系'
  };
  var SEQ = PAGE_SEQ;

  var el = document.createElement('div');
  el.className = 'page-hint';
  el.innerHTML = '<span class="ph-arrow">↓</span><span class="ph-text"></span>';
  /* 页面底部"继续滚动 · 关于"提示已按用户要求移除；保留代码但不挂进 body，避免各种滚动监听报错 */
  var arrow = el.querySelector('.ph-arrow');
  var text = el.querySelector('.ph-text');

  function cur() {
    var f = (location.pathname.split('/').pop() || 'index.html');
    for (var i = 0; i < SEQ.length; i++) if (SEQ[i] === f) return i;
    return -1;
  }
  function bottomOk() {
    var doc = document.documentElement;
    return window.scrollY + window.innerHeight >= doc.scrollHeight - 24;
  }
  function topOk() { return window.scrollY <= 2; }

  function update() {
    if (window.__transiting) { el.classList.remove('is-on'); return; }
    var i = cur();
    if (i < 0) { el.classList.remove('is-on'); return; }

    if (bottomOk() && i < SEQ.length - 1) {
      arrow.textContent = '↓';
      text.textContent = '继续滚动 · ' + (NAMES[SEQ[i + 1]] || '下一个');
      el.classList.add('is-on');
    } else if (topOk() && i > 0) {
      arrow.textContent = '↑';
      text.textContent = '继续上滑 · ' + (NAMES[SEQ[i - 1]] || '上一个');
      el.classList.add('is-on');
    } else {
      el.classList.remove('is-on');
    }
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
  window.__updateHint = update;
})();
/* ============================================================
   细滚动条：只在滚动时淡入，停手 700ms 淡出
   —— 顺带干掉"页面加载时滚动条出现把布局顶一下"的位移
   ============================================================ */
(function () {
  var bar = document.createElement('div');
  bar.className = 'scrollbar';
  bar.innerHTML = '<i></i>';
  document.body.appendChild(bar);
  var thumb = bar.firstChild;
  var hideTimer = null;
  var idle = null;

  function update() {
    var doc = document.documentElement;
    var viewH = window.innerHeight;
    var max = doc.scrollHeight - viewH;
    if (max <= 4) { bar.classList.remove('on'); return; }

    var h = Math.max(30, Math.round(viewH * viewH / doc.scrollHeight));
    var p = Math.min(1, Math.max(0, window.scrollY / max));
    thumb.style.height = h + 'px';
    thumb.style.transform = 'translateY(' + Math.round(p * (viewH - h)) + 'px)';

    bar.classList.add('on');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { bar.classList.remove('on'); }, 700);
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  /* 转场期间直接收起来 */
  window.__hideScrollbar = function () { clearTimeout(hideTimer); bar.classList.remove('on'); };
  update();
})();
















