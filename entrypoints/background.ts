import { messaging } from '@/lib/messaging'
import { google } from '../lib/translate/google'
import { getMergedSettings, setSyncSettings } from '@/lib/settings'
import { openai } from '@/lib/translate/openai'
import { chrome } from '@/lib/translate/chrome-ai'
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

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
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
      settings.engine === 'google'
        ? google
        : settings.engine === 'chrome-ai'
          ? chrome
          : openai
    try {
      const result = await client.translate(ev.data, { to: settings.to! })
      if (result) {
        await updateRecentLanguages(settings.to!)
      }
      return result
    } catch (error) {
      console.error('translateText', error)
      return null
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
