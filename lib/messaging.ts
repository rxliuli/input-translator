import { defineExtensionMessaging } from '@webext-core/messaging'

interface ProtocolMap {
  // background => content
  getSelect(): string | null
  writeClipboard(text: string): Promise<void>
  triggerTranslate(): Promise<void>

  // content => background
  translateText(text: string): Promise<string | null>
}

export const messaging = defineExtensionMessaging<ProtocolMap>()
