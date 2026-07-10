import OpenAI, { APIError } from 'openai'

/**
 * Create an OpenAI client instance (server-side only).
 */
export function createOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
    baseURL: process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1',
    maxRetries: 3,
    timeout: 60000,
    defaultHeaders: {
      'Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
      'X-Title': 'Atoms',
    },
  })
}

/**
 * Check if the OpenAI API key is configured.
 */
export function hasApiKey(): boolean {
  return !!process.env.OPENAI_API_KEY
}

/**
 * Extract a user-friendly error message from an API error.
 */
export function extractErrorInfo(error: unknown): {
  message: string
  status: number
  retryable: boolean
} {
  if (error instanceof APIError) {
    const status = error.status || 500
    let message = error.message || 'Unknown API error'

    // Try to extract more detail from OpenRouter's error format
    try {
      const body = error.error as Record<string, unknown>
      if (body && typeof body === 'object') {
        const innerError = body as { message?: string; code?: number; metadata?: { raw?: string } }
        if (innerError.message) {
          message = innerError.message
        }
        if (innerError.metadata?.raw) {
          message += ` (${innerError.metadata.raw})`
        }
      }
    } catch {
      // ignore parse errors
    }

    const retryable = status === 429 || status === 503 || status === 502
    return { message, status, retryable }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      status: 500,
      retryable: false,
    }
  }

  return {
    message: 'An unexpected error occurred',
    status: 500,
    retryable: false,
  }
}

/**
 * Non-streaming chat completion.
 */
export async function chatCompletion(
  messages: { role: string; content: string }[],
  systemPrompt: string
) {
  const client = createOpenAIClient()
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'openrouter/free',
    messages: [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ],
  })
  return response.choices[0]?.message?.content || ''
}

/**
 * Streaming chat completion. Returns an async iterable stream.
 */
export async function streamChatCompletion(
  messages: { role: string; content: string }[],
  systemPrompt: string
) {
  const client = createOpenAIClient()
  const stream = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'openrouter/free',
    messages: [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ],
    stream: true,
  })
  return stream
}
