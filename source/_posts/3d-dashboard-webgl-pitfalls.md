---
title: 二次进入后图层全没了：三维大屏三个报错的定位路线｜洹拓科技
date: 2026-10-24 20:35:00
updated: 2026-10-24 20:35:00
categories: [技术实践]
tags: [三维可视化, WebGL, IndexedDB, Cesium, 前端排障]
cover: /images/posts/3d-dashboard-webgl-pitfalls.png
excerpt: 三维大屏切走再切回来图层就不见了、本地图层配置存不进 IndexedDB 抛 DataCloneError、控制台刷 Refused to get unsafe header ETag。三个坑分处三层，这篇给出各自的机理、定位顺序和我们的大屏初始化边界约定。
---

## 一、三个报错分属三层，但都卡在"边界"上

工业现场的三维大屏很少是"一个页面一个场景"这么简单。它通常是路由切走的标签页、是多块屏拼出来的一个总览、是运维人员在几个车间视图之间来回跳。于是同一份代码会被反复挂载和卸载，而三维这一层的对象又远比一个 DOM 节点贵。2026 年 10 月发在博客园的一篇踩坑记录，把这类项目里最容易被同时碰到的三个问题串在了一起：Cesium Viewer 的"二次进入"之谜、IndexedDB 拒收 DOM 节点、以及跨域资源的 ETag 告警。

我们复核自己交付的看板与大屏项目时，习惯把它们按层次归位——这一步决定了你从哪里开始查，而不是从报错文字开始猜。

| 层次 | 典型对象 | 对应的那个坑 | 第一反应该查什么 |
| --- | --- | --- | --- |
| 场景渲染层 | Viewer、Scene、实体、图层 | Viewer 二次进入后状态残留 | 卸载路径里谁先被销毁 |
| 业务状态层 | 图层开关、视角书签、面板配置 | 把 DOM 存进 IndexedDB 失败 | 存进去的值能不能被结构化克隆 |
| 持久化与资源层 | 本地存储、跨域静态资源 | 跨域 ETag 告警 | 响应头是否对脚本可读 |

![三维大屏页面的分层示意：场景渲染层、业务状态层与持久化资源层各自对应一个坑](/images/posts/3d-dashboard-webgl-pitfalls.png)

## 二、Viewer 的"二次进入"：不是场景坏了，是清理代码引用了一个空壳

报错长这样：

```
Cannot read properties of undefined (reading 'scene')
```

注意它读的是 `scene`，也就是说 `xxx.scene` 里的那个 `xxx` 本身已经是 `undefined`。原文里对应的清理语句是这一行：

```js
sharedViewer.scene.postRender.removeEventListener(sharedPostRender);
```

`sharedViewer` 是模块级变量。第一次进入页面时它被赋值，卸载时走完 `viewer.destroy()` 后被置空；而事件的订阅关系是跨模块建立的——渲染循环每帧都会派发 `scene.postRender`，各业务模块把自己的回调挂上去。清理代码在置空之后才跑到，于是它去解引用一个已经是 `undefined` 的共享引用。用户看到的现象就是"第一次进正常，切出去再切回来，图层和标签没了"：新的 Viewer 起来了，但前置的注销动作抛异常中断，后续挂载逻辑没执行完。

我们的排查顺序固定四步：

1. 先确定异常抛在挂载路径还是卸载路径。卸载路径里抛错最阴险，因为它不影响第一次进入，只在二次进入时暴露。
2. 全文搜这个共享变量的赋值点和置空点，看有没有第三个模块在置空之后还读它。
3. 把事件监听器按"谁注册、谁注销"配对列一遍，`addEventListener` 与 `removeEventListener` 的回调必须是同一个引用，传一个新函数等于没注销。
4. 确认销毁顺序：先摘依赖者（事件、图层、每帧回调），再销毁场景本身。

第 4 步之后还要留一道防御，因为 Viewer 是否已经被销毁，外部其实看不准。原文的做法是调用前先探测并判断：

```js
const alive =
  sharedViewer &&
  typeof sharedViewer.isDestroyed === 'function' &&
  !sharedViewer.isDestroyed();

if (alive) {
  sharedViewer.scene.postRender.removeEventListener(sharedPostRender);
}
```

顺带一个和"二次进入"症状相同、根因不同的形态：如果 `destroy()` 压根没跑成，反复 `new Viewer` 会把 canvas 和 WebGL 上下文累积下来。多数浏览器对同一页面内存活的上下文数量有上限，超出的部分拿不到上下文，画面直接全黑。区分方法很简单——看报错里有没有那句 `undefined`，再看 DOM 里 canvas 节点数量是不是在涨。

## 三、IndexedDB 拒收 DOM：结构化克隆的名单里没有节点

第二个坑的报错是 `DataCloneError`，发生在把图层面板的状态写进 IndexedDB 的时候。

机理要说清楚：IndexedDB 写入走的是结构化克隆算法。它认的是纯数据——普通对象、数组、`Map`/`Set`、`Date`、`RegExp`、`TypedArray`、`ArrayBuffer`、`Blob`、`File`、`ImageBitmap`。它不认的是带执行环境或带树结构的引用——函数、`Proxy`、`Window`，以及 DOM 节点。把一个 SVG 图层节点、一段从接口里 `querySelector` 出来的元素直接塞进对象仓库，克隆一开始就失败，而且是整条记录写不进去，不是某个字段被忽略。同族的 `structuredClone()` 用的是同一套规则，所以"先克隆再存"绕不过去。

正确的做法是先把节点降维成字符串，读出来再还原成节点。原文用的正是这对 API：写入时 `XMLSerializer`，读取时 `DOMParser`。

```js
// 存：把节点转成标记字符串，只让字符串进库
const markup = new XMLSerializer().serializeToString(svgElement);
await put({ layerId, markup, savedAt: Date.now() });

// 取：从字符串重建文档，再移植进当前 DOM
const doc = new DOMParser().parseFromString(stored.markup, 'image/svg+xml');
const fresh = document.importNode(doc.documentElement, true);
panel.replaceChildren(fresh);
```

这里有个容易被忽略的代价：`importNode` 移植的是结构，事件监听器、组件实例上挂的状态都不会跟着过来，必须重新绑定。所以我们内部有一条硬约定——落库的应该是"能重放的最小状态"，也就是图层 ID、可见性、样式参数这类可序列化的字段；标记字符串只作为兜底，不作为首选。能在重建时从数据算出来的东西，就不要存渲染结果。

## 四、`Refused to get unsafe header "ETag"`：告警来自可读白名单

第三条最迷惑人，因为它不是异常，控制台黄色警告，页面照常跑。

```
Refused to get unsafe header "ETag"
```

跨域请求的响应头对脚本不是全量开放的。默认只有少数几个可读——`Cache-Control`、`Content-Language`、`Content-Type`、`Expires`、`Last-Modified`、`Pragma`；其余的头必须由服务端通过 `Access-Control-Expose-Headers` 显式暴露，`ETag` 不在那份默认可读名单里。于是脚本调 `getResponseHeader('ETag')` 拿到的是 `null`，浏览器顺手在控制台记一笔。

危险不在告警本身，而在它悄悄改变了行为：大屏上模型、瓦片这类静态资源常用 ETag 做缓存校验，前端读不到这个值，条件请求的逻辑就退化成"每次全量拉"。表现是页面没坏，但流量和首帧时间在恶化，而且只在跨域环境复现——同源一测就好，非常容易误判成网络问题。

两条处理路径，我们按优先级排：

- 能改服务端就加 `Access-Control-Expose-Headers: ETag`。这是把可读权限真正打开的唯一标准做法。
- 改不了服务端（走第三方 CDN 或网关），就退到 `getAllResponseHeaders()` 一次性取回可读头集合再手工解析，读不到 ETag 时按缺省值走，并把告警压掉。原文给的降级读取就是这个思路。

需要补一句自己的判断：`getAllResponseHeaders()` 返回的集合同样受 CORS 暴露规则约束，所以这条路解决的是"读不到单个头时的健壮降级"，不会把 `ETag` 变出来。别把它当成修复，它是止血。这条边界建议在自己的浏览器版本和网关配置上实测一遍再下结论。

## 五、我们做大屏项目时的初始化边界约定

把上面三个坑抽象一下，问题全都出在"谁拥有什么、什么时候交出"没定义。所以我们在新项目动手写渲染代码之前，会先把这几条落到评审文档里：

- 一个页面路由对应一个 Viewer 生命周期，禁止跨路由共享同一个实例；确实要复用的，用显式的注册表管理，由注册表负责销毁。
- 每个模块自己注册、自己注销，卸载入口按注册顺序的反序执行；任何模块的注销函数抛异常，不允许阻断后面的注销。
- 模块级变量在销毁时必须置空，同时所有读取方都要有 `isDestroyed()` 或等价的存活判断。
- 进本地存储的字段先过一遍"可克隆检查"：函数、节点、组件实例一律不落库；需要落库的结构先序列化成字符串或纯对象。
- 跨域资源的缓存策略要写清依赖哪个响应头，并在联调阶段用真跨域环境验一次，不接受"同源测试通过"。

## 六、一条可复用的定位路线

三个坑放在一起看，能提炼出一个不依赖具体库的排查顺序：先看症状出现在哪一层，再看它是不是只在"重复生命周期"里出现，最后才读报错文字。

1. 复现路径先固化：首次进入、切走、再进入，三步各自的表现记录下来。只在第二步之后出现的故障，几乎都指向状态残留。
2. 读报错里的属性名，反推解引用链上哪一环是 `undefined`——这一步能直接区分"对象被销毁"和"对象没创建"。
3. 涉及存储就试一次最小化写入：把要存的东西逐字段单独 `put`，抛 `DataCloneError` 的那个字段就是根因，比通读代码快。
4. 涉及告警先判断它有没有吞掉返回值。控制台警告 + 业务逻辑静默退化，比直接抛错更难发现，要看请求计数而不是看有没有红字。

三维大屏这类项目，故障成本集中在"演示当天"。上面这套顺序的价值不在于少写几行代码，而在于把"切走再切回来"变成一个常规测试动作，而不是上线前的赌博。
