/**
 * 注入 Vercel Web Analytics 采集脚本。
 *
 * 站点是 Hexo 产出的纯静态 HTML，用不了官方默认的 @vercel/analytics React 组件，
 * 所以按 Vercel 文档 "HTML" 那一档的做法，直接在每个页面的 </head> 前补两行：
 *
 *   <script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script>
 *   <script defer src="/_vercel/insights/script.js"></script>
 *
 * 几个必须这样的点：
 * - src 必须是根绝对路径。/_vercel/* 由 Vercel 边缘网络提供，不在构建产物里；
 *   若按 relative_link 拼成 ../_vercel/... 就取不到了。站点只部署在域名根目录
 *   （www.huant.ltd），根绝对路径成立。
 * - 放在 <head> 里配 defer：不阻塞渲染，又能在首屏就打上 view 事件。
 * - 本地 hexo server 下这个请求 404 是正常的（只有 Vercel 域名有该路由），
 *   不影响页面渲染，因此不加任何环境判断，保持无条件注入。
 * - 与 scripts/inject-site-assets.js 各自独立：两边都有"已存在就跳过"的判断，
 *   重复注册不会互相踩掉。
 */
'use strict';

const MARKER = '/_vercel/insights/script.js';

const SNIPPET = [
  '<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};</script>',
  '<script defer src="' + MARKER + '"></script>'
].join('\n  ');

hexo.extend.filter.register('after_render:html', function (str) {
  if (typeof str !== 'string') return str;
  if (str.indexOf(MARKER) !== -1) return str;      // 已注入过，避免重复
  if (str.indexOf('</head>') === -1) return str;   // 非正常 HTML 文档，跳过

  return str.replace('</head>', '  ' + SNIPPET + '\n</head>');
});
