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

  const prefix = prefixOf(data.path || 'index.html');
  let out = str;

  if (out.indexOf('css/site.css') === -1) {
    out = out.replace('</head>',
      '  <link rel="stylesheet" href="' + prefix + 'css/site.css">\n</head>');
  }

  if (out.indexOf('js/site.js') === -1 && /<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i,
      '  <script src="' + prefix + 'js/site.js" defer></script>\n</body>');
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
