import { describe, it, expect, vi, beforeEach } from 'vitest'

// Tests the Imp Credits translator client (lib/translate/imp.ts). It reads
// the api key from settings (getMergedSettings -> browser.storage.sync), so
// the storage global is stubbed; fetch is stubbed per-test.
describe('imp translator', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  function stubSettings(partial: Record<string, unknown>) {
    vi.stubGlobal('browser', {
      storage: {
        sync: {
          get: async () => partial,
          set: async () => {},
        },
      },
    })
  }

  it('sends the text as a single-item batch and returns the first translation', async () => {
    stubSettings({ imp: { apiKey: 'test-key' } })
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ texts: ['你好'], from: 'en', usage: {} }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { imp } = await import('./imp')
    const result = await imp.translate('Hello', { to: 'zh' })

    expect(result).toBe('你好')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(url).toBe('https://imp.rxliuli.com/api/v1/translate')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      to: 'zh',
      texts: ['Hello'],
    })
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer test-key',
    )
  })

  it("throws a friendly error when the extension isn't connected", async () => {
    stubSettings({})
    const { imp } = await import('./imp')
    await expect(imp.translate('Hello', { to: 'zh' })).rejects.toThrow(
      'Imp Credits is not connected',
    )
  })

  it('throws an ApiError carrying the upstream status', async () => {
    stubSettings({ imp: { apiKey: 'test-key' } })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 402,
        text: async () => JSON.stringify({ error: 'insufficient balance' }),
      })),
    )

    const { imp, ApiError } = await import('./imp')
    await expect(imp.translate('Hello', { to: 'zh' })).rejects.toBeInstanceOf(
      ApiError,
    )
    await expect(imp.translate('Hello', { to: 'zh' })).rejects.toMatchObject({
      status: 402,
    })
  })
})

describe('humanizeImpError', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('maps 401 to a reconnect message', async () => {
    const { humanizeImpError, ApiError } = await import('./imp')
    expect(humanizeImpError(new ApiError('expired', 401))).toContain(
      'reconnect',
    )
  })

  it('maps 402 to a top-up message', async () => {
    const { humanizeImpError, ApiError } = await import('./imp')
    expect(humanizeImpError(new ApiError('insufficient', 402))).toContain(
      'top up',
    )
  })

  it('maps 429 to a retry message', async () => {
    const { humanizeImpError, ApiError } = await import('./imp')
    expect(humanizeImpError(new ApiError('rate', 429))).toContain(
      'Rate limited',
    )
  })

  it('maps 5xx to a service-error message', async () => {
    const { humanizeImpError, ApiError } = await import('./imp')
    expect(humanizeImpError(new ApiError('boom', 502))).toContain(
      'service error',
    )
  })

  it('falls back to the raw message for unknown errors', async () => {
    const { humanizeImpError } = await import('./imp')
    expect(humanizeImpError(new Error('something odd'))).toBe('something odd')
  })
})
