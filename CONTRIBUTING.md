# 贡献指南

感谢参与本项目！提交前请阅读以下约定。

## 开发环境

```bash
pnpm install
cp .env.example .env.local   # 填写 LLM_API_KEY
pnpm dev                     # http://localhost:5000
```

## 提交前自检

所有 PR 必须通过：

```bash
pnpm ts-check   # TypeScript 类型检查
pnpm lint       # ESLint
pnpm build      # 生产构建
```

也可以一次跑完：`pnpm validate`。

## 代码规范

- **TypeScript 严格模式**，禁止隐式 `any`；ESLint 的 `no-explicit-any` 为错误级别。
- **大模型调用只能走 `src/lib/llm/client.ts`**，不要在业务代码里直接 `fetch` 模型接口或硬编码模型名。
- **不要在服务端组件/路由之外引入 Node 专属模块**（`fs`、`path` 等），客户端组件中尤其禁止。
- **颜色一律使用 `globals.css` 中的主题变量或 Tailwind token**，禁止硬编码十六进制/RGB。详见 [DESIGN.md](DESIGN.md)。
- **页面跳转使用 `next/link`**，不要用裸 `<a>`。
- 新增环境变量必须同时更新 `.env.example` 与 README 的环境变量表。

## 目录约定

| 目录 | 用途 |
| --- | --- |
| `src/lib/llm/` | 模型接入，唯一的模型出口 |
| `src/lib/settings/` | 应用设置读写与配置解析（settings > env > 默认） |
| `src/lib/mcp/` | MCP 客户端与法律检索能力 |
| `src/lib/agents/` | Agent 角色实现 |
| `src/lib/court/` | 庭审状态机与会话管理 |
| `src/lib/storage/` | 文件存储 |
| `src/lib/data/` | 预设案例、法规、统计等数据加载 |
| `src/app/api/` | HTTP 接口，仅做校验与编排，业务逻辑放 `lib/` |
| `scripts/dev/` | 本地开发辅助脚本（mock 模型、mock MCP、流程回归） |

## 无 API Key 调试庭审流程

`scripts/dev/` 提供了一套不依赖真实模型与真实法律数据库的调试工具，改完流程/状态机/工具链后**务必**跑一遍回归——历史上曾出现「特定角色下判决无法产出且会话损坏」的问题，就是靠它复现的。

```bash
# 终端 1：启动 mock 模型（OpenAI 兼容）
pnpm dev:mock-llm

# 终端 2：把应用指向 mock 模型并启动
# 注意 ALLOW_PRIVATE_ENDPOINTS=true —— 出站地址默认禁止指向本机，本地调试需放行
ALLOW_PRIVATE_ENDPOINTS=true \
LLM_BASE_URL=http://localhost:3200/v1 LLM_API_KEY=test LLM_MODEL=mock pnpm dev

# 终端 3：自动把一场庭审理到宣判，检查是否产出判决、是否报错
pnpm test:trial-flow
CASE_TYPE=criminal ROLE=defendant pnpm test:trial-flow
CASE_TYPE=arbitration ROLE=claimant pnpm test:trial-flow
```

脚本退出码非 0 表示流程异常（未走完、判决条数不为 1、接口报错或会话不可读）。**改动 `src/lib/court/` 或流程定义时，请覆盖民事/刑事/仲裁三种模式与双方角色。**

### 验证法律检索（MCP）

```bash
# 终端 1：示例法律数据库 MCP
pnpm dev:mock-mcp

# 终端 2：让 mock 模型主动发起工具调用
MOCK_TOOL_CALL=1 pnpm dev:mock-llm

# 终端 3：应用（同样需要放行本机地址）；然后在 /settings 启用 MCP 并填 http://localhost:3300/mcp
ALLOW_PRIVATE_ENDPOINTS=true pnpm dev
pnpm test:trial-flow
```

若链路正常，庭审消息里会出现 `【已检索法条】…` 前缀，`mock-mcp` 日志也会打印 `tools/call`。

## 前端约定

- 同一页面存在多个同名按钮时，为需要自动化定位的元素加 `data-testid`（如设置页的 `test-llm` / `test-mcp`），便于用 `getByTestId` 稳定定位，避免依赖位置或文案。


## 提交信息

使用语义化前缀，例如：

```
feat: 支持刑事案件的量刑情节记忆
fix: 修正仲裁模式下的发言权判定
docs: 补充 S3 存储接入说明
refactor: 抽取阶段推进的公共循环
```

## 新增一个 AI 角色或庭审流程

1. 在 `src/lib/court/flow-definitions.ts` 定义阶段与发言者序列。
2. 在 `src/lib/prompts/index.ts` 增加对应系统提示词。
3. 如涉及新角色，在 `src/types/court.ts` 扩展 `RoleId` 并处理角色标签映射。

## 关于数据与版权

- 请勿提交第三方享有版权的材料（学术论文、书籍扫描件、商业数据库导出等）。
- 新增示例案件请使用虚构事实，并确认所用图片可自由分发。
- 法规文本请以官方发布版本为准，并遵守数据来源的使用条款。
