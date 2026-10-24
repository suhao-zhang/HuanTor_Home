---
title: 从零搭建企业级RAG系统：洹拓科技的检索增强生成实战指南
date: 2026-10-24 13:30:00
categories: [AI前沿]
tags: [RAG, 检索增强生成, 向量数据库, 大模型应用]
cover: /images/thumb-3.svg
excerpt: 大模型很聪明，但对你公司的资料一无所知。洹拓科技分享如何用40行代码跑通RAG最小闭环，再逐步优化到可上线的企业级系统。
---

## 一、大模型的尴尬：聪明但"无知"

大模型接个API就能聊天，但真到业务里你会发现一个尴尬的事实：它很聪明，却对你公司的资料一无所知。员工手册、产品文档、项目复盘，它统统没见过。你问它，它不会说"我不知道"，而是开始一本正经地编。

洹拓科技在为新乡本地企业部署AI应用时，这是客户反馈最多的痛点。

RAG（Retrieval-Augmented Generation，检索增强生成）就是这件事的工程解法。说白了就一句：**回答之前先翻资料，再照着资料说话。**

| 对比项 | 直接用大模型（闭卷） | RAG（开卷） |
|-------|------------------|-----------|
| 知识来源 | 训练语料，有截止时间 | 你的文档库，随时可改 |
| 私有知识 | 不知道 | 放进去就知道 |
| 幻觉风险 | 较高 | 显著降低 |
| 可追溯性 | 说不清为什么这么答 | 能溯源到原文段落 |
| 更新成本 | 微调，贵且慢 | 重灌文档即可 |

可追溯性经常被低估，但它是RAG能在企业活下来的根本——答错了，你能点开引用判断是检索错了还是总结错了。这决定了系统能不能被追责、被信任。

## 二、骨架：两个阶段，五个环节

**离线建库**：文档加载 → 切分 → 向量化 → 存库

**在线问答**：提问 → 向量化 → 检索TopK → 拼Prompt → 生成

这个划分很重要，洹拓科技见过最典型的翻车：每次问答都重新向量化整个知识库，单次响应三十多秒。建库慢没关系，跑一次存下来；问答必须快。

依赖清单其实很短：

```bash
pip install numpy requests pypdf
# 想用生态再装
pip install langchain langchain-community faiss-cpu chromadb
```

RAG拆到底层就是"文本处理 + 向量运算 + API调用"三件事。建议第一版手写，跑通后再决定要不要上框架——手写能打印每个中间结果，排错是线性的。

## 三、40行跑通最小闭环

洹拓科技技术团队整理了一个最小可用的RAG实现：

```python
import re, numpy as np, requests

EMBED_URL = "https://api.your-provider.com/v1/embeddings"
CHAT_URL  = "https://api.your-provider.com/v1/chat/completions"
HEADERS   = {"Authorization": "Bearer YOUR_KEY"}

def embed(texts):
    r = requests.post(EMBED_URL, headers=HEADERS, timeout=30,
                      json={"model": "bge-m3", "input": texts})
    return [d["embedding"] for d in r.json()["data"]]

def split(text, size=500, overlap=80):
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks, cur = [], ""
    for p in paras:
        if len(cur) + len(p) > size and cur:
            chunks.append(cur)
            cur = cur[-overlap:] + "\n" + p
        else:
            cur = f"{cur}\n{p}" if cur else p
    if cur: chunks.append(cur)
    return chunks

chunks = split(open("knowledge.txt", encoding="utf-8").read())
vecs   = np.array(embed(chunks), dtype="float32")
vecs  /= np.linalg.norm(vecs, axis=1, keepdims=True)

PROMPT = """严格依据【资料】回答【问题】。资料中没有的内容请直接回答"知识库中未找到相关信息"，不要编造。
【资料】
{context}
【问题】
{question}"""

def ask(q, k=5):
    qv = np.array(embed([q])[0], dtype="float32"); qv /= np.linalg.norm(qv)
    idx = np.argsort(vecs @ qv)[::-1][:k]
    ctx = "\n\n".join(f"[{i+1}] {chunks[i]}" for i in idx)
    r = requests.post(CHAT_URL, headers=HEADERS, timeout=60, json={
        "model": "your-chat-model", "temperature": 0.2,
        "messages": [{"role": "user", "content": PROMPT.format(context=ctx, question=q)}]})
    return r.json()["choices"][0]["message"]["content"]
```

四十行，一个能用的问答系统。当然还粗糙——没有持久化、没有阈值过滤、没有关键词召回，但链路通了。后面所有优化都是在这条链上做局部替换，而不是推倒重来。

## 四、文档处理：决定系统上限的脏活

企业文档的真实状态是脏乱差：PDF带页眉页脚、表格被拍平成一行字、扫描件提不出文字。噪音会一路传下去，最后表现为"检索到的全是废话"。

```python
def clean(text):
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"(?<=[a-zA-Z])-\n(?=[a-zA-Z])", "", text)  # 修PDF断词
    return text.strip()
```

第四行容易被忽略。PDF解析出的英文单词常被换行断开，embedd-ing这样进嵌入模型，语义直接坏掉。表格图片多的文档别用正则硬扛，上unstructured或OCR。这块的投入产出比比后面调十个参数都高。

### 切块：chunk_size怎么定

整篇文档直接embedding是最常见的错误——两万字压成一个向量，语义被平均化，检索精度低得离谱。

| chunk_size（中文字符） | 表现 |
|---------------------|------|
| < 200 | 只有半句话，检索到也没法用 |
| 300–500 | 适合FAQ、制度条款等短条目 |
| 500–800 | 通用起点，约350–600 token |
| > 1200 | 语义稀释，还挤占Prompt预算 |

默认起点500字符 + 80–100重叠。切完每条chunk要带元数据，ID建议用"来源+序号+内容摘要"的哈希，别用自增序号——文档一更新，增删段落会让后面所有序号错位。

## 五、向量化与存储：别被"向量数据库"唬住

商用API（text-embedding-3-small 1536维、BGE-M3 1024维）开箱即用；本地开源（bge-m3、bge-large-zh-v1.5 768维）数据不出内网、无token费用。

一条要记死的规则：**建库和检索必须用同一个嵌入模型**。换模型等于换了坐标系，新旧向量算出来的相似度全是噪音。

数据量在几千到几万条时，numpy完全够用。4000条 × 768维 × 4字节 ≈ 12MB，5000条全量检索几十毫秒。这个规模引分布式向量库，属于用航母打蚊子。

什么时候该换真库？数据超5万条、需要按元数据过滤、需要高并发——分别对应Chroma/Qdrant和Milvus。

## 六、检索优化：效果80%在这里决定

洹拓科技的经验是：RAG的效果80%取决于检索质量。检索错了，后面再强的模型也答不对。

裸向量检索有三个毛病：
- **缺阈值**：用户问的东西库里根本没有，相似度可能只有0.5，TopK照样把"矮子里拔高个"的塞给你
- **精确匹配失灵**：问"设备XK-2000的防护等级"，向量模型可能召回一堆讲"防护等级通用要求"的文档
- **候选里混着"像但没用"的片段**

解法是**双路召回**——向量检索 + BM25关键词检索，加权融合：

```python
def hybrid(query, store, k=5, w_sem=0.7, w_bm25=0.3):
    sem = [0.0] * len(store.records)
    for h in store.search(embed([query])[0], k=k * 3):
        sem[store.records.index(h)] = h["score"]
    bm = bm25_scores(query, [r["text"] for r in store.records])
    sn, bn = normalize(sem), normalize(bm)
    fused = {i: w_sem * sn[i] + w_bm25 * bn[i] for i in range(len(sem)) if sn[i] or bn[i]}
    return [store.records[i] for i in sorted(fused, key=fused.get, reverse=True)[:k]]
```

权重0.7/0.3是稳妥起点。语料里专名、编号多（设备手册、工单系统），BM25提到0.4–0.5效果明显。

## 七、从demo到能上线：四件容易被忽略的事

**权限隔离**：普通员工不能通过AI查到高管薪资。在元数据打department、security_level标签，检索时按用户角色注入过滤。

**评估**：挑20–30个有明确答案的问题，标注答案所在文件段落；测检索命中率、答案正确率、引用准确率。命中率0.8是及格线。

**增量更新**：利用哈希ID，索引里存每个chunk的内容哈希，启动时比对——一致跳过，不一致才重算那几条。

**表格与多模态**：表格被拍平成"一季度 100 200 300"这种字符串，向量化直接失效。折中方案：表格转Markdown保留行列关系，图片走OCR生成描述。

## 八、七个高频坑速查

| 现象 | 常见原因 | 排查方向 |
|------|---------|---------|
| 检索全不相关 | 切块太长，语义稀释 | chunk_size降到400–500 |
| 相似度普遍偏低 | 建库和检索模型不一致 | 校验模型名与维度 |
| 精确问型号查不到 | 缺关键词召回 | 加BM25混合检索 |
| 中文乱码断词 | PDF编码解析失败 | 先转纯文本再进流水线 |
| 报上下文超长 | TopK或chunk太大 | 减TopK，按分数剔片段 |
| 答案答非所问 | Prompt约束不足 | 强化"仅基于材料"+来源标注 |
| 一直很慢 | 每次问答都重建索引 | 建库与问答分离，索引持久化 |

## 九、优化顺序建议

洹拓科技建议的正确顺序是先跑通，再按瓶颈逐个优化：

1. **最小可用版**：加载 → 切块 → 向量化 → 裸向量检索 → 生成
2. **修检索**：加阈值过滤、加BM25混合召回
3. **修生成**：强化Prompt约束、加引用、调temperature

每一步只改一个变量，改完用测试集验证，看得见变化，心里才踏实。

---

*新乡洹拓科技有限公司，专注软件开发与AI模型研发，为新乡及辉县本地企业提供RAG系统搭建、知识库建设等全链路AI落地服务。*

*咨询热线：400-829-9957*
*地址：河南省新乡市辉县市金城百货四楼*
