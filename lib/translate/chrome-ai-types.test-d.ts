import './chrome-ai-types'
import { assert, describe, expectTypeOf, it } from 'vitest'

describe('chrome-ai types', () => {
  it('LanguageDetector', async () => {
    expectTypeOf(LanguageDetector).toExtend<object | undefined>()
    assert(LanguageDetector)
    expectTypeOf(await LanguageDetector.availability()).toExtend<
      'available' | 'downloadable'
    >()
    const detector = await LanguageDetector.create({
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          expectTypeOf(e.loaded).toBeNumber()
        })
      },
    })
    expectTypeOf(detector.detect).toBeFunction()
    expectTypeOf(detector.detect).parameter(0).toBeString()
    expectTypeOf(detector.detect).returns.toExtend<Promise<DetectResult[]>>()
    const results = await detector.detect('Hello world')
    expectTypeOf(results[0]).toEqualTypeOf<{
      detectedLanguage: string
      confidence: number
    }>()
  })
  it('Translator', async () => {
    expectTypeOf(Translator).toExtend<object | undefined>()
    assert(Translator)
    expectTypeOf(
      await Translator.availability({
        sourceLanguage: 'en',
        targetLanguage: 'ja',
      }),
    ).toExtend<'available' | 'downloadable'>()
    const translator = await Translator.create({
      sourceLanguage: 'en',
      targetLanguage: 'ja',
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          expectTypeOf(e.loaded).toBeNumber()
        })
      },
    })
    expectTypeOf(translator.translate).toBeFunction()
    expectTypeOf(translator.translate).parameter(0).toBeString()
    expectTypeOf(translator.translate).returns.toExtend<Promise<string>>()
    const translated = await translator.translate('Hello world')
    expectTypeOf(translated).toBeString()
  })
})
