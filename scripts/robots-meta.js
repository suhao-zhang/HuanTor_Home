/**
 * robots meta：给每个 HTML 输出 <meta name="robots">，控制搜索引擎与 AI 爬虫的收录行为。
 *
 * 为什么用 after_render 而不是改主题：主题的 head.ejs 根本不输出 robots，
 * 而改主题文件升级会被覆盖（本项目已有 5 处本地补丁，能不加就不加）。
 * 这里只插一行标签，模式不匹配就原样返回，不会让构建失败。
 *
 * 策略（默认值，可被 front-matter 覆盖）：
 *   收录   首页、/about/ 及其子页、/products/、/news/、/tech/、/contact/、文章页、
 *          标签页与分类页的第 1 页
 *   不收录 纯粹的重复副本：/page/N/ 首页分页（企业模板下整页等于首页）、
 *          /news/page/N/、/archives/ 整棵归档树（含按月分页）、
 *          /tags/标签/page/N/ 与 /categories/分类/page/N/
 *   不收录但继续放链接（noindex, follow），不动 robots.txt——本站明确欢迎 AI 抓取，
 *   用 meta 收掉副本比用 robots.txt 封路径好：爬虫仍能进去把权重传出去。
 *
 * 注意：本文件是 .js，块注释里不能出现星号紧跟斜杠的那两个字符（会被当成注释结束），
 *       所以上面的路径通配一律写成 /tags/标签/page/N/ 这种形式，别改回 glob 写法。
 *
 * 单页想改口径，在 front-matter 里写整串，例如：
 *   robots: noindex, follow      robots: none      robots: noindex, nofollow
 * 写了就直接照原样输出，不再拼后面的 max-* 提示。
 *
 * 与 sitemap 的关系：被 noindex 的这些路径本来就不在 sitemap.xml 里
 * （hexo-generator-sitemap 只收文章、页面、标签、分类的第 1 页），两边不打架。
 */
'use strict';

const INDEX = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const NOINDEX = 'noindex, follow';

// 命中即不收录：全是"同一份内容的第 N 页"或日期归档这种纯副本
function isDuplicate(routePath) {
  const p = routePath.replace(/index\.html$/, '');
  return /^page\/\d+\//.test(p) ||                       // 首页分页 /page/2/ …
    /^news\/page\/\d+\//.test(p) ||                      // /news/ 列表分页
    /^archives(\/|$)/.test(p) ||                         // 归档整棵树（含按月分页）
    /^(tags|categories)\/.+\/page\/\d+\//.test(p);       // 标签/分类的分页副本
}

/* front-matter 里的 robots 覆盖：按 route path 找对应文章/页面，取它的 robots 字段。
   每次渲染都现扫（550 篇扫一遍构建耗时没变），换来 hexo server 常驻时改了
   front-matter 立刻生效，不会读到旧值。
   坑（与 scripts/meta-length.js 同一个）：post.path 是目录式 '2026/08/25/slug/'，
   page.path 带文件名 'about/index.html'，而这里的 route path 一律以 index.html 结尾，
   必须两边都去掉结尾的 index.html 再比——否则文章的 front-matter 永远匹配不上。 */
function normPath(p) {
  return String(p == null ? '' : p).replace(/index\.html$/, '');
}

function fmRobots(routePath) {
  const want = normPath(routePath);
  let hit = '';
  ['posts', 'pages'].forEach(function (key) {
    const col = hexo.locals.get(key);
    if (!col || typeof col.each !== 'function') return;
    col.each(function (doc) {
      if (!hit && normPath(doc.path) === want && doc.robots) hit = String(doc.robots).trim();
    });
  });
  return hit;
}

hexo.extend.filter.register('after_render:html', function (str, data) {
  if (typeof str !== 'string' || /<meta[^>]+name=["']robots["']/i.test(str)) return str;

  const routePath = String((data && data.path) || 'index.html');
  const custom = fmRobots(routePath);
  const content = custom || (isDuplicate(routePath) ? NOINDEX : INDEX);
  const line = '<meta name="robots" content="' + content + '">';

  // 优先插在 canonical 前面（同一缩进），没有 canonical 就插到 </head> 前
  const anchor = str.match(/[ \t]*<link rel="canonical"/i);
  if (anchor) {
    const indent = (anchor[0].match(/^[ \t]*/) || [''])[0];
    return str.slice(0, anchor.index) + indent + line + '\n' + str.slice(anchor.index);
  }
  if (/<\/head>/i.test(str)) return str.replace(/<\/head>/i, '  ' + line + '\n</head>');
  return str;
});
