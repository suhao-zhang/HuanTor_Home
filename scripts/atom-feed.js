/**
 * 自带的 Atom 订阅源生成器（输出 atom.xml）。
 *
 * 为什么不用 hexo-generator-feed：它对每条链接调 hexo-util 的 encodeURL，内部是
 * decodeURI()，文章文件名里只要有一个裸 % 就抛 URIError: URI malformed，
 * 整站 hexo generate 直接失败、线上部署一起挂。用户的内容流水线会批量产出
 * 中文文件名，这个风险不能压在"文件名永远不出错"上。这里自己生成，转义可控。
 */
'use strict';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function cdata(s) {
  return '<![CDATA[' + String(s || '').replace(/\]\]>/g, ']]&gt;') + ']]>';
}

function iso(d) {
  try { return new Date(d).toISOString(); } catch (e) { return new Date().toISOString(); }
}

// 相对地址转绝对；已经带协议的原样返回
function abs(origin, href) {
  if (!href) return '';
  if (/^(https?:)?\/\//i.test(href)) return href.replace(/^(https?:)?\/\//, 'https://');
  return origin + (href.charAt(0) === '/' ? '' : '/') + href;
}

hexo.extend.generator.register('atom', function (locals) {
  const origin = (this.config.url || '').replace(/\/+$/, '');
  const siteTitle = this.config.title || '';
  const posts = locals.posts.sort('-date').toArray().slice(0, 20);
  const fallbackImg = abs(origin, '/images/og-cover.png');

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<feed xmlns="http://www.w3.org/2005/Atom">\n';
  xml += '  <id>' + esc(origin + '/') + '</id>\n';
  xml += '  <title>' + esc(siteTitle) + '</title>\n';
  xml += '  <subtitle>' + esc(this.config.description || '') + '</subtitle>\n';
  xml += '  <updated>' + iso(posts.length ? posts[0].updated || posts[0].date : Date.now()) + '</updated>\n';
  xml += '  <generator uri="https://hexo.io/" version="' + esc(this.version) + '">Hexo</generator>\n';
  if (this.config.author) xml += '  <author><name>' + esc(this.config.author) + '</name></author>\n';
  xml += '  <link href="' + esc(origin + '/') + '" />\n';
  xml += '  <link rel="self" href="' + esc(origin + '/atom.xml') + '" />\n';
  xml += '  <logo>' + esc(fallbackImg) + '</logo>\n';

  posts.forEach(function (post) {
    const link = abs(origin, '/' + post.path);
    const summary = String(post.excerpt || post.description || '')
      .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
    const cover = /\.(png|jpe?g|webp)$/i.test(post.cover || '') ? abs(origin, post.cover) : fallbackImg;
    xml += '  <entry>\n';
    xml += '    <title>' + esc(post.title) + '</title>\n';
    xml += '    <id>' + esc(link) + '</id>\n';
    xml += '    <link href="' + esc(link) + '" />\n';
    xml += '    <published>' + iso(post.date) + '</published>\n';
    xml += '    <updated>' + iso(post.updated || post.date) + '</updated>\n';
    if (summary) xml += '    <summary>' + esc(summary) + '</summary>\n';
    xml += '    <media:thumbnail xmlns:media="http://search.yahoo.com/mrss/" url="' + esc(cover) + '" />\n';
    (post.tags || []).toArray().forEach(function (t) {
      xml += '    <category term="' + esc(t.name) + '" />\n';
    });
    xml += '    <content type="html">' + cdata(post.content) + '</content>\n';
    xml += '  </entry>\n';
  });

  xml += '</feed>\n';
  return { path: 'atom.xml', data: xml };
});
