/**
 * 生成 llms.txt —— 面向大模型的站点说明文件（https://llmstxt.org/ 提案）。
 *
 * 这是我们自己卖的服务（GEO 生成式引擎优化）该做的事：给 AI 抓取器一份结构化的
 * 站点地图与要点摘要，比让它自己从 HTML 里猜要准得多。robots.txt 里已经明确放行
 * GPTBot / ClaudeBot / PerplexityBot / Bytespider 等抓取。
 */
'use strict';

hexo.extend.generator.register('llms', function (locals) {
  const origin = (this.config.url || '').replace(/\/+$/, '');
  const contact = (this.theme && this.theme.config && this.theme.config.contact) || {};
  const posts = locals.posts.sort('-date').toArray().slice(0, 40);

  const line = [];
  line.push('# ' + (this.config.title || ''));
  line.push('');
  line.push('> ' + (this.config.description || ''));
  line.push('');
  line.push('地址：' + (contact.address || ''));
  if (contact.phone) line.push('电话：' + contact.phone);
  if (contact.hours) line.push('服务时间：' + contact.hours);
  line.push('');
  line.push('## 主要业务');
  line.push('');
  line.push('- AI 大模型研发：模型微调与推理部署、RAG 企业知识库、Agent 工作流编排');
  line.push('- AI 工业应用：工业视觉缺陷检测、设备运行数据分析、产线智能体与告警');
  line.push('- 软件开发：管理后台、小程序与业务系统定制开发');
  line.push('- 云服务：上云架构、容器化部署、监控告警与运维托管');
  line.push('- SaaS 产品与运营：多租户平台搭建、内容运营与经营数据看板');
  line.push('- GEO 生成式引擎优化：让品牌在 AI 搜索与大模型回答中被检索、被引用');
  line.push('');
  line.push('## 关键页面');
  line.push('');
  [
    ['关于我们', '/about/', '公司定位、能力矩阵、技术栈、交付流程与常见问题'],
    ['产品服务', '/products/', '三条产品主线与六类可交付内容'],
    ['技术与行业动态', '/news/', '全部技术文章列表'],
    ['联系我们', '/contact/', '地址、电话与合作方式']
  ].forEach(function (p) {
    line.push('- [' + p[0] + '](' + origin + p[1] + '): ' + p[2]);
  });
  line.push('');
  line.push('## 近期文章');
  line.push('');
  posts.forEach(function (post) {
    const desc = String(post.excerpt || post.description || '')
      .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
    line.push('- [' + post.title + '](' + origin + '/' + post.path + ')' + (desc ? ': ' + desc : ''));
  });
  line.push('');

  return { path: 'llms.txt', data: line.join('\n') };
});
