import { Settings } from '../settings'

export interface Translator {
  name: Settings['engine']
  translate: (
    text: string,
    options: {
      to: string
    },
  ) => Promise<string>
}

// Batch-shaped result matching imp-translate's translator core, kept identical
// so the endpoint implementations can later be extracted into a shared package.
export interface TranslationResult {
  texts: string[]
  detectedLang?: string
}
