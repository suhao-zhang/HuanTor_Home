/**
 * SEO 增强：在渲染完成后修正/补全站点自己没法通过主题配置搞定的部分。
 *
 * 为什么用 after_render 而不是改主题：主题没有 head_end 之类的插槽，也不渲染
 * hexo.inject；改主题文件会在升级时被覆盖（历史上已经吃过一次）。所有改写都做了
 * 存在性判断，模式不匹配就原样返回，不会让构建失败。
 *
 * 具体做六件事：
 *  1) canonical / og:url 归一化：去掉 /index.html，统一带尾斜杠的目录式地址，
 *     避免 /about/ 与 /about/index.html 被当成两个页面（重复内容）。
 *  2) og:type：文章页改成 article。
 *  3) og:image / twitter:image：输出绝对地址；没有合适封面时回落到 1200x630 的
 *     标准分享图 images/og-cover.png（主题的默认值会拿 logo 当图，比例和透明度都不合适）。
 *  4) 结构化数据：首页 WebSite、文章 BlogPosting、内页 BreadcrumbList、
 *     含 FAQ 的页面 FAQPage（直接从页面里的 <details> 提取，改文案不用同步改代码）。
 *  5) RSS 自动发现链接。
 *  6) 把主题写死的 cdnjs highlight.js 配色改成站点自带的本地副本：少一个第三方
 *     阻塞请求，国内访问也不受 cdnjs 影响。
 */
'use strict';

function originOf(hexo) {
  const url = (hexo.config.url || '').replace(/\/+$/, '');
  return url;
}

// 'index.html' -> ''  |  'about/index.html' -> '../'
function prefixOf(routePath) {
  return '../'.repeat(((routePath || '').match(/\//g) || []).length);
}

// '/about/index.html' -> 'https://site/about/'
function canonicalUrl(origin, routePath) {
  let p = '/' + String(routePath || 'index.html');
  if (/\/index\.html$/.test(p)) p = p.replace(/index\.html$/, '');
  if (!p.endsWith('/')) p += '/';
  return origin + p;
}

function absUrl(origin, href) {
  if (!href) return '';
  if (/^(https?:)?\/\//i.test(href)) return href;
  return origin + (href.startsWith('/') ? '' : '/') + href;
}

function json(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

// 从页面 HTML 里抓 <details><summary>问</summary><div>答</div></details>
function extractFaq(str) {
  const out = [];
  const re = /<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/details>/gi;
  let m;
  while ((m = re.exec(str)) !== null) {
    const q = m[1].replace(/<[^>]+>/g, '').trim();
    const a = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (q && a) out.push({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } });
  }
  return out;
}

function findPost(hexo, dirPath) {
  try {
    const posts = hexo.model('Post').toArray();
    for (let i = 0; i < posts.length; i++) {
      if (posts[i].path === dirPath) return posts[i];
    }
  } catch (e) { /* 模型还没就绪就算了 */ }
  return null;
}

function isoDate(d) {
  try { return new Date(d).toISOString(); } catch (e) { return null; }
}

hexo.extend.filter.register('after_render:html', function (str, data) {
  if (typeof str !== 'string' || str.indexOf('<head>') === -1) return str;

  const hexo = this;
  const origin = originOf(hexo);
  if (!origin) return str;

  const routePath = (data && data.path) || 'index.html';
  const canonical = canonicalUrl(origin, routePath);
  const prefix = prefixOf(routePath);
  const isPost = /^[\d-]{4,}\/.*\/index\.html$/.test(routePath) || /^\d{4}\/\d{2}\/\d{2}\//.test(routePath);
  const isHome = routePath === 'index.html';

  let out = str;

  // 1) canonical 与 og:url
  out = out.replace(/<link rel="canonical" href="[^"]*">/,
    '<link rel="canonical" href="' + canonical + '">');
  out = out.replace(/<meta property="og:url" content="[^"]*">/,
    '<meta property="og:url" content="' + canonical + '">');

  // 2) 文章页 og:type
  if (isPost) {
    out = out.replace(/<meta property="og:type" content="[^"]*">/,
      '<meta property="og:type" content="article">');
  }

  // 3) 分享图：文章位图封面优先；主题的兜底值会拿 logo 当 og:image（624x180 且透明底，
  //     在微信/微博/X 的卡片里很难看），这种一律换成 1200x630 的标准分享图。
  //     主题给的可能是 /images/x.png、../images/x.png 或 images/x.png，
  //     先按当前页面位置解析成站点根路径，再拼绝对地址。
  const path = require('path').posix;
  const routeRel = routePath.replace(/index\.html$/, '');      // 与 post.path 一致（无前导斜杠）
  const routeDir = '/' + routeRel;                              // 与 post.path 比较用
  const coverMatch = out.match(/<meta property="og:image" content="([^"]*)">/);
  let cover = coverMatch ? coverMatch[1] : '';
  if (!/\.(png|jpe?g|webp)$/i.test(cover) || /(^|\/)images\/logo/.test(cover)) {
    cover = prefix + 'images/og-cover.png';
  }
  const coverFinal = /^(https?:)?\/\//i.test(cover)
    ? cover.replace(/^(https?:)?\/\//, 'https://')
    : absUrl(origin, path.resolve(routeDir, cover));
  if (coverMatch) {
    out = out.replace(/<meta property="og:image" content="[^"]*">/,
      '<meta property="og:image" content="' + coverFinal + '">');
  } else {
    out = out.replace('</head>', '  <meta property="og:image" content="' + coverFinal + '">\n</head>');
  }
  if (out.indexOf('twitter:image') === -1) {
    out = out.replace(/<meta name="twitter:card" content="[^"]*">/,
      function (m0) {
        return m0 + '\n  <meta name="twitter:image" content="' + coverFinal + '">';
      });
  }

  // 4) 结构化数据
  const org = {
    '@type': 'Organization',
    name: hexo.config.title,
    url: origin + '/',
    logo: absUrl(origin, '/images/logo-mark-light.png')
  };
  const blocks = [];

  if (isHome) {
    blocks.push({
      '@context': 'https://schema.org', '@type': 'WebSite',
      name: hexo.config.title, url: origin + '/', inLanguage: 'zh-CN', publisher: org
    });
  }

  if (isPost) {
    const post = findPost(hexo, routeRel);
    if (post) {
      const title = (post.title || '').trim();
      const desc = (post.description || post.excerpt || hexo.config.description || '')
        .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
      blocks.push({
        '@context': 'https://schema.org', '@type': 'BlogPosting',
        headline: title, description: desc, image: [coverFinal],
        inLanguage: 'zh-CN', author: org, publisher: org,
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        datePublished: isoDate(post.date), dateModified: isoDate(post.updated || post.date),
        url: canonical
      });
    }
  }

  if (!isHome) {
    const crumbs = [{ '@type': 'ListItem', position: 1, name: '首页', item: origin + '/' }];
    if (isPost) {
      const post = findPost(hexo, routeRel);
      crumbs.push({ '@type': 'ListItem', position: 2, name: '技术与行业动态', item: origin + '/news/' });
      if (post && post.title) {
        crumbs.push({ '@type': 'ListItem', position: 3, name: post.title.trim(), item: canonical });
      }
    } else {
      const t = (out.match(/<title>([^|<]*)/) || [])[1];
      crumbs.push({ '@type': 'ListItem', position: 2, name: (t || '').trim() || canonical, item: canonical });
    }
    blocks.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs });
  }

  const faq = extractFaq(out);
  if (faq.length) {
    blocks.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq });
  }

  const extra = blocks
    .map(function (b) { return '  <script type="application/ld+json">' + json(b) + '</script>'; })
    .join('\n');

  // 5) RSS 自动发现
  const feed = '  <link rel="alternate" type="application/atom+xml" title="' +
    (hexo.config.title || '') + '" href="' + absUrl(origin, '/atom.xml') + '">';

  if (extra || feed) {
    out = out.replace('</head>', extra + '\n' + feed + '\n</head>');
  }

  // 6) 高亮配色本地化
  out = out.replace(
    /<link rel="stylesheet" href="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/highlight\.js\/[^"]+">/,
    '<link rel="stylesheet" href="' + prefix + 'css/highlight-theme.css">');

  return out;
});


/* ------------------------------------------------------------------
 * 7) 品牌去重：文章标题本身已带「洹拓科技」时，去掉 head.ejs 追加的站点名后缀，
 *    否则 <title> 会变成「……｜洹拓科技 | 新乡洹拓科技有限公司」，品牌出现两次。
 *    单独注册一个 after_render:html，排在上面主处理之后，只动 title 与 og/twitter 标题。
 * ------------------------------------------------------------------ */
hexo.extend.filter.register('after_render:html', function (str) {
  const SUFFIX = ' | 新乡洹拓科技有限公司';
  if (str.indexOf(SUFFIX) === -1) return str;
  const head = (str.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
  if (!head || head.length <= SUFFIX.length) return str;
  const bare = head.slice(0, head.length - SUFFIX.length);
  if (!/｜洹拓科技$/.test(bare)) return str;   // 只处理我们统一加的后缀模式，其余页面保留站点名后缀
  str = str.replace(/<title>[\s\S]*?<\/title>/, '<title>' + bare + '</title>');
  str = str.replace(/(<meta property="og:title" content=")[^"]*(")/, '$1' + bare + '$2');
  str = str.replace(/(<meta name="twitter:title" content=")[^"]*(")/, '$1' + bare + '$2');
  return str;
});
