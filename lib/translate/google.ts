import {
  ITranslatorHandler,
  Translator as GoogleTranslator,
} from '@liuli-util/google-translate-api-free'
import { Translator } from './types'

class TranslatorHandler implements ITranslatorHandler {
  async handle<T>(url: string): Promise<T> {
    const resp = await fetch(url)
    const r = await resp.json()
    return r as T
  }
}

export const google: Translator = {
  name: 'google',
  translate: async (text: string, options: { to: string }) => {
    const translator = new GoogleTranslator(new TranslatorHandler())
    const r = await translator.translate(text, { to: options.to as any })
    return r.text
  },
}
