import { getSelect } from './DOMEditorUtil'

interface Selection {
  hasSelection: () => boolean

  getSelection: () => string
  replaceSelection: (text: string) => boolean | Promise<boolean>

  getInputValue: () => string
  replaceInputValue: (text: string) => boolean | Promise<boolean>
}

export function inputOrTextareaSelection(
  element: HTMLInputElement | HTMLTextAreaElement,
): Selection {
  const replaceSelection = (text: string): boolean => {
    const doc = element.ownerDocument || document
    const u = element.selectionStart
    const v = element.selectionEnd
    if (u == null || v == null || u === v) {
      return false
    }

    element.focus()

    // beforeinput: delete
    const delEvt = new InputEvent('beforeinput', {
      inputType: 'deleteContentBackward',
      data: null,
      bubbles: true,
      cancelable: true,
    })
    const delPrevented = !element.dispatchEvent(delEvt)
    if (!delPrevented) {
      // @deprecated
      doc.execCommand('delete', false)
      // beforeinput: insert
      const insEvt = new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: text,
        bubbles: true,
        cancelable: true,
      })
      const insPrevented = !element.dispatchEvent(insEvt)
      if (!insPrevented) {
        // @deprecated
        doc.execCommand('insertText', false, text)
        // input 事件
        const inputEvt = new Event('input', {
          bubbles: true,
          cancelable: true,
        })
        element.dispatchEvent(inputEvt)
      }
    }
    return true
  }
  return {
    hasSelection: () => {
      const start = element.selectionStart
      const end = element.selectionEnd
      return start !== end && start !== null && end !== null
    },
    getSelection: () => {
      const start = element.selectionStart
      const end = element.selectionEnd
      if (start !== end && start !== null && end !== null) {
        return element.value.slice(start, end)
      }
      return ''
    },
    replaceSelection,
    getInputValue: () => {
      return element.value
    },
    replaceInputValue: async (text: string) => {
      element.select()
      return replaceSelection(text)
    },
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function isInputOrTextarea(
  el: Element,
): el is HTMLInputElement | HTMLTextAreaElement {
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'
}

function selectAll(el: Element) {
  const doc = el.ownerDocument || document
  const sel = doc.getSelection?.()
  if (!sel) return
  const range = doc.createRange()
  range.selectNodeContents(el)
  sel.removeAllRanges()
  sel.addRange(range)
}

function dispatchInput(el: Element) {
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

async function tryPaste(text: string, el: Element, stepDelayMs: number) {
  await sleep(10)
  try {
    // 合成粘贴事件（有站点/浏览器会拦截，故仅为尝试）
    const dt = new DataTransfer()
    dt.setData('text/plain', text)
    const evt = new ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    })
    el.dispatchEvent(evt)
    await sleep(stepDelayMs)
  } catch {
    // ignore
  }
}

export async function tryExecCommandInsertText(
  text: string,
  el: Element,
  stepDelayMs: number,
) {
  const doc = el.ownerDocument || document
  try {
    const selected = getSelect()
    if (!selected) {
      if (isInputOrTextarea(el) && el.value) {
        el.select()
      } else if (!isInputOrTextarea(el)) {
        selectAll(el)
      }
    }
    // 有些浏览器不再推荐 execCommand，但仍兼容
    // 插入时将 \n 替换为 \r 与原实现一致（有些输入控件依赖此行为）
    // 这里保留 \n 写入；需要完全一致可改为 text.replace(/\n/g, '\r')
    // @deprecated
    doc.execCommand('insertText', false, text)
    await sleep(stepDelayMs)
    // 兜底：对 input/textarea，直接赋值
    if (isInputOrTextarea(el)) {
      if (el.value !== text) {
        if (selected) {
          el.value = el.value.replace(selected, text)
        } else {
          el.value = text
        }
        dispatchInput(el)
      }
    }
  } catch {
    // ignore
  }
}

export function editableSelection(element: HTMLElement): Selection {
  const getInputValue = () => {
    return element.innerText || element.textContent || ''
  }
  const getSelection = () => {
    const selection = window.getSelection()
    return selection?.toString() || ''
  }

  async function checkWriteSuccess(tryFn: () => Promise<void>, text: string) {
    const beforeContent = getInputValue()
    await tryFn()
    const afterContent = getInputValue()
    if (afterContent.trim().length === 0) {
      return false
    }
    if (afterContent.includes(text)) {
      return true
    }
    // Check if content has changed, likely successful despite formatting differences
    if (
      afterContent !== beforeContent &&
      afterContent.trim() !== beforeContent.trim()
    ) {
      console.debug(
        'Content changed, likely successful despite formatting differences',
      )
      return true
    }

    // normalize
    const normalizeText = (str: string) => str.replace(/\s+/g, ' ').trim()
    const normalizedAfter = normalizeText(afterContent)
    const normalizedText = normalizeText(text)

    if (normalizedAfter.includes(normalizedText)) {
      console.debug('Text found after normalization')
      return true
    }
  }

  const replaceSelection = async (
    text: string,
    all = false,
  ): Promise<boolean> => {
    // contentEditable 的删除尝试（可选）
    // try {
    //   if (!isInputOrTextarea(element) && getInputValue().trim() !== '') {
    //     // @deprecated
    //     document.execCommand('delete')
    //     await sleep(10)
    //   }
    // } catch {
    //   /* ignore */
    // }

    // try paste
    if (all) {
      selectAll(element)
    }
    if (await checkWriteSuccess(() => tryPaste(text, element, 100), text)) {
      return true
    }
    // try command
    if (
      await checkWriteSuccess(
        () => tryExecCommandInsertText(text, element, 100),
        text,
      )
    ) {
      return true
    }
    return false
  }
  return {
    hasSelection: () => !!getSelection(),
    getSelection,
    replaceSelection,
    getInputValue,
    replaceInputValue: (text: string) => replaceSelection(text, true),
  }
}

export function isInputElement(
  element: Element | null,
): element is HTMLElement {
  if (!element) {
    return false
  }

  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element.getAttribute('contenteditable') === 'true' ||
    element.getAttribute('role') === 'textbox'
  )
}

export function getEditSelection(element: HTMLElement): Selection {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return inputOrTextareaSelection(element)
  }
  return editableSelection(element)
}
