import { getSelect, writeClipboard } from '@/lib/DOMEditorUtil'
import { messaging } from '@/lib/messaging'
import { getEditSelection, isInputElement } from '@/lib/selection'

export default defineContentScript({
  matches: ['<all_urls>'],
  main: () => {
    messaging.onMessage('getSelect', getSelect)
    messaging.onMessage('writeClipboard', (ev) => writeClipboard(ev.data))
    messaging.onMessage('triggerTranslate', triggerTranslate)

    async function triggerTranslate() {
      const activeElement = document.activeElement
      if (!activeElement || !isInputElement(activeElement)) {
        alert('No active element')
        return
      }
      const selection = getEditSelection(activeElement)
      const textToTranslate = selection.hasSelection()
        ? selection.getSelection()
        : selection.getInputValue()
      if (!textToTranslate?.trim()) {
        alert('No text to translate')
        return
      }
      const translatedText = await messaging.sendMessage(
        'translateText',
        textToTranslate,
      )
      if (!translatedText) {
        alert('Failed to translate')
        return
      }
      let result = false
      if (selection.hasSelection()) {
        result = await selection.replaceSelection(translatedText)
      } else {
        result = await selection.replaceInputValue(translatedText)
      }
      if (!result) {
        alert('Failed to write')
      }
    }

    let spaceCount = 0
    let lastSpaceTime = 0
    const SPACE_THRESHOLD = 500
    document.addEventListener('keydown', async (event) => {
      if (event.code !== 'Space') {
        return
      }
      const currentTime = Date.now()
      if (currentTime - lastSpaceTime > SPACE_THRESHOLD) {
        spaceCount = 0
      }
      spaceCount++
      lastSpaceTime = currentTime
      if (spaceCount < 3) {
        return
      }
      lastSpaceTime = 0
      spaceCount = 0
      await triggerTranslate()
    })
  },
})
