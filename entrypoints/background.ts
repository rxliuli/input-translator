import { messaging } from '@/lib/messaging'
import { google } from '../lib/translate/google'
import { getMergedSettings } from '@/lib/settings'
import { openai } from '@/lib/translate/openai'

async function translate(tabId: number) {
  await messaging.sendMessage('triggerTranslate', undefined, tabId)
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async () => {
    browser.contextMenus.create({
      id: 'translate-text',
      title: 'Translate Text',
      contexts: ['selection'],
    })
  })

  messaging.onMessage('translateText', async (ev) => {
    const settings = await getMergedSettings()
    const client = settings.engine === 'google' ? google : openai
    try {
      return await client.translate(ev.data, { to: settings.to! })
    } catch (error) {
      console.error('translateText', error)
      return null
    }
  })

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.selectionText) {
      await translate(tab!.id!)
    }
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
