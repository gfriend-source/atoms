// ========== Three-Phase Code Generation Prompts ==========

export interface PlannedFile {
  path: string
  description: string
}

export interface ProjectPlan {
  projectType: string
  files: PlannedFile[]
}

// 规划阶段 System Prompt
export const PLANNING_SYSTEM_PROMPT = `你是一位项目架构师。根据用户的需求描述，规划一个完整的前端项目文件结构。

你必须只输出 JSON 格式的项目规划，不要输出任何其他内容。

JSON 格式要求：
{
  "projectType": "react-vite" | "html-css-js" | "vue-vite" | "nextjs",
  "files": [
    { "path": "文件路径", "description": "该文件的用途简述" }
  ]
}

规划规则：
- 对于 React 项目，必须包含：package.json, index.html, vite.config.ts, tsconfig.json, src/main.tsx, src/App.tsx
- 每个组件放在独立文件中
- 工具函数放在 src/utils/ 下
- 样式文件与组件同目录或放在 src/styles/ 下
- 文件数量合理（通常 5-15 个）
- 只输出 JSON，绝对不要输出解释文本或代码`

// 文件生成阶段 System Prompt
export const BUILDER_SYSTEM_PROMPT = `你是一位高级前端工程师。你的任务是根据项目需求和文件规划，生成指定文件的完整代码。

规则：
- 只输出该文件的代码内容，不要加任何包裹标签或解释
- 不要输出文件名或路径
- 不要输出 \`\`\` 代码块标记
- 直接输出文件的完整源代码
- 确保代码可直接运行，import 路径正确
- 使用 TypeScript + React + Tailwind CSS（如适用）`

// 构建文件生成的 User Prompt
export function buildFilePrompt(
  userRequirement: string,
  plan: ProjectPlan,
  targetFile: PlannedFile,
  existingFiles: string[]
): string {
  return `## 用户需求
${userRequirement}

## 项目文件规划
${plan.files.map(f => `- ${f.path}: ${f.description}`).join('\n')}

## 已生成的文件
${existingFiles.length > 0 ? existingFiles.map(f => `- ${f}`).join('\n') : '（暂无）'}

## 当前任务
请生成文件: ${targetFile.path}
用途: ${targetFile.description}

请直接输出该文件的完整代码内容。`
}
