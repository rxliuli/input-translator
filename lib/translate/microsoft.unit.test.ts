import { describe, it, expect, vi, beforeEach } from 'vitest'

function mockMsAuthResponse(delay = 50) {
  return async () => {
    await new Promise((r) => setTimeout(r, delay))
    return { ok: true, text: async () => 'mock-token' }
  }
}

function mockMsTranslateResponse(texts: string[]) {
  return {
    ok: true,
    json: async () =>
      texts.map((t) => ({
        translations: [{ text: `[翻译] ${t}` }],
        detectedLanguage: { language: 'en' },
      })),
  }
}

describe('translateMicrosoft', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('maps results and detected language', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockImplementation(async (url: string | URL, init?: RequestInit) => {
      const u = url.toString()
      if (u.includes('translate/auth')) {
        return mockMsAuthResponse(0)()
      }
      const body = JSON.parse(init?.body as string)
      const texts = body.map((b: { Text: string }) => b.Text)
      return mockMsTranslateResponse(texts)
    })

    const { translateMicrosoft } = await import('./microsoft')
    const result = await translateMicrosoft(['hello', 'world'], 'zh')

    expect(result.texts).toEqual(['[翻译] hello', '[翻译] world'])
    expect(result.detectedLang).toBe('en')
  })

  it('single-text adapter returns the first translation', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockImplementation(async (url: string | URL, init?: RequestInit) => {
      const u = url.toString()
      if (u.includes('translate/auth')) {
        return mockMsAuthResponse(0)()
      }
      const body = JSON.parse(init?.body as string)
      const texts = body.map((b: { Text: string }) => b.Text)
      return mockMsTranslateResponse(texts)
    })

    const { microsoft } = await import('./microsoft')
    expect(await microsoft.translate('hello', { to: 'zh' })).toBe('[翻译] hello')
  })
})

describe('getMicrosoftToken dedup', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('concurrent translate calls should fetch auth only once', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    let authCallCount = 0
    fetchMock.mockImplementation(async (url: string | URL, init?: RequestInit) => {
      const u = url.toString()
      if (u.includes('translate/auth')) {
        authCallCount++
        return mockMsAuthResponse(50)()
      }
      const body = JSON.parse(init?.body as string)
      const texts = body.map((b: { Text: string }) => b.Text)
      return mockMsTranslateResponse(texts)
    })

    const { translateMicrosoft } = await import('./microsoft')

    await Promise.all([
      translateMicrosoft(['hello'], 'zh'),
      translateMicrosoft(['world'], 'zh'),
      translateMicrosoft(['foo'], 'zh'),
      translateMicrosoft(['bar'], 'zh'),
    ])

    expect(authCallCount).toBe(1)
  })

  it('cached token skips auth entirely', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    let authCallCount = 0
    fetchMock.mockImplementation(async (url: string | URL, init?: RequestInit) => {
      const u = url.toString()
      if (u.includes('translate/auth')) {
        authCallCount++
        return mockMsAuthResponse(0)()
      }
      const body = JSON.parse(init?.body as string)
      const texts = body.map((b: { Text: string }) => b.Text)
      return mockMsTranslateResponse(texts)
    })

    const { translateMicrosoft } = await import('./microsoft')

    await translateMicrosoft(['first'], 'zh')
    expect(authCallCount).toBe(1)

    await translateMicrosoft(['second'], 'zh')
    expect(authCallCount).toBe(1)
  })

  it('auth failure rejects all waiters', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    fetchMock.mockImplementation(async (url: string | URL) => {
      const u = url.toString()
      if (u.includes('translate/auth')) {
        await new Promise((r) => setTimeout(r, 30))
        return { ok: false, status: 500 }
      }
      return { ok: true, json: async () => [] }
    })

    const { translateMicrosoft } = await import('./microsoft')

    const results = await Promise.allSettled([
      translateMicrosoft(['a'], 'zh'),
      translateMicrosoft(['b'], 'zh'),
    ])

    expect(results[0].status).toBe('rejected')
    expect(results[1].status).toBe('rejected')
  })

  it('failed translate clears the cached token', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    let authCallCount = 0
    let failNext = true
    fetchMock.mockImplementation(async (url: string | URL, init?: RequestInit) => {
      const u = url.toString()
      if (u.includes('translate/auth')) {
        authCallCount++
        return mockMsAuthResponse(0)()
      }
      if (failNext) {
        failNext = false
        return { ok: false, status: 401 }
      }
      const body = JSON.parse(init?.body as string)
      const texts = body.map((b: { Text: string }) => b.Text)
      return mockMsTranslateResponse(texts)
    })

    const { translateMicrosoft } = await import('./microsoft')

    await expect(translateMicrosoft(['a'], 'zh')).rejects.toThrow('401')
    expect(authCallCount).toBe(1)

    const result = await translateMicrosoft(['b'], 'zh')
    expect(result.texts).toEqual(['[翻译] b'])
    expect(authCallCount).toBe(2)
  })
})
