/**
 * 注入第三方统计采集脚本：Umami（流量口径）+ Microsoft Clarity（热图/录屏）。
 *
 * 为什么用 after_render 而不是填主题槽位：
 * 主题 layout/_partial/scripts.ejs 里只认 analytics.google 和 analytics.cloudflare
 * 两个字段，没有 Umami / Clarity 的位置。改主题文件升级就被覆盖（主题已 vendor 进仓库，
 * 见 memory 里的三处本地补丁），所以和 scripts/vercel-analytics.js 一样走过滤器补标签。
 *
 * ID 从哪读：优先 theme config（站点配置走根目录 _config.hexo-theme-xongyi.yml 覆盖，
 * 和主题自带的 google/cloudflare 两栏在同一个 analytics 块里，集中一处填），
 * 值为空时回落到 _config.yml 的同名字段。
 *
 * 几个必须这样的点：
 * - **两个 ID 都没填时整个过滤器原样返回**，产出和没装一样，可以先合并代码再去注册。
 * - ID 做白名单清洗（只留字母数字和 - _），配置里多打一个引号不会把 HTML 撑破。
 * - Umami 用 defer + data-website-id：不阻塞首屏；Clarity 必须同步建队列函数再异步插 script，
 *   否则 head 里晚到的交互录不上（官方 snippet 就是这个形状，不要简写）。
 * - 已存在同名标签就跳过，重复注册/别的脚本已经注入过都不会打两遍。
 * - 不要点 Vercel 控制台里"自动安装分析"那类开关，本站已有 scripts/vercel-analytics.js 手工注入。
 *
 * 站点是 relative_link: true 且只部署在域名根目录，第三方脚本一律用完整 https:// 地址，
 * 不涉及相对路径前缀计算。
 */
'use strict';

const UMAMI_HOST_DEFAULT = 'https://cloud.umami.is';

/** 只保留 ID 里合法字符，防止配置笔误把 script 标签写坏。 */
function safeId(v) {
  return String(v == null ? '' : v).trim().replace(/[^A-Za-z0-9_-]/g, '');
}

/** 空字符串视为"没填"，好让 _config.yml 里的兜底值生效。 */
function pick(key) {
  const themeCfg = (hexo.theme && hexo.theme.config && hexo.theme.config.analytics) || {};
  const siteCfg = (hexo.config && hexo.config.analytics) || {};
  return safeId(themeCfg[key] || siteCfg[key] || '');
}

hexo.extend.filter.register('after_render:html', function (str) {
  if (typeof str !== 'string') return str;
  if (str.indexOf('</head>') === -1) return str;   // 非正常 HTML 文档，跳过

  const parts = [];

  const umami = pick('umami');
  if (umami && str.indexOf('data-website-id') === -1) {
    const hostRaw = String((hexo.theme.config.analytics || {}).umami_server ||
      (hexo.config.analytics || {}).umami_server || UMAMI_HOST_DEFAULT);
    const host = hostRaw.replace(/\/+$/, '').replace(/^(?!https:\/\/)/, 'https://');
    parts.push('<script defer src="' + host + '/script.js" data-website-id="' + umami + '"></script>');
  }

  const clarity = pick('clarity');
  if (clarity && str.indexOf('clarity.ms/tag/') === -1) {
    parts.push('<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){' +
      '(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;' +
      't.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];' +
      'y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","' + clarity + '");</script>');
  }

  if (!parts.length) return str;
  return str.replace('</head>', '  ' + parts.join('\n  ') + '\n</head>');
});
