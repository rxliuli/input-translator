import { getMergedSettings } from '../settings'
import { Translator as InputTranslator } from './types'

export function isChromeAIAvailable(): boolean {
  return 'Translator' in globalThis
}

export async function checkLanguageModel(
  sourceLanguage: string,
  targetLanguage: string,
): Promise<'available' | 'downloadable' | 'unavailable'> {
  if (!('Translator' in globalThis)) {
    return 'unavailable'
  }
  try {
    const availability = await Translator!.availability({
      sourceLanguage,
      targetLanguage,
    })
    return availability === 'available' ? 'available' : 'downloadable'
  } catch (error) {
    return 'unavailable'
  }
}

export async function downloadLanguageModel(
  sourceLanguage: string,
  targetLanguage: string,
  onProgress: (progress: number) => void,
): Promise<void> {
  if (!('Translator' in globalThis)) {
    throw new Error('Chrome Translate API is not available.')
  }
  const availability = await Translator!.availability({
    sourceLanguage,
    targetLanguage,
  })
  if (availability === 'available') {
    return
  }
  await Translator!.create({
    sourceLanguage,
    targetLanguage,
    monitor(m) {
      m.addEventListener('downloadprogress', (e) => {
        onProgress(e.loaded)
      })
    },
  })
}

export const chrome: InputTranslator = {
  name: 'chrome-ai',
  async translate(text, options) {
    if (!('Translator' in globalThis)) {
      throw new Error('Chrome Translate API is not available.')
    }

    const settings = await getMergedSettings()
    if (!settings.chromeAiSourceLanguage) {
      throw new Error('Chrome AI source language is not set')
    }

    const sourceLanguage = settings.chromeAiSourceLanguage
    const targetLanguage = options.to

    // Check if the language model is available
    const availability = await Translator!.availability({
      sourceLanguage,
      targetLanguage,
    })

    if (availability !== 'available') {
      throw new Error(
        `Language model for ${sourceLanguage} -> ${targetLanguage} is not available. Please download it in settings.`,
      )
    }

    // Create translator and translate
    console.log('Creating Chrome AI translator', {
      sourceLanguage,
      targetLanguage,
    })
    const translator = await Translator!.create({
      sourceLanguage,
      targetLanguage,
    })
    const r = await translator.translate(text)
    console.log('Chrome AI translation result', text, r)
    return r
  },
}
