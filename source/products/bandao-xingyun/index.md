---
title: 伴岛星云 · 同城找搭子社交产品（服务号加小程序）
subtitle: 服务号加小程序，从发帖约人到绑定关系
description: "伴岛星云（全称伴岛星云同城搭子社交软件 V1.0）是自研自营的同城找搭子产品，由微信服务号与小程序承载：按饭搭子、旅游、运动、学习等分类发帖约人，报名并经对方同意后绑定关系再私信沟通，用户内容在入库前送审，uni-app 一套代码覆盖四端。"
date: 2026-10-26 04:22:00
---

<nav class="ht-subnav" aria-label="产品与方案">
  <a href="../">全部产品与方案</a>
  <a href="../onegeo/">OneGeo</a>
  <a href="./" class="active">伴岛星云</a>
</nav>

<div class="section-head section-head--left">
  <h1>伴岛星云</h1>
  <p>全称：伴岛星云同城搭子社交软件 V1.0　·　自研自营　·　微信服务号 + 小程序</p>
</div>

<div class="about__text">
  <p>"找搭子"是很具体的需求：一顿饭想有人拼、周末想去一个地方但没人同行、球局差一个人、备考想找个一起坐馆的。它不等于交友，也不等于相亲——目的明确、边界清楚、完事各自回家。</p>
  <p>伴岛星云做的就是这一段：把"发个帖子找人"和"确认过之后能持续联系"接起来。发起方说清时间地点和人数，想参加的人报名，对方同意之后两人才绑定关系并可以私信，不需要先把关系摊开去公开社交。</p>
</div>

<div class="section-head" style="margin-top: 56px;">
  <h2>一条主流程</h2>
  <p>五个动作，走完一次结伴</p>
</div>

<div class="ht-timeline ht-stagger">
  <div class="ht-step">
    <div class="ht-step__head"><h3>发布</h3><span class="ht-step__tag">选分类，说清条件</span></div>
    <p>选一个搭子分类，写清时间、地点、人数与费用怎么算。发布前文本已经过内容检测，不合规的内容进不了广场。</p>
    <p class="ht-step__out"><b>产出：</b>一条带分类、地点与时间的搭子帖</p>
  </div>
  <div class="ht-step">
    <div class="ht-step__head"><h3>逛广场</h3><span class="ht-step__tag">四种排法</span></div>
    <p>推荐、最新、最热、离我最近。同城场景里"离我最近"往往比"最热"更有用，所以位置是产品的一等公民。</p>
    <p class="ht-step__out"><b>产出：</b>筛出可以报名的帖子</p>
  </div>
  <div class="ht-step">
    <div class="ht-step__head"><h3>报名</h3><span class="ht-step__tag">名额有限</span></div>
    <p>对想去的活动提交报名，名额与截止由发起方掌握，服务端做报名限流，避免同一时间被刷爆。</p>
    <p class="ht-step__out"><b>产出：</b>一条等待同意的报名</p>
  </div>
  <div class="ht-step">
    <div class="ht-step__head"><h3>同意并绑定</h3><span class="ht-step__tag">这一步之后才开私聊</span></div>
    <p>发起方同意后双方建立搭子关系，关系类型可在后台配置的范围内维护。没被同意就没有私信入口，这是产品层面的默认。</p>
    <p class="ht-step__out"><b>产出：</b>一段绑定关系</p>
  </div>
  <div class="ht-step">
    <div class="ht-step__head"><h3>私信与举报</h3><span class="ht-step__tag">会话、未读、图片</span></div>
    <p>绑定后可以私信，支持会话列表、未读提示与图片。任何一侧都可以举报，举报进入后台处理队列，处理结果留痕。</p>
    <p class="ht-step__out"><b>产出：</b>约成一次，或者把不合适的人交回后台处理</p>
  </div>
</div>

<div class="section-head" style="margin-top: 72px;">
  <h2>搭子分类</h2>
  <p>默认八类，由后台"运营管理"维护，新增改文案不用发版</p>
</div>

<div class="ht-stack ht-stagger">
  <div class="ht-stack__group">
    <h3>常见场景</h3>
    <div class="ht-chips">
      <span class="ht-chip">饭搭子</span><span class="ht-chip">旅游</span><span class="ht-chip">运动</span>
      <span class="ht-chip">学习</span><span class="ht-chip">游戏</span><span class="ht-chip">演出展</span>
      <span class="ht-chip">伴行</span><span class="ht-chip">其他</span>
    </div>
  </div>
  <div class="ht-stack__group">
    <h3>浏览方式</h3>
    <div class="ht-chips">
      <span class="ht-chip">推荐</span><span class="ht-chip">最新</span><span class="ht-chip">最热</span>
      <span class="ht-chip">离我最近</span><span class="ht-chip">按城市</span>
    </div>
  </div>
</div>

<div class="section-head" style="margin-top: 72px;">
  <h2>安全与合规做到哪一步</h2>
  <p>社交产品的红线是内容，不是功能数量</p>
</div>

<div class="ht-modes ht-stagger">
  <div class="ht-mode">
    <h3>入库前送审，不是发布前</h3>
    <p>昵称、个性签名、活动标题与正文、上传图片都在落库之前送检测。因为图库和文本一旦进库，就会在动态流、活动封面、个人主页、分享海报多处复用，漏审一次会长期存在。</p>
  </div>
  <div class="ht-mode">
    <h3>关系是门槛</h3>
    <p>私信只对已绑定的双方开放，未同意的报名拿不到联系方式。举报与后台处理形成闭环，处理过程可回溯。</p>
  </div>
  <div class="ht-mode">
    <h3>还欠的合规件</h3>
    <p>社交类目上架需要的《用户协议》《隐私政策》与账号注销入口属于必办项，这部分与小程序资质、服务器域名备案一并推进，没有做完就不宣称已上架。</p>
  </div>
</div>

<div class="section-head" style="margin-top: 72px;">
  <h2>怎么做出来的</h2>
  <p>这套栈就是我们给客户做交付时用的同一套，不是演示工程</p>
</div>

<table>
  <thead>
    <tr><th>层</th><th>选型</th><th>说明</th></tr>
  </thead>
  <tbody>
    <tr><td>客户端</td><td>uni-app（Vue 3）</td><td>一套代码出微信小程序、H5、安卓与 iOS；底部导航等组件自绘，不依赖图标图片资源</td></tr>
    <tr><td>后端</td><td>Spring Boot 3.2 + Java 17</td><td>单体起步，统一响应与错误码、接口鉴权、口令哈希；内置安装向导与管理后台</td></tr>
    <tr><td>数据</td><td>MySQL 8 + MyBatis-Plus</td><td>建表脚本随版本走，实体与 DTO 分离</td></tr>
    <tr><td>缓存与位置</td><td>Redis</td><td>登录态、附近帖子的地理查询、热度榜、报名限流</td></tr>
    <tr><td>能力扩展</td><td>插件框架 + 应用市场</td><td>存储、短信等可替换能力做成插件，在后台统一启停与配置，换实现不动业务代码</td></tr>
    <tr><td>内容安全</td><td>平台文本与图片检测</td><td>入库前送审，未配置凭据时按策略降级并留痕</td></tr>
  </tbody>
</table>

<p style="color: var(--muted); font-size: 14.5px;">私信目前是轮询方案，后续换成推送；图片先落在应用工作目录，之后接对象存储。这两条在产品路线图上，不是已完成项。</p>

<p class="section-more">
  <a class="btn btn--primary" href="../../contact/">找我们聊<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>
  <a class="btn btn--ghost" href="../onegeo/">看另一个自研产品 OneGeo</a>
  <a class="btn btn--ghost" href="../">返回产品与方案</a>
</p>

<!-- 待你确认或补充的（源码与文档里查不到的一律没写）：
     1) 上线状态：服务号与小程序是否已对外可搜可用、appid 与域名备案是否已办完。
        页面刻意没放"扫码体验"和搜索指引，确认后我加一节入口区（服务号二维码 + 小程序码）。
     2) 覆盖城市：代码里的热门城市有新乡、郑州等，是否已实际开放、还有哪几个。
     3) 任何数字：注册用户、日活、发帖量、搭子成对数——一个都没有，需要后台真实导出。
     4) 运营主体与名称：是否以"新乡洹拓科技有限公司"名义运营，还是另一个主体；
        软件著作权（V1.0 材料已在准备）是否已受理/发证，拿到受理号可以写一句。
     5) 关系类型的实际标签（搭子/闺蜜/兄弟/恋人等）由后台配置，我按代码里的 code 只写了"可配置"。 -->
