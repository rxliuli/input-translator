import { getMergedSettings } from '../settings'
import { IMP_API_BASE } from '../imp'
import { Translator } from './types'

/**
 * An error from the Imp Credits service, carrying the HTTP status so callers
 * can build a human-readable message without re-parsing response text.
 */
export class ApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Turns a raw error from `imp.translate` into a short, user-facing message.
 * The status codes are the Imp Credits connection/billing semantics, not a
 * generic provider's: 401 = this key is revoked/expired, 402 = out of
 * credits, 429 = rate limited.
 */
export function humanizeImpError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Your Imp connection has expired — reconnect in the extension settings'
    }
    if (error.status === 402) {
      return 'Insufficient credits — top up at https://imp.rxliuli.com/buy'
    }
    if (error.status === 429) {
      return 'Rate limited — try again in a moment'
    }
    if (error.status !== undefined && error.status >= 500) {
      return 'Imp Credits service error — try again later'
    }
  }
  const message = error instanceof Error ? error.message : String(error)
  if (message.toLowerCase().includes('failed to fetch')) {
    return 'Cannot reach the Imp Credits service — check your network'
  }
  return message
}

/**
 * The Imp Credits translator. The server owns the translation prompt, the
 * source-language detection, the model, and the chunking — the client only
 * sends the target language and the text. Unlike the Google engine (whose
 * gtx endpoint collapses lines), no line-splitting is needed here: the whole
 * selection is sent as a single `texts` element, matching how the OpenAI
 * engine treats the input.
 */
export const imp: Translator = {
  name: 'imp',
  async translate(text, { to }) {
    const settings = await getMergedSettings()
    const apiKey = settings.imp?.apiKey
    if (!apiKey) {
      throw new Error('Imp Credits is not connected — connect it in the extension settings')
    }
    const res = await fetch(`${IMP_API_BASE}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ to, texts: [text] }),
    })
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '')
      let message = `Imp Credits request failed (${res.status})`
      try {
        const body = JSON.parse(bodyText) as { error?: string }
        if (body.error) message = body.error
      } catch {
        // non-JSON error body — keep the status message
      }
      throw new ApiError(message, res.status)
    }
    const data = (await res.json()) as { texts?: unknown[] }
    const translated = data.texts?.[0]
    if (typeof translated !== 'string') {
      throw new Error('Imp Credits returned an unexpected response')
    }
    return translated
  },
}
