# Atoms - AI 代码生成平台 技术文档

## 1. 项目概述

### 1.1 项目定位

Atoms 是一个 AI 驱动的代码生成与开发协作平台。用户可以通过自然语言描述需求，由 AI Agent 自动规划、生成完整的前端项目代码，并在浏览器内的 WebContainer 中实时预览运行效果。

核心能力：
- **AI 对话驱动**：通过与多角色 AI Agent 对话，自动生成可运行的前端项目
- **三阶段编排器**：规划 → 生成 → 验证，确保项目完整性
- **浏览器内运行**：基于 WebContainer 技术，在浏览器中安装依赖、编译和运行项目
- **项目持久化**：对话历史、生成的文件均保存到数据库，支持后续继续编辑

### 1.2 技术栈选型

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router) | 16.2.10 |
| 前端 | React | 19.2.4 |
| 语言 | TypeScript | ^5 |
| 样式 | Tailwind CSS | ^4 |
| 状态管理 | Zustand | ^5.0.14 |
| 代码编辑器 | Monaco Editor (@monaco-editor/react) | ^4.7.0 |
| 浏览器运行时 | @webcontainer/api | ^1.6.4 |
| 数据库 ORM | Prisma | ^5.22.0 |
| 数据库 | SQLite | - |
| 认证 | NextAuth v5 (Beta) | 5.0.0-beta.31 |
| LLM SDK | OpenAI SDK | ^6.45.0 |
| UI 组件 | Shadcn/ui (via Base UI) | ^1.6.0 |
| Markdown | react-markdown + remark-gfm | ^10.1.0 |
| 图标 | Lucide React | ^1.23.0 |

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Dashboard   │  │    Workspace     │  │   Auth Pages     │  │
│  │  - Agents    │  │  ┌────┐ ┌─────┐  │  │  - Login         │  │
│  │  - Input     │  │  │Chat│ │Code │  │  │  - Register      │  │
│  │  - Projects  │  │  │    │ │Editor│  │  │                  │  │
│  └──────────────┘  │  │    │ │     │  │  └──────────────────┘  │
│                     │  │    │ ├─────┤  │                        │
│                     │  │    │ │Files│  │                        │
│                     │  │    │ ├─────┤  │                        │
│                     │  │    │ │ App │  │                        │
│                     │  │    │ │Preview│ │                        │
│                     │  └────┘ └─────┘  │                        │
│                     └──────────────────┘                        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Zustand State Management                     │   │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────────┐            │   │
│  │  │ChatStore│  │FileStore │  │ProjectStore │            │   │
│  │  └─────────┘  └──────────┘  └─────────────┘            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              WebContainer (Browser Runtime)                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐          │   │
│  │  │npm install│  │Dev Server│  │Static Server │          │   │
│  │  └──────────┘  └──────────┘  └──────────────┘          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                     Next.js API Routes                            │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ /api/chat    │  │/api/projects │  │/api/auth           │    │
│  │ (SSE Stream) │  │  (CRUD)      │  │(NextAuth handlers) │    │
│  └──────┬───────┘  └──────┬───────┘  └────────────────────┘    │
│         │                  │                                     │
├─────────┼──────────────────┼─────────────────────────────────────┤
│         │                  │          Server Layer               │
│  ┌──────▼───────┐  ┌──────▼───────┐                            │
│  │ OpenAI SDK   │  │  Prisma ORM  │                            │
│  │ (LLM Client) │  │  (SQLite DB) │                            │
│  └──────┬───────┘  └──────────────┘                            │
│         │                                                        │
└─────────┼────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────┐
│  LLM Provider    │
│  - OpenRouter    │
│  - SiliconFlow   │
│  - OpenAI        │
└──────────────────┘
```

### 2.2 核心模块关系

```
用户输入 → Dashboard/CreativeInput
    ↓ 创建项目 (POST /api/projects)
    ↓ 跳转 Workspace
    ↓
Workspace/ChatPanel
    ↓ 检测项目请求 (detectProjectRequest)
    ├─ 是: Orchestrator (三阶段)
    │     ├─ Phase 1: /api/chat?mode=plan → 规划文件列表
    │     ├─ Phase 2: /api/chat?mode=generate-file → 逐文件生成
    │     └─ Phase 3: 验证 + 补全
    └─ 否: Stream Chat → /api/chat (SSE)
              ↓ 解析 AI 响应 (parser.ts)
              ↓ 提取 file_operation → FileStore
              ↓ 自动续写检测 (detectIncomplete)
              ↓ 保存到 DB (/api/projects/:id/files)
```

---

## 3. 目录结构

```
src/
├── app/                          # Next.js App Router 页面
│   ├── api/                      # API 路由
│   │   ├── auth/[...nextauth]/   # NextAuth 认证端点
│   │   ├── chat/route.ts         # AI 对话 API（SSE 流式 + 非流式）
│   │   └── projects/             # 项目 CRUD API
│   │       ├── route.ts          # GET 列表 / POST 创建
│   │       └── [id]/
│   │           ├── route.ts      # GET/PUT/DELETE 单项目
│   │           ├── files/route.ts    # GET/POST 项目文件
│   │           └── messages/route.ts # GET/POST 聊天消息
│   ├── auth/                     # 认证页面
│   │   ├── login/page.tsx        # 登录页
│   │   └── register/page.tsx     # 注册页
│   ├── dashboard/page.tsx        # Dashboard 首页
│   ├── workspace/[id]/page.tsx   # 工作区页面
│   ├── layout.tsx                # 根布局
│   ├── page.tsx                  # 首页（重定向）
│   └── globals.css               # 全局样式
│
├── components/                   # React 组件
│   ├── dashboard/                # Dashboard 页面组件
│   │   ├── AgentShowcase.tsx     # AI Agent 展示区
│   │   ├── CreativeInput.tsx     # 创意输入框（项目入口）
│   │   └── ProjectGrid.tsx       # 项目网格（发现/我的项目/模板）
│   ├── layout/                   # 布局组件
│   │   ├── Header.tsx            # 顶部导航
│   │   └── Sidebar.tsx           # 侧边栏（导航+最近项目）
│   ├── ui/                       # Shadcn/ui 基础组件
│   │   ├── button.tsx, card.tsx, input.tsx, tabs.tsx ...
│   │   └── (共 11 个 UI 基础组件)
│   └── workspace/                # 工作区组件
│       ├── ChatPanel.tsx         # AI 对话面板（核心，745 行）
│       ├── CodeEditor.tsx        # Monaco 代码编辑器
│       ├── FileExplorer.tsx      # 文件浏览器
│       ├── AppPreview.tsx        # WebContainer 应用预览
│       └── WorkspaceTabs.tsx     # 工作区标签切换
│
├── lib/                          # 核心库
│   ├── ai/                       # AI 集成层
│   │   ├── client.ts             # OpenAI SDK 客户端封装
│   │   ├── agents.ts             # AI Agent 角色定义
│   │   ├── orchestrator.ts       # 三阶段编排器
│   │   ├── parser.ts             # AI 响应解析器
│   │   └── prompts.ts            # System Prompt 模板
│   ├── store/                    # Zustand 状态管理
│   │   ├── chat-store.ts         # 聊天消息状态
│   │   ├── file-store.ts         # 文件系统状态
│   │   └── project-store.ts      # 项目状态
│   ├── webcontainer/             # WebContainer 集成
│   │   └── instance.ts           # 实例管理与操作
│   ├── auth.ts                   # NextAuth 配置
│   ├── prisma.ts                 # Prisma 客户端实例
│   └── utils.ts                  # 工具函数 (cn)
│
├── types/
│   └── next-auth.d.ts            # NextAuth 类型扩展
│
└── middleware.ts                 # 路由中间件（认证守卫）

prisma/
├── schema.prisma                 # 数据库模型定义
└── dev.db                        # SQLite 数据库文件
```

---

## 4. 核心功能模块

### 4.1 AI 对话与代码生成

#### 4.1.1 双模式架构

系统支持两种 AI 交互模式：

1. **流式对话模式（Stream Chat）**：适用于普通对话和单文件修改
2. **三阶段编排器模式（Orchestrator）**：适用于从零创建完整项目

模式选择逻辑在 `ChatPanel.tsx` 中通过 `detectProjectRequest()` 函数判断：

```typescript
// 关键词匹配判断是否为项目创建请求
const keywords = ['创建', '写一个', '开发', '做一个', '生成', 'create', 'build', ...]
```

#### 4.1.2 三阶段编排器（orchestrator.ts）

**Phase 1 - Planning（规划阶段）**
- 调用 `/api/chat?mode=plan`
- System Prompt：`PLANNING_SYSTEM_PROMPT`（项目架构师角色）
- 输出格式：JSON `{ projectType, files: [{ path, description }] }`
- 支持项目类型：`react-vite` | `html-css-js` | `vue-vite` | `nextjs`

**Phase 2 - Building（生成阶段）**
- 逐文件调用 `/api/chat?mode=generate-file`
- System Prompt：`BUILDER_SYSTEM_PROMPT`（高级前端工程师角色）
- 每个文件独立生成，携带上下文（已生成文件列表）
- 内容验证 `isValidCodeContent()`：检查长度、拒绝标记、文件类型特征
- 失败重试：最多 3 次（`MAX_RETRIES`），重试间隔 1 秒

**Phase 3 - Verification（验证阶段）**
- 检查所有规划文件是否已成功生成
- 验证内容质量（非空、非拒绝响应、符合文件类型特征）
- 对缺失/无效文件进行补全生成

#### 4.1.3 AI Agent 角色系统（agents.ts）

系统定义了 8 个专业 Agent：

| Agent | 角色 | 职责 |
|-------|------|------|
| Alex | 工程师 | 编写代码（默认 Agent） |
| Emma | 产品经理 | 需求梳理、产品设计 |
| Bob | 架构师 | 系统架构设计 |
| Sarah | SEO 专家 | 搜索引擎优化 |
| Mike | 团队领导 | 任务分解与协调 |
| David | 数据分析师 | 数据分析与可视化 |
| Adrian | 广告专家 | 营销策略 |
| Iris | 深度研究员 | 调研分析 |

每个 Agent 共享统一的 **文件操作指令格式**（`FILE_OPERATION_INSTRUCTIONS`）。

#### 4.1.4 文件操作解析器（parser.ts）

解析 AI 响应中的结构化标签，提取：

- **文件操作**：`<file_operation><action>create</action><path>...</path><content>...</content></file_operation>`
- **步骤**：`<step>步骤描述</step>`
- **建议**：`<suggestions>建议1\n建议2</suggestions>`

解析策略（容错设计，按优先级尝试）：
1. **Strategy 1**：标准格式（完整闭合标签）
2. **Strategy 2**：缺少 `</file_operation>` 闭合标签
3. **Strategy 3**：内联压缩格式

#### 4.1.5 代码质量验证

`isValidCodeContent()` 函数根据文件类型进行验证：

- **通用检查**：内容长度 ≥ 20 字符，无安全拒绝标记
- **JS/TS 文件**：包含 `import`/`export`/`const`/`function` 等关键字
- **JSON 文件**：以 `{` 或 `[` 开头
- **HTML 文件**：包含 `<` 和 `>`
- **CSS 文件**：包含 `{` 和 `}`

#### 4.1.6 自动续写机制（ChatPanel.tsx）

当 AI 响应被截断时，自动检测并发送续写请求：

- **最大续写次数**：3 次（`MAX_AUTO_CONTINUES`）
- **检测信号**：
  1. 未闭合的 `<file_operation>` 标签
  2. 未闭合的 `<content>` 标签
  3. 未闭合的 `<action>` 或 `<path>` 标签
  4. AI 明确表示将继续生成（关键词匹配）
- **终止条件**：AI 提供了 `<suggestions>` 表示任务完成

---

### 4.2 工作区

#### 4.2.1 工作区布局（workspace/[id]/page.tsx）

- **顶部栏**：项目名称（可编辑）、面板控制、分享/发布按钮
- **左面板**：ChatPanel（AI 对话），宽度可拖拽调整（280-600px）
- **右面板**：WorkspaceTabs（编辑器/文件/预览/更多）

进入工作区时自动加载持久化数据：
1. 项目信息 → `GET /api/projects/:id`
2. 聊天消息 → `GET /api/projects/:id/messages`
3. 项目文件 → `GET /api/projects/:id/files` → 重建文件树

#### 4.2.2 代码编辑器（CodeEditor.tsx）

- 基于 Monaco Editor（动态导入，禁用 SSR）
- 文件树浏览器（左侧）+ 编辑器面板（右侧）
- 支持操作：文件/文件夹创建、删除、重命名
- 语言检测：根据文件扩展名自动设置语法高亮
- 文件标签页管理

#### 4.2.3 文件系统管理（FileExplorer.tsx）

- 树形文件浏览器，支持展开/折叠目录
- 文件图标根据扩展名差异化显示（TSX=⚛️, TS=蓝色标签, CSS=🎨 等）
- 右键上下文菜单

#### 4.2.4 应用预览（AppPreview.tsx + WebContainer）

**项目类型自动检测**：
- 有 `package.json` → Node 项目流程（npm install + npm run dev）
- 有 `index.html` 无 `package.json` → 静态项目流程（注入 Node.js 静态服务器）

**WebContainer 工作流**：
```
Boot WebContainer → Mount Files → Install Dependencies → Start Dev Server → iframe 预览
```

**静态服务器**：对于纯 HTML/CSS/JS 项目，自动注入 `__server.js`（基于 Node.js http 模块），支持 MIME 类型识别和 SPA fallback。

**状态管理**：idle → installing → compiling → running | error

**COOP/COEP 头**（next.config.ts）：
```
Cross-Origin-Embedder-Policy: credentialless
Cross-Origin-Opener-Policy: same-origin
```
WebContainer 需要这些 HTTP 头才能正常工作。

---

### 4.3 用户系统

#### 4.3.1 NextAuth 认证（auth.ts）

- **Provider**：Credentials（邮箱 + 密码）
- **Session 策略**：JWT
- **密码存储**：明文比对（开发阶段，生产环境需替换为 bcrypt）
- **回调**：session 中注入 user.id

#### 4.3.2 路由中间件（middleware.ts）

```
未登录用户 → 重定向到 /auth/login
已登录用户访问 /auth/* → 重定向到 /dashboard
放行路由：/api/auth/*, /api/chat, /_next/static, favicon.ico
```

#### 4.3.3 项目 CRUD

- 项目创建：Dashboard 输入框提交时自动创建
- 项目归属：所有操作验证 `userId` 确保数据隔离
- 级联删除：删除项目时自动清理关联的消息和文件（Prisma `onDelete: Cascade`）

#### 4.3.4 数据持久化

- **消息保存**：对话完成后异步保存到 `ChatMessage` 表
- **文件保存**：AI 生成文件后异步 upsert 到 `ProjectFile` 表
- **非阻塞设计**：保存失败不影响用户体验

---

### 4.4 Dashboard

#### 4.4.1 布局与导航

- **Sidebar**（240px 固定宽度）：
  - 品牌标识 "Atoms"
  - 导航菜单（首页、资源、我的项目）
  - 最近项目列表（最多 3 个）
  - 底部推广区

- **主内容区**：
  - Agent 展示区（8 个角色头像）
  - 创意输入框（项目创建入口）
  - 项目网格（发现/我的项目/模板 三标签）

#### 4.4.2 项目创建流程

```
用户输入描述 → POST /api/projects → 获取 project.id
→ router.push(`/workspace/${id}?prompt=...`)
→ 工作区接收 initialPrompt → 自动触发 AI 生成
```

---

## 5. API 设计

### 5.1 路由列表

| 方法 | 路由 | 功能 | 认证 |
|------|------|------|------|
| POST | `/api/chat` | AI 对话（支持 3 种模式） | 否 |
| GET | `/api/projects` | 获取当前用户项目列表 | 是 |
| POST | `/api/projects` | 创建新项目 | 是 |
| GET | `/api/projects/[id]` | 获取项目详情（含文件和消息） | 是 |
| PUT | `/api/projects/[id]` | 更新项目名称/描述 | 是 |
| DELETE | `/api/projects/[id]` | 删除项目 | 是 |
| GET | `/api/projects/[id]/files` | 获取项目文件列表 | 是 |
| POST | `/api/projects/[id]/files` | 批量创建/更新文件 | 是 |
| GET | `/api/projects/[id]/messages` | 获取对话消息列表 | 是 |
| POST | `/api/projects/[id]/messages` | 保存对话消息 | 是 |
| * | `/api/auth/[...nextauth]` | NextAuth 认证端点 | 否 |

### 5.2 Chat API 详细说明

`POST /api/chat` 支持三种模式（通过 `mode` 字段区分）：

**模式 1：流式对话（默认）**
```json
{
  "messages": [{ "role": "user", "content": "..." }],
  "agentId": "alex"
}
```
响应：SSE 流（`text/event-stream`）
```
data: {"text": "chunk..."}
data: {"text": "chunk..."}
data: [DONE]
```

**模式 2：项目规划**
```json
{
  "mode": "plan",
  "messages": [{ "role": "user", "content": "用户需求" }]
}
```
响应：JSON `{ "content": "{...JSON plan...}" }`

**模式 3：文件生成**
```json
{
  "mode": "generate-file",
  "messages": [{ "role": "user", "content": "文件生成 prompt" }]
}
```
响应：JSON `{ "content": "文件内容" }`

---

## 6. 数据模型

### 6.1 Prisma Schema

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model User {
  id        String    @id @default(cuid())
  name      String?
  email     String    @unique
  password  String
  avatar    String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  projects  Project[]
}

model Project {
  id          String        @id @default(cuid())
  name        String
  description String?
  userId      String
  user        User          @relation(fields: [userId], references: [id])
  views       Int           @default(0)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  messages    ChatMessage[]
  files       ProjectFile[]
}

model ChatMessage {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  role      String   // "user" | "assistant"
  content   String
  agent     String?  // Agent 名称（如 "Alex"）
  agentRole String?  // Agent 角色（如 "工程师"）
  steps     String?  // JSON 字符串，存储步骤数组
  createdAt DateTime @default(now())
}

model ProjectFile {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  path      String   // 相对于项目根的文件路径
  content   String   // 文件内容
  size      Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([projectId, path])  // 同项目内文件路径唯一
}
```

### 6.2 实体关系

```
User 1:N Project 1:N ChatMessage
                  1:N ProjectFile
```

---

## 7. 状态管理

### 7.1 Chat Store（chat-store.ts）

管理 AI 对话状态：

```typescript
interface ChatStore {
  messages: ChatMessage[]        // 当前对话消息列表
  isLoading: boolean             // 是否正在等待 AI 响应
  currentAgentId: string         // 当前选中的 Agent（默认 'alex'）
  addMessage: (msg) => void
  updateMessage: (id, partial) => void
  appendToMessage: (id, text) => void
  setLoading: (loading) => void
  setMessages: (messages) => void
  clearMessages: () => void
  setCurrentAgentId: (id) => void
}
```

### 7.2 File Store（file-store.ts）

管理工作区文件系统：

```typescript
interface FileStore {
  files: FileNode[]              // 文件树根节点列表
  activeFile: string | null      // 当前打开的文件路径
  openFiles: string[]            // 标签页中打开的文件列表
  initialized: boolean           // 是否已初始化
  expandedDirs: Set<string>      // 展开的目录集合
  
  // 核心操作
  addFileByPath: (path, content) => void  // AI 生成文件时调用
  updateFileContent: (path, content) => void
  createFile: (parentPath, name, type) => void
  deleteFile: (path) => void
  getFileContent: (path) => string | undefined
  // ... 其他操作
}
```

`FileNode` 数据结构：
```typescript
interface FileNode {
  name: string          // 文件/目录名
  path: string          // 完整相对路径
  type: 'file' | 'directory'
  content?: string      // 文件内容
  children?: FileNode[] // 子节点（目录）
  size?: number
}
```

`addFileByPath` 是关键方法，AI 生成文件时：
- 自动创建中间目录
- 自动展开父目录
- 自动激活新文件

### 7.3 Project Store（project-store.ts）

管理项目元数据：

```typescript
interface ProjectStore {
  projects: Project[]
  currentProject: Project | null
  setProjects: (projects) => void
  setCurrentProject: (project) => void
  addProject: (project) => void
}
```

---

## 8. LLM 集成

### 8.1 客户端封装（client.ts）

基于 OpenAI SDK，通过 `baseURL` 配置支持多种 LLM 提供商：

```typescript
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1',
  maxRetries: 3,
  timeout: 60000,
  defaultHeaders: {
    'Referer': process.env.NEXTAUTH_URL,
    'X-Title': 'Atoms',
  },
})
```

提供两个核心方法：
- `chatCompletion()`：非流式调用（用于规划和文件生成）
- `streamChatCompletion()`：流式调用（用于对话）

### 8.2 多模型支持

通过环境变量切换，无需改代码：

| 方案 | BASE_URL | MODEL | 特点 |
|------|----------|-------|------|
| OpenRouter 免费 | `openrouter.ai/api/v1` | `openrouter/free` | 免费，适合开发测试 |
| SiliconFlow | `api.siliconflow.cn/v1` | `deepseek-ai/DeepSeek-V3` | 国内推荐，性价比高 |
| OpenAI 直连 | `api.openai.com/v1` | `gpt-4o` | 质量最好，成本高 |

### 8.3 Mock 模式

当 `OPENAI_API_KEY` 未配置时，自动降级为 Mock 模式：
- `mockPlanResponse()`：根据用户输入生成模拟项目规划
- `mockGenerateFileResponse()`：根据文件名生成模拟代码
- `mockStreamResponse()`：模拟流式对话，包含文件操作示例

Mock 模式支持完整的功能演示，无需真实 API Key。

### 8.4 错误处理

`extractErrorInfo()` 函数提供：
- 错误信息提取（支持 OpenRouter 嵌套错误格式）
- HTTP 状态码识别
- 可重试判断（429/502/503 为可重试错误）

---

## 9. 部署与运行

### 9.1 本地开发

```bash
# 安装依赖
pnpm install

# 初始化数据库
npx prisma db push

# 启动开发服务器
pnpm dev
```

访问 http://localhost:3000

### 9.2 环境变量

创建 `.env` 文件（参考 `.env.example`）：

```bash
# LLM 配置（必需）
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=openrouter/free

# 数据库（默认 SQLite）
DATABASE_URL="file:./prisma/dev.db"

# NextAuth（必需）
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 9.3 构建与部署

```bash
# 构建生产版本
pnpm build

# 启动生产服务
pnpm start
```

**注意事项**：
- WebContainer 需要 COOP/COEP 响应头（已在 `next.config.ts` 中配置）
- WebContainer 仅支持 Chromium 内核浏览器
- 生产环境需将 SQLite 替换为 PostgreSQL/MySQL
- 生产环境需对密码进行哈希加密（bcrypt）

---

## 10. 已知限制与未来规划

### 10.1 当前限制

1. **密码安全**：当前为明文存储和比对，需引入 bcrypt 加密
2. **数据库**：使用 SQLite，不适合多实例部署
3. **文件协作**：不支持多人实时协作编辑
4. **浏览器兼容**：WebContainer 仅支持 Chromium 系列浏览器
5. **项目类型**：主要支持前端项目（React/Vue/HTML），后端项目支持有限
6. **模板系统**：模板库功能尚未实现（UI 已准备，数据层待开发）
7. **资源页**：侧边栏"资源"入口尚未实现
8. **Agent 切换**：UI 上 Agent 切换功能已预留，完整交互待实现

### 10.2 未来规划

- 接入更多 LLM 模型（Claude、Gemini）
- 实现项目模板库
- 支持后端项目生成（Node.js/Python）
- 添加实时协作功能
- 支持项目发布/分享（Public URL）
- 引入 Git 版本管理
- 添加代码执行沙箱（非 WebContainer 方案）
- 国际化支持
