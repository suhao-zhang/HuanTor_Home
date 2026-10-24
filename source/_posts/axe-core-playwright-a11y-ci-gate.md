---
title: 别追"零违规"：把 axe-core 挂进 Playwright 用基线门禁控住无障碍
date: 2026-10-01 15:57:00
updated: 2026-10-01 15:57:00
categories: [开发工具]
tags: [无障碍, WCAG, Playwright, axe-core, CI]
cover: /images/posts/axe-core-playwright-ci.png
excerpt: 存量项目跑一遍无障碍扫描常有几百条违规，一刀切门禁只会让团队把它关掉。洹拓科技记录用 axe-core + Playwright 做基线对比门禁的做法，以及 SPA 场景下的假绿陷阱。
---

## 一、先说结论：门禁要拦的是"新增"

很多团队第一次跑无障碍扫描就放弃了，原因很实际：一个做了两三年的后台系统，扫出三五百条违规很正常，把"违规数必须为 0"写进 CI 的结果只有一个——有人给流水线加了跳过开关。

能长期活下来的策略是**基线对比**：把当前存量违规数固化成基线，只在**新增**时阻断。这样第一次接入不用改任何代码，之后每个 PR 只负责自己那一点增量。

## 二、最小接入

```bash
npm i -D @playwright/test @axe-core/playwright
```

```js
import { AxeBuilder } from '@axe-core/playwright';

test('关键页面不应引入新的 WCAG 违规', async ({ page }) => {
  await page.goto('/order/list');
  await page.waitForLoadState('networkidle');   // SPA 必须等

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])            // 只锁 WCAG 2.1 A/AA
    .analyze();

  expect(results.violations.length).toBeLessThanOrEqual(BASELINE);
});
```

Playwright 的定位器（`getByRole`、`getByLabel`）走的就是浏览器无障碍树，而 axe-core 判定用的也是同一棵树——这一点很方便：**测试能选中的元素，和合规检查看到的元素，是同一个来源**。反过来，"用 `#id` 硬选出来的按钮，屏幕阅读器未必能读到"这类分歧也能早点暴露。

`withTags(['wcag2a','wcag2aa'])` 这一步不是可选项。不筛标签时，axe 会把最佳实践类、`minor` 级的一起报出来，噪音足以淹没真正必须修的对比度、`image-alt`、`label`。

## 三、常见违规与真实成因

| 规则 id | 典型表现 | 根因 |
|--------|---------|-----|
| `color-contrast` | 灰字浅底、置灰按钮文字 | 设计稿取色只看屏幕，未做比值校验 |
| `image-alt` | 图标 `<img>` 无 alt，装饰图也加了 alt | 组件默认不传 alt；装饰图应 `alt=""` |
| `label` | 输入框只有 placeholder | placeholder 会被读屏跳过，且在聚焦后消失 |
| `heading-order` | 从 h2 直接跳 h4 | 按视觉大小选标签，而不是按层级 |
| landmark 缺失 | 整页一个 `<div>` 到底 | 自研组件库没有语义映射 |

`label` 这一条在企业后台里出现频率最高，也最难看：表单密密麻麻，全靠 placeholder 提示，读屏用户和用键盘填写的仓库同事都受影响。**这一类问题的修复成本极低，收益却最直接**——毕竟工厂里用扫码枪、戴手套操作网页的人，比互联网用户更需要键盘可达。

## 四、判定脚本与报告留档

```js
// scripts/check-a11y-baseline.js
const target = Number(process.env.A11Y_BASELINE);
const current = report.reduce((s, t) => s + (t.results?.violations?.length ?? 0), 0);
if (current > target) {
  console.error(`无障碍违规 ${current} 条，超出基线 ${target}，阻断合并`);
  process.exit(1);
}
```

配套三件小事，决定了这套东西能不能被团队接受：

1. **报告要能读**。axe 原始的 violations 对象嵌套很深，建议映射成 `{ id, impact, target selector }` 的精简列表直接打到 CI 日志里，让人一眼看到"哪个页面哪个元素"。
2. **产物留档**。`--reporter=json` 落 `a11y-report.json`，GitHub Actions 里用 `if: always()` + `actions/upload-artifact@v4`，失败时也能下载。
3. **基线只降不升**。每次有人修掉一批，就把 `A11Y_BASELINE` 调低，PR 里写明降了多少。这个数字的变化就是团队的进度条。

## 五、SPA 场景的三个坑

1. **假绿**。异步渲染未完成就扫描，页面还是一片空白，违规数为 0，绿灯通过。解法是 `waitForLoadState('networkidle')`，或者等关键 role 可见后再扫。
2. **弹窗与折叠面板**。藏在未展开状态里的表单根本没进入 a11y 树，必须先操作展开再扫。
3. **不要扫生产域名**。一是给线上带不必要的负载，二是生产数据会进报告；固定指向 staging。

## 六、为什么值得找洹拓科技做这件事

政务、事业单位与国企项目 increasingly 会在验收里加无障碍与适配要求，而大多数存量系统的组件库是从未考虑语义化的角度长出来的。我们的做法是：

- **组件库语义改造**：把图标按钮、表单、表格补上可访问名称与焦点管理，一次改造全站受益
- **扫描接入 CI**：按上面的基线策略落地，含流水线脚本与看板
- **整改优先级清单**：按影响面（阻断使用的键盘不可达 > 对比度）排序，而不是按违规数量
- **验收材料支持**：给出扫描范围、方法、结论与整改记录，配合项目验收

需要给现网系统做一次无障碍体检的新乡本地单位，可以先由我们出一份基线扫描报告。

![axe-core 与 Playwright 的基线门禁](/images/posts/axe-core-playwright-ci.png)

---

*技术要点与 axe-core、Playwright 的公开用法核对。*

*新乡洹拓科技有限公司，软件开发 · AI模型研发 · 云服务与部署运维。*

*咨询热线：400-829-9957*
*地址：河南省新乡市辉县市金城百货四楼*
