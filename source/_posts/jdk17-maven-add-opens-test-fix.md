---
title: JDK 17 升级后单测集体报 InaccessibleObjectException：--add-opens 该怎么加才对｜洹拓科技
date: 2026-09-05 15:45:00
updated: 2026-09-05 15:45:00
categories: [开发工具]
tags: [JDK17, Maven, Surefire, Mockito, 模块化]
cover: /images/posts/jdk17-maven-add-opens.png
excerpt: 强封装让反射类测试框架批量失败。洹拓科技记录 JDK 8 升 JDK 17 后 Maven 测试的排障路径：为什么 --illegal-access 没用、argLine 写在哪、哪些包该开。
---

## 一、症状非常统一

项目从 JDK 8/11 升到 17，编译打包都没问题，一跑单测就成片报同一句：

```
java.lang.reflect.InaccessibleObjectException:
Unable to make field ... accessible:
module java.base does not "opens java.lang" to unnamed module @1a2bff
```

出错的不只是自研代码，而是 Mockito、ByteBuddy、CGLIB、Jackson、Hibernate 这些**运行时靠深层反射干活**的库。它们要 `setAccessible(true)` 打开 `java.base` 里的内部包，而 JDK 17 的强封装（JPMS）默认拒绝未授权的深度反射。

## 二、先排除三个无效操作

| 操作 | 结论 |
|-----|-----|
| 加 `--illegal-access=permit` | 无效。该选项在 JDK 16 起已失效、17 中不再起作用 |
| 只在 IDE 的 Run Configuration 里加参数 | 只救本地，`mvn test` 和流水线仍然红 |
| 只在 `maven-compiler-plugin` 配参数 | 这是**运行时**参数，编译期加了没有意义 |

关键认识：`--add-opens` 是给 **JVM 启动**用的，而 Surefire 会 fork 出一个独立的测试 JVM。参数必须通过 `argLine` 传进那个子进程，加在主进程上不算。

## 三、正确写法

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-surefire-plugin</artifactId>
  <version>3.1.2</version>
  <configuration>
    <argLine>
      --add-opens java.base/java.lang=ALL-UNNAMED
      --add-opens java.base/java.util=ALL-UNNAMED
      --add-opens java.base/java.time=ALL-UNNAMED
    </argLine>
  </configuration>
</plugin>
```

四个容易写错的地方：

1. **格式是 `模块/包=目标模块`**，不是 `java.base=ALL-UNNAMED`。目标写成 `ALL-UNNAMED` 是因为测试类通常由未命名模块的类加载器加载。
2. **`--add-opens` 只到包一级**，不能精确到类，也无法递归子包，用到哪个开哪个。
3. **Surefire 版本要 ≥ 3.0.0**。2.22.x 时代对模块参数的处理不一致，常见现象是参数加上了但被静默忽略，让人以为"改了没用"。
4. **集成测试要同步配**。`maven-failsafe-plugin` 是另一个 fork 进程，只改 Surefire 的话，`mvn verify` 阶段照样挂。

写成属性形式更利于多模块复用：

```xml
<properties>
  <test.argLine>
    --add-opens java.base/java.lang=ALL-UNNAMED
    --add-opens java.base/java.util=ALL-UNNAMED
  </test.argLine>
</properties>
...
<argLine>${test.argLine}</argLine>
```

## 四、比加参数更好的两条路

`--add-opens` 本质是**给旧实现打临时通道**，不是解决问题。按代价从低到高：

- **优先升级依赖**：Mockito 5.x、ByteBuddy 1.14+、Jackson 2.15+ 都已适配 JDK 17 的反射约束。我们手上几个老项目实测下来，一多半的 `InaccessibleObjectException` 在升级依赖后直接消失，根本不需要开包。
- **收敛反射用法**：把"用反射注入私有字段"的测试改成走构造器/Setters 或提供测试可见的包级方法。这类改动比看上去少——很多反射只是历史习惯。
- **长期方案**：如果项目本身模块化了，可以在 `module-info.java` 里显式 `opens ... to`，把开放范围限定到具体模块而不是 `ALL-UNNAMED`。

**不要做的事**：把 `--add-opens` 抄成一份二十行的"全家桶"清单贴进 CI。范围越大，将来升到下一个 LTS 时的隐性风险越高，而且**违反格式（例如把模块名写成 `ALL-UNNAMED`）会让 JVM 直接启动失败**，测试从"报错"变成"跑不起来"。

![JDK 17 强封装与测试 JVM 参数](/images/posts/jdk17-maven-add-opens.png)

## 五、洹拓科技的升级服务

新乡及豫北不少企业还在跑 JDK 8，出于安全和性能考虑近两年陆续要动。我们的经验是把这件事拆成三步，而不是一次梭哈：

1. **依赖体检**：列出所有依赖反射的库及其最低兼容版本，先升级再谈改造
2. **流水线并行**：新旧 JDK 各跑一份构建，用测试结果差异来判断改造是否到位
3. **灰度切换**：先切测试环境，再切预生产，生产窗口内保留回退包

需要评估存量项目升级成本的，可以找洹拓科技做一次**JDK 升级可行性评估**，输出一份含依赖清单、风险项和工作量的报告。

---

*要点已与 JDK 17 强封装机制及 Maven Surefire 参数传递行为核对。*

*新乡洹拓科技有限公司，软件开发 · AI模型研发 · 云服务与部署运维。*

*咨询热线：400-829-9957*
*地址：河南省新乡市辉县市金城百货四楼*
