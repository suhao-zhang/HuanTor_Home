---
title: 组织架构
subtitle: 一条链路，四类角色
description: "新乡洹拓科技的组织架构：按交付链路分为需求与方案、算法与数据、工程与部署、运营与支持四类角色，负责人下不设中间传话层；含六个业务方向的主责归属表，以及方案评审、效果验收、故障响应三条机制。这一页给的是职责结构，不含人员名单与编制，六个方向可单独切入也可串成一个项目。"
date: 2026-10-26 01:10:00
---

<nav class="ht-subnav" aria-label="关于我们">
  <a href="../">公司介绍</a>
  <a href="./" class="active">组织架构</a>
  <a href="../history/">发展历程</a>
  <a href="../careers/">加入我们</a>
  <a href="../../contact/">联系我们</a>
</nav>

<div class="section-head section-head--left">
  <h1>按交付链路分工，不按销售漏斗分工</h1>
  <p>这一页给的是职责结构，不是人员名单，也不标人数与编制</p>
</div>

<div class="about__text">
  <p>我们把一个 AI 项目要走的路拆成四段：把需求问清楚、把模型与数据做出来、把系统跑稳、上线之后接着运营。每一段有人主责，但同一个项目从头到尾由同一批人跟，不在中途换手——换手丢的是上下文，而 AI 项目的效果恰恰取决于上下文。</p>
  <p>所以这张图看的是"一件事该找谁、谁对什么负责"，而不是"谁向谁汇报"。</p>
</div>

<div class="ht-org ht-stagger">
  <div class="ht-org__root">
    <div class="ht-org__node ht-org__node--root">
      <b>负责人</b>
      <span>定方向、对外签约、对交付质量兜底；方案评审与否决权在这里</span>
    </div>
  </div>
  <div class="ht-org__row">
    <div class="ht-org__node">
      <b>需求与方案</b>
      <span>把业务问题翻译成可验收的技术方案</span>
      <ul class="ht-org__duty">
        <li>场景梳理、数据现状盘点</li>
        <li>可行性判断与风险提示</li>
        <li>方案书、里程碑、分项报价</li>
        <li>验收标准与评估集定义</li>
      </ul>
    </div>
    <div class="ht-org__node">
      <b>算法与数据</b>
      <span>负责效果能不能达到约定水位</span>
      <ul class="ht-org__duty">
        <li>模型选型、微调与推理部署</li>
        <li>文档解析、切片与检索链路</li>
        <li>数据清洗与标注规范</li>
        <li>错例分析与效果迭代</li>
      </ul>
    </div>
    <div class="ht-org__node">
      <b>工程与部署</b>
      <span>负责系统能在真实环境里稳定跑</span>
      <ul class="ht-org__duty">
        <li>前后端与业务系统集成</li>
        <li>容器化部署与上云架构</li>
        <li>权限、日志、监控与备份</li>
        <li>产线设备与相机对接</li>
      </ul>
    </div>
    <div class="ht-org__node">
      <b>运营与支持</b>
      <span>负责上线之后不掉链子</span>
      <ul class="ht-org__duty">
        <li>操作培训与文档交付</li>
        <li>知识库维护与内容运营</li>
        <li>数据看板与使用分析</li>
        <li>故障响应与 GEO 监测</li>
      </ul>
    </div>
  </div>
</div>

<div class="section-head" style="margin-top: 72px;">
  <h2>六个业务方向分别由谁主责</h2>
  <p>主责指对结果负责的那一组，参与组按项目实际范围拉进来</p>
</div>

<table>
  <thead>
    <tr><th>业务方向</th><th>主责</th><th>通常一起干的人</th><th>交付看什么</th></tr>
  </thead>
  <tbody>
    <tr><td>AI 大模型研发</td><td>算法与数据</td><td>工程与部署</td><td>事先约定的评估集通过率</td></tr>
    <tr><td>AI 工业应用</td><td>算法与数据</td><td>工程与部署、需求与方案</td><td>产线漏检/误检的实测口径</td></tr>
    <tr><td>软件开发</td><td>工程与部署</td><td>需求与方案</td><td>功能清单与验收用例</td></tr>
    <tr><td>云服务</td><td>工程与部署</td><td>运营与支持</td><td>可用性、恢复演练与成本账单</td></tr>
    <tr><td>SaaS 产品与运营</td><td>运营与支持</td><td>工程与部署、需求与方案</td><td>活跃与留存数据、迭代节奏</td></tr>
    <tr><td>GEO 生成式引擎优化</td><td>运营与支持</td><td>需求与方案</td><td>主流 AI 问答里的引用与提及变化</td></tr>
  </tbody>
</table>

<div class="section-head" style="margin-top: 72px;">
  <h2>三件事在图之外，靠机制保证</h2>
  <p>不靠某个人的责任心，靠固定动作</p>
</div>

<div class="ht-modes ht-stagger">
  <div class="ht-mode">
    <h3>方案评审</h3>
    <p>每个项目开工前过一次评审，重点不是怎么做，而是该不该做。</p>
    <ul>
      <li>数据拿不拿得到、够不够、干不干净</li>
      <li>做成了用什么数字判断成功</li>
      <li>当前技术做不到的部分当场写明</li>
    </ul>
  </div>
  <div class="ht-mode">
    <h3>效果验收</h3>
    <p>AI 相关的交付不接受"演示时看着挺好"，只接受按评估集跑分。</p>
    <ul>
      <li>评估集在方案阶段就与业务方共同确认</li>
      <li>错例逐条归类：数据问题、检索问题还是模型问题</li>
      <li>达不到约定水位就如实说明，不悄悄降标准</li>
    </ul>
  </div>
  <div class="ht-mode">
    <h3>故障响应</h3>
    <p>上线后按事先约定的响应时限处理，责任落到人而不是落到群。</p>
    <ul>
      <li>监控与告警在部署阶段就配好，不等出事再补</li>
      <li>响应时限与升级路径写进合同或运维约定</li>
      <li>每次故障出复盘，改进项进下一个版本</li>
    </ul>
  </div>
</div>

<div class="section-head" style="margin-top: 72px;">
  <h2>我们没有的设置</h2>
  <p>说清楚不设什么，比列一堆头衔有用</p>
</div>

<div class="ht-stack ht-stagger">
  <div class="ht-stack__group">
    <h3>不设的岗位</h3>
    <div class="ht-chips">
      <span class="ht-chip">专职销售</span><span class="ht-chip">售前 PPT 岗</span>
      <span class="ht-chip">转包中介</span><span class="ht-chip">纯项目管理岗</span>
    </div>
  </div>
  <div class="ht-stack__group">
    <h3>为什么</h3>
    <div class="about__text">
      <p>谈需求的人后面要负责把东西做出来，所以不会为了签单先答应下来。项目由干活的人自己排期、自己对进度负责，中间不再加一层传话的人。承接范围之外的需求，我们在方案阶段就当场说明做不了和为什么。</p>
    </div>
  </div>
</div>

<!-- 待你确认或补充的（这些我没有依据，一律没写）：
     1) 各组实际人数、姓名与汇报关系；成立时的架构与后来的调整过程。
     2) 是否有独立的质检/测试角色，还是由工程与部署组兼任。
     3) 顾问、外包或长期合作方的位置——如果有，架构图上要加一层，并说明哪些环节会外发。
     4) 六个方向的主责归属是我按职能推的，如实际划分不同（例如工业应用由工程组牵头），改表格那一列即可。
     5) "不设专职销售""响应时限写进合同"这类口径如果与实际做法不符，直接删掉对应条目。 -->
