import { describe, it, expect, vi, beforeEach } from 'vitest'

// Merges query-string and form-body params of a fetch call.
function requestParams(url: string, init?: RequestInit): URLSearchParams {
  const params = new URLSearchParams(new URL(url).search)
  if (typeof init?.body === 'string') {
    for (const [k, v] of new URLSearchParams(init.body)) params.append(k, v)
  }
  return params
}

// Minimal gtx-shaped response: data[0] holds [translated, source] segments,
// data[2] the detected language.
function gtxResponse(segments: [string, string][], detected = 'en') {
  return {
    ok: true,
    json: async () => [segments, null, detected],
  }
}

describe('translateGoogle', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('calls the gtx endpoint with dt=t and dt=qca and the text in the body', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue(gtxResponse([['你好世界', 'Hello world']]))

    const { translateGoogle } = await import('./google')
    const result = await translateGoogle(['Hello world'], 'zh-CN')

    expect(result.texts).toEqual(['你好世界'])
    expect(result.detectedLang).toBe('en')
    const [url, init] = fetchMock.mock.calls[0]
    expect(new URL(url).pathname).toBe('/translate_a/single')
    expect(init.method).toBe('POST')
    const params = requestParams(url, init)
    expect(params.get('client')).toBe('gtx')
    expect(params.get('sl')).toBe('auto')
    expect(params.get('tl')).toBe('zh-CN')
    expect(params.getAll('dt')).toEqual(expect.arrayContaining(['t', 'qca']))
    expect(params.get('q')).toBe('Hello world')
    // q must live in the body, not the URL
    expect(new URL(url).searchParams.has('q')).toBe(false)
  })

  it('joins multiple sentence segments into one string', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue(
      gtxResponse(
        [
          ['Hello.\n', '你好。\n'],
          ['The world is big.', '世界很大。'],
        ],
        'zh-CN',
      ),
    )

    const { translateGoogle } = await import('./google')
    const result = await translateGoogle(['你好。\n世界很大。'], 'en')
    expect(result.texts).toEqual(['Hello.\nThe world is big.'])
    expect(result.detectedLang).toBe('zh-CN')
  })

  it('passes special characters through untouched', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue(
      gtxResponse([
        ['汤姆和杰瑞 <3 "引用" & 更多', 'Tom & Jerry <3 "quoted" & more'],
      ]),
    )

    const { translateGoogle } = await import('./google')
    const result = await translateGoogle(
      ['Tom & Jerry <3 "quoted" & more'],
      'zh-CN',
    )
    expect(result.texts).toEqual(['汤姆和杰瑞 <3 "引用" & 更多'])
    expect(
      requestParams(...(fetchMock.mock.calls[0] as [string, RequestInit])).get(
        'q',
      ),
    ).toBe('Tom & Jerry <3 "quoted" & more')
  })

  it('sends one request per text and keeps their order', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const q = requestParams(url, init).get('q')
      // Resolve the first request last to make sure ordering is by input, not arrival.
      if (q === 'First') await new Promise((r) => setTimeout(r, 5))
      return gtxResponse([[q === 'First' ? '第一' : '第二', q!]])
    })

    const { translateGoogle } = await import('./google')
    const result = await translateGoogle(['First', 'Second'], 'zh-CN')
    expect(result.texts).toEqual(['第一', '第二'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('throws on a non-ok response', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue({ ok: false, status: 429 })

    const { translateGoogle } = await import('./google')
    await expect(translateGoogle(['Hello'], 'zh')).rejects.toThrow('429')
  })
})

describe('google translator', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  function stubLineTranslations(map: Record<string, string>) {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const q = requestParams(url, init).get('q')!
      if (!(q in map)) throw new Error(`unexpected q: ${JSON.stringify(q)}`)
      return gtxResponse([[map[q], q]])
    })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('single-text adapter returns the translation', async () => {
    stubLineTranslations({ Hello: '你好' })
    const { google } = await import('./google')
    expect(await google.translate('Hello', { to: 'zh' })).toBe('你好')
  })

  it('translates each line separately to preserve line structure', async () => {
    const fetchMock = stubLineTranslations({
      'First line': '第一行',
      'Second line': '第二行',
    })

    const { google } = await import('./google')
    const result = await google.translate('First line\nSecond line', {
      to: 'zh',
    })

    expect(result).toBe('第一行\n第二行')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('preserves empty lines without sending them to the API', async () => {
    const fetchMock = stubLineTranslations({
      'Paragraph one': '第一段',
      'Paragraph two': '第二段',
    })

    const { google } = await import('./google')
    const result = await google.translate('Paragraph one\n\nParagraph two', {
      to: 'zh',
    })

    expect(result).toBe('第一段\n\n第二段')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns whitespace-only text unchanged without calling the API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { google } = await import('./google')
    expect(await google.translate('\n \n', { to: 'zh' })).toBe('\n \n')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('romanized input (regression: translate-pa translateHtml mistranslates)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  // Real responses recorded on 2026-08-19 for the romanized Bengali input
  // "Tumi ki koro" -> en. translate.google.com shows "What do you do?" because
  // its query-correction step (dt=qca) transliterates "Tumi ki koro" to
  // "তুমি কি করো" before translating. The Translate Element backend
  // (translate-pa.googleapis.com/v1/translateHtml) has no such step and feeds
  // the Latin text straight to the model, producing "Go to the heart".
  const TRANSLATE_PA_RESPONSE = [['Go to the heart'], ['bn']]
  const GTX_WITHOUT_QCA_RESPONSE = [
    [['Tumi ki koro', 'Tumi ki koro', null, null, 3]],
    null,
    'bn',
    null,
    null,
    null,
    1,
    [],
    [['bn'], null, [1], ['bn-Latn']],
  ]
  const GTX_WITH_QCA_RESPONSE = [
    [['what do you do', 'তুমি কি করো', null, null, 3]],
    null,
    'bn',
    null,
    null,
    null,
    1,
    [
      '<b><i>তুমি</i></b> <b><i>কি</i></b> <b><i>করো</i></b>',
      'তুমি কি করো',
      [6],
      null,
      null,
      true,
    ],
    [['bn'], null, [1], ['bn-Latn']],
  ]

  // Simulates how each real Google backend answers, so this test fails for an
  // implementation that talks to translateHtml (or to gtx without dt=qca).
  function fakeGoogleBackends(url: string, init?: RequestInit) {
    const u = new URL(url)
    let data: unknown
    if (u.pathname === '/translate_a/single') {
      const params = requestParams(url, init)
      expect(params.get('client')).toBe('gtx')
      expect(params.get('q')).toBe('Tumi ki koro')
      expect(params.get('tl')).toBe('en')
      data = params.getAll('dt').includes('qca')
        ? GTX_WITH_QCA_RESPONSE
        : GTX_WITHOUT_QCA_RESPONSE
    } else {
      data = TRANSLATE_PA_RESPONSE
    }
    return Promise.resolve({ ok: true, json: async () => data })
  }

  it('transliterates romanized Bengali before translating, like translate.google.com', async () => {
    const fetchMock = vi.fn(fakeGoogleBackends)
    vi.stubGlobal('fetch', fetchMock)

    const { google, translateGoogle } = await import('./google')
    expect(await google.translate('Tumi ki koro', { to: 'en' })).toBe(
      'what do you do',
    )

    const result = await translateGoogle(['Tumi ki koro'], 'en')
    expect(result.texts).toEqual(['what do you do'])
    expect(result.detectedLang).toBe('bn')
  })
})
