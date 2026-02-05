import { InputLoader } from '@/lib/loading'
import { messaging } from '@/lib/messaging'
import {
  getActiveElement,
  getEditSelection,
  getSelect,
  isInputElement,
  writeClipboard,
} from '@/lib/selection'
import { getMergedSettings } from '@/lib/settings'
import { UniversalSpaceDetector } from '@/lib/UniversalSpaceDetector'

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  main: async () => {
    messaging.onMessage('getSelect', getSelect)
    messaging.onMessage('writeClipboard', (ev) => writeClipboard(ev.data))
    messaging.onMessage('triggerTranslate', triggerTranslate)

    const loader = new InputLoader()
    async function triggerTranslate() {
      if (loader.visible) {
        console.debug('Loader is already visible, skipping translation')
        return
      }

      try {
        const activeElement = getActiveElement()
        if (activeElement instanceof HTMLIFrameElement) {
          console.debug('Active element is an iframe, skipping translation')
          return
        }
        if (!activeElement || !isInputElement(activeElement)) {
          if (top !== window) {
            console.debug(
              'Active element is not in the iframe, skipping translation',
            )
            return
          }
          console.log('No active element', location.href)
          alert('No active element')
          return
        }
        loader.show(activeElement)
        const selection = getEditSelection(activeElement)
        const textToTranslate = selection.hasSelection()
          ? selection.getSelection()
          : selection.getInputValue()
        if (!textToTranslate?.trim()) {
          alert('No text to translate')
          return
        }
        console.debug('Translating text:', JSON.stringify(textToTranslate))
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

    const spaceDetector = new UniversalSpaceDetector(triggerTranslate)

    const settings = await getMergedSettings()
    if (settings.enableTripleSpace !== false) {
      spaceDetector.enable()
    }

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && 'enableTripleSpace' in changes) {
        if (changes.enableTripleSpace.newValue !== false) {
          spaceDetector.enable()
        } else {
          spaceDetector.disable()
        }
      }
    })
  },
})
