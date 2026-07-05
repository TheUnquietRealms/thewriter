export type AIProvider = 'gemini' | 'openai' | 'openrouter' | 'anthropic'

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  model: string
}

export interface AIContext {
  mode: string
  voiceRules: string
  bannedHabits: string
  bodySample: string
  title: string
}

const CONFIG_KEY = 'cce_ai_config'

export const PROVIDER_MODELS: Record<AIProvider, Array<{ value: string; label: string }>> = {
  gemini: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (free tier)' },
    { value: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash' },
  ],
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (fast)' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  ],
  openrouter: [
    { value: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5 (free)' },
    { value: 'meta-llama/llama-3.1-8b-instruct:free', label: 'Llama 3.1 8B (free)' },
    { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'anthropic/claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    { value: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' },
  ],
  anthropic: [
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fast)' },
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  ],
}

export const PROVIDER_HINTS: Record<AIProvider, string> = {
  gemini: 'Free key at ai.google.dev — never sent anywhere except Google.',
  openai: 'Key at platform.openai.com — usage billed to your OpenAI account.',
  openrouter: 'Key at openrouter.ai — many free models available on free tier.',
  anthropic: 'Key at console.anthropic.com — usage billed to your Anthropic account.',
}

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  anthropic: 'Anthropic',
}

export function loadAIConfig(): AIConfig {
  const raw = localStorage.getItem(CONFIG_KEY)
  if (raw) {
    try { return JSON.parse(raw) as AIConfig } catch {}
  }
  // migrate from legacy gemini-only key
  const legacy = localStorage.getItem('cce_gemini_key')
  return { provider: 'gemini', apiKey: legacy ?? '', model: 'gemini-2.0-flash' }
}

export function saveAIConfig(config: AIConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

function buildSystemPrompt(ctx: AIContext): string {
  return [
    `You are a writing assistant for a ${ctx.mode} piece titled "${ctx.title}".`,
    `Voice rules: ${ctx.voiceRules.slice(0, 400)}`,
    `Never use these phrases: ${ctx.bannedHabits.slice(0, 200)}`,
    `Match the voice in this sample: "${ctx.bodySample.slice(0, 500)}"`,
  ].join('\n')
}

async function* streamGemini(config: AIConfig, ctx: AIContext, userPrompt: string, maxTokens: number): AsyncGenerator<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?key=${config.apiKey}&alt=sse`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: buildSystemPrompt(ctx) }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 },
    }),
  })
  if (res.status === 400 || res.status === 401 || res.status === 403) throw new Error('INVALID_KEY')
  if (res.status === 429) throw new Error('RATE_LIMIT')
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  yield* parseSSE(res, chunk => chunk.candidates?.[0]?.content?.parts?.[0]?.text)
}

async function* streamOpenAICompat(config: AIConfig, ctx: AIContext, userPrompt: string, maxTokens: number, baseUrl: string): AsyncGenerator<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      ...(baseUrl.includes('openrouter') ? {
        'HTTP-Referer': 'https://thewriter.pages.dev/',
        'X-Title': 'The Writer',
      } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: buildSystemPrompt(ctx) },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      max_tokens: maxTokens,
      temperature: 0.8,
    }),
  })
  if (res.status === 401 || res.status === 403) throw new Error('INVALID_KEY')
  if (res.status === 429) throw new Error('RATE_LIMIT')
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  yield* parseSSE(res, chunk => chunk.choices?.[0]?.delta?.content)
}

async function* streamAnthropic(config: AIConfig, ctx: AIContext, userPrompt: string, maxTokens: number): AsyncGenerator<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model,
      system: buildSystemPrompt(ctx),
      messages: [{ role: 'user', content: userPrompt }],
      stream: true,
      max_tokens: maxTokens,
    }),
  })
  if (res.status === 401 || res.status === 403) throw new Error('INVALID_KEY')
  if (res.status === 429) throw new Error('RATE_LIMIT')
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  yield* parseSSE(res, chunk =>
    chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta'
      ? chunk.delta.text
      : undefined
  )
}

async function* parseSSE(
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extract: (chunk: any) => string | undefined,
): AsyncGenerator<string> {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const json = line.slice(6).trim()
      if (!json || json === '[DONE]') continue
      try {
        const text = extract(JSON.parse(json))
        if (text) yield text
      } catch { /* skip malformed chunks */ }
    }
  }
}

export async function* streamAI(config: AIConfig, ctx: AIContext, userPrompt: string, maxTokens = 400): AsyncGenerator<string> {
  switch (config.provider) {
    case 'gemini':
      yield* streamGemini(config, ctx, userPrompt, maxTokens)
      break
    case 'openai':
      yield* streamOpenAICompat(config, ctx, userPrompt, maxTokens, 'https://api.openai.com/v1')
      break
    case 'openrouter':
      yield* streamOpenAICompat(config, ctx, userPrompt, maxTokens, 'https://openrouter.ai/api/v1')
      break
    case 'anthropic':
      yield* streamAnthropic(config, ctx, userPrompt, maxTokens)
      break
  }
}

export function findBannedViolations(text: string, bannedHabits: string): string[] {
  const phrases = bannedHabits.split('\n').map(s => s.trim()).filter(Boolean)
  return phrases.filter(p =>
    new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(text)
  )
}
