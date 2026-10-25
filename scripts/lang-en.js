/**
 * 英文站（方案 A：精简英文企业站）
 *
 * 为什么用 after_render 而不是继续改主题：Hexo 的 i18n 只解决两件事——
 * 按路径前缀 source/en/**（或 front-matter 的 lang:）认语言，以及把主题
 * languages/*.yml 里的固定 UI 词（read_more / archives / 上一页…）换掉。
 * 而本站的导航、页脚、按钮、SEO 文案全写在一份 _config.hexo-theme-xongyi.yml 里，
 * 主题没有"按语言取配置"的机制。再往主题里塞第 7、8 处补丁，不如放在站点层：
 * 翻译表就在下面，改文案不用懂 EJS，也不会被主题升级覆盖。
 *
 * 做四件事（都只动 head / header / footer，英文页正文一律不碰）：
 *  1) en/** 页面：head 里的品牌名、og:site_name、JSON-LD 的 name 换成英文写法
 *  2) 所有页面：header 右侧注入语言切换按钮（中文页 → EN，英文页 → 中文）
 *  3) 成对页面：注入 hreflang 三件套（zh-CN / en / x-default）与 og:locale
 *  4) en/** 页面：header 与 footer 两块的文字按表换英文
 *
 * 中英配对（互为一对，双向都能对上）：
 *   /about/     ↔ /en/            公司介绍 / Company Profile
 *   /products/  ↔ /en/services/   产品服务 / Products & Capabilities
 *   /contact/   ↔ /en/contact/    联系我们 / Contact
 * 首页不配英文对应页：/en/ 本身就是"公司"页，再造一个英文首页只会是空壳。
 *
 * 加载顺序：本文件按字母序排在 meta-length.js 之前，所以第 4 步换完文字之后，
 * 描述标签仍会由 meta-length.js 用英文页自己的 front-matter description 覆盖，
 * 两边不冲突（它只改 description 三个标签和本页 title）。
 */
'use strict';

const PAIRS = {
  'about/index.html': 'en/index.html',
  'en/index.html': 'about/index.html',
  'products/index.html': 'en/services/index.html',
  'en/services/index.html': 'products/index.html',
  'contact/index.html': 'en/contact/index.html',
  'en/contact/index.html': 'contact/index.html'
};

const BRAND_CN = '新乡洹拓科技有限公司';
const BRAND_EN = 'Xinxiang Huantuo Technology Co., Ltd.';
const BRAND_SHORT_CN = '新乡洹拓科技';
const BRAND_SHORT_EN = 'Xinxiang Huantuo Technology';

const COPYRIGHT_CN = '© 2026 新乡洹拓科技有限公司 · 保留所有权利';
const COPYRIGHT_EN = '© 2026 Xinxiang Huantuo Technology Co., Ltd. All rights reserved';
const KEYWORDS_EN = 'Xinxiang Huantuo Technology,AI application development,large model RAG,industrial AI,defect detection,custom software development,SaaS,cloud deployment operations,GEO optimisation';

/* 表里的键是"整段文字"，命中才换：链接文字、栏目标题都是独立文本节点，
   不做子串替换，避免把正文里出现的同一个词也翻掉。
   注意：页脚版权那一行不能放进来——它和后面的 &nbsp;·&nbsp; 与备案号链接
   同属一个文本节点，整段匹配不上，改用 COPYRIGHT_CN 子串替换。 */
const HEADER_MAP = {
  '首页': 'Home',
  '关于我们': 'About Us',
  '产品服务': 'Services',
  '新闻动态': 'News',
  '技术栈': 'Tech Stack',
  '技术咨询': 'Get a Quote',
  '公司介绍': 'Company Profile',
  '组织架构': 'Organisation',
  '发展历程': 'History',
  '加入我们': 'Careers',
  '联系我们': 'Contact'
};

const FOOTER_MAP = {
  '快速导航': 'Quick Links',
  '服务支持': 'Support',
  '站点信息': 'Site Info',
  '联系我们': 'Contact Us',
  '归档': 'Archive',
  '网站地图 XML': 'Sitemap XML',
  'RSS 订阅': 'RSS Feed',
  '首页': 'Home',
  '关于我们': 'About Us',
  '产品服务': 'Services',
  '新闻动态': 'News',
  'AI 大模型研发 · 工业智能 · SaaS 与云服务': 'AI large-model R&D · Industrial intelligence · SaaS and cloud services',
  '新乡洹拓科技有限公司：AI 大模型研发、工业 AI 应用、软件开发、云服务与 SaaS 运营、GEO 优化。':
    'Xinxiang Huantuo Technology Co., Ltd.: large-model application R&D, industrial AI, software development, cloud and SaaS operations, and GEO optimisation.',
  '河南省新乡市辉县市金城百货四楼': '4F, Jincheng Department Store, Huixian, Xinxiang, Henan, China',
  '工作日 9:00 - 18:00': 'Mon–Fri 9:00–18:00 (UTC+8)',
  '© 2026 新乡洹拓科技有限公司 · 保留所有权利': '© 2026 Xinxiang Huantuo Technology Co., Ltd. All rights reserved'
};

/* 无障碍文案与正文外的属性（这些是属性值，不是文本节点，单独列一张表） */
const ATTR_MAP = {
  '电话咨询 400-829-9957': 'Call 400-829-9957',
  '公司地址：辉县市金城百货四楼': 'Company address: Huixian, Xinxiang, Henan',
  '技术咨询与合作洽谈': 'Enquiries and partnership',
  '跳转到主要内容': 'Skip to main content'
};

function originOf() {
  return String(hexo.config.url || '').replace(/\/+$/, '');
}

function urlOf(routePath) {
  return originOf() + '/' + routePath.replace(/index\.html$/, '');
}

// 只替换 >文本< 之间的整段文字
function mapText(html, table) {
  return html.replace(/>([^<>]+)</g, function (m, text) {
    const key = text.trim();
    return Object.prototype.hasOwnProperty.call(table, key) ? '>' + table[key] + '<' : m;
  });
}

function mapAttrs(html) {
  let out = html;
  Object.keys(ATTR_MAP).forEach(function (cn) {
    out = out.split('"' + cn + '"').join('"' + ATTR_MAP[cn] + '"');
  });
  return out;
}

function swapBrand(html) {
  // 先换全称再换简称，否则"新乡洹拓科技有限公司"会被换成"Xinxiang…有限公司"
  return html.split(BRAND_CN).join(BRAND_EN).split(BRAND_SHORT_CN).join(BRAND_SHORT_EN);
}

function langSwitch(isEn) {
  return isEn
    ? '<a class="ht-lang-switch" href="/" hreflang="zh-CN" title="切换到中文">中文</a>'
    : '<a class="ht-lang-switch" href="/en/" hreflang="en" title="Switch to English">EN</a>';
}

function hreflangTags(routePath) {
  const isEn = routePath.indexOf('en/') === 0;
  const mate = PAIRS[routePath];
  const self = urlOf(routePath);
  const out = [];
  if (isEn) {
    out.push('<link rel="alternate" hreflang="en" href="' + self + '">');
    if (!mate) return '';
    out.push('<link rel="alternate" hreflang="zh-CN" href="' + urlOf(mate) + '">');
    out.push('<link rel="alternate" hreflang="x-default" href="' + urlOf(mate) + '">');
  } else {
    if (!mate) return '';
    out.push('<link rel="alternate" hreflang="zh-CN" href="' + self + '">');
    out.push('<link rel="alternate" hreflang="en" href="' + urlOf(mate) + '">');
    out.push('<link rel="alternate" hreflang="x-default" href="' + self + '">');
  }
  out.push('<meta property="og:locale" content="' + (isEn ? 'en_US' : 'zh_CN') + '">');
  return out.join('\n  ');
}

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

/* 优先级 30：排在 seo.js（补 JSON-LD 面包屑）与 meta-length.js（换描述）之后，
   这样它们写进 head 的中文品牌名也能被这里一并换掉，不会漏。 */
hexo.extend.filter.register('after_render:html', function (str, data) {
  if (typeof str !== 'string' || str.indexOf('</head>') === -1) return str;

  const routePath = String((data && data.path) || 'index.html');
  const isEn = routePath.indexOf('en/') === 0;
  let out = str;

  /* 1) 语言切换：优先插在暗色开关前，其次 CTA 前，最后汉堡按钮前 */
  const tag = '  ' + langSwitch(isEn) + '\n';
  if (/<button id="theme-toggle"/.test(out)) out = out.replace(/(\s*)(<button id="theme-toggle")/, '\n' + tag.trimEnd() + '$1$2');
  else if (/<a class="btn [^"]*nav-cta"/.test(out)) out = out.replace(/(\s*)(<a class="btn [^"]*nav-cta")/, '\n' + tag.trimEnd() + '$1$2');
  else out = out.replace(/(\s*)(<button id="nav-toggle")/, '\n' + tag.trimEnd() + '$1$2');

  /* 2) hreflang 与 og:locale */
  const alt = hreflangTags(routePath);
  if (alt) out = out.replace(/<\/head>/, '  ' + alt + '\n</head>');

  if (!isEn) return out;

  /* 3) head：关键词换英文、结构化数据里的公司名与描述换英文、品牌全称/简称统一 */
  const doc = docOf(routePath);
  const enDesc = doc && doc.description ? String(doc.description) : '';
  out = out.replace(/<head>[\s\S]*?<\/head>/, function (m) {
    let h = m;
    h = h.replace(/<meta name="keywords" content="[^"]*"/, '<meta name="keywords" content="' + KEYWORDS_EN + '"');
    if (enDesc) h = h.replace(/("description":\s*)"[^"]*"/, function (mm, a) { return a + JSON.stringify(enDesc); });
    // seo.js 生成的面包屑根节点写死是"首页"
    h = h.replace(/("name":\s*)"首页"/g, '$1"Home"');
    h = swapBrand(h);
    return h;
  });

  /* 4) header 与 footer：文字换英文（正文一律不动） */
  out = out.replace(/<header[\s\S]*?<\/header>/, function (m) {
    return swapBrand(mapAttrs(mapText(m, HEADER_MAP)));
  });
  out = out.replace(/<footer[\s\S]*?<\/footer>/, function (m) {
    return swapBrand(mapAttrs(mapText(m.split(COPYRIGHT_CN).join(COPYRIGHT_EN), FOOTER_MAP)));
  });
  out = out.replace(/(<a class="skip-link" href="#main">)([^<]*)(<\/a>)/, function (m, a, t, c) {
    return a + (ATTR_MAP[t.trim()] || t) + c;
  });
  out = out.replace(/>豫ICP备2025140588号<\/a>/, '>豫ICP备2025140588号 (ICP filing)</a>');

  return out;
}, 30);
