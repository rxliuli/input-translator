import { describe, it, expect, vi, beforeEach } from 'vitest'
import { decodeHTML } from './google'

describe('decodeHTML', () => {
  it('decodes the named entities Google Translate emits', () => {
    expect(decodeHTML('Tom &amp; Jerry')).toBe('Tom & Jerry')
    expect(decodeHTML('&lt;b&gt;bold&lt;/b&gt;')).toBe('<b>bold</b>')
    expect(decodeHTML('&quot;hi&quot;')).toBe('"hi"')
    expect(decodeHTML('it&apos;s')).toBe("it's")
    expect(decodeHTML('a&nbsp;b')).toBe('a b')
  })

  it('decodes decimal numeric entities', () => {
    expect(decodeHTML('it&#39;s')).toBe("it's")
    expect(decodeHTML('&#8364;')).toBe('€')
  })

  it('decodes hex numeric entities (lower and upper case)', () => {
    expect(decodeHTML('&#x27;')).toBe("'")
    expect(decodeHTML('&#X27;')).toBe("'")
    expect(decodeHTML('&#x1F600;')).toBe('😀')
  })

  it('leaves unknown named entities untouched', () => {
    expect(decodeHTML('&nosuch;')).toBe('&nosuch;')
  })

  it('leaves out-of-range numeric entities untouched', () => {
    expect(decodeHTML('&#9999999;')).toBe('&#9999999;')
  })

  it('handles mixed content', () => {
    expect(decodeHTML('A &amp; B &lt; C &#8364; D')).toBe('A & B < C € D')
  })

  it('returns input unchanged when no entities present', () => {
    expect(decodeHTML('plain text 中文')).toBe('plain text 中文')
  })
})

describe('translateGoogle', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('escapes input HTML and decodes entities in the response', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [['Tom &amp; Jerry &lt;3'], ['en']],
    })

    const { translateGoogle } = await import('./google')
    const result = await translateGoogle(['Tom & Jerry <3'], 'zh')

    expect(result.texts).toEqual(['Tom & Jerry <3'])
    expect(result.detectedLang).toBe('en')
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body[0][0]).toEqual(['Tom &amp; Jerry &lt;3'])
    expect(body[0][2]).toBe('zh')
  })

  it('single-text adapter returns the first translation', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [['你好'], ['en']],
    })

    const { google } = await import('./google')
    expect(await google.translate('Hello', { to: 'zh' })).toBe('你好')
  })

  it('throws on a non-ok response', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue({ ok: false, status: 429 })

    const { translateGoogle } = await import('./google')
    await expect(translateGoogle(['Hello'], 'zh')).rejects.toThrow('429')
  })
})
