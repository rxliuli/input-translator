import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { readFile } from 'fs/promises'
import { BrowserCommands, locators } from '@vitest/browser/context'
import { BrowserCommandContext } from 'vitest/node'

type CustomCommand<K extends keyof BrowserCommands> = (
  context: BrowserCommandContext,
  ...args: Parameters<BrowserCommands[K]>
) => Promise<Awaited<ReturnType<BrowserCommands[K]>>>

const waitForDownload: CustomCommand<'waitForDownload'> = async (ctx) => {
  const download = await ctx.page.waitForEvent('download')
  return {
    suggestedFilename: download.suggestedFilename(),
    text: await readFile(await download.path(), 'utf-8'),
  }
}

const waitForUpload: CustomCommand<'waitForUpload'> = async (ctx, file) => {
  const fileChooser = await ctx.page.waitForEvent('filechooser')
  await fileChooser.setFiles({
    name: file.name,
    mimeType: file.mimeType,
    buffer: Buffer.from(file.text),
  })
}

const undo: CustomCommand<'undo'> = async (ctx) => {
  await ctx.page.keyboard.press('ControlOrMeta+Z')
}

const keydown: CustomCommand<'keydown'> = async (ctx, key) => {
  await ctx.page.keyboard.down(key)
}

const keyup: CustomCommand<'keyup'> = async (ctx, key) => {
  await ctx.page.keyboard.up(key)
}

const keypress: CustomCommand<'keypress'> = async (ctx, key) => {
  await ctx.page.keyboard.press(key)
}

declare module '@vitest/browser/context' {
  interface Locator {
    element(): HTMLElement
  }
  interface BrowserCommands {
    waitForDownload: () => Promise<{
      suggestedFilename: string
      text: string
    }>
    waitForUpload: (file: {
      name: string
      mimeType: string
      text: string
    }) => Promise<void>
    undo: () => Promise<void>

    keydown: (key: string) => Promise<void>
    keyup: (key: string) => Promise<void>
    keypress: (key: string) => Promise<void>
  }
}

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react(), tsconfigPaths()] as any,
        test: {
          exclude: ['**/*.unit.test.ts', 'node_modules/**'],
          browser: {
            enabled: true,
            provider: 'playwright',
            // https://vitest.dev/guide/browser/playwright
            instances: [{ browser: 'chromium', headless: true }],
            commands: {
              waitForDownload,
              waitForUpload,
              undo,
              keydown,
              keyup,
              keypress,
            },
          },
        },
      },
      {
        plugins: [tsconfigPaths()] as any,
        test: {
          include: ['**/*.unit.test.ts'],
          exclude: ['*.test.ts', 'node_modules/**'],
        },
      },
    ],
  },
})
