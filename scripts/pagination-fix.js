'use strict';
/* 修归档 / 分类 / 标签列表页的分页链接。
 *
 * 症状（第十八批全站链接体检查出，212 条断链全部来自这里）：
 *   - 下一页与页码链接被输出成根绝对串 /page/N/ ，而首页分页已在 a406a4c 关掉
 *     （index_generator.per_page: 0），这些地址现在一律 404。关掉之前它们也不是坏链，
 *     而是错指到首页的副本页，所以这个缺陷一直存在，只是换了表现。
 *   - 上一页回到"第 1 页"时走的是主题 partial 里 base === '' 的兜底分支 url_for('archives/')，
 *     于是分类页与标签页的上一页会跳到归档页，按年月归档的上一页深度也算错。
 *
 * 根因在主题 layout/_partial/pagination.ejs：它先算 base = url_for(page.path) 再剥掉结尾斜杠，
 * 而 relative_link: true 下 url_for 指向自身时返回空串，base 塌成 ''，后面拼出来的全是根绝对串。
 *
 * 这里不改主题（那会再加一处升级即失效的补丁），在 after_render 里按当前路由重算正确的相对链接：
 *   上跳层数 = 段数(当前目录) - 段数(该列表第 1 页所在目录)。
 * 只处理 archives / categories / tags 三条路由下的 <nav class="pagination"> 块，
 * 不碰 /news/（那是 scripts/news-pagination.js 与主题 news.ejs 自己出的分页，链接已验证正确）。
 */

const ROUTE = /^(archives|categories|tags)\/([\s\S]*?)(?:page\/(\d+)\/)?index\.html$/;

hexo.extend.filter.register('after_render:html', function (str, data) {
  if (typeof str !== 'string' || str.indexOf('<nav class="pagination"') < 0) return str;
  const path = String((data && data.path) || '').replace(/^\/+/, '');
  const m = path.match(ROUTE);
  if (!m) return str;

  const kind = m[1];
  const middle = m[2] || '';                       // 例如 2026/10/ 或 AI安全/
  const current = Number(m[3] || 1);
  const baseDir = kind + '/' + middle;             // 该列表第 1 页所在目录
  const curDir = path.slice(0, path.length - 'index.html'.length);
  const depth = s => (s.match(/\//g) || []).length;
  const prefix = '../'.repeat(Math.max(0, depth(curDir) - depth(baseDir)));
  const root = prefix || './';

  return str.replace(/<nav class="pagination"[\s\S]*?<\/nav>/, nav => nav
    // 下一页 / 页码：根绝对串 -> 相对串
    .replace(/href="\/page\/(\d+)\/"/g, (all, n) => 'href="' + prefix + 'page/' + n + '/"')
    // 回到第 1 页：整串只有 ../（可能带主题兜底分支塞进来的 archives/）-> 精确回到本列表根
    .replace(/href="(?:\.\.\/)+(?:archives\/)?"/g, 'href="' + root + '"')
    // 第 1 页上的"上一页"在主题里会退到站点首页，这里让它指向本列表自己
    .replace(/href="\.\.\/index\.html"/g, current === 1 ? 'href="' + root + '"' : all => all));
}, 40);
