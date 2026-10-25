/**
 * 把站点自定义的 css/js 注入到每个页面。
 *
 * 为什么这么做：主题没有提供 head_pre / body_end 之类的插槽，而 source/ 下的
 * .ejs 页面不会被 Hexo 渲染（试过，直接不产出），所以无法在页面里调用主题的
 * url_for / icon 等 helper。用 after_render:html 过滤器在最终 HTML 上补标签，
 * 既不用改主题文件（升级主题不会被覆盖），也能按页面深度算出正确的相对路径，
 * 配合 _config.yml 里的 relative_link: true 保证换域名、换子路径都能加载。
 */
'use strict';

function prefixOf(routePath) {
  // 'index.html' -> ''  |  'about/index.html' -> '../'  |  深三层 -> '../../../'
  const depth = (routePath.match(/\//g) || []).length;
  return '../'.repeat(depth);
}

hexo.extend.filter.register('after_render:html', function (str, data) {
  if (typeof str !== 'string' || str.indexOf('</head>') === -1) return str;

  // 404.html 特殊处理：线上（Vercel）是拿它兜底任意不存在的路径，浏览器地址可能是
  // /foo/bar/ 这种深层地址，而站内所有链接与资源都是 relative_link 生成的相对路径
  // （css/site.css、../images/logo.png）。相对路径会按"当前地址"解析，
  // 于是 /foo/bar/css/site.css 全部 404，兜底页变成没样式的裸 HTML。
  // 所以这一页的资源一律改成根绝对路径，跟访客从哪个路径进来都无关。
  const routePath = data.path || 'index.html';
  const is404 = routePath === '404.html';
  const prefix = is404 ? '/' : prefixOf(routePath);
  let out = str;

  if (out.indexOf('css/site.css') === -1) {
    out = out.replace('</head>',
      '  <link rel="stylesheet" href="' + prefix + 'css/site.css">\n</head>');
  }

  if (out.indexOf('js/site.js') === -1 && /<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i,
      '  <script src="' + prefix + 'js/site.js" defer></script>\n</body>');
  }

  if (is404) {
    // 主题自己输出的 href/src 也是相对的，一并转成根绝对；
    // 已经是绝对地址、协议相对、锚点、mailto/tel/data: 的一律不动
    out = out.replace(/\b(href|src)="(?!\/|#|https?:|mailto:|tel:|data:)([^"]+)"/g,
      function (m, attr, val) {
        return attr + '="/' + val.replace(/^(?:\.\.\/|\.\/)+/, '') + '"';
      });
  }

  // 主题的 head.ejs 把 favicon 的 type 写死成 image/svg+xml；换成 PNG 图标时
  // 按真实扩展名纠正 MIME 类型，否则部分浏览器会忽略这个图标。
  out = out.replace(/<link rel="icon"([^>]*?)href="([^"]+\.png)"([^>]*?)>/gi,
    function (m, pre, href, post) {
      return '<link rel="icon"' + pre.replace(/type="[^"]*"/, 'type="image/png"') +
        ' href="' + href + '"' + post + '>';
    });

  return out;
});
