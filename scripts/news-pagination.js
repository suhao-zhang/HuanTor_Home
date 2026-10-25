/**
 * /news/ 文章列表分页
 *
 * 为什么要这个脚本：/news/ 是 source/news/index.md 这一个"页"，Hexo 的 per_page
 * 只管首页和归档/分类/标签这些由 generator 出的列表页，普通 page 不分页——
 * 全站 500+ 篇会一次性渲染进一个 HTML（1.1MB、几万像素高，配图请求也全压在首页）。
 *
 * 所以这里只补第 2 页及以后的路由 news/page/N/index.html，
 * 第 1 页仍由 source/news/index.md 渲染：
 *   - /news/ 继续留在 sitemap.xml 里（generator 出的路由不会进 sitemap）；
 *   - 标题、副标题仍以那个 md 为准，改一处两边走；
 *   - 每页条数读主题配置 news.per_page，layout/news.ejs 用同一个值切片。
 */
'use strict';

hexo.extend.generator.register('news_pagination', function (locals) {
  const conf = themeConf();
  const per = conf.per_page;
  const all = locals.posts.sort('date', -1);
  const total = Math.ceil(all.length / per);

  // 第 1 页那份源文件不在（被删了/改名了）就别再出后续页，避免产出打不开的空页
  const base = locals.pages.find(function (p) { return p.path === 'news/index.html'; });
  if (!base) return [];

  const routes = [];
  for (let i = 2; i <= total; i++) {
    routes.push({
      path: 'news/page/' + i + '/index.html',
      layout: ['news'],
      data: {
        title: base.title,
        subtitle: base.subtitle,
        news_page: i
      }
    });
  }
  return routes;
});

/**
 * news.per_page 可能写在主题默认配置里，也可能只写在站点的
 * _config.hexo-theme-xongyi.yml 覆盖文件里，两处都认，取到多少算多少；
 * 非法值（0、负数、非数字）一律退回 12，免得生成 0 页或死循环。
 */
function themeConf() {
  const raw = (hexo.config.theme_config && hexo.config.theme_config.news) ||
    (hexo.theme && hexo.theme.config && hexo.theme.config.news) || {};
  const per = parseInt(raw.per_page, 10);
  return { per_page: per > 0 ? per : 12 };
}
