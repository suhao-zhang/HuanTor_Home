/**
 * 构建守卫：文章文件名必须纯 ASCII，且 date 不得晚于当前时间。
 *
 * 起因：hexo-generator-feed 会对每条链接调 hexo-util 的 encodeURL，而它内部用
 * decodeURI()。文件名里只要出现一个裸的 %（比如标题带 "30%"），decodeURI 就抛
 * URIError: URI malformed，整个 hexo generate 直接失败、线上部署一起挂。
 * 中文/全角冒号虽然不炸构建，但会生成百分号编码的长 URL，分享和收录都难看。
 *
 * 这里不擅自改名（改名等于改线上 URL），只把问题在构建日志里喊出来。
 */
'use strict';

hexo.extend.filter.register('before_generate', function () {
  const bad = [];
  const fatal = [];
  const now = Date.now();
  const future = [];
  hexo.model('Post').toArray().forEach(function (post) {
    const slug = post.slug || '';
    if (/[^\x00-\x7F]/.test(slug)) {
      const breaks = /%/.test(slug);
      (breaks ? fatal : bad).push(post.full_source + '  ->  /' + post.path);
    }
    // 排期规则：date 用写作当天，不要未来日期（未来时间会让 sitemap 的 lastmod
    // 和文章页出现"发布于将来"，也影响搜索引擎对时间戳的信任）
    if (post.date && post.date.valueOf() > now + 60 * 1000) {
      future.push(post.source + '  ->  ' + post.date.format('YYYY-MM-DD HH:mm:ss'));
    }
  });
  if (fatal.length) {
    hexo.log.error('文章文件名含非 ASCII 且有 %，会导致 hexo-generator-feed 构建失败：\n  ' + fatal.join('\n  '));
  }
  if (bad.length) {
    hexo.log.warn('建议把文章文件名改成纯 ASCII（标题字段可以留中文，不影响显示）：\n  ' + bad.join('\n  '));
  }
  if (future.length) {
    hexo.log.warn('有 ' + future.length + ' 篇文章用了未来日期，应改成写作当天：\n  ' + future.join('\n  '));
  }

  // 文章引用的 /images/posts/* 必须真实存在，否则首页新闻卡和文章页会出现裂图
  const fs = require('fs'), path = require('path');
  const imgDir = path.join(hexo.base_dir, 'source/images/posts');
  let have = new Set();
  try { have = new Set(fs.readdirSync(imgDir)); } catch (e) { /* 目录不存在下面会全部报出来 */ }
  const missing = new Map();
  hexo.model('Post').toArray().forEach(function (post) {
    const raw = [post.raw || '', post.front_content || ''].join('\n');
    const re = /\/images\/posts\/([A-Za-z0-9._-]+)/g;
    let m;
    while ((m = re.exec(raw)) !== null) {
      if (!have.has(m[1])) missing.set(m[1], post.source);
    }
  });
  if (missing.size) {
    const lines = [];
    missing.forEach(function (src, img) { lines.push('  source/images/posts/' + img + '   <- ' + src); });
    hexo.log.warn('文章引用了 ' + missing.size + ' 张不存在的配图，线上会裂图，请补图或改引用：\n' + lines.join('\n'));
  }
});
