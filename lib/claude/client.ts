import Anthropic from '@anthropic-ai/sdk'

export const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5'

let client: Anthropic | null = null

export function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
    client = new Anthropic({ apiKey })
  }
  return client
}

export function claudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

/**
 * Forces the model to answer through a single tool call, which gives us
 * schema shaped JSON without parsing prose or stripping code fences.
 */
export async function callStructured<T>(params: {
  system: string
  content: string | Anthropic.ContentBlockParam[]
  toolName: string
  toolDescription: string
  schema: Anthropic.Tool['input_schema']
  maxTokens: number
}): Promise<T> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: params.maxTokens,
    system: params.system,
    tools: [{ name: params.toolName, description: params.toolDescription, input_schema: params.schema }],
    tool_choice: { type: 'tool', name: params.toolName },
    messages: [{ role: 'user', content: params.content }],
  })

  const block = response.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') throw new Error('The model did not return a structured answer')
  if (response.stop_reason === 'max_tokens') throw new Error('The answer was cut off')
  return block.input as T
}

/**
 * Cleans text the app itself shows the owner. Swaps dashes used as pauses for
 * commas and squeezes whitespace, but keeps paragraph breaks.
 */
export function tidy(text: unknown): string {
  if (typeof text !== 'string') return ''
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Trims, drops empties and duplicates, and caps a list the model returned. */
export function tidyList(list: unknown, max: number): string[] {
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of list) {
    const t = tidy(item).replace(/\s+/g, ' ')
    const key = t.toLowerCase()
    if (!t || seen.has(key)) continue
    seen.add(key)
    out.push(t)
    if (out.length >= max) break
  }
  return out
}

/** Wraps user written text in a tag so it reads as data, not instructions. */
export function wrap(tag: string, text: string): string {
  const stripped = text.replace(new RegExp(`</?${tag}>`, 'gi'), '')
  return `<${tag}>\n${stripped}\n</${tag}>`
}

export const str = { type: 'string' } as const
export const strList = { type: 'array', items: { type: 'string' } } as const

export const NOT_A_VET =
  'You are not a vet and you never diagnose, prescribe or change a treatment plan. You explain and you point people back to their vet.'
