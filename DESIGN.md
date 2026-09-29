# 设计规范

庭审界面采用**暖白底 + 暗金主色**的低干扰配色，强调庄重、克制与内容优先。

所有颜色、圆角、字体均定义在 `src/app/globals.css` 的 `:root` / `.dark` 中，通过 Tailwind token 使用。

## 色彩

### 亮色（默认）

| 用途 | Token | 值 |
| --- | --- | --- |
| 页面底色 | `--background` | `#FAFAF7` |
| 正文文字 | `--foreground` | `#1A1A1A` |
| 卡片 / 弹层 | `--card` / `--popover` | `#FFFFFF` |
| 主色（暗金） | `--primary` | `#9A7B2D` |
| 主色浅底 | `--secondary` / `--accent` | `#F5ECD0` |
| 次级文字 | `--muted-foreground` | `#77736B` |
| 静音底 / 输入框 | `--muted` / `--input` | `#F0EDE6` |
| 警示 / 错误 | `--destructive` | `#C0392B` |
| 描边 | `--border` | `#E6E2DA` |
| 聚焦环 | `--ring` | `#9A7B2D` |

### 暗色

`.dark` 提供对应反色值（底 `#1A1A1A`、主色 `#D4A017`），组件无需额外适配。

### 扩展语义色

除 shadcn 标准 token 外，原型还定义了以下语义色，用于庭审场景的状态表达：

| Token | 值 | 用途 |
| --- | --- | --- |
| `--color-success` | `#4A7C59` | 异议成立、有利结果 |
| `--color-warning` | `#D4A017` | 提醒、待处理 |
| `--color-outline` | `#D4CFC5` | 强描边 |
| `--color-outline-variant` | `#E6E2DA` | 弱分隔线 |
| `--color-surface` | `#FFFFFF` | 面板底色 |
| `--color-surface-container` | `#F0EDE6` | 次级面板 |
| `--color-surface-container-high` | `#E8E4DB` | 悬停态 |
| `--color-on-surface` | `#1A1A1A` | 面板文字 |
| `--color-on-surface-variant` | `#77736B` | 面板次级文字 |
| `--color-primary-container` | `#F5ECD0` | 主色容器 |

## 字体

- 正文 / 界面：`--font-sans` —— Inter + Noto Sans SC / 苹方 / 微软雅黑
- 等宽（法条、编号）：`--font-mono`
- 衬线（判决书等正式文书）：`--font-serif` —— Noto Serif SC / 宋体

## 圆角与阴影

- 圆角统一使用 `--radius-*`（`sm` 0.25rem → `4xl` 1.5rem，`--radius` 默认 0.5rem）。
- 阴影使用 `--shadow-card` / `--shadow-float` / `--shadow-dialog` 三档，不要自造阴影值。

## 编写规则

1. **禁止硬编码颜色**。用 Tailwind token（如 `bg-background`、`text-muted-foreground`、`border-border`）或 `var(--...)`。
2. **优先复用 `src/components/ui/` 下的 shadcn 组件**，不要重复实现基础控件。
3. 合并类名统一用 `cn()`（`src/lib/utils.ts`）。
4. 新增语义色请加到 `globals.css` 的 `@theme inline` 与 `:root` / `.dark`，而不是散落在组件里。
