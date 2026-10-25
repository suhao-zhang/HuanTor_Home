---
title: Organisation
lang: en
description: "How Xinxiang Huantuo Technology is organised: four role groups along one delivery chain — requirements and solution, algorithms and data, engineering and deployment, operations and support — plus who owns each of the six directions."
date: 2026-10-26 03:40:00
---

<nav class="ht-subnav" aria-label="About us">
  <a href="/en/">Company Profile</a>
  <a href="/en/organization/" class="active">Organisation</a>
  <a href="/en/history/">History</a>
  <a href="/en/careers/">Careers</a>
  <a href="/en/contact/">Contact</a>
</nav>

<div class="section-head section-head--left">
  <h1>Organised by the delivery chain, not by a sales funnel</h1>
  <p>This page describes responsibilities. It is not a staff list, and it does not show headcount or reporting lines.</p>
</div>

<div class="about__text">
  <p>An AI project has four parts: work out what is actually needed, make the model and the data work, get the system running in a real environment, and keep it useful after go-live. Someone owns each part, but the same people stay with one project from beginning to end. Handing a project over mid-way loses context, and in AI delivery context is most of what makes the result work.</p>
  <p>So read this as "who is responsible for what", not "who reports to whom".</p>
</div>

<div class="ht-org ht-stagger">
  <div class="ht-org__root">
    <div class="ht-org__node ht-org__node--root">
      <b>Principal</b>
      <span>Direction, contracts, final responsibility for delivery quality; holds the veto in solution review</span>
    </div>
  </div>
  <div class="ht-org__row">
    <div class="ht-org__node">
      <b>Requirements &amp; Solution</b>
      <span>Turns a business problem into a solution that can be signed off</span>
      <ul class="ht-org__duty">
        <li>Scenario mapping, data readiness review</li>
        <li>Feasibility judgement and risk notes</li>
        <li>Proposal, milestones, itemised quotation</li>
        <li>Acceptance criteria and evaluation set</li>
      </ul>
    </div>
    <div class="ht-org__node">
      <b>Algorithms &amp; Data</b>
      <span>Owns whether the result reaches the agreed quality line</span>
      <ul class="ht-org__duty">
        <li>Model selection, fine-tuning, inference deployment</li>
        <li>Document parsing, chunking, retrieval chain</li>
        <li>Data cleaning and labelling standards</li>
        <li>Failure-case analysis and tuning</li>
      </ul>
    </div>
    <div class="ht-org__node">
      <b>Engineering &amp; Deployment</b>
      <span>Owns whether the system runs stably in your environment</span>
      <ul class="ht-org__duty">
        <li>Front-end, back-end and system integration</li>
        <li>Containerised deployment and cloud architecture</li>
        <li>Permissions, logging, monitoring, backups</li>
        <li>Camera and production-line integration</li>
      </ul>
    </div>
    <div class="ht-org__node">
      <b>Operations &amp; Support</b>
      <span>Owns what happens after go-live</span>
      <ul class="ht-org__duty">
        <li>Training and documentation handover</li>
        <li>Knowledge-base upkeep and content operations</li>
        <li>Usage dashboards and analysis</li>
        <li>Incident response and GEO monitoring</li>
      </ul>
    </div>
  </div>
</div>

<div class="section-head" style="margin-top: 72px;">
  <h2>Who owns which direction</h2>
  <p>Owner means accountable for the outcome; the others join according to scope</p>
</div>

<table>
  <thead>
    <tr><th>Direction</th><th>Owner</th><th>Usually also involved</th><th>Judged by</th></tr>
  </thead>
  <tbody>
    <tr><td>Large-model applications</td><td>Algorithms &amp; Data</td><td>Engineering &amp; Deployment</td><td>Pass rate on the agreed evaluation set</td></tr>
    <tr><td>Industrial AI</td><td>Algorithms &amp; Data</td><td>Engineering, Requirements</td><td>Miss and false-positive rates measured on the line</td></tr>
    <tr><td>Software development</td><td>Engineering &amp; Deployment</td><td>Requirements &amp; Solution</td><td>Feature checklist and acceptance cases</td></tr>
    <tr><td>Cloud services</td><td>Engineering &amp; Deployment</td><td>Operations &amp; Support</td><td>Availability, restore drill, cost report</td></tr>
    <tr><td>SaaS and operations</td><td>Operations &amp; Support</td><td>Engineering, Requirements</td><td>Activity and retention, release cadence</td></tr>
    <tr><td>GEO optimisation</td><td>Operations &amp; Support</td><td>Requirements &amp; Solution</td><td>Citations and mentions in AI answers</td></tr>
  </tbody>
</table>

<div class="section-head" style="margin-top: 72px;">
  <h2>Three things the chart does not show</h2>
  <p>Held by a fixed routine rather than by somebody's sense of responsibility</p>
</div>

<div class="ht-modes ht-stagger">
  <div class="ht-mode">
    <h3>Solution review</h3>
    <p>Every project is reviewed before it starts. The point is not how to build it, but whether it should be built.</p>
    <ul>
      <li>Is the data obtainable, sufficient, clean enough</li>
      <li>Which number decides success</li>
      <li>What current technology cannot do, stated on the spot</li>
    </ul>
  </div>
  <div class="ht-mode">
    <h3>Quality acceptance</h3>
    <p>AI deliverables are not accepted on "the demo looked good". They are scored against an evaluation set.</p>
    <ul>
      <li>The evaluation set is agreed with the client during design</li>
      <li>Failure cases are classified: data, retrieval or model</li>
      <li>If the line is not reached we say so; we do not quietly lower it</li>
    </ul>
  </div>
  <div class="ht-mode">
    <h3>Incident response</h3>
    <p>After go-live, response times are those agreed in advance, and responsibility sits with a person, not a group chat.</p>
    <ul>
      <li>Monitoring and alerting configured during deployment, not after an outage</li>
      <li>Response times and escalation written into the contract or the operations agreement</li>
      <li>Each incident produces a review; the fixes go into the next release</li>
    </ul>
  </div>
</div>

<div class="section-head" style="margin-top: 72px;">
  <h2>Roles we deliberately do not have</h2>
  <p>Saying what is absent is more useful than listing titles</p>
</div>

<div class="ht-stack ht-stagger">
  <div class="ht-stack__group">
    <h3>Not on the chart</h3>
    <div class="ht-chips">
      <span class="ht-chip">Dedicated sales</span><span class="ht-chip">Pre-sales deck writers</span>
      <span class="ht-chip">Subcontracting brokers</span><span class="ht-chip">Project managers who do not build</span>
    </div>
  </div>
  <div class="ht-stack__group">
    <h3>Why</h3>
    <div class="about__text">
      <p>The people who scope a project are the ones who later maintain it, so nothing gets promised just to win a signature. Scheduling is done by the people doing the work, and there is no extra layer relaying messages in between. Anything outside our capability is declined during the proposal stage with the reason stated.</p>
    </div>
  </div>
</div>

<!-- 待确认（与中文页 /about/organization/ 同步）：
     1) 各组实际人数、姓名、汇报关系；成立时的架构与后来的调整。
     2) 是否有独立测试/质检角色，还是由工程组兼任。
     3) 六个方向的"主责"归属是按职能推的，如实际划分不同，中文英文两张表一起改。
     4) "不设专职销售""响应时限写进合同"若与实际不符，中英两版一起删掉对应条目。 -->
