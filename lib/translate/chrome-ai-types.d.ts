export declare global {
  type DetectResult = {
    detectedLanguage: string
    confidence: number
  }

  type LanguageDetectorType = {
    detect: (text: string) => Promise<DetectResult[]>
  }
  const LanguageDetector:
    | {
        availability(): Promise<'available' | 'downloadable'>
        create(options: {
          monitor?(m: {
            addEventListener: (
              type: 'downloadprogress',
              listener: (ev: { loaded: number }) => void,
            ) => void
          }): void
        }): Promise<LanguageDetectorType>
      }
    | undefined

  type TranslatorType = {
    translate(text: string): Promise<string>
  }
  const Translator:
    | {
        availability(options: {
          sourceLanguage: string
          targetLanguage: string
        }): Promise<'available' | 'downloadable'>
        create(options: {
          sourceLanguage: string
          targetLanguage: string
          monitor?(m: {
            addEventListener: (
              type: 'downloadprogress',
              listener: (ev: { loaded: number }) => void,
            ) => void
          }): void
        }): Promise<TranslatorType>
      }
    | undefined
}
