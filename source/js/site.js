/* 站点自定义交互：交错淡入 / 数字滚动 / 阅读进度条
   主题自带的 main.js 只负责 .reveal，这里补主题没有的部分。
   尊重 prefers-reduced-motion：用户要求减少动效时全部直接呈现。 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    /* 1) 交错淡入容器：先加 ht-anim 才会启用隐藏样式，
          JS 没执行时页面内容照常完整显示 */
    var groups = Array.prototype.slice.call(document.querySelectorAll('.ht-stagger'));
    if (groups.length) {
      if (reduce || !('IntersectionObserver' in window)) {
        /* 用户要求减少动效 / 老浏览器：不做动画，直接呈现 */
      } else {
        groups.forEach(function (g) { g.classList.add('ht-anim'); });
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) { e.target.classList.add('ht-in'); io.unobserve(e.target); }
          });
        }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
        groups.forEach(function (g) { io.observe(g); });
      }
    }

    /* 2) 数字滚动 */
    var nums = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
    function run(el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      if (isNaN(target)) return;
      var final = target.toFixed(decimals);
      /* 先把终值写进去：动画没跑起来（rAF 被挂起、后台标签页）也不会停在 0 */
      el.textContent = final;
      if (reduce || !window.requestAnimationFrame) return;
      var dur = 1100, t0 = null;
      function frame(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals);
        if (p < 1) requestAnimationFrame(frame);
        else el.textContent = final;
      }
      requestAnimationFrame(frame);
      /* 兜底：动画异常也在规定时长后落到终值 */
      setTimeout(function () { el.textContent = final; }, dur + 250);
    }
    if (nums.length) {
      if (!('IntersectionObserver' in window)) {
        nums.forEach(run);
      } else {
        var io2 = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) { run(e.target); io2.unobserve(e.target); }
          });
        }, { threshold: 0.4 });
        nums.forEach(function (n) { io2.observe(n); });
      }
    }

    /* 4) logo 明暗切换：主题只支持一张 logo，这里按 data-theme 换图。
          文件名约定 logo-light.png / logo-dark.png，只替换文件名，
          保留 url_for 生成的相对前缀，换域名换子路径都不受影响。 */
    var logos = Array.prototype.slice.call(document.querySelectorAll('img[class*="brand__logo"]'));
    logos.forEach(function (img) {
      var src = img.getAttribute('src') || '';
      if (!/logo-(light|dark)\.png/.test(src)) return;
      img.setAttribute('data-logo-light', src.replace(/logo-(light|dark)\.png/, 'logo-light.png'));
      img.setAttribute('data-logo-dark', src.replace(/logo-(light|dark)\.png/, 'logo-dark.png'));
    });
    function applyLogo() {
      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      logos.forEach(function (img) {
        var next = img.getAttribute(dark ? 'data-logo-dark' : 'data-logo-light');
        if (next && img.getAttribute('src') !== next) img.setAttribute('src', next);
      });
    }
    if (logos.length) {
      applyLogo();
      if ('MutationObserver' in window) {
        new MutationObserver(applyLogo).observe(document.documentElement, {
          attributes: true, attributeFilter: ['data-theme']
        });
      }
    }

    /* 3) 阅读进度条 */
    var bar = document.createElement('div');
    bar.className = 'ht-progress';
    document.body.appendChild(bar);
    if (!reduce) {
      var tick = false;
      var update = function () {
        var h = document.documentElement;
        var max = h.scrollHeight - h.clientHeight;
        bar.style.width = (max > 0 ? (h.scrollTop || document.body.scrollTop) / max * 100 : 0) + '%';
        tick = false;
      };
      window.addEventListener('scroll', function () {
        if (!tick) { tick = true; requestAnimationFrame(update); }
      }, { passive: true });
      update();
    }
  });
})();

/* ------------------------------------------------------------------
 * 404 页两件小事（只在有对应元素时生效，其它页面零开销）
 *  1) 把访客真正要找的地址回填进那张终端卡片。线上 Vercel 是用 404.html 兜底，
 *     浏览器地址栏就是那个不存在的路径，所以能直接显示；本地 hexo server 打开
 *     /404.html 时显示的就是 /404.html 本身，属正常。
 *  2) "复制这段提问"按钮：把那段写给 AI 的提示词复制到剪贴板。
 *     clipboard API 只在安全上下文可用（https 与 localhost），失败就退回提示手动选中，
 *     绝不静默——按钮文案会告诉你成没成。
 * ---------------------------------------------------------------- */
(function () {
  'use strict';
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var slot = document.querySelector('[data-404-path]');
    if (slot && location.pathname && location.pathname !== '/404.html') {
      slot.textContent = decodeURIComponent(location.pathname);
    }

    var btn = document.querySelector('[data-404-copy]');
    if (!btn) return;
    var label = btn.querySelector('span') || btn;
    btn.addEventListener('click', function () {
      var src = document.getElementById(btn.getAttribute('data-404-copy'));
      var text = src ? src.textContent.trim() : '';
      var done = function (ok) {
        label.textContent = ok ? '已复制，去粘给 AI' : '复制没成功，请手动选中这段文字';
        if (window.umami && window.umami.track) {
          window.umami.track('404复制提问', { 成功: ok ? '是' : '否' });
        }
      };
      if (!text || !navigator.clipboard || !navigator.clipboard.writeText) { done(false); return; }
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    });
  });
})();

/* ------------------------------------------------------------------
 * 转化事件上报（Umami）：页面 PV 由采集脚本自己发，这里只补三类"动作"。
 * - 点电话 / 点邮箱：官网最该看的转化，直接对应询盘
 * - 点联系方式旁边的二维码图：说明有人在扫码加微信，也算询盘
 * - 点站外链接：看访客被谁接走（GitHub、云服务控制台等）
 * umami 脚本是 defer 的，正常点击时已就绪；万一没加载（被拦/未部署 ID），
 * 这里静默跳过，不影响页面任何功能。
 * ---------------------------------------------------------------- */
(function () {
  function track(name, props) {
    var u = window.umami;
    if (u && typeof u.track === 'function') u.track(name, props);
  }

  function payload(el) {
    return {
      目标: el.getAttribute('href') || el.getAttribute('src') || '',
      所在页: location.pathname
    };
  }

  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('a,img') : null;
    if (!el) return;
    var ref = el.getAttribute('href') || '';

    if (/^tel:/i.test(ref)) { track('点击电话', payload(el)); return; }
    if (/^mailto:/i.test(ref)) { track('点击邮箱', payload(el)); return; }

    var cls = el.className || '';
    if (el.tagName === 'IMG' && /qrcode/i.test(cls)) { track('长按二维码', payload(el)); return; }

    if (el.tagName === 'A' && /^https?:\/\//i.test(ref) && el.host !== location.host) {
      var p = payload(el);
      p.域名 = el.hostname;
      track('点击外链', p);
    }
  }, true);
})();
