import {
  getActiveElement,
  getSelect,
  writeClipboard,
} from '@/lib/DOMEditorUtil'
import { InputLoader } from '@/lib/loading'
import { messaging } from '@/lib/messaging'
import { getEditSelection, isInputElement } from '@/lib/selection'
import { UniversalSpaceDetector } from '@/lib/UniversalSpaceDetector'

export default defineContentScript({
  matches: ['<all_urls>'],
  main: () => {
    messaging.onMessage('getSelect', getSelect)
    messaging.onMessage('writeClipboard', (ev) => writeClipboard(ev.data))
    messaging.onMessage('triggerTranslate', triggerTranslate)

    const loader = new InputLoader()
    async function triggerTranslate() {
      try {
        const activeElement = getActiveElement()
        loader.show(activeElement)
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
      } finally {
        loader.hide()
      }
    }

    new UniversalSpaceDetector(triggerTranslate)
  },
})
