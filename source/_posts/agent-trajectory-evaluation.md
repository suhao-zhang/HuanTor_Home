---
title: Agent 行为评估新范式：用 Trajectory 断言替代结果校验
date: 2026-10-24 13:19:00
categories: [AI测试]
tags: [Agent测试, 行为评估, Trajectory, pytest, AI工程化]
cover: /images/posts/agent-trajectory-evaluation.png
excerpt: 只断言最终结果等于放弃中间可测性。洹拓科技分享如何把Behavioral Evaluation翻译成pytest里的Trajectory断言。
---

很多团队在测试 AI Agent 时，只关注"最终结果是否正确"。但洹拓科技在为新乡企业做 Agent 系统测试时，发现一个严重问题：结果正确不代表过程正确，Agent 可能在中间步骤犯了错，只是运气好最终结果对了。

今天分享我们如何用 Trajectory 断言，实现对 Agent 行为的全过程测试。

## 为什么结果校验不够

**案例1：客服 Agent**

用户问："我的订单什么时候到？"

Agent 执行流程：
1. 调用订单查询 API
2. 获取物流信息
3. 生成回复

结果校验：回复内容是否正确（"预计明天到达"）

问题：如果 Agent 跳过了第 2 步，直接猜了一个答案，结果可能碰巧正确，但过程是错误的。这种 Agent 上线后会在其他场景出错。

**案例2：数据分析 Agent**

用户问："上个月销售额最高的产品是什么？"

Agent 执行流程：
1. 查询销售数据库
2. 按产品分组统计
3. 排序取 Top 1
4. 生成报告

结果校验：产品名称是否正确

问题：如果 Agent 在第 2 步用了错误的字段（用"订单数"代替"销售额"），结果可能碰巧一样，但逻辑是错误的。

## Trajectory 断言

Trajectory（轨迹）是指 Agent 执行过程中的完整路径，包括：

- 调用了哪些工具
- 每个工具的输入参数
- 每个工具的输出结果
- 中间的推理过程

Trajectory 断言就是检查这个路径是否符合预期。

**三层断言**

洹拓科技把 Trajectory 断言分为三层：

**1. 工具调用断言**

检查 Agent 是否调用了正确的工具：

```python
def test_agent_calls_order_api(agent):
    trajectory = agent.run("我的订单什么时候到？")
    
    # 断言调用了订单查询 API
    assert "query_order" in trajectory.tool_calls
    
    # 断言调用了物流查询 API
    assert "query_logistics" in trajectory.tool_calls
```

**2. 参数断言**

检查工具调用的参数是否正确：

```python
def test_agent_uses_correct_order_id(agent):
    trajectory = agent.run("订单 12345 什么时候到？")
    
    # 找到订单查询调用
    order_call = next(c for c in trajectory.tool_calls if c.name == "query_order")
    
    # 断言参数包含正确的订单号
    assert order_call.args["order_id"] == "12345"
```

**3. 中间状态断言**

检查中间步骤的输出是否符合预期：

```python
def test_agent_gets_logistics_info(agent):
    trajectory = agent.run("我的订单什么时候到？")
    
    # 找到物流查询的输出
    logistics_result = next(r for r in trajectory.results if r.tool == "query_logistics")
    
    # 断言结果包含预计到达时间
    assert "estimated_arrival" in logistics_result.data
```

## pytest 集成

洹拓科技把 Trajectory 断言集成到 pytest 框架：

```python
import pytest
from agent import CustomerServiceAgent

@pytest.fixture
def agent():
    return CustomerServiceAgent()

def test_order_query_trajectory(agent):
    """测试订单查询的完整轨迹"""
    trajectory = agent.run("订单 12345 什么时候到？")
    
    # 第一层：工具调用
    assert "query_order" in trajectory.tool_calls
    assert "query_logistics" in trajectory.tool_calls
    
    # 第二层：参数
    order_call = next(c for c in trajectory.tool_calls if c.name == "query_order")
    assert order_call.args["order_id"] == "12345"
    
    # 第三层：中间状态
    logistics_result = next(r for r in trajectory.results if r.tool == "query_logistics")
    assert logistics_result.data["status"] == "in_transit"
    
    # 最终结果
    assert "明天" in trajectory.final_response

def test_no_tool_call_when_not_needed(agent):
    """测试不需要工具时不调用"""
    trajectory = agent.run("你好")
    
    # 断言没有调用任何工具
    assert len(trajectory.tool_calls) == 0
    
    # 断言直接回复
    assert "你好" in trajectory.final_response
```

## 洹拓科技的实践经验

在为多家企业建设 Agent 测试体系时，我们总结了几条经验：

**1. 先记录 Trajectory**

要测试 Trajectory，首先要能记录它。建议在 Agent 框架里内置 Trajectory 记录：

```python
class Agent:
    def __init__(self):
        self.trajectory = Trajectory()
    
    def call_tool(self, tool_name, args):
        # 记录工具调用
        self.trajectory.add_tool_call(tool_name, args)
        
        # 执行工具
        result = tool_name(**args)
        
        # 记录结果
        self.trajectory.add_result(tool_name, result)
        
        return result
```

**2. 分层测试**

不要在一个测试里检查所有东西。建议：

- 单元测试：检查单个工具调用
- 集成测试：检查工具链协作
- 端到端测试：检查完整流程

**3. 回归测试集**

把发现过的 Bug 都加入回归测试集：

- 每次修复 Bug，写一个对应的 Trajectory 测试
- 每次上线前，运行全部回归测试
- 确保老 Bug 不再出现

**4. 可视化 Trajectory**

Trajectory 数据很复杂，建议可视化工具：

- 流程图：展示工具调用顺序
- 时序图：展示每个步骤的输入输出
- 对比图：展示预期 vs 实际的差异

## 洹拓科技的 Agent 测试服务

如果你的团队也在为 Agent 测试发愁，洹拓科技可以提供：

- 测试框架搭建：帮你建设 Trajectory 断言体系
- 测试用例编写：从业务场景到测试代码，全流程交付
- 持续集成：对接 CI/CD，实现自动化测试

我们为辉县及新乡本地企业提供 AI Agent 测试服务，欢迎联系我们。

---

**新乡洹拓科技有限公司**
地址：河南省新乡市辉县市金城百货四楼
电话：400-829-9957
业务：AI Agent | 测试工程 | 质量保障 | 软件开发
