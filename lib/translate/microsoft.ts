import { TranslationResult, Translator } from './types'

let msTokenCache: { token: string; expires: number } | null = null
let msTokenInflight: Promise<string> | null = null

async function getMicrosoftToken(): Promise<string> {
  if (msTokenCache && Date.now() < msTokenCache.expires) {
    return msTokenCache.token
  }
  if (msTokenInflight) return msTokenInflight
  msTokenInflight = (async () => {
    try {
      const resp = await fetch('https://edge.microsoft.com/translate/auth', {
        method: 'GET',
      })
      if (!resp.ok) throw new Error(`Microsoft auth failed: ${resp.status}`)
      const token = await resp.text()
      msTokenCache = { token, expires: Date.now() + 8 * 60 * 1000 }
      return token
    } finally {
      msTokenInflight = null
    }
  })()
  return msTokenInflight
}

export async function translateMicrosoft(
  texts: string[],
  targetLang: string,
): Promise<TranslationResult> {
  const token = await getMicrosoftToken()
  const url = new URL(
    'https://api-edge.cognitive.microsofttranslator.com/translate',
  )
  url.searchParams.set('api-version', '3.0')
  url.searchParams.set('to', targetLang)

  const resp = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(texts.map((t) => ({ Text: t }))),
  })

  if (!resp.ok) {
    msTokenCache = null
    throw new Error(`Microsoft translate failed: ${resp.status}`)
  }

  const data = await resp.json()
  return {
    texts: data.map((item: any) => item.translations[0].text),
    detectedLang: data[0]?.detectedLanguage?.language,
  }
}

export const microsoft: Translator = {
  name: 'microsoft',
  async translate(text, options) {
    return (await translateMicrosoft([text], options.to)).texts[0]
  },
}
