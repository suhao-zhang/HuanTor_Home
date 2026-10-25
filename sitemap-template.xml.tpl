<?xml version="1.0" encoding="UTF-8"?>
{#
  本站自用的 sitemap 模板（hexo-generator-sitemap 支持 config.sitemap.template 指定模板，
  见该插件 lib/template.js）。和默认模板唯一的差别：标签页/分类页的文章数少于
  config.sitemap.thin_list_below 时不写进清单——这类页面和它唯一那篇文章几乎完全重复，
  一边在页面里给 noindex 一边又把它递进 sitemap 是自相矛盾的。
  阈值与 noindex 判定共用 _config.yml 里同一个键，两边不会走偏（scripts/robots-meta.js 读它）。
  改这个文件不影响插件升级，因为它在项目根目录、不在 node_modules 里。
#}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  {% set thin = config.sitemap.thin_list_below | default(0, true) %}
  {% for post in posts %}
  <url>
    <loc>{{ post.permalink | uriencode }}</loc>
    {% if post.updated %}
    <lastmod>{{ post.updated | formatDate }}</lastmod>
    {% elif post.date %}
    <lastmod>{{ post.date | formatDate }}</lastmod>
    {% endif %}
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  {% endfor %}

  <url>
    <loc>{{ config.url | uriencode }}</loc>
    <lastmod>{{ sNow | formatDate }}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  {% for tag in tags %}
  {% if not thin or tag.posts.length >= thin %}
  <url>
    <loc>{{ tag.permalink | uriencode }}</loc>
    <lastmod>{{ sNow | formatDate }}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.2</priority>
  </url>
  {% endif %}
  {% endfor %}

  {% for cat in categories %}
  {% if not thin or cat.posts.length >= thin %}
  <url>
    <loc>{{ cat.permalink | uriencode }}</loc>
    <lastmod>{{ sNow | formatDate }}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.2</priority>
  </url>
  {% endif %}
  {% endfor %}
</urlset>
