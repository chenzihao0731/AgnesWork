# AgnesWork

多模态桌面 AI 智能助手，基于 React + Electron 构建。支持对话聊天、图片生成、视频生成、本地文件读写、任务管理等功能。

## 功能特性

- **多轮对话**：与 AI 进行多轮自然语言对话
- **多模态生成**：调用 AI 生成图片和视频
- **本地文件操作**：在桌面端查看并读写本地工作目录中的文件
- **目标拆解**：切换「交给Agent」模式后，输入目标即可自动拆解里程碑
- **插件系统**：支持提示插件和 HTTP API 插件扩展
- **MCP 服务器**：接入外部工具服务器
- **多供应商支持**：支持 Agnes AI、OpenAI、DeepSeek、Ollama 及自定义 OpenAI 兼容服务
- **深色模式**：一键切换明暗主题

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 5 |
| 样式方案 | Tailwind CSS 3 |
| 桌面框架 | Electron 42 |
| 打包工具 | electron-builder |
| Markdown 渲染 | react-markdown + rehype-highlight |

## 项目结构

```
agnes-work/
├── src/                    # React 前端源码
│   ├── components/         # UI 组件
│   │   ├── Sidebar.tsx         侧边栏导航
│   │   ├── SettingsPanel.tsx   设置面板
│   │   ├── SkillsPanel.tsx     技能管理
│   │   ├── PluginsPanel.tsx    插件管理
│   │   ├── McPanel.tsx         MCP 服务器管理
│   │   ├── TodoPanel.tsx       待办事项
│   │   ├── RightPanel.tsx      右侧目标面板
│   │   ├── MessageBubble.tsx   消息气泡
│   │   ├── MarkdownRenderer.tsx Markdown 渲染
│   │   ├── FileTree.tsx        文件树
│   │   └── icons.tsx           SVG 图标集
│   ├── lib/                # 核心逻辑
│   │   ├── agent/              AI Agent 引擎
│   │   │   ├── agent.ts            对话循环
│   │   │   ├── tools.ts            工具注册
│   │   │   └── tools/              各工具实现
│   │   │       ├── filesystem.ts   文件读写
│   │   │       ├── media.ts        图片/视频生成
│   │   │       ├── websearch.ts    网页搜索
│   │   │       ├── goals.ts        目标管理
│   │   │       ├── todo.ts         待办管理
│   │   │       ├── plugin.ts       插件调用
│   │   │       ├── mcp.ts          MCP 工具
│   │   │       ├── browser.ts      浏览器工具
│   │   │       └── registry.ts     工具注册表
│   │   ├── api/                API 层
│   │   │   ├── agnes.ts            Agnes AI 客户端
│   │   │   ├── openai-provider.ts  OpenAI 兼容客户端
│   │   │   ├── provider.ts         供应商抽象
│   │   │   ├── fs.ts               文件系统 API
│   │   │   └── window.ts           窗口控制 API
│   │   └── storage/            本地存储
│   │       ├── config.ts           配置管理
│   │       ── extensions.ts       扩展存储
│   ├── App.tsx             # 主应用组件
│   ├── main.tsx            # 入口文件
│   └── styles.css          # 全局样式
├── electron/               # Electron 主进程
│   ├── main.cjs                主进程入口
│   └── preload.cjs             预加载脚本
├── public/                 # 静态资源
│   └── icons/                应用图标
── src-tauri/              # Tauri 配置（备用）
│   ├── icons/                Tauri 图标
│   ├── src/                  Rust 源码
│   ── tauri.conf.json       Tauri 配置
├── package.json            # 项目配置与依赖
├── tsconfig.json           # TypeScript 配置
├── vite.config.ts          # Vite 配置
├── tailwind.config.js      # Tailwind 配置
└── postcss.config.js       # PostCSS 配置
```

## 快速开始

### 环境要求

- **Node.js** >= 18
- **npm** >= 9

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

启动 Vite 开发服务器，默认访问 `http://localhost:5173`。

### 构建生产版本

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

### 打包为桌面应用

```bash
npm run electron:pack
```

打包为 Windows 便携版 exe，输出到 `release/` 目录。

### 完整流程（构建 + 打包）

```bash
npm run pack
```

等同于 `npm run electron:pack && move dist\*.exe AgnesWork.exe`。

## 编译说明

### 方式一：Electron 打包（推荐）

本项目使用 Electron 作为桌面运行时，打包流程如下：

```bash
# 1. 安装依赖
npm install

# 2. 构建前端
npm run build

# 3. 打包为 exe
npm run electron:pack
```

打包产物位于 `release/win-unpacked/` 目录，其中 `AgnesWork.exe` 为可执行文件。

### 方式二：Tauri 打包（备选）

项目同时包含 Tauri 配置，如需使用 Tauri 打包：

```bash
# 1. 安装 Rust 工具链（如未安装）
# 访问 https://rustup.rs/ 安装

# 2. 安装 Tauri CLI
npm install -g @tauri-apps/cli

# 3. 构建并打包
npm run tauri build
```

Tauri 打包产物位于 `src-tauri/target/release/bundle/` 目录。

### 打包原理

1. **前端构建**：Vite 将 React + TypeScript 源码编译为静态 HTML/CSS/JS，输出到 `dist/`
2. **Electron 打包**：electron-builder 将 `dist/` 和 `electron/` 目录打包为便携版 exe
3. **资源路径**：Electron 主进程通过 `resources/app/` 路径加载前端资源

### 注意事项

- API Key 仅保存在浏览器 localStorage 中，不会上传到任何服务器
- 打包后的 exe 为便携版，无需安装，双击即可运行
- 文件读写功能依赖 Electron 主进程的 IPC 通信

## 配置说明

### 多供应商配置

在设置面板中可选择不同的 AI 供应商：

| 供应商 | 默认 Base URL | 默认模型 | 需要 API Key |
|--------|--------------|---------|-------------|
| Agnes AI | 内置 | 内置 | 是 |
| OpenAI | https://api.openai.com/v1 | gpt-4o | 是 |
| DeepSeek | https://api.deepseek.com/v1 | deepseek-chat | 是 |
| Ollama | http://localhost:11434/v1 | llama3 | 否 |
| 自定义 | 手动填写 | 手动填写 | 是 |

### 高级设置

- **温度 (Temperature)**：控制输出随机性，0 = 精确，2.0 = 创意
- **最大输出长度 (Max Tokens)**：单次回复的最大 token 数
- **系统提示词 (System Prompt)**：自定义 AI 助手的角色设定

## License

MIT
