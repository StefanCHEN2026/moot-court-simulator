# 模拟法庭（Moot Court Simulator）

多智能体交互式模拟法庭训练平台。由**法官 AI** 主持庭审流程，**对手 AI** 扮演对方当事人，用户扮演本方，三方按照真实的庭审程序进行对抗式辩论。

支持**民事 / 刑事 / 国际仲裁**三种庭审模式，覆盖开庭准备 → 法庭调查 → 举证质证 → 法庭辩论 → 最后陈述 → 宣判的完整流程。

> ⚠️ **免责声明**：本项目为教学与训练工具，案件均为虚构示例，AI 生成的一切内容**不构成法律意见**，不得用于真实诉讼决策。

---

## 功能特性

- **多智能体对抗**：法官 AI 负责流程调度与程序裁决，对手 AI 主动抗辩并维护策略记忆。
- **真实庭审流程**：状态机驱动，支持民事、刑事与国际仲裁三套流程定义。
- **三层记忆架构**：工作记忆 / 案件记忆 / 策略记忆，Agent 之间相互隔离。
- **实时消息流**：基于 SSE 推送庭审消息、阶段变更与发言权切换。
- **异议与发言申请**：用户可随时提出异议或申请发言，由法官 AI 裁决。
- **案件材料上传**：支持上传 DOCX / PDF 起诉状、答辩状、证据材料，自动提取文本并注入 AI 上下文。
- **图片证据与识图**：可上传图片证据，由多模态模型生成证据分析并注入双方记忆。
- **可插拔大模型**：在「设置」页面填写接口地址、密钥与模型，接入任意兼容 OpenAI 协议的服务。
- **可选的法律检索（MCP）**：接入法律数据库 MCP 后，法官与对手 AI 可调用 `legal_search` 检索法条原文，为发言与判决提供法律依据。
- **庭审复盘**：结束后生成结构化庭审报告与统计。

---

## 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | Next.js 16（App Router）+ React 19 |
| 语言 | TypeScript 5 |
| 样式 | Tailwind CSS v4 + shadcn/ui |
| 大模型 | 任意 OpenAI 兼容接口（默认 DeepSeek） |
| 文档解析 | mammoth（DOCX）、pdfjs-dist（PDF） |
| 存储 | 本地文件系统（默认），无外部依赖 |

---

## 快速开始

### 前置要求

- Node.js ≥ 20
- pnpm ≥ 9（推荐，仓库使用 pnpm 锁文件）

```bash
npm install -g pnpm
```

### 安装与运行

```bash
git clone <your-repo-url>
cd moot-court-simulator

pnpm install

# 配置大模型（二选一，推荐用设置页面）
cp .env.example .env.local     # 方式一：环境变量
# 方式二：启动后打开 /settings，在页面上填写并「保存设置」

pnpm dev          # 开发模式，http://localhost:5000
```

生产构建与启动：

```bash
pnpm build
pnpm start        # http://localhost:5000
```

代码检查：

```bash
pnpm ts-check     # TypeScript 类型检查
pnpm lint         # ESLint
pnpm validate     # 类型检查 + Lint
```

### 环境变量

完整清单见 [.env.example](.env.example)。核心项：

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `LLM_BASE_URL` | 否 | 兼容 OpenAI 的服务地址，默认 `https://api.deepseek.com/v1` |
| `LLM_API_KEY` | **是** | 大模型 API Key |
| `LLM_MODEL` | 否 | 文本模型，默认 `deepseek-chat` |
| `LLM_VISION_MODEL` | 否 | 多模态模型；不配置则图片证据不自动生成识图分析 |
| `LLM_TIMEOUT_MS` | 否 | 单次请求超时，默认 `60000` |
| `UPLOAD_DIR` | 否 | 上传文件目录，默认 `./data/uploads` |
| `LAWS_DATA_DIR` | 否 | 法规 JSON 目录，默认 `./data/laws` |
| `PORT` | 否 | 服务端口，默认 `5000` |

**接入其他模型示例**（任选其一，均为 OpenAI 兼容）：

```bash
# OpenAI
LLM_BASE_URL=https://api.openai.com/v1 ; LLM_MODEL=gpt-4o ; LLM_VISION_MODEL=gpt-4o-mini
# Moonshot
LLM_BASE_URL=https://api.moonshot.cn/v1 ; LLM_MODEL=moonshot-v1-32k
# 通义千问
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1 ; LLM_MODEL=qwen-plus
# 本地 Ollama（API Key 可随意填写）
LLM_BASE_URL=http://localhost:11434/v1 ; LLM_MODEL=llama3.1 ; LLM_API_KEY=ollama
```

> 配置优先级：**设置页面（`data/settings.json`）> 环境变量 > 内置默认值**。
> 页面上留空的字段会回退到环境变量，因此两种方式可以混用。

---

## 配置（设置页面）

打开 <http://localhost:5000/settings>，可在界面上配置并点「测试连接」验证：

### 大模型

接口地址、API Key、文本模型、识图模型、请求超时。密钥保存在服务端 `data/settings.json`（已 gitignore），**不会回传浏览器**，页面只显示掩码提示（如 `••••1234`）；留空表示不修改。

### 法律数据库检索（MCP，可选）

启用后，法官与对手 AI 在需要引用法条时会调用 `legal_search` 工具，把检索结果并入自己的上下文。要求服务端支持 **MCP 的 Streamable HTTP 传输（JSON-RPC 2.0）**。

| 字段 | 说明 |
| --- | --- |
| MCP 服务地址 | 例如 `https://your-host/mcp` |
| 请求头（JSON） | 选填，如 `{"Authorization": "Bearer xxx"}`；重新填写会整体覆盖，清空则删除 |
| 工具名 | 留空则使用服务返回的第一个工具 |
| 检索参数名 | 默认 `query`，留空会依据工具的 `inputSchema` 自动推断 |
| 每次发言最大检索次数 | 控制时延与调用量，默认 2 |

实现细节：启用后每个 Agent 的单次发言最多检索若干次，检索结果以纯文本并入该轮对话；关闭或连接失败时自动退化为普通对话，不产生额外开销、不影响庭审流程。

本地验证 MCP 链路（无需真实法律数据库）：

```bash
pnpm dev:mock-mcp        # 启动示例法律数据库 MCP（:3300）
# 设置页填写 http://localhost:3300/mcp 并启用，点「测试连接」应显示 search_law
```

---

## 目录结构

```
src/
├── app/
│   ├── page.tsx                     # 首页：选择案件、配置角色
│   ├── courtroom/page.tsx           # 庭审现场（核心界面）
│   ├── review/                      # 庭审复盘与报告
│   ├── settings/page.tsx            # 设置：大模型 + 法律检索 MCP
│   └── api/
│       ├── sessions/                # 创建 / 查询会话
│       │   └── [sessionId]/
│       │       ├── stream/          # SSE 消息流
│       │       ├── documents/       # 案件文档上传
│       │       ├── image/           # 图片证据上传
│       │       ├── report/          # 庭审报告
│       │       └── pause|resume/    # 暂停 / 恢复
│       ├── messages/                # 用户发言、异议、申请发言
│       ├── files/[...key]/          # 本地存储文件访问
│       ├── settings/                # 读取/保存设置、连通性测试
│       ├── laws/                    # 法规条文（本地 JSON）
│       └── stats/                   # 开庭次数统计
├── lib/
│   ├── llm/client.ts                # 大模型客户端（OpenAI 兼容 + 工具调用）
│   ├── settings/                    # 应用设置读写与配置解析
│   ├── mcp/                         # MCP 客户端与法律检索能力
│   ├── agents/                      # Agent 基类、法官 AI、对手 AI
│   ├── court/                       # 会话管理、状态机、流程定义
│   ├── memory/memory-store.ts       # 三层记忆
│   ├── prompts/index.ts             # 系统提示词
│   ├── storage/index.ts             # 本地文件存储
│   ├── data/                        # 预设案例、法规与统计加载
│   └── utils/                       # 文档解析、图片分析
└── types/court.ts                   # 核心类型定义

data/
├── laws/                            # 法规 JSON（见 data/laws/README.md）
├── settings.json                    # 运行时设置（含密钥，自动生成）
├── uploads/                         # 运行时上传文件（自动生成）
└── stats.json                       # 运行时开庭次数（自动生成）
```

---

## 架构说明

### 数据流

1. 用户创建会话 → `SessionManager` 初始化两个 Agent 与状态机。
2. 法官 AI 生成开庭公告 → 通过消息总线发布 → SSE 推送到前端。
3. 用户发言 → `POST /api/messages` → 会话管理器路由 → 法官 AI 判断 → 调度下一位发言者。
4. 轮到对手 AI 时自动生成抗辩 → 法官 AI 推进流程。
5. 进入终态 → 法官生成判决书 → 生成复盘报告。

### 核心模块

- **`lib/llm/client.ts`** — 唯一的模型出口。`chatCompletion()` 失败时抛错，`chat()` 捕获后返回可展示的提示文本，避免单次调用失败中断整场庭审。
- **`lib/court/state-machine.ts`** — 按阶段/子阶段/发言者序列推进，仲裁模式自动做角色映射。
- **`lib/court/session-manager.ts`** — Agent 协调、消息路由、SSE 广播、输出清洗。
- **`lib/memory/memory-store.ts`** — 工作记忆超限自动压缩为摘要；案件事实与策略笔记分别注入上下文。

### 已知限制

- **会话保存在内存中**（`globalThis`），服务重启后会话丢失，且**不支持多实例横向扩展**。如需持久化可将会话写入数据库或缓存。
- **上下文长度**：案件材料会整体注入提示词，上传超长文档可能超出模型上下文窗口。
- **PDF 提取**依赖 `pdfjs-dist` legacy 构建，扫描件（无文本层）无法提取文字。

---

## 常见问题

**界面显示「AI 回复生成失败：LLM_API_KEY 未配置」**
未配置模型密钥。按上文设置 `.env.local` 中的 `LLM_API_KEY` 后重启。

**「法律条文」面板是空的**
仓库不附带法规正文，见 [data/laws/README.md](data/laws/README.md) 自行填充，不影响庭审主流程。

**图片证据上传成功但没有 AI 分析**
未配置 `LLM_VISION_MODEL`（或该模型不支持图片输入）。

**上传 PDF 报错**
确认文件包含可选中文本；纯扫描件需先做 OCR。

**法律检索（MCP）没有生效**
到「设置」页面确认已勾选启用、地址无误，并用「测试连接」确认能列出工具；服务端需支持 MCP 的 HTTP（JSON-RPC）传输。关闭状态下不会产生任何 MCP 调用。

**改了设置但没生效**
设置保存在 `data/settings.json`，保存后立即生效（无需重启）；若同名字段在环境变量中也有配置，以设置页面为准。

---

## 部署

标准 Next.js 应用，可部署到任意支持 Node.js 的平台（Vercel、Docker、自有服务器）：

```bash
pnpm build && pnpm start
```

注意事项：

- **持久化**：`data/` 目录需挂载持久卷，否则重启后上传文件与统计数据丢失。
- **多实例**：由于会话存于进程内存，负载均衡多实例时需开启粘性会话，或改造会话存储。
- **反向代理**：SSE 需关闭响应缓冲（本项目已发送 `X-Accel-Buffering: no`）。

---

## 贡献

欢迎提交 Issue 与 Pull Request，请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 安全

报告安全问题请参阅 [SECURITY.md](SECURITY.md)。

## 许可证

[MIT](LICENSE)

## 致谢

- 界面组件基于 [shadcn/ui](https://ui.shadcn.com)
- 文档解析基于 [mammoth](https://github.com/mwilliamson/mammoth.js) 与 [pdfjs-dist](https://mozilla.github.io/pdf.js/)
