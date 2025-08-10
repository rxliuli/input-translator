export function getSelect(): string | null {
  const selection = getSelection()
  if (!selection || selection.type === 'None') {
    return null
  }
  return selection.toString()
}

export async function writeClipboard(text: string) {
  await navigator.clipboard.writeText(text)
}

export function getActiveElement(): HTMLElement | null {
  const element = document.activeElement as HTMLElement
  const shadowRoot = element.shadowRoot
  if (!shadowRoot) {
    return element
  }
  const shadowElement = shadowRoot.activeElement as HTMLElement
  if (!shadowElement) {
    return element
  }
  return shadowElement
}
