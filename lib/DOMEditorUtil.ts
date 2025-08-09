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
