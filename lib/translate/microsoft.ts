import { TranslationResult, Translator } from './types'

// Microsoft retired the legacy Edge translation pipeline
// (edge.microsoft.com/translate/auth) on 2026-07-30, so this now goes through
// the Bing web translator: scrape a session from the translator page, then
// call ttranslatev3. The token is valid for one hour.
interface BingSession {
  ig: string
  iid: string
  key: number
  token: string
  expires: number
}

let sessionCache: BingSession | null = null
let sessionInflight: Promise<BingSession> | null = null

async function getBingSession(): Promise<BingSession> {
  if (sessionCache && Date.now() < sessionCache.expires) {
    return sessionCache
  }
  if (sessionInflight) return sessionInflight
  sessionInflight = (async () => {
    try {
      const resp = await fetch('https://www.bing.com/translator')
      if (!resp.ok) throw new Error(`Bing session failed: ${resp.status}`)
      const html = await resp.text()
      const ig = /IG:"([^"]+)"/.exec(html)?.[1]
      const iid = /data-iid="([^"]+)"/.exec(html)?.[1] ?? 'translator.5023'
      const helper = /params_AbusePreventionHelper\s*=\s*(\[[^\]]+\])/.exec(
        html,
      )?.[1]
      if (!ig || !helper) {
        throw new Error('Bing session failed: page layout changed')
      }
      const [key, token, duration] = JSON.parse(helper) as [
        number,
        string,
        number,
      ]
      const session: BingSession = {
        ig,
        iid,
        key,
        token,
        expires: Date.now() + Math.min(duration || 3600000, 3600000) - 60000,
      }
      sessionCache = session
      return session
    } finally {
      sessionInflight = null
    }
  })()
  return sessionInflight
}

// The extension uses Google-style language codes; map the ones Bing names
// differently. Codes Bing doesn't support at all fail the request and are
// handled by the caller's fallback.
const BING_LANG_MAP: Record<string, string> = {
  zh: 'zh-Hans',
  'zh-cn': 'zh-Hans',
  'zh-tw': 'zh-Hant',
  tl: 'fil',
  iw: 'he',
  no: 'nb',
  sr: 'sr-Cyrl',
  mn: 'mn-Cyrl',
  hmn: 'mww',
  ku: 'kmr',
}

async function translateOne(
  text: string,
  to: string,
  retried = false,
): Promise<{ text: string; detected?: string }> {
  const s = await getBingSession()
  const resp = await fetch(
    `https://www.bing.com/ttranslatev3?isVertical=1&IG=${s.ig}&IID=${s.iid}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        fromLang: 'auto-detect',
        to,
        text,
        token: s.token,
        key: String(s.key),
      }),
    },
  )
  if (!resp.ok) {
    sessionCache = null
    if (!retried) return translateOne(text, to, true)
    throw new Error(`Microsoft translate failed: ${resp.status}`)
  }
  const data = await resp.json()
  const first = Array.isArray(data) ? data[0] : null
  if (!first?.translations?.[0]?.text) {
    // An expired token or a captcha challenge comes back as an object
    // (e.g. {"statusCode":400}) instead of the translations array.
    sessionCache = null
    if (!retried) return translateOne(text, to, true)
    throw new Error(
      `Microsoft translate failed: ${JSON.stringify(data).slice(0, 200)}`,
    )
  }
  return {
    text: first.translations[0].text,
    detected: first.detectedLanguage?.language,
  }
}

export async function translateMicrosoft(
  texts: string[],
  targetLang: string,
): Promise<TranslationResult> {
  const to = BING_LANG_MAP[targetLang] ?? targetLang
  const results = await Promise.all(texts.map((t) => translateOne(t, to)))
  return {
    texts: results.map((r) => r.text),
    detectedLang: results[0]?.detected,
  }
}

export const microsoft: Translator = {
  name: 'microsoft',
  async translate(text, options) {
    return (await translateMicrosoft([text], options.to)).texts[0]
  },
}
