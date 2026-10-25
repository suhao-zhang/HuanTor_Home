---
title: 让大模型输出不再失控：洹拓科技的Pydantic结构化输出校验实践
date: 2026-09-23 13:40:00
updated: 2026-09-23 13:40:00
categories: [技术实践]
tags: [LLM, Pydantic, 结构化输出, 工程化]
cover: /images/posts/llm-structured-output-pydantic.png
excerpt: 大模型很聪明，但它的输出常常"不听话"——返回非标准JSON、编造不存在的字段、甚至直接输出一段散文。洹拓科技分享如何用Pydantic给LLM输出加上严格的工程化校验。
---

![模型输出经解析、约束校验、范围校验、降级四段才落到业务表](/images/posts/llm-structured-output-pydantic.png)

## 一、LLM输出的"失控"问题

在与大模型打交道的过程中，洹拓科技的工程师们发现一个普遍现象：模型很聪明，但它的输出常常"不听话"。

你让它返回一个JSON格式的用户信息，它可能：
- 返回一个看起来像JSON但语法错误的字符串
- 编造你从未要求过的字段
- 在JSON外面包一层markdown代码块
- 直接输出一段散文，告诉你"这是用户信息"

这些问题在Demo阶段可以忽略，但在生产环境中是致命的。下游系统解析失败、数据入库出错、业务流程中断——每一个都是P0级事故。

## 二、为什么需要结构化输出校验

洹拓科技在为新乡本地企业交付AI应用时，总结出了结构化输出的三个核心需求：

**1. 类型安全**

LLM的输出本质上是文本，但业务系统需要的是强类型数据。一个用户年龄字段，模型可能返回"25岁"、"二十五"、"25"、"大约二十五岁左右"——这四种表述对人类来说意思相同，但对程序来说只有最后一个是合法的整数。

**2. 字段完整**

业务系统对数据结构有明确要求。一个订单信息必须包含订单号、金额、状态三个字段，缺一不可。但LLM可能"偷懒"，只返回它认为重要的字段。

**3. 值域约束**

某些字段有明确的取值范围。比如"性别"只能是"男"或"女"，"订单状态"只能是"待支付""已支付""已发货""已完成""已取消"中的一个。LLM可能返回"未知"或"其他"这类不在枚举中的值。

## 三、Pydantic：Python生态的结构化校验利器

Pydantic是Python生态中最流行的数据校验库，FastAPI框架就用它做请求参数校验。用它来校验LLM输出，是洹拓科技在多个项目中验证过的最佳实践。

### 3.1 基础用法

```python
from pydantic import BaseModel, Field
from typing import Literal

class UserInfo(BaseModel):
    name: str = Field(..., description="用户姓名")
    age: int = Field(..., ge=0, le=150, description="用户年龄")
    gender: Literal["男", "女"] = Field(..., description="用户性别")
    email: str = Field(..., pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$", description="邮箱地址")

# 校验LLM输出
raw_output = '{"name": "张三", "age": "25岁", "gender": "男", "email": "zhangsan@example.com"}'
try:
    user = UserInfo.model_validate_json(raw_output)
    print(user.age)  # 报错：age字段期望int，实际是str
except ValidationError as e:
    print(f"校验失败：{e}")
```

### 3.2 与LLM Prompt结合

洹拓科技的做法是：把Pydantic模型的定义直接放进System Prompt，让模型知道期望的输出格式。

```python
import json
from openai import OpenAI

client = OpenAI()

SYSTEM_PROMPT = """你是一个信息提取助手。请严格按照以下JSON Schema提取用户信息：

{
    "name": "string, 用户姓名",
    "age": "integer, 用户年龄，0-150之间",
    "gender": "string, 只能是'男'或'女'",
    "email": "string, 邮箱地址，必须符合邮箱格式"
}

只返回JSON，不要任何额外文字。"""

def extract_user_info(text: str) -> dict:
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text}
        ],
        temperature=0.1  # 低温度保证输出稳定
    )
    raw = response.choices[0].message.content
    # 清理可能的markdown代码块
    raw = raw.strip().strip("`").strip()
    if raw.startswith("json"):
        raw = raw[4:].strip()
    return json.loads(raw)
```

## 四、洹拓科技的工程化实践

在实际项目中，洹拓科技总结出了一套完整的LLM输出校验工程化方案：

### 4.1 分层校验

**第一层：格式校验**
- JSON语法是否合法
- 是否包含必需的字段
- 字段类型是否正确

**第二层：值域校验**
- 数值是否在合理范围内
- 字符串是否符合格式要求（邮箱、手机号等）
- 枚举值是否在允许列表中

**第三层：业务校验**
- 字段之间的逻辑关系是否合理（如出生日期与年龄是否匹配）
- 是否与已有数据冲突（如订单号是否重复）

### 4.2 重试机制

LLM的输出具有随机性，一次校验失败不代表永远失败。洹拓科技的做法是：

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def extract_with_retry(text: str) -> UserInfo:
    raw = extract_user_info(text)
    return UserInfo.model_validate(raw)  # 校验失败会抛出ValidationError，触发重试
```

### 4.3 降级策略

当重试仍然失败时，需要有降级方案：

- **人工接管**：将原始输出和错误信息推送给人工审核
- **默认值填充**：对于非关键字段，使用默认值
- **部分解析**：只使用校验通过的字段，丢弃有问题的字段

## 五、常见陷阱与避坑指南

洹拓科技在项目中踩过的坑：

**1. 不要信任模型的"自我修正"能力**

有些开发者会在Prompt里写"如果你不确定，请重新思考"。实践证明，这种提示对减少幻觉几乎无效，反而可能让模型输出更长的"思考过程"。

**2. Temperature不是越低越好**

低Temperature确实能让输出更稳定，但也会让模型变得更"保守"。在需要创造性的场景（如文案生成），过低的Temperature会导致输出千篇一律。洹拓科技的经验值是：结构化输出0.1–0.3，创意输出0.7–0.9。

**3. JSON模式不是万能的**

OpenAI的JSON Mode能保证输出是合法的JSON，但不能保证字段完整或类型正确。仍然需要Pydantic做业务层校验。

**4. 注意Token消耗**

详细的JSON Schema会占用大量Prompt Token。洹拓科技的做法是：把Schema定义放在System Prompt中（只计算一次），而不是每次请求都带上。

## 六、给开发者的建议

1. **先定义数据契约**：在写Prompt之前，先用Pydantic定义好期望的数据结构
2. **把Schema放进Prompt**：让模型明确知道期望的输出格式
3. **低Temperature起步**：结构化输出场景，Temperature设0.1–0.3
4. **永远做校验**：不要信任模型的输出，用Pydantic做严格校验
5. **准备好重试和降级**：LLM输出有随机性，工程上要有容错机制

---

*新乡洹拓科技有限公司，专注软件开发与AI模型研发，为新乡及辉县本地企业提供从咨询到落地的全链路数字化服务。*

*咨询热线：400-829-9957*
*地址：河南省新乡市辉县市金城百货四楼*
