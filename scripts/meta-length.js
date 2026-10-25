/**
 * meta 长度标准（2026-10-26 用户定的口径，来自站外 SEO 检测工具）：
 *   <title>       30–60 字符，含主要关键词
 *   meta 描述     120–160 字符，准确描述本页内容
 *
 * 但主题 head.ejs 第 7 行有一句 `if (page.title && seo.description) pageDesc = seo.description;`
 * ——只要页面有标题，描述就被强制换成站点那一句，所以全站 3000 多个页面的
 * description 完全相同（68 字）。重复 meta 描述本身就是检测工具会报的问题，
 * 比长度更该修。这里不改主题，用 after_render 按页重写。
 *
 * 取值优先级（描述）：
 *   1) front-matter 的 description（落地页与需要自定义的页都走这条）
 *   2) 文章自己的 excerpt（550 篇都有，中位数 80 字）
 *   3) 站点 seo.description（兜底，首页就用这条）
 * 超过 160 字按句读截断；不足 120 字不硬凑——中文搜索结果摘要实际只显示 80 字左右，
 * 为了过检测去填充重复尾巴会让摘要更难读，也容易被判重复内容。
 *
 * 标题：只给首页补一条关键词式的 home_title（主题在 page.title 为空时只会输出站点名，
 * 10 字太短）。其它页面的「页面名 | 站点名」结构不动，文章标题的品牌后缀由 scripts/seo.js 处理。
 */
'use strict';

const DESC_MAX = 160;

function clean(s) {
  return String(s == null ? '' : s)
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* 塞进 HTML 属性前必须自己转义。EJS 的 <%= %> 会自动做这件事，
   而 after_render 里的正则替换不会——站内有几十篇文章的 excerpt 用半角引号
   （例如 `只测"答得对不对"远远不够`），不转义的话第一个引号就把 content 提前闭合，
   描述只剩两个字。& 和 < 同理。 */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 在 160 以内找最后一个句读截，找不到再硬切
function clamp(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const i = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('；'), cut.lastIndexOf('，'),
    cut.lastIndexOf('.'), cut.lastIndexOf(';'), cut.lastIndexOf(','));
  return (i > max * 0.6 ? cut.slice(0, i + 1) : cut.slice(0, max - 1) + '…');
}

// 按 route path 找回对应的文章/页面，取它的 front-matter 字段。
// 坑：Hexo 里 post.path 是**目录式**（2026/08/25/slug/），page.path 却带文件名
// （about/index.html），而 after_render 拿到的 route path 一律是 .../index.html。
// 两边都去掉结尾的 index.html 再比，否则文章永远匹配不上（robots-meta.js 里同样的坑已一并修）。
function normPath(p) {
  return String(p == null ? '' : p).replace(/index\.html$/, '');
}

function docOf(routePath) {
  const want = normPath(routePath);
  let hit = null;
  ['posts', 'pages'].forEach(function (key) {
    const col = hexo.locals.get(key);
    if (!col || typeof col.each !== 'function' || hit) return;
    col.each(function (doc) { if (!hit && normPath(doc.path) === want) hit = doc; });
  });
  return hit;
}

/* 标签页与分类页既不是文章也不是页面，取不到自己的描述，之前一律落到站点那句兜底
   ——2400 多个列表页共用一句描述，对"准确描述本页内容"这条标准是反例。
   这里按列表页自己的主题生成，篇数从集合里现取，不写任何没有依据的数字。 */
function listDesc(routePath) {
  const m = routePath.match(/^(tags|categories)\/([^/]+)\/index\.html$/);
  if (!m) return '';
  const key = m[1] === 'tags' ? 'tags' : 'categories';
  let name = '';
  try { name = decodeURIComponent(m[2]); } catch (e) { name = m[2]; }
  const col = hexo.locals.get(key);
  let count = 0;
  if (col && typeof col.each === 'function') {
    col.each(function (t) { if (t.name === name && t.posts) count = t.posts.length; });
  }
  if (!count) return '';
  const what = m[1] === 'tags' ? '标签' : '分类';
  return '「' + name + '」' + what + '下的全部文章，共 ' + count + ' 篇，按发布时间倒序排列。'
    + '新乡洹拓科技的技术专栏覆盖 AI 工程化、大模型应用、工业 AI、云服务与后端架构等方向，'
    + '每篇标注信息来源与可复核的判断依据。同方向的文章也可从另一类列表页进入，'
    + '需要针对具体场景的方案可直接说明数据现状让我们评估。';
}

/* 描述不足 120 字时，用这一页自己的分类与标签补一句——只用它自己 front-matter 里
   已有的信息，不编内容，同时把关键词真正放进描述里。 */
function appendMeta(desc, doc) {
  if (desc.length >= 120 || !doc) return desc;
  const bits = [];
  if (doc.categories && doc.categories.length) bits.push('分类：' + doc.categories.first().name);
  if (doc.tags && doc.tags.length) bits.push('关键词：' + doc.tags.slice(0, 4).map(t => t.name).join('、'));
  if (!bits.length) return desc;
  const tail = (/[。！？…]$/.test(desc) ? '' : '。') + bits.join('；') + '。';
  return desc + tail;
}

function siteDesc() {
  const seo = (hexo.theme.config && hexo.theme.config.seo) || {};
  return clean(seo.description || hexo.config.description || '');
}

function homeTitle() {
  const seo = (hexo.theme.config && hexo.theme.config.seo) || {};
  return clean(seo.home_title || hexo.config.title || '');
}

hexo.extend.filter.register('after_render:html', function (str, data) {
  if (typeof str !== 'string' || str.indexOf('<meta name="description"') === -1) return str;

  const routePath = String((data && data.path) || 'index.html');
  const doc = docOf(routePath);

  let desc = '';
  if (doc && doc.description) desc = clean(doc.description);
  else if (doc && doc.excerpt) desc = clean(doc.excerpt);
  else desc = listDesc(routePath);
  if (!desc) desc = siteDesc();
  if (doc && desc !== siteDesc()) desc = appendMeta(desc, doc);
  desc = clamp(desc, DESC_MAX);

  let out = str
    .replace(/<meta name="description" content="[^"]*"/, '<meta name="description" content="' + esc(desc) + '"')
    .replace(/<meta property="og:description" content="[^"]*"/, '<meta property="og:description" content="' + esc(desc) + '"')
    .replace(/<meta name="twitter:description" content="[^"]*"/, '<meta name="twitter:description" content="' + esc(desc) + '"');

  // 首页标题：主题只会输出站点名（10 字），换成带关键词的 home_title
  if (routePath === 'index.html') {
    const t = homeTitle();
    if (t) {
      out = out.replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(t) + '</title>');
      out = out.replace(/<meta property="og:title" content="[^"]*"/, '<meta property="og:title" content="' + esc(t) + '"');
      out = out.replace(/<meta name="twitter:title" content="[^"]*"/, '<meta name="twitter:title" content="' + esc(t) + '"');
    }
  }
  return out;
});
