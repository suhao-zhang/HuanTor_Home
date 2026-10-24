---
title: 不落盘的打印页：Blob、隐藏 iframe 与样式还原的边界
date: 2026-10-08 11:07:00
updated: 2026-10-08 11:07:00
categories: [前端工程]
tags: [浏览器打印, Blob URL, 分页控制, 前端工程, 兼容性]
cover: /images/posts/in-browser-print-blob.png
excerpt: 浏览器里打印一张单据，难的不是调用 print，而是"临时页面"怎么造、怎么等、怎么拆。这篇把改主文档、新窗口、隐藏 iframe、Blob 与 Object URL 四条路线的失效场景讲清，再给打印样式、分页、字体与异步时序的边界。
---

## 一、为什么打印是 Web 应用里最容易翻车的功能

打印看起来只是调一个 `window.print()`，实际上是让浏览器在另一个渲染管线里重排一份文档：纸张尺寸由驱动决定，边距由用户在对话框里改，背景色默认被丢掉，分页规则由排版引擎在运行期算，字体可能没有加载完，用户机器上还装着各家打印驱动的缩放策略。屏幕上的布局是你控制的，纸上的布局是协商出来的。

php.cn 上有条问答把需求提得很典型：不想生成物理文件，希望动态创建一个临时页面拿去打印。这个需求在企业 Web 系统里几乎每套单据、报表、合同都会遇到，而实现路线只有四条，每条都有自己的失效场景。先把四条路线摆平，再谈样式还原。

| 实现路线 | 看起来简单的地方 | 真实失效场景 | 什么时候还能用 |
| --- | --- | --- | --- |
| 直接替换主文档再打印 | 一行 `document.body.innerHTML` 加一次 `print()` | 单页应用的运行时状态被打断，事件监听与样式作用域丢失，打印完回不去原视图；用户在打印框里停留时页面已经"空了" | 纯静态页面、无路由无状态的独立打印页 |
| 新窗口加 `document.write` | 与主文档隔离，改动最小 | 被弹窗拦截（多数浏览器只允许用户手势的同步链路里打开）；新窗口默认带着 `opener` 引用，被打开的页面能反向操作父窗口，要显式断开这层关系；写入时机与 `close()` 的先后一旦错开，文档就进入不可预期状态；打印完窗口残留 | 明确存在用户点击手势、且允许新窗口的桌面场景 |
| 隐藏 iframe 写内容 | 主文档完全不动，隔离性好 | iframe 用 `display: none` 时部分引擎给出零尺寸布局，打印结果空白；子文档没加载完就调用打印会缺内容；用完没摘节点，多次点击叠加出多个 iframe | 需要保留主文档状态的通用场景，也是最常见落点 |
| Blob 与 Object URL | 内容是一次性生成的字符串，好管理 | `URL.createObjectURL` 产生的引用不 `revokeObjectURL` 就一直在内存里；过早撤销会让 iframe 取不到内容；字符集没写进 Blob 类型时中文变乱码 | 内容较大、需要反复装载或需要把同一份产物同时用于打印与下载 |

这里要澄清一个常见误解："不落盘"不等于"不占内存"。把 HTML 塞进 Blob 只是绕开了文件系统，代价转移到了文档生命周期内的对象引用管理上。

![浏览器内打印的临时页面与样式还原边界](/images/posts/in-browser-print-blob.png)

## 二、隐藏 iframe 与 Object URL：谁负责装载，谁负责拆

隐藏 iframe 路线的关键是三件事：怎么让子文档可靠加载、怎么让它拿到该有的样式、怎么在打印结束后干净收尾。

构造方式有两种。一种是 `srcdoc` 属性直接把 HTML 塞进属性值，代价是转义——引号与 `&` 必须处理，属性值超长时解析和调试都困难，而且子文档的字符集要靠内容里的 `<meta charset="utf-8">` 声明。另一种是造一个 Blob，再用 `URL.createObjectURL` 拿到形如 `blob:` 的地址赋给 iframe 的 `src`。Blob 的 MIME 类型要写成 `text/html;charset=utf-8`，漏掉 charset 时中文按错误编码解析，打印出来是一页问号。`createObjectURL` 返回的 URL 属于"引用型"资源，浏览器不会在你不需要它的时候自动回收，必须在合适时机调用 `revokeObjectURL`；而撤销时机又必须晚于 iframe 完成加载，否则请求还在半路就断了。这两个约束决定了撤销只能挂在"打印链路结束"之后，而不是"赋值完成"之后。

同源判定也值得实测而不是照抄结论：Blob URL 由当前文档创建，通常继承创建者来源，因此主文档去访问 iframe 的 `contentDocument` 一般可行；但只要子文档里嵌了来自其他来源的框架，或者你的页面本身运行在 `sandbox` 属性限制下，访问就会抛异常。这类边界建议写一条集成测试固定住，行为以所用浏览器版本为准。

至于"隐藏"的写法，把 iframe 挪出视口（绝对定位到 `left: -10000px`，或宽高给极小值但保留 `visibility: visible`）比 `display: none` 稳妥——前者仍在布局树里，后者在部分引擎里根本不产生盒子。这是需要三种浏览器各打一次才能确认的差异，别靠记忆。

时序骨架可以写成这样，注意每一步都在等一个明确的信号，而不是靠延时：

```js
async function printHtml(html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:absolute;left:-10000px;top:0;width:794px;height:1px';
  document.body.appendChild(frame);

  await new Promise((res, rej) => { frame.onload = res; frame.onerror = rej; frame.src = url; });
  const doc = frame.contentDocument;
  await doc.fonts.ready;                       // 子文档自己的 FontFaceSet
  await Promise.all([...doc.images].map(img =>
    img.complete ? Promise.resolve() : img.decode().catch(() => {})
  ));

  const teardown = () => { URL.revokeObjectURL(url); frame.remove(); };
  frame.contentWindow.focus();
  frame.contentWindow.print();
  // 撤销与摘节点都推迟到打印链路结束：预览异步渲染的引擎上，print() 一返回就撤销会让预览变空白
  addEventListener('afterprint', teardown, { once: true });
  frame.contentWindow.addEventListener('afterprint', teardown, { once: true });
  setTimeout(teardown, 60000);                 // 兜底，afterprint 不是每处都会来
}
```

`document.fonts.ready` 这个 Promise 只代表"当前进行中的字体加载任务收尾了"，不代表某个具体字体可用；对打印这种一次性场景足够，但如果你的单据里有必须出现的生僻字，仍要检查回退链。另外别把主文档的字体等待结果当成子文档的——`FontFaceSet` 是每份文档各自的。撤销与收尾的时机在引擎之间也有差别：预览是异步渲染的实现里，`print()` 一返回就 `revokeObjectURL` 会让预览页变空白；用户取消打印时 `afterprint` 是否触发请以实测为准。所以收尾动作要写成可重复执行的幂等函数，事件与兜底超时都指向它，谁先到算谁。

## 三、打印样式不是屏幕样式的副本

`@media print` 里能拿到的是一份重新排版的文档，屏幕上的浮动定位、粘性表头、滚动容器在纸上没有对应概念。三条规则最容易踩。

第一是背景与颜色。多数浏览器默认不打印背景色与背景图，用户可以在对话框里勾选"打印背景图形"，但你不能假设他勾了。要让状态标记（红色逾期、黄色待办）在纸上成立，得写 `print-color-adjust: exact`，同时带 `-webkit-print-color-adjust` 前缀写法，并把语义冗余到边框或文字上——颜色丢了还能读懂，比强行保色更可靠。更稳的方案是打印版式改成黑白可读：用边框粗细与文字前缀表达状态。

第二是分页控制。`break-inside: avoid` 用在卡片和表格行上效果不同：块级卡片通常能整块移到下一页，而 `<tr>` 上的断行行为在各引擎里一致性较差，需要同时写旧版别名 `page-break-inside: avoid`。真正决定跨页体验的是表头重复——`thead { display: table-header-group }` 让表头在每一页顶部重出，`tfoot` 同理；如果你把汇总行做成普通 `<div>` 放在表格后面，它就会跟着最后一行飘到不知哪一页。段落层面 `orphans` 与 `widows` 控制孤行，标题层面 `break-after: avoid` 防止"标题在页尾、正文在下一页"。

第三是纸张与边距。`@page { size: A4; margin: 12mm }` 给出建议值，但驱动与用户设置可以覆盖它；带物理打印机的用户如果开了"适合页面"缩放，你算的边距就作废。别把关键信息放进靠近纸张边缘的区域。

```css
@page { size: A4; margin: 12mm 10mm; }
@media print {
  .screen-toolbar, .page-actions { display: none; }
  thead { display: table-header-group; }
  tr, .doc-card { break-inside: avoid; page-break-inside: avoid; }
  h2 { break-after: avoid; }
  body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}
```

## 四、单位、字体与异步内容：还原的边界在哪

CSS 长度在屏幕上按 96px 每英寸解释，纸上按打印机的点与驱动 DPI 解释。`1pt = 96/72px ≈ 1.333px`，所以用 pt 写打印字号更接近排版直觉；同一份 HTML 里 px 与 pt 混用时，跨页表格的行高会先于宽度出问题。中文字体在这里最敏感：屏幕字体族在打印环境里可能回退到点阵感更强的替身，字号相同但字面宽度更大，于是本来一行的标题变成两行，把整块内容顶到下一页。行高也受影响——按固定像素写的行高在缩放后不跟随，撑破单元格的往往不是宽度而是高度。

异步内容必须全部落地再打印。数据在接口回来之前，打印按钮就该禁用；图片除了 `decode()` 还要处理 `loading="lazy"`——懒加载图片在从未进入视口的打印文档里可能根本不发起请求，打印版应显式设为 `eager`；外链图标字体在离线或受限网络下拿不到，就用内联 SVG。图表如果是画布，打印前把画布转成图片再塞进打印文档，因为部分引擎对画布的栅格化时机与屏幕不同。

页码是纯 CSS 方案的硬边界。`@page` 的 margin box 与 `counter(page)`、`counter(pages)` 属于 CSS Paged Media 的更完整规范，桌面主流引擎对其支持有限，能不能出页脚"第 3 页 共 12 页"以所用浏览器版本为准。可靠的替代只有两条：用打印对话框自带的页眉页脚（用户可控但你不可样式化），或让服务端渲染带页码的 PDF 交给浏览器打印——后者能保住版式，代价是引入一份排版实现。

## 五、测试矩阵至少要覆盖这些组合

打印功能的问题几乎都出在环境差异，靠一台机器一种打印机验收不出来。最小集合：

1. Chrome 与 Edge 各打一次物理机（同内核不等于同表现，企业机器上策略与驱动不同）。
2. Firefox 与 Safari 各一次，重点看背景色、表头重复与 `break-inside`。
3. iOS Safari 与 Android 上的 Chrome：走系统分享里的打印，观察边距与缩放是否把内容截掉。
4. 目标打印机一台加"另存为 PDF"一路径：这两种输出的分页实现并不相同，PDF 路径常常多出或少掉一页。
5. A4 与 Letter 两种纸：横向表格在 Letter 上更容易溢出边界。
6. 内容边界样本各一条：单行超长文本、跨三页的长表格、带图片的行、空值行、只有一行数据的表格。
7. 用户改动项：浏览器缩放 80%、125%，系统字号放大，深色模式（检查你有没有把深色下的颜色值直接搬到纸上）。
8. 时序场景：弱网下先点打印再等数据、数据已到但图片未到的中间态、打印后回到列表页时主文档状态是否完好。
9. 连续打印：同一个会话里连点三次打印，确认 iframe 数量与 Object URL 没有累积。

## 六、洹拓视角：验收写成"字段级完整 + 分页不断行"

我们内部对打印功能只写两条可判定的验收标准，不写"和屏幕上一模一样"这种无法验证的承诺。

第一条是字段级完整：以同一份样例数据为准，打印产物上必须出现的字段清单逐项核对，包含表头、单位、页脚口径说明与空值占位。判定方式是拿打印文档的文本内容做集合比对，缺字段就是缺陷，多字段也是缺陷。第二条是分页不破版：把同一份数据在三种纸张与两种引擎下各出一次 PDF，检查每个逻辑块的完整性——表格行不跨页断裂、卡片不半张、标题不与正文分离、汇总行不脱离表格。这两条能自动化到"取打印文档的 DOM 与 PDF 文本做断言"的程度，比人工看图便宜得多。

路线选择上我们的判断很朴素：需要在单页应用里保留状态，就走隐藏 iframe 加 Blob，同时把 Object URL 的撤销和节点摘除挂到打印结束事件与兜底超时上；一次点击只允许一个打印任务在跑，用按钮禁用而不是排队。真正版式要求高的单据（多栏、骑缝、套打），别在浏览器里硬扛，服务端出 PDF 更省人力——但那是另一笔账，要按版式复杂度和打印机数量一起算，而不是按"看起来能不能行"来定。
