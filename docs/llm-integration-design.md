# AI 代码生成 - LLM 集成设计文档

## 项目背景

本项目是 Atoms.dev 的复刻，核心功能是 AI 驱动的代码生成。用户通过自然语言与 AI Agent 对话，AI 生成代码并在浏览器中实时预览。

## 当前架构

- **API 路由**: `src/app/api/chat/route.ts` - SSE 流式对话接口
- **AI 客户端**: `src/lib/ai/client.ts` - OpenAI 兼容客户端封装
- **Agent 系统**: `src/lib/ai/agents.ts` - 8 个 Agent 角色定义
- **回复解析**: `src/lib/ai/parser.ts` - 解析 file_operation/step/suggestions 标签
- **Mock 模式**: 无 API Key 时自动降级为模拟响应

## 通信协议

AI 回复使用 XML 标签结构化输出：

- `<step>步骤描述</step>` - 进度指示
- `<file_operation><action>create</action><path>...</path><content>...</content></file_operation>` - 文件操作
- `<suggestions>建议1\n建议2</suggestions>` - 后续建议

## LLM 方案对比

### 方案 1：OpenRouter 免费方案（当前使用）

| 项目 | 详情 |
|------|------|
| 提供商 | OpenRouter |
| 模型 | qwen/qwen3-coder:free |
| 价格 | 免费（轮转模式） |
| 接入方式 | OpenAI 兼容 API |
| Base URL | https://openrouter.ai/api/v1 |
| 适用场景 | 开发测试、功能验证 |

优点：零成本、一个 Key 切换 400+ 模型、无需改代码
缺点：免费模型可能有速率限制、质量不如付费模型

### 方案 2：DeepSeek V3.2 + SiliconFlow（国内推荐）

| 项目 | 详情 |
|------|------|
| 提供商 | SiliconFlow / DeepSeek |
| 模型 | deepseek-ai/DeepSeek-V3.2 |
| 价格 | 输入 $0.28/1M tokens，输出 $0.42/1M tokens |
| 接入方式 | OpenAI 兼容 API |
| Base URL | https://api.siliconflow.cn/v1 或 https://api.deepseek.com/v1 |
| 适用场景 | 生产环境、国内用户 |
| 月估算成本 | ¥250（1000万 tokens） |

优点：中国直连、极低成本（比 GPT 便宜 50 倍）、OpenAI 兼容
缺点：代码质量略逊于 Claude

### 方案 3：Claude 3.5 Sonnet（质量最优）

| 项目 | 详情 |
|------|------|
| 提供商 | Anthropic |
| 模型 | claude-3-5-sonnet-20241022 |
| 价格 | 输入 $3/1M tokens，输出 $15/1M tokens |
| 接入方式 | Anthropic SDK（需改代码） |
| 适用场景 | 对代码质量有严格要求 |
| 月估算成本 | ~$240 |

优点：代码生成质量最稳定（SWE-bench 79.6分）、200K 上下文
缺点：需改代码引入 anthropic SDK、国内需代理、成本较高

### 方案 4：OpenAI GPT-4o / GPT-5.4

| 项目 | 详情 |
|------|------|
| 提供商 | OpenAI |
| 模型 | gpt-4o / gpt-5.4 |
| 价格 | 输入 $2.5-5/1M，输出 $15/1M |
| 接入方式 | OpenAI 原生 API |
| 适用场景 | 全功能需求、Function Calling |
| 月估算成本 | ~$400 |

优点：功能最全（Structured Outputs、Vision、Prompt Caching）
缺点：成本最高、国内需代理

### 方案 5：本地 Ollama（离线方案）

| 项目 | 详情 |
|------|------|
| 模型 | Qwen3-Coder-30B / DeepSeek Coder V2 |
| 价格 | 免费（需硬件） |
| 接入方式 | OpenAI 兼容 API (localhost:11434/v1) |
| 硬件要求 | 64GB RAM 或 24GB VRAM |
| 适用场景 | 数据隐私要求高、无网络环境 |

## 切换模型的方式

只需修改 `.env` 中的三个变量即可切换模型：
```
OPENAI_BASE_URL=<provider_base_url>
OPENAI_API_KEY=<your_api_key>
OPENAI_MODEL=<model_name>
```

## 多模型降级策略（未来规划）

```
OpenRouter/SiliconFlow → DeepSeek → OpenAI → Mock
```

当主力 API 不可用时，自动尝试下一个，最终降级到 Mock 模式保证可用性。

## 注册链接

- OpenRouter: https://openrouter.ai （获取免费 API Key）
- SiliconFlow: https://siliconflow.cn （新用户送额度）
- DeepSeek: https://platform.deepseek.com
- OpenAI: https://platform.openai.com
- Anthropic: https://console.anthropic.com
