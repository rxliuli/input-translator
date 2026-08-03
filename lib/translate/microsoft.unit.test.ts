import { describe, it, expect, vi, beforeEach } from 'vitest'

const BING_PAGE = `
<html><body data-iid="translator.5023"><script>
var params_AbusePreventionHelper = [123456,"test-token",3600000];
_G={IG:"TESTIG123"};
</script></body></html>
`

function mockPageResponse(delay = 0) {
  return async () => {
    if (delay) await new Promise((r) => setTimeout(r, delay))
    return { ok: true, text: async () => BING_PAGE }
  }
}

function mockTranslateResponse(text: string, detected = 'en') {
  return {
    ok: true,
    json: async () => [
      {
        translations: [{ text }],
        detectedLanguage: { language: detected },
      },
    ],
  }
}

function setupFetch(
  onTranslate: (body: URLSearchParams, url: string) => any,
  pageDelay = 0,
) {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  let pageCalls = 0
  fetchMock.mockImplementation(async (url: string | URL, init?: RequestInit) => {
    const u = url.toString()
    if (u === 'https://www.bing.com/translator') {
      pageCalls++
      return mockPageResponse(pageDelay)()
    }
    const body = new URLSearchParams(init?.body as string)
    return onTranslate(body, u)
  })
  return { fetchMock, getPageCalls: () => pageCalls }
}

describe('translateMicrosoft', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('maps results and detected language', async () => {
    setupFetch((body) => mockTranslateResponse(`[翻译] ${body.get('text')}`))

    const { translateMicrosoft } = await import('./microsoft')
    const result = await translateMicrosoft(['hello', 'world'], 'zh-cn')

    expect(result.texts).toEqual(['[翻译] hello', '[翻译] world'])
    expect(result.detectedLang).toBe('en')
  })

  it('sends session params and maps language codes to Bing codes', async () => {
    let seen: { url?: string; to?: string; token?: string } = {}
    setupFetch((body, url) => {
      seen = { url, to: body.get('to')!, token: body.get('token')! }
      return mockTranslateResponse('你好')
    })

    const { translateMicrosoft } = await import('./microsoft')
    await translateMicrosoft(['hello'], 'zh-cn')

    expect(seen.url).toContain('IG=TESTIG123')
    expect(seen.url).toContain('IID=translator.5023')
    expect(seen.to).toBe('zh-Hans')
    expect(seen.token).toBe('test-token')
  })

  it('single-text adapter returns the first translation', async () => {
    setupFetch((body) => mockTranslateResponse(`[翻译] ${body.get('text')}`))

    const { microsoft } = await import('./microsoft')
    expect(await microsoft.translate('hello', { to: 'ja' })).toBe('[翻译] hello')
  })

  it('concurrent translate calls fetch the session page only once', async () => {
    const { getPageCalls } = setupFetch(
      (body) => mockTranslateResponse(`[翻译] ${body.get('text')}`),
      50,
    )

    const { translateMicrosoft } = await import('./microsoft')
    await Promise.all([
      translateMicrosoft(['hello'], 'ja'),
      translateMicrosoft(['world'], 'ja'),
      translateMicrosoft(['foo'], 'ja'),
    ])

    expect(getPageCalls()).toBe(1)
  })

  it('cached session skips the page fetch entirely', async () => {
    const { getPageCalls } = setupFetch((body) =>
      mockTranslateResponse(`[翻译] ${body.get('text')}`),
    )

    const { translateMicrosoft } = await import('./microsoft')
    await translateMicrosoft(['first'], 'ja')
    expect(getPageCalls()).toBe(1)
    await translateMicrosoft(['second'], 'ja')
    expect(getPageCalls()).toBe(1)
  })

  it('expired token response refreshes the session and retries once', async () => {
    let translateCalls = 0
    const { getPageCalls } = setupFetch((body) => {
      translateCalls++
      if (translateCalls === 1) {
        return { ok: true, json: async () => ({ statusCode: 400 }) }
      }
      return mockTranslateResponse(`[翻译] ${body.get('text')}`)
    })

    const { translateMicrosoft } = await import('./microsoft')
    const result = await translateMicrosoft(['hello'], 'ja')

    expect(result.texts).toEqual(['[翻译] hello'])
    expect(translateCalls).toBe(2)
    expect(getPageCalls()).toBe(2)
  })

  it('persistent failure throws after one retry', async () => {
    setupFetch(() => ({ ok: false, status: 429 }))

    const { translateMicrosoft } = await import('./microsoft')
    await expect(translateMicrosoft(['hello'], 'ja')).rejects.toThrow('429')
  })

  it('throws when the page layout changed and session cannot be parsed', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue({ ok: true, text: async () => '<html></html>' })

    const { translateMicrosoft } = await import('./microsoft')
    await expect(translateMicrosoft(['hello'], 'ja')).rejects.toThrow(
      'page layout changed',
    )
  })
})
