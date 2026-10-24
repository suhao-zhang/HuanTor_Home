/**
 * 文件名守卫：文章 slug 必须是纯 ASCII。
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
  hexo.model('Post').toArray().forEach(function (post) {
    const slug = post.slug || '';
    if (/[^\x00-\x7F]/.test(slug)) {
      const breaks = /%/.test(slug);
      (breaks ? fatal : bad).push(post.full_source + '  ->  /' + post.path);
    }
  });
  if (fatal.length) {
    hexo.log.error('文章文件名含非 ASCII 且有 %，会导致 hexo-generator-feed 构建失败：\n  ' + fatal.join('\n  '));
  }
  if (bad.length) {
    hexo.log.warn('建议把文章文件名改成纯 ASCII（标题字段可以留中文，不影响显示）：\n  ' + bad.join('\n  '));
  }
});
