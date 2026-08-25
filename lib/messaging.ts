import { defineExtensionMessaging } from '@webext-core/messaging'

export type TranslateResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

export type ConnectionCheckResult =
  | { ok: true }
  | { ok: false; error: string }

interface ProtocolMap {
  // background => content
  getSelect(): string | null
  writeClipboard(text: string): Promise<void>
  triggerTranslate(): Promise<void>

  // content => background
  translateText(text: string): Promise<TranslateResult>

  // imp-connect content script => background
  impConnect(code: string): Promise<{ ok: boolean; error?: string }>

  // options page => background: validate the stored Imp key without calling
  // the model (401 == revoked/expired), so the Connected badge is honest.
  checkConnection(): Promise<ConnectionCheckResult>
}

export const messaging = defineExtensionMessaging<ProtocolMap>()
