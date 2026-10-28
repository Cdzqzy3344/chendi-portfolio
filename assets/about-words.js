/* 「关于」逐词点亮：逆向自 blackman99.github.io/me/zh 的 #manifesto
   —— .wd 初始 opacity .12，随 section 滚动进度逐词升到 1；.hl 词过 60% 时亮 accent。
   段落在首次进入时拆成 .wd span（中文按单字、英文按词、标点单独）。 */
(function () {
  var seq = 0;
  var raf = 0;
  var words = [];

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  function splitNode(node, hl) {
    if (node.nodeType === 3) {
      var text = node.nodeValue;
      if (!text || !text.trim()) return;
      var tokens = text.match(/[\u4e00-\u9fff]|[A-Za-z0-9]+(?:['’.\-][A-Za-z0-9]+)*|\s+|[^\s]/g);
      if (!tokens) return;
      var frag = document.createDocumentFragment();
      tokens.forEach(function (t) {
        if (/^\s+$/.test(t)) {
          frag.appendChild(document.createTextNode(t));
        } else {
          var s = document.createElement('span');
          s.className = hl ? 'wd hl' : 'wd';
          s.textContent = t;
          frag.appendChild(s);
        }
      });
      node.parentNode.replaceChild(frag, node);
      return;
    }
    if (node.nodeType !== 1 || node.tagName === 'BR') return;
    var next = hl || node.tagName === 'STRONG' || node.classList.contains('hl');
    Array.prototype.slice.call(node.childNodes).forEach(function (c) {
      splitNode(c, next);
    });
  }

  function teardown() {
    seq++;
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    words = [];
  }

  function init() {
    teardown();
    var my = seq;
    var root = document.querySelector('#about');
    if (!root) return;
    var body = root.querySelector('.body');
    if (!body) return;
    var photo = root.querySelector('.about-photo img');

    Array.prototype.forEach.call(body.querySelectorAll('p'), function (p) {
      if (p.getAttribute('data-word-split') === '1') return;
      p.setAttribute('data-word-split', '1');
      Array.prototype.slice.call(p.childNodes).forEach(function (n) {
        splitNode(n, false);
      });
    });

    words = Array.prototype.slice.call(body.querySelectorAll('.wd'));
    if (!words.length) return;

    function tick() {
      if (my !== seq) return;
      var rect = root.getBoundingClientRect();
      var total = root.offsetHeight - window.innerHeight;
      var progress = total > 0 ? clamp(-rect.top / total, 0, 1) : 1;
      /* 手机：文字在滚到一半左右就全部点亮，别等页面到底；
         否则读完最后一句时正文已经被滚出视口。 */
      if (window.matchMedia('(max-width: 680px)').matches) {
        progress = clamp(progress / 0.72, 0, 1);
      }
      var t = progress * 1.12 * words.length;

      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        var k = clamp(t - i, 0, 1);
        w.style.opacity = (0.12 + 0.88 * k).toFixed(3);
        if (w.classList.contains('hl')) w.classList.toggle('on', k > 0.6);
      }
      if (photo) {
        var lit = t / words.length;
        photo.style.opacity = (0.1 + 0.9 * clamp(lit / 0.5, 0, 1)).toFixed(3);
      }
      raf = requestAnimationFrame(tick);
    }

    tick();
  }

  window.__initAboutWords = init;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
