import { describe, it, expect } from 'vitest'
import { google, translateGoogle } from './google'

// Hits the real Google endpoint. Exists because the romanized-input bug
// (see google.unit.test.ts) was a difference in real backend behaviour that
// no mocked test could have caught. Assertions ignore case and punctuation so
// that only a change in backend behaviour turns this red.
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()

describe('google (live)', { timeout: 30_000 }, () => {
  it('handles romanized Bengali like translate.google.com', async () => {
    const out = await google.translate('Tumi ki koro', { to: 'en' })
    expect(['what do you do', 'what are you doing']).toContain(norm(out))

    const { detectedLang } = await translateGoogle(['Tumi ki koro'], 'en')
    expect(detectedLang).toBe('bn')
  })

  it('gives the same result for native-script input', async () => {
    const out = await google.translate('তুমি কি করো', { to: 'en' })
    expect(['what do you do', 'what are you doing']).toContain(norm(out))
  })

  it('handles romanized Hindi and pinyin', async () => {
    expect(norm(await google.translate('aap kaise ho', { to: 'en' }))).toBe(
      'how are you',
    )
    expect(norm(await google.translate('ni hao', { to: 'en' }))).toBe('hello')
  })

  it('preserves line structure including blank lines', async () => {
    const out = await google.translate('你好\n\n世界很大。', { to: 'en' })
    const lines = out.split('\n')
    expect(lines).toHaveLength(3)
    expect(norm(lines[0])).toBe('hello')
    expect(lines[1]).toBe('')
    expect(norm(lines[2])).toContain('world')
  })

  it('translates into Chinese', async () => {
    const out = await google.translate('Hello world', { to: 'zh-CN' })
    expect(out).toContain('世界')
  })
})
