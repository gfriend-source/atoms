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
 * Uses multiple regex strategies with increasing tolerance for format variations.
 */
export function parseAIResponse(rawContent: string): ParsedResponse {
  let text = rawContent
  const fileOperations: FileOperation[] = []
  const steps: string[] = []
  const suggestions: string[] = []
  let match: RegExpExecArray | null

  // Strategy 1: Standard format with closing tag (tolerant whitespace/newlines)
  const strictRegex = /<file_operation>\s*<action>\s*(create|update|delete)\s*<\/action>\s*<path>\s*([\s\S]*?)\s*<\/path>\s*(?:<content>([\s\S]*?)<\/content>\s*)?<\/file_operation>/gi
  while ((match = strictRegex.exec(rawContent)) !== null) {
    fileOperations.push({
      action: match[1].trim() as 'create' | 'update' | 'delete',
      path: match[2].trim(),
      content: match[3] !== undefined ? match[3].replace(/^\n/, '').replace(/\n$/, '') : '',
    })
  }

  // Strategy 2: Missing closing </file_operation> tag - match until next <file_operation> or end
  if (fileOperations.length === 0) {
    const looseRegex = /<file_operation>[\s\S]*?<action>\s*(create|update|delete)\s*<\/action>[\s\S]*?<path>\s*([\s\S]*?)\s*<\/path>[\s\S]*?<content>([\s\S]*?)<\/content>/gi
    while ((match = looseRegex.exec(rawContent)) !== null) {
      fileOperations.push({
        action: match[1].trim() as 'create' | 'update' | 'delete',
        path: match[2].trim(),
        content: match[3] !== undefined ? match[3].replace(/^\n/, '').replace(/\n$/, '') : '',
      })
    }
  }

  // Strategy 3: Inline format on single/few lines (model compresses everything)
  // e.g.: <file_operation> <action>create</action> <path>src/x.tsx</path> <content>...</content> </file_operation>
  if (fileOperations.length === 0) {
    const inlineRegex = /<file_operation>\s*<action>\s*(create|update|delete)\s*<\/action>\s*<path>\s*([^<]+?)\s*<\/path>\s*<content>([\s\S]*?)<\/content>(?:\s*<\/file_operation>)?/gi
    while ((match = inlineRegex.exec(rawContent)) !== null) {
      fileOperations.push({
        action: match[1].trim() as 'create' | 'update' | 'delete',
        path: match[2].trim(),
        content: match[3] !== undefined ? match[3].replace(/^\n/, '').replace(/\n$/, '') : '',
      })
    }
  }

  console.log('[Parser] Extracted file operations:', fileOperations.length,
    fileOperations.map(op => `${op.action}:${op.path}`))

  // --- Remove file_operation blocks from display text ---
  // Remove fully closed blocks
  text = text.replace(/<file_operation>[\s\S]*?<\/file_operation>/gi, '')
  // Remove unclosed blocks (from <file_operation> to </content> without closing tag)
  text = text.replace(/<file_operation>[\s\S]*?<\/content>(?!\s*<\/file_operation>)/gi, '')
  // Remove any remaining orphan file_operation tags
  text = text.replace(/<\/?file_operation>/gi, '')
  text = text.replace(/<action>[\s\S]*?<\/action>/gi, '')
  text = text.replace(/<path>[\s\S]*?<\/path>/gi, '')
  text = text.replace(/<content>[\s\S]*?<\/content>/gi, '')

  // --- Extract steps ---
  const stepRegex = /<step>\s*([\s\S]*?)\s*<\/step>/gi
  while ((match = stepRegex.exec(rawContent)) !== null) {
    steps.push(match[1].trim())
  }
  text = text.replace(/<step>[\s\S]*?<\/step>/gi, '')

  // --- Extract suggestions ---
  const suggestionsRegex = /<suggestions>([\s\S]*?)<\/suggestions>/gi
  while ((match = suggestionsRegex.exec(rawContent)) !== null) {
    const suggestionsBlock = match[1].trim()
    const items = suggestionsBlock
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    suggestions.push(...items)
  }
  text = text.replace(/<suggestions>[\s\S]*?<\/suggestions>/gi, '')

  // Remove any leftover orphan tags
  text = text.replace(/<\/?(?:step|suggestions)>/gi, '')

  // Clean up extra whitespace
  text = text.replace(/\n{3,}/g, '\n\n').trim()

  return { text, fileOperations, steps, suggestions }
}

/**
 * Incrementally parse steps from a streaming response (partial content).
 * Returns steps found so far without requiring the full response.
 */
export function parseStepsFromPartial(content: string): string[] {
  const steps: string[] = []
  const stepRegex = /<step>\s*([\s\S]*?)\s*<\/step>/gi
  let match: RegExpExecArray | null
  while ((match = stepRegex.exec(content)) !== null) {
    steps.push(match[1].trim())
  }
  return steps
}
