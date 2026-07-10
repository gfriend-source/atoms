export interface FileOperation {
  action: 'create' | 'update' | 'delete'
  path: string
  content?: string
}

export interface ParsedResponse {
  text: string
  fileOperations: FileOperation[]
  steps: string[]
  suggestions: string[]
}

/**
 * Parse AI response to extract file operations, steps, and suggestions.
 */
export function parseAIResponse(rawContent: string): ParsedResponse {
  let text = rawContent
  const fileOperations: FileOperation[] = []
  const steps: string[] = []
  const suggestions: string[] = []

  // Extract <file_operation>...</file_operation> blocks
  const fileOpRegex = /<file_operation>\s*<action>(create|update|delete)<\/action>\s*<path>(.*?)<\/path>\s*(?:<content>([\s\S]*?)<\/content>\s*)?<\/file_operation>/g
  let match: RegExpExecArray | null

  while ((match = fileOpRegex.exec(text)) !== null) {
    const action = match[1] as 'create' | 'update' | 'delete'
    const path = match[2].trim()
    const content = match[3] !== undefined ? match[3].replace(/^\n/, '').replace(/\n$/, '') : undefined

    fileOperations.push({ action, path, content })
  }

  // Remove file_operation blocks from text
  text = text.replace(/<file_operation>[\s\S]*?<\/file_operation>/g, '')

  // Extract <step>...</step> tags
  const stepRegex = /<step>(.*?)<\/step>/g
  while ((match = stepRegex.exec(text)) !== null) {
    steps.push(match[1].trim())
  }

  // Remove step tags from text
  text = text.replace(/<step>.*?<\/step>/g, '')

  // Extract <suggestions>...</suggestions> block
  const suggestionsRegex = /<suggestions>([\s\S]*?)<\/suggestions>/g
  while ((match = suggestionsRegex.exec(text)) !== null) {
    const suggestionsBlock = match[1].trim()
    const items = suggestionsBlock
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    suggestions.push(...items)
  }

  // Remove suggestions blocks from text
  text = text.replace(/<suggestions>[\s\S]*?<\/suggestions>/g, '')

  // Clean up extra whitespace in the remaining text
  text = text
    .split('\n')
    .map((line) => line)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { text, fileOperations, steps, suggestions }
}

/**
 * Incrementally parse steps from a streaming response (partial content).
 * Returns steps found so far without requiring the full response.
 */
export function parseStepsFromPartial(content: string): string[] {
  const steps: string[] = []
  const stepRegex = /<step>(.*?)<\/step>/g
  let match: RegExpExecArray | null
  while ((match = stepRegex.exec(content)) !== null) {
    steps.push(match[1].trim())
  }
  return steps
}
