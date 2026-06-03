export interface LTMatch {
  message: string
  offset: number
  length: number
  replacements: { value: string }[]
  rule: { id: string; description: string }
}

export interface LTResult {
  matches: LTMatch[]
}

export async function checkGrammar(text: string, language = 'en-US'): Promise<LTResult> {
  const body = new URLSearchParams({ text, language })
  const res = await fetch('https://api.languagetool.org/v2/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`LanguageTool error: ${res.status}`)
  return res.json()
}
