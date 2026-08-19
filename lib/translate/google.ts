import { TranslationResult, Translator } from './types'

// Same endpoint translate.google.com's "gtx" client uses. No API key or token
// needed. `dt=t` asks for the translation segments, `dt=qca` enables Google's
// query-correction step, which is what makes the website handle romanized
// input (e.g. Bengali "Tumi ki koro" -> "তুমি কি করো", pinyin "ni hao" ->
// "你好") before translating. The Translate Element backend
// (translate-pa.googleapis.com/v1/translateHtml) lacks that step and
// mistranslates such input, see google.unit.test.ts.
const GOOGLE_TRANSLATE_URL =
  'https://translate.googleapis.com/translate_a/single'

async function translateGoogleOne(
  text: string,
  targetLang: string,
): Promise<{ text: string; detectedLang?: string }> {
  const query = new URLSearchParams({
    client: 'gtx',
    sl: 'auto',
    tl: targetLang,
    ie: 'UTF-8',
    oe: 'UTF-8',
  })
  query.append('dt', 't')
  query.append('dt', 'qca')
  // `q` goes in the body so long inputs don't hit URL length limits.
  const resp = await fetch(`${GOOGLE_TRANSLATE_URL}?${query}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: new URLSearchParams({ q: text }).toString(),
  })

  if (!resp.ok) throw new Error(`Google translate failed: ${resp.status}`)

  const data = await resp.json()
  // data[0]: [[translatedSegment, sourceSegment, ...], ...]; data[2]: detected language
  const segments = (data[0] ?? []) as (string | null)[][]
  return {
    text: segments.map((s) => s?.[0] ?? '').join(''),
    detectedLang: typeof data[2] === 'string' ? data[2] : undefined,
  }
}

export async function translateGoogle(
  texts: string[],
  targetLang: string,
): Promise<TranslationResult> {
  const results = await Promise.all(
    texts.map((text) => translateGoogleOne(text, targetLang)),
  )
  return {
    texts: results.map((r) => r.text),
    detectedLang: results[0]?.detectedLang,
  }
}

export const google: Translator = {
  name: 'google',
  async translate(text, options) {
    // Lines without terminal punctuation get merged into one sentence by the
    // API ("你好\n世界" -> "Hello World"), so translate each line separately
    // to preserve line structure.
    const lines = text.split('\n')
    const indexed = lines
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => line.trim() !== '')
    if (indexed.length === 0) return text
    const result = await translateGoogle(
      indexed.map(({ line }) => line),
      options.to,
    )
    const out = [...lines]
    indexed.forEach(({ i }, j) => {
      out[i] = result.texts[j]
    })
    return out.join('\n')
  },
}
