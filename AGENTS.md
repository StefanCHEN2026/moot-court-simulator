# 模拟法庭系统 — AGENTS.md

## 项目概览

多智能体交互式模拟法庭训练平台。系统运行法官 AI、对手 AI 和用户三个角色，在法官 AI 的流程调度下按真实法庭程序进行对抗性对话。

### 核心架构

- **通信架构**：消息总线（`SessionManager` 内的 emitSSE）+ 事件驱动，法官 AI 为中央调度者
- **案件类型**：民事 (civil)、刑事 (criminal)、国际仲裁 (arbitration) 三种模式
- **记忆架构**：三层独立记忆（工作记忆 / 案件记忆 / 策略记忆），Agent 间完全隔离
- **流程控制**：状态机驱动的庭审流程（开庭准备 → 法庭调查 → 举证质证 → 法庭辩论 → 最后陈述 → 调解 → 宣判）
- **实时通信**：SSE（Server-Sent Events）推送庭审消息流
- **模型接入**：统一的 OpenAI 兼容客户端，无平台绑定；支持 function calling 工具调用
- **配置层**：设置页面（`data/settings.json`）> 环境变量 > 默认值
- **法律检索（可选）**：接入法律数据库 MCP 后，Agent 可调用 `legal_search` 检索法条
- **存储**：本地文件系统，无数据库、无外部云服务依赖

### 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: Tailwind CSS 4 + shadcn/ui
- **LLM**: 任意 OpenAI 兼容接口（见 `src/lib/llm/client.ts`）
- **包管理**: pnpm

## 目录结构

```
src/
├── app/
│   ├── page.tsx                    # 庭前准备页
│   ├── courtroom/page.tsx          # 庭审现场页（核心）
│   ├── review/page.tsx             # 庭审复盘页
│   ├── settings/page.tsx           # 设置页（大模型 + 法律检索 MCP）
│   └── api/
│       ├── sessions/route.ts       # POST 创建 / GET 列表
│       ├── sessions/[sessionId]/
│       │   ├── route.ts            # GET 会话状态 / DELETE 删除
│       │   ├── stream/route.ts     # SSE 消息流
│       │   ├── documents/route.ts  # 案件文档上传
│       │   ├── image/route.ts      # 图片证据上传
│       │   ├── report/route.ts     # 庭审报告
│       │   └── pause|resume/       # 暂停 / 恢复
│       ├── messages/route.ts       # 用户消息 / 异议 / 申请发言
│       ├── files/[...key]/route.ts # 本地存储文件访问
│       ├── settings/route.ts       # 读取/保存设置
│       ├── settings/test/route.ts  # LLM / MCP 连通性测试
│       ├── laws/route.ts           # 法规条文（本地 JSON）
│       └── stats/route.ts          # 开庭次数统计
├── lib/
│   ├── llm/client.ts               # 大模型客户端（唯一模型出口，含工具调用回环）
│   ├── settings/                   # 设置读写与配置解析（含密钥掩码）
│   ├── mcp/                        # MCP HTTP 客户端 + 法律检索能力
│   ├── agents/
│   │   ├── base-agent.ts           # Agent 基类（LLM 调用、输出清洗、记忆）
│   │   ├── judge-agent.ts          # 法官 AI（流程调度、异议裁决、判决）
│   │   └── opponent-agent.ts       # 对手 AI（抗辩、策略记忆）
│   ├── court/
│   │   ├── session-manager.ts      # 会话管理器（Agent 协调、消息路由、SSE）
│   │   ├── state-machine.ts        # 庭审流程状态机
│   │   └── flow-definitions.ts     # 民事/刑事/仲裁流程定义
│   ├── memory/memory-store.ts      # 三层记忆管理器
│   ├── prompts/index.ts            # 系统 prompt（法官/对手）
│   ├── storage/index.ts            # 本地文件存储（保存/读取/data URL）
│   ├── data/                       # 预设案例、法规加载、统计
│   └── utils/
│       ├── document-parser.ts      # DOCX / PDF 文本提取
│       └── image-analyzer.ts       # 图片证据识图分析
└── types/court.ts                  # 核心类型定义

data/
├── laws/                           # 法规 JSON（domestic.json / arbitration.json）
├── uploads/                        # 运行时上传文件（gitignore）
└── stats.json                      # 运行时开庭次数（gitignore）
```

## 构建与运行命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 开发模式 (端口 5000)
pnpm build            # 构建
pnpm start            # 生产模式
pnpm ts-check         # TypeScript 类型检查
pnpm lint             # ESLint
pnpm validate         # ts-check + lint

# 本地无 Key 调试（详见 CONTRIBUTING.md）
pnpm dev:mock-llm     # mock 大模型服务
pnpm dev:mock-mcp     # mock 法律数据库 MCP
pnpm test:trial-flow  # 自动把一场庭审理到宣判并校验
```

## 核心数据流

1. 用户创建会话 → `SessionManager` 初始化 Agent + 状态机
2. 法官 AI 自动开场 → 通过消息总线发布消息 → SSE 推送到前端
3. 用户发言 → POST /api/messages → SessionManager 路由 → 法官 AI 判断 → 调度下一发言者
4. 对手 AI 发言 → 自动回应 → 法官 AI 推进流程
5. 阶段推进 → 状态机 advance → 法官宣读 → 继续下一阶段

## 编码规范

- 禁止隐式 any，所有函数参数必须有类型
- **模型调用只允许通过 `src/lib/llm/client.ts`**，禁止在业务代码中直接请求模型接口或硬编码模型名
- **模型配置只从 `src/lib/settings` 读取**，不要在业务代码里直接读 `process.env.LLM_*`
- **工具调用由 `client.ts` 的回环统一处理**，不要在 Agent 里手工拼装 tool_calls
- **MCP 交互统一走 `src/lib/mcp`**，且必须在未启用/失败时优雅退化
- **服务端发起外部请求前必须用 `src/lib/net/outbound-url.ts` 校验目标地址**
  （仅 http/https，拒绝本机与内网/保留地址），防止 SSRF
- **仅后端（API Routes / 服务端代码）可引入 `fs`、`path` 等 Node 模块**；客户端组件中禁止
- 文件上传/读取统一走 `src/lib/storage/`，不要在路由里直接操作磁盘
- 使用 Link 组件而非 <a> 标签进行页面导航
- 前端动态内容需 'use client' + useEffect/useState 避免 hydration 问题
- 颜色使用 globals.css 中的主题变量，禁止硬编码 Hex/RGB（详见 DESIGN.md）
- 同名交互元素请加 `data-testid`，便于自动化稳定定位

## 环境变量

见 `.env.example`。新增环境变量时同步更新 `.env.example` 与 README。

- `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` / `LLM_VISION_MODEL` / `LLM_TIMEOUT_MS`
- `UPLOAD_DIR` / `LAWS_DATA_DIR` / `STATS_FILE` / `PORT`

## 已知限制

- 会话存于进程内存（`globalThis`），重启即丢失，不支持多实例横向扩展
- 案件材料整体注入提示词，超长文档可能超出模型上下文
- 扫描版 PDF（无文本层）无法提取文字，需先 OCR
