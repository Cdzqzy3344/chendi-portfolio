/* 自定义光标：白环 + 白点，环滞后（指数平滑），fine pointer 才启用。
   逆向自 blackman99.github.io/me/zh 的 #cursor：环 38 / 点 6 / hover 76 填白 + data-cursor 文案，
   整层 mix-blend-mode:difference。 */
(function () {
  if (window.__siteCursor) return;
  window.__siteCursor = true;
  if (!window.matchMedia || !window.matchMedia('(pointer: fine) and (hover: hover)').matches) return;

  function init() {
    var root = document.documentElement;
    root.classList.add('cursor-fine');

    var wrap = document.createElement('div');
    wrap.className = 'cursor';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = '<div class="c-ring"><span class="c-label"></span></div><div class="c-dot"></div>';
    document.body.appendChild(wrap);

    var dot = wrap.querySelector('.c-dot');
    var ring = wrap.querySelector('.c-ring');
    var label = wrap.querySelector('.c-label');

    var mx = window.innerWidth * 0.65;
    var my = window.innerHeight * 0.45;
    var rx = mx;
    var ry = my;
    var last = performance.now();
    /* 页面刚加载时先不显示光标，等第一次真实移动再出现 */
    var shown = false;
    wrap.classList.add('gone');

    function placeDot() {
      dot.style.transform = 'translate3d(' + mx.toFixed(1) + 'px,' + my.toFixed(1) + 'px,0)';
    }

    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (dt > 0) {
        var k = 1 - Math.exp(-14 * dt);
        rx += (mx - rx) * k;
        ry += (my - ry) * k;
        ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      }
      requestAnimationFrame(frame);
    }

    window.addEventListener('pointermove', function (e) {
      mx = e.clientX;
      my = e.clientY;
      if (!shown) {
        shown = true;
        rx = mx;
        ry = my;
        ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      }
      placeDot();
      wrap.classList.remove('gone');
    }, { passive: true });

    document.addEventListener('pointerover', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('a,button,[data-cursor]') : null;
      /* 菜单按钮本身就是一块米白药丸：光标环叠上去就是第二个白层。
         菜单上连环和点一起隐掉（.menu-hide），只留药丸；离开菜单再恢复。 */
      var onMenu = !!(t && t.id === 'menuToggle');
      wrap.classList.toggle('menu-hide', onMenu);
      wrap.classList.toggle('hover', !!t && !onMenu);
      label.textContent = t && !onMenu && t.getAttribute ? (t.getAttribute('data-cursor') || '') : '';
    });

    document.addEventListener('pointerleave', function () {
      shown = false;
      wrap.classList.add('gone');
    });

    window.addEventListener('cursorreset', function () {
      wrap.classList.remove('hover');
      wrap.classList.remove('menu-hide');
      label.textContent = '';
    });

    placeDot();
    ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
    requestAnimationFrame(frame);
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
