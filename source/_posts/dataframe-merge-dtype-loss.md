---
title: 合并之后类型悄悄变了：洹拓科技谈 DataFrame 的 dtype 保全
date: 2026-10-17 11:09:00
updated: 2026-10-17 11:09:00
categories: [数据分析]
tags: [数据合并, 数据类型, 数据质量]
cover: /images/posts/dataframe-merge-dtype-loss.png
excerpt: 报表数据一到合并这一步就悄悄变了：整数编号带上小数点，长 ID 显示成科学计数法，导出 Excel 后前导零丢失。洹拓科技把 dtype 保全拆成键规范化、类型统一、膨胀校验与快照比对四条可断言的规则。
---

## 一、合并这一步为什么总在悄悄改数据

一份订单明细、一份商品主数据，单独打开都正常；一旦 merge，编号列就开始出问题。原本是整数的 10086，出来变成 10086.0；原本是纯数字的长 ID，显示成 1.23e+18 且末几位变成了 0；导出 Excel 之后，"0012345" 这类带前导零的编码直接成了 12345。最麻烦的是这三件事都不报错——pandas 只是"替你"改了类型，等你发现时，报表已经发出去了。

近期技术社区里有这样一组问答：合并两个列名不完全一致的 DataFrame 时，原始数据类型保不住。看起来像 pandas 的坑，实际上同时发生了三件事：join 键没对上，缺失值触发类型上浮，显示层再把上浮的结果放大成精度损失。把它们拆开，就能写出可断言的规则。

| 合并后出现的现象 | 真实原因 | 第一反应该查什么 |
| --- | --- | --- |
| 整数编号全部带 `.0` | 键没对上导致列里混入 NaN，而 `np.int64` 表示不了 NaN，整列升到 float64 | 该列的 `isna().sum()`，以及 `on=` 用的是哪个列 |
| 长 ID 显示成 `1.23e+18`，末几位归零 | float64 有效位约 53 位，装不下 18 位整数，这是精度损失而非显示问题 | 读入阶段有没有指定 `dtype` |
| 导出 Excel 后前导零丢失 | 在 pandas 里它已经是数值类型，Excel 只是照着数值写 | 源头是否按字符串读取 |
| 结果行数比左表多出一截 | `on=` 写成了非唯一列，触发笛卡尔式膨胀 | 右表键的重复情况与 `validate=` |
| 日期列变成 object，无法比较大小 | 对齐过程中 category、timestamp 被降级 | 合并前后的 dtypes 差异 |

![DataFrame 合并时的数据类型丢失](/images/posts/dataframe-merge-dtype-loss.png)

## 二、类型上浮的三条机理

第一，整数列的空值规则。传统整数 dtype 是 np.int64，它没有"缺失"这个概念，NaN 本质上是浮点位模式的哨兵值。于是只要某一行在合并中没匹配上，这一列就被迫整列转成 float64——语义从"编号"变成了"实数"，后续所有下游都跟着变。pandas 的可空整数扩展类型 Int64（注意是大写 I）用独立的掩码记录缺失，可以在保留整数语义的同时容纳空值。区别只在于读入和合并之前有没有显式指定。

第二，列名不一致造成的静默失配。左表叫 `order_no`，右表叫 `order_id`，如果 `on=` 写了一个只在一侧存在的列名，merge 依然返回一个结构完整的表，只是另一侧的所有列在每一行上都对不上，被填满 NaN。列数没变、行数没变，但内容已经空了。类型上浮只是这次失配的副作用，真正的问题是键根本没接上。

第三，扩展类型在对齐中被降级。category 和 datetime64 这类 dtype，在 merge、concat、reindex 的对齐过程中，只要两侧不一致——一边是 category 一边是 object，或者两边都是 category 但 categories 集合不同——结果列往往退化为 object。退化之后，日期比较、有序判断、groupby 观察到的取值都会变，而报错通常要到下游环节才浮现。

## 三、四条 dtype 保全规则

1. 合并前先把列名规范化，并断言两边的键名字与 dtype 完全一致。

```python
import pandas as pd

KEY = ["order_no"]

left = left.rename(columns={"订单号": "order_no", "SKU": "sku_id"})
right = right.rename(columns={"order_id": "order_no", "sku_code": "sku_id"})

assert set(KEY) <= set(left.columns) and set(KEY) <= set(right.columns), "键列不存在"
assert left[KEY].dtypes.equals(right[KEY].dtypes), (
    f"键 dtype 不一致: {left[KEY].dtypes.tolist()} vs {right[KEY].dtypes.tolist()}"
)
```

2. 键统一成字符串，或统一成可空整数 Int64，绝不允许左半边 int64、右半边 object。

```python
# 编码类字段（有前导零、不参与运算）一律按字符串读、字符串合
left = pd.read_csv("orders.csv", dtype={"order_no": "string", "sku_code": "string"})

# 纯数字主键用可空整数，空值不会把整列推成 float
right["sku_id"] = pd.to_numeric(right["sku_id"], errors="raise").astype("Int64")
left["sku_id"] = left["sku_id"].astype("Int64")
```

3. 用 `validate=` 和 `indicator=True` 主动检查行数膨胀，别让静默的一对多毁掉数据。

```python
rows_before = len(left)
merged = left.merge(right, on="order_no", how="left",
                    validate="m:1", indicator=True)

assert len(merged) == rows_before, f"行数从 {rows_before} 变成 {len(merged)}"
unmatched = merged["_merge"].eq("left_only")
print(f"未匹配行数 {unmatched.sum()}，占比 {unmatched.mean():.2%}")
```

`validate="m:1"` 声明的是"左多右一"，右表键一旦重复就直接报错；这正是我们想要暴露的情况。如果业务上两侧都可能重复，那说明你合的不是主数据而是明细，得先聚合再合。

4. 合并后跑一遍 dtypes 快照比对，把断言留在管道里。

```python
def dtype_snapshot(df: pd.DataFrame) -> pd.Series:
    return df.dtypes.astype(str).sort_index()

before = dtype_snapshot(left)
after = dtype_snapshot(merged[left.columns])
changed = (before != after)
assert not changed.any(), f"dtype 发生变化的列: {changed[changed].index.tolist()}"
```

## 四、把断言塞进 ETL 的测试

上面四条不是代码风格建议，而是可以固化成测试的约束。判断标准很简单：一次合并如果只靠"人眼看几行数据没变样"来验收，它就不算完成。ETL 脚本里至少留三个测试——第一个测试比对键的 dtype 与名字，专门对付列名改名；第二个测试跑小样本 merge 并断言行数与匹配率，专门对付重复键；第三个测试做 dtypes 快照 diff，专门对付类型降级。三个测试各十几行，跑在 CI 里比任何数据质量平台的看板都便宜。

还有一类边界值得单独造样本：右表缺这个键、左表键为空、键同时存在前导零与纯数字形态。这三类样本一旦进入测试集，多数"合并后类型变了"的问题会在提交阶段就被拦下。

## 五、洹拓视角：数据合并的验收清单

我们交付数据类项目时，合并环节的验收只看四个指标，缺一个就打回，阈值由业务方定，不由开发方猜。

| 必须记录的指标 | 怎么算 | 不达标时先停什么 |
| --- | --- | --- |
| 键匹配率 | 匹配上的行数 / 左表行数 | 先停报表发布，查列名与口径，而不是补默认值 |
| 行数变化率 | (结果行数 - 左表行数) / 左表行数 | 先停写入，查右表键唯一性 |
| dtype 差异数 | 快照比对中不一致的列数 | 先停下游任务，逐列确认为什么降级 |
| 空值新增数 | 合并后新增的 NaN 单元格数 | 先停指标计算，空值会污染均值与占比 |

四条验收标准写得更直白一些：一，任何人改列名，测试必须先红一次；二，任何一次合并，结果行数与匹配率必须落到日志里可回溯；三，任何一列的 dtype 变化必须显式声明理由，"合并时自动变的"不算理由；四，编码类字段永远按字符串处理，不参与算术就不许是数值类型。做到这四条，"报表一到合并就变样"这件事就不再是玄学，而是一个有明确责任环节的缺陷。
