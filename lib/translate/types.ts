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
