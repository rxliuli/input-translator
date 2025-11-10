import { OptionalKeysOf } from 'type-fest'

export interface Settings {
  to?: string
  engine?: 'google' | 'openai' | 'chrome-ai'

  apiKey?: string
  model?: string
  baseUrl?: string
  prompt?: string

  chromeAiSourceLanguage?: string
}

const Prompt = `
You are a professional {to} native translator who fluently translates text into {to}. Follow these rules:
1. Output only the translated content, without explanations or additional content (such as "Here is the translation:" or "Translation as follows:")
2. If the text contains HTML tags, maintain correct tag placement after translation and ensure the translation flows naturally
3. For content that should not be translated (such as proper nouns, code, etc.), keep the original text

Translate to {to} (output translation only):
`.trim()

export function getDefaultSettings(): Pick<Settings, OptionalKeysOf<Settings>> {
  return {
    to: 'en',
    engine: 'google',
    baseUrl: 'https://api.openai.com/v1',
    prompt: Prompt,
    model: 'gpt-4.1-mini',
    chromeAiSourceLanguage: 'en',
  }
}

export async function getSettings(): Promise<Settings> {
  return {
    ...(await browser.storage.sync.get<Settings>([
      'to',
      'engine',
      'baseUrl',
      'prompt',
      'model',
      'apiKey',
      'chromeAiSourceLanguage',
    ])),
  }
}

export async function getMergedSettings(): Promise<Settings> {
  return Object.freeze({ ...getDefaultSettings(), ...(await getSettings()) })
}

export async function setSyncSettings(settings: Settings) {
  await browser.storage.sync.set(settings)
}
