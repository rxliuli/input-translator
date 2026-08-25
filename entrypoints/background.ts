import { messaging } from '@/lib/messaging'
import { google } from '../lib/translate/google'
import { getMergedSettings, setSyncSettings } from '@/lib/settings'
import { openai } from '@/lib/translate/openai'
import { microsoft } from '@/lib/translate/microsoft'
import { imp, humanizeImpError } from '@/lib/translate/imp'
import { IMP_API_BASE, IMP_ORIGIN } from '@/lib/imp'
import { langs, defaultPopularLanguages } from '@/lib/langs'

const MENU_PREFIX = 'translate-lang-'
const MENU_MORE_PREFIX = 'translate-more-'
const MENU_PARENT_ID = 'input-translator'
const MENU_MORE_ID = 'translate-more'
const MAX_RECENT = 5

async function translate(tabId: number) {
  await messaging.sendMessage('triggerTranslate', undefined, tabId)
}

function getTopLanguages(
  currentLang: string,
  recentLanguages: string[],
): string[] {
  const browserLang = navigator.language.toLowerCase().split('-')[0]
  const result = [currentLang]
  for (const lang of recentLanguages) {
    if (result.length >= MAX_RECENT) break
    if (!result.includes(lang)) result.push(lang)
  }
  for (const lang of defaultPopularLanguages) {
    if (result.length >= MAX_RECENT) break
    if (!result.includes(lang) && lang !== browserLang) result.push(lang)
  }
  return result
}

async function buildContextMenu() {
  await browser.contextMenus.removeAll()

  const settings = await getMergedSettings()
  const currentLang = settings.to || 'en'
  const recentLanguages = settings.recentLanguages || []
  const topLangs = getTopLanguages(currentLang, recentLanguages)

  browser.contextMenus.create({
    id: MENU_PARENT_ID,
    title: 'Input Translator',
    contexts: ['editable'],
  })

  for (const code of topLangs) {
    const label = langs[code] || code
    const isCurrent = code === currentLang
    browser.contextMenus.create({
      id: MENU_PREFIX + code,
      parentId: MENU_PARENT_ID,
      title: isCurrent ? `✓ ${label}` : `    ${label}`,
      contexts: ['editable'],
    })
  }

  browser.contextMenus.create({
    id: 'separator',
    parentId: MENU_PARENT_ID,
    type: 'separator',
    contexts: ['editable'],
  })

  browser.contextMenus.create({
    id: MENU_MORE_ID,
    parentId: MENU_PARENT_ID,
    title: 'More',
    contexts: ['editable'],
  })

  const topSet = new Set(topLangs)
  for (const [code, label] of Object.entries(langs)) {
    if (topSet.has(code)) continue
    browser.contextMenus.create({
      id: MENU_MORE_PREFIX + code,
      parentId: MENU_MORE_ID,
      title: label,
      contexts: ['editable'],
    })
  }
}

async function updateRecentLanguages(langCode: string) {
  const settings = await getMergedSettings()
  const recent = settings.recentLanguages || []
  const updated = [langCode, ...recent.filter((l) => l !== langCode)].slice(
    0,
    10,
  )
  await setSyncSettings({ recentLanguages: updated })
}

// The chrome-ai engine was removed in 0.6.0; users who had selected it fall
// back to the default engine.
async function migrateSettings() {
  const stored = await browser.storage.sync.get<{ engine?: string }>([
    'engine',
  ])
  const removals = ['chromeAiSourceLanguage']
  if (stored.engine === 'chrome-ai') {
    removals.push('engine')
  }
  await browser.storage.sync.remove(removals)
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    migrateSettings()
    buildContextMenu()
  })

  browser.runtime.onStartup.addListener(() => {
    buildContextMenu()
  })

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (
      areaName === 'sync' &&
      ('to' in changes || 'recentLanguages' in changes)
    ) {
      buildContextMenu()
    }
  })

  messaging.onMessage('translateText', async (ev) => {
    const settings = await getMergedSettings()
    const client =
      settings.engine === 'openai'
        ? openai
        : settings.engine === 'imp'
          ? imp
          : settings.engine === 'google'
            ? google
            : microsoft
    try {
      const text = await client.translate(ev.data, { to: settings.to! })
      await updateRecentLanguages(settings.to!)
      return { ok: true as const, text }
    } catch (error) {
      console.error('translateText', error)
      return {
        ok: false as const,
        error:
          settings.engine === 'imp'
            ? humanizeImpError(error)
            : error instanceof Error
              ? error.message
              : 'Failed to translate',
      }
    }
  })

  // Exchanges the one-time code the imp-connect content script read off the
  // success page's meta tag for a persistent Imp Credits API key. Only the
  // api key is persisted; the service origin/API base are constants
  // (lib/imp.ts) and the model is server-authoritative, so neither baseUrl
  // nor model is stored.
  messaging.onMessage('impConnect', async (message) => {
    const code = message.data
    try {
      const res = await fetch(`${IMP_ORIGIN}/api/connect/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        const error =
          (body as { error?: string } | null)?.error ??
          `Connect failed with status ${res.status}`
        return { ok: false, error }
      }
      const { apiKey } = body as { apiKey: string }
      await setSyncSettings({ engine: 'imp', imp: { apiKey } })
      return { ok: true }
    } catch (err) {
      console.error(
        'impConnect',
        err instanceof Error ? err.message : err,
      )
      return {
        ok: false,
        error: 'Could not reach the Imp Credits service — please retry.',
      }
    }
  })

  // Zero-cost status check for the options page: the stored Imp key is valid
  // iff GET {baseUrl}/me accepts it. The session cookie is excluded via
  // credentials: 'omit' — the check must reflect the KEY only, and /me
  // accepts session-OR-key, so a logged-in user's cookie would otherwise
  // make a revoked key still return 200 while real requests 401.
  messaging.onMessage('checkConnection', async () => {
    const settings = await getMergedSettings()
    const apiKey = settings.imp?.apiKey
    if (settings.engine !== 'imp' || !apiKey) {
      return { ok: false as const, error: 'not connected' }
    }
    try {
      const res = await fetch(`${IMP_API_BASE}/me`, {
        credentials: 'omit',
        headers: { authorization: `Bearer ${apiKey}` },
      })
      if (res.status === 401)
        return { ok: false as const, error: 'unauthorized' }
      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        return { ok: false as const, error: 'unexpected endpoint response' }
      }
      const body = (await res.json().catch(() => null)) as {
        email?: unknown
      } | null
      if (typeof body?.email !== 'string') {
        return { ok: false as const, error: 'unexpected endpoint response' }
      }
      return { ok: true as const }
    } catch (err) {
      console.error(
        'checkConnection',
        err instanceof Error ? err.message : err,
      )
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : 'network error',
      }
    }
  })

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab?.id) return

    let langCode: string | null = null

    if (
      typeof info.menuItemId === 'string' &&
      info.menuItemId.startsWith(MENU_PREFIX)
    ) {
      langCode = info.menuItemId.slice(MENU_PREFIX.length)
    } else if (
      typeof info.menuItemId === 'string' &&
      info.menuItemId.startsWith(MENU_MORE_PREFIX)
    ) {
      langCode = info.menuItemId.slice(MENU_MORE_PREFIX.length)
    }

    if (!langCode) return

    const settings = await getMergedSettings()
    if (langCode !== settings.to) {
      await setSyncSettings({ to: langCode })
      await updateRecentLanguages(langCode)
    }

    await translate(tab.id)
  })

  browser.commands.onCommand.addListener(async (command, tab) => {
    if (command === 'translate') {
      await translate(tab!.id!)
    }
  })

  browser.action.onClicked.addListener(async (tab) => {
    await translate(tab!.id!)
  })
})
