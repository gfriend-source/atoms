// ========== Three-Phase Project Generation Orchestrator ==========

import { useFileStore } from '@/lib/store/file-store'
import { buildFilePrompt, type PlannedFile, type ProjectPlan } from './prompts'

export type { PlannedFile, ProjectPlan } from './prompts'

export interface OrchestratorEvent {
  phase: 'planning' | 'planned' | 'generating' | 'fileCreated' | 'verifying' | 'fixing' | 'complete' | 'error'
  message: string
  file?: string
  progress?: string
  plan?: ProjectPlan
  filesCount?: number
  error?: string
}

export type OrchestratorCallback = (event: OrchestratorEvent) => void

/**
 * Orchestrate the three-phase project generation:
 * Phase 1: Planning - Determine project structure
 * Phase 2: Building - Generate each file individually
 * Phase 3: Verification - Check completeness and retry missing files
 */
export async function orchestrateProjectGeneration(
  userPrompt: string,
  projectId: string,
  onEvent: OrchestratorCallback
): Promise<void> {
  try {
    // Phase 1: Planning
    onEvent({ phase: 'planning', message: '正在分析需求，设计项目结构...' })

    const plan = await callPlanningPhase(userPrompt)

    if (!plan || !plan.files || plan.files.length === 0) {
      onEvent({ phase: 'error', message: '项目规划失败，请重试', error: 'Empty plan' })
      return
    }

    onEvent({
      phase: 'planned',
      message: `已规划 ${plan.files.length} 个文件`,
      plan,
      filesCount: plan.files.length,
    })

    // Phase 2: Generate files one by one (with validation and retry)
    const generatedFiles: string[] = []

    for (let i = 0; i < plan.files.length; i++) {
      const file = plan.files[i]
      onEvent({
        phase: 'generating',
        message: `正在创建 ${file.path}`,
        file: file.path,
        progress: `${i + 1}/${plan.files.length}`,
      })

      let content = ''
      let success = false

      for (let retry = 0; retry < MAX_RETRIES; retry++) {
        try {
          content = await callBuilderPhase(userPrompt, plan, file, generatedFiles)

          if (isValidCodeContent(content, file.path)) {
            success = true
            break
          } else {
            console.log(`[Orchestrator] Invalid content for ${file.path} (attempt ${retry + 1}), retrying...`)
            // Wait before retrying to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        } catch (err) {
          console.error(`[Orchestrator] Error generating ${file.path} (attempt ${retry + 1}):`, err)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      if (success && content) {
        // Write to file store
        useFileStore.getState().addFileByPath(file.path, content)
        generatedFiles.push(file.path)

        onEvent({
          phase: 'fileCreated',
          message: `已完成 ${file.path}`,
          file: file.path,
          progress: `${i + 1}/${plan.files.length}`,
        })

        // Save to database
        if (projectId && projectId !== 'new') {
          saveFileToDb(projectId, file.path, content)
        }
      } else {
        onEvent({
          phase: 'generating',
          message: `⚠️ ${file.path} 生成失败，已跳过`,
          file: file.path,
          progress: `${i + 1}/${plan.files.length}`,
        })
      }
    }

    // Phase 3: Verification (check both existence and content quality)
    onEvent({ phase: 'verifying', message: '正在验证文件完整性...' })

    const fileStore = useFileStore.getState()
    const invalidFiles = plan.files.filter(f => {
      if (!generatedFiles.includes(f.path)) return true // File not generated
      const content = fileStore.getFileContent(f.path)
      if (!content || !isValidCodeContent(content, f.path)) return true // Content invalid
      return false
    })

    if (invalidFiles.length > 0) {
      for (const file of invalidFiles) {
        onEvent({ phase: 'fixing', message: `正在补全 ${file.path}`, file: file.path })

        let content = ''
        let success = false

        for (let retry = 0; retry < MAX_RETRIES; retry++) {
          try {
            content = await callBuilderPhase(userPrompt, plan, file, generatedFiles)
            if (isValidCodeContent(content, file.path)) {
              success = true
              break
            }
            await new Promise(resolve => setTimeout(resolve, 1000))
          } catch (err) {
            console.error(`[Orchestrator] Retry failed for ${file.path} (attempt ${retry + 1}):`, err)
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }

        if (success && content) {
          useFileStore.getState().addFileByPath(file.path, content)
          if (!generatedFiles.includes(file.path)) {
            generatedFiles.push(file.path)
          }

          if (projectId && projectId !== 'new') {
            saveFileToDb(projectId, file.path, content)
          }
        }
      }
    }

    onEvent({
      phase: 'complete',
      message: `项目生成完成！共创建 ${generatedFiles.length} 个文件`,
      filesCount: generatedFiles.length,
    })
  } catch (err) {
    onEvent({
      phase: 'error',
      message: '生成过程出错，请重试',
      error: (err as Error).message,
    })
  }
}

// ========== Phase Callers ==========

async function callPlanningPhase(userPrompt: string): Promise<ProjectPlan> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'plan',
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok) throw new Error('Planning phase failed')

  const data = await response.json()
  return extractJSON(data.content)
}

async function callBuilderPhase(
  userPrompt: string,
  plan: ProjectPlan,
  targetFile: PlannedFile,
  existingFiles: string[]
): Promise<string> {
  const prompt = buildFilePrompt(userPrompt, plan, targetFile, existingFiles)

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'generate-file',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) throw new Error(`Builder phase failed for ${targetFile.path}`)

  const data = await response.json()
  return cleanGeneratedCode(data.content)
}

// ========== Content Validation ==========

const MAX_RETRIES = 3

/**
 * Validate if the generated content is valid code (not safety metadata or refusal).
 */
function isValidCodeContent(content: string, filePath: string): boolean {
  const trimmed = content.trim()

  // Content too short (less than 20 chars), likely an error response
  if (trimmed.length < 20) return false

  // Contains known invalid response markers
  const invalidPatterns = [
    /^User Safety:/i,
    /^Content Policy:/i,
    /^I cannot/i,
    /^I'm sorry/i,
    /^As an AI/i,
    /^I apologize/i,
    /^Sorry,/i,
    /^\[SAFETY\]/i,
    /^This request/i,
  ]
  if (invalidPatterns.some(p => p.test(trimmed))) return false

  // Check for code characteristics based on file type
  const ext = filePath.split('.').pop()?.toLowerCase()

  if (['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) {
    const codePatterns = ['import ', 'export ', 'const ', 'function ', 'return ', 'class ', 'interface ', 'type ', 'let ', 'var ']
    return codePatterns.some(p => trimmed.includes(p))
  }

  if (ext === 'json') {
    return trimmed.startsWith('{') || trimmed.startsWith('[')
  }

  if (ext === 'html') {
    return trimmed.includes('<') && trimmed.includes('>')
  }

  if (ext === 'css') {
    return trimmed.includes('{') && trimmed.includes('}')
  }

  // For other file types, accept as long as it's not a known invalid pattern
  return true
}

// ========== Utilities ==========

function extractJSON(text: string): ProjectPlan {
  // Try direct parse
  try {
    return JSON.parse(text)
  } catch { /* fallthrough */ }

  // Try to extract JSON block from text
  const jsonMatch = text.match(/\{[\s\S]*"files"[\s\S]*\}/i)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch { /* fallthrough */ }
  }

  throw new Error('Failed to parse project plan JSON')
}

function cleanGeneratedCode(content: string): string {
  let code = content.trim()
  // Remove possible markdown code block wrappers
  if (code.startsWith('```')) {
    code = code.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '')
  }
  return code
}

async function saveFileToDb(projectId: string, path: string, content: string) {
  try {
    await fetch(`/api/projects/${projectId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: [{ path, content }] }),
    })
  } catch {
    // Non-blocking, ignore save errors
  }
}

// ========== Project Request Detection ==========

/**
 * Detect if the user's message is a project creation request
 * vs a normal conversation/question.
 */
export function detectProjectRequest(content: string): boolean {
  const keywords = [
    '创建', '写一个', '开发', '做一个', '生成', '帮我写', '实现一个',
    '构建', '搭建', '设计一个', '帮我做', '帮我开发', '帮我创建',
    'create', 'build', 'write', 'develop', 'make a', 'generate',
  ]
  return keywords.some(kw => content.toLowerCase().includes(kw.toLowerCase()))
}
