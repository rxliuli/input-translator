import { getMergedSettings, Settings } from '../settings'
import { Translator } from './base'

const newModels = [
  'gpt-5-nano',
  'gpt-5',
  'gpt-5-mini-2025-08-07',
  'gpt-5-mini',
  'gpt-5-nano-2025-08-07',
  'o1-2024-12-17',
  'o1',
  'o3-mini',
  'o3-mini-2025-01-31',
  'o1-pro-2025-03-19',
  'o1-pro',
  'o3-2025-04-16',
  'o4-mini-2025-04-16',
  'o3',
  'o4-mini',
  'gpt-4.1-2025-04-14',
  'gpt-4.1',
  'gpt-4.1-mini-2025-04-14',
  'gpt-4.1-mini',
  'gpt-4.1-nano-2025-04-14',
  'gpt-4.1-nano',
  'o3-pro',
  'gpt-4o-realtime-preview-2025-06-03',
  'gpt-4o-audio-preview-2025-06-03',
  'o3-pro-2025-06-10',
  'o4-mini-deep-research',
  'o3-deep-research',
  'o3-deep-research-2025-06-26',
  'o4-mini-deep-research-2025-06-26',
  'gpt-5-chat-latest',
  'gpt-5-2025-08-07',
]

export const openai: Translator = {
  name: 'openai',
  translate: async (text: string, options: { to: string }) => {
    const settings = await getMergedSettings()
    if (!settings.apiKey) {
      throw new Error('OpenAI API key is not set')
    }
    if (!settings.baseUrl) {
      throw new Error('OpenAI base URL is not set')
    }
    if (!settings.model) {
      throw new Error('OpenAI model is not set')
    }
    if (!settings.prompt) {
      throw new Error('OpenAI prompt is not set')
    }
    if (newModels.includes(settings.model)) {
      return sendOfResponse(text, settings)
    }
    return sendOfCompletion(text, settings)
  },
}

async function sendOfResponse(text: string, options: Settings) {
  const r = await fetch(`${options.baseUrl}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({
      model: options.model,
      input: options.prompt + '\n\n' + text,
    }),
  })
  if (!r.ok) {
    throw new Error(await r.text())
  }
  const data = await r.json()
  return data.output[0].content[0].text
}

async function sendOfCompletion(text: string, options: Settings) {
  const r = await fetch(`${options.baseUrl}/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({
      model: options.model,
      messages: [
        {
          role: 'user',
          content: options.prompt + '\n\n' + text,
        },
      ],
    }),
  })
  if (!r.ok) {
    throw new Error(await r.text())
  }
  const data = await r.json()
  return data.choices[0].message.content
}
