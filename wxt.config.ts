import { defineConfig, UserManifest } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  modules: ['@wxt-dev/module-react', '@extport/wxt'],
  extport: {
    extension: 'ext_6VJwi5sSNN4Rl7awTTKs',
    safari: {
      appCategory: 'public.app-category.productivity',
      bundleIdentifier: 'com.rxliuli.Input-Translator',
      developmentTeam: 'N2X78TUUFG',
      issuerId: '48f39427-c063-4e33-98d2-31de80aad0be',
      keyId: '8N27UWG9RG',
    },
    // Daily anonymous usage ping + the Firefox data-collection declaration,
    // injected by @extport/wxt — see PRIVACY.md "Anonymous Usage Statistics".
    analytics: true,
  },
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      tsconfigPaths: true,
    },
  }),
  manifestVersion: 3,
  manifest: (env) => {
    const manifest: UserManifest = {
      name: 'Input Translator: AI Translate While Typing',
      description:
        'Translate text inside any input box in place. Press Space 3× or Alt+T on Discord, Slack & email — free Google/Microsoft or AI.',
      permissions: ['contextMenus', 'storage'],
      host_permissions: ['<all_urls>'],
      author: {
        email: 'rxliuli@gmail.com',
      },
      action: {
        default_icon: {
          '16': 'icon/16.png',
          '32': 'icon/32.png',
          '48': 'icon/48.png',
          '96': 'icon/96.png',
          '128': 'icon/128.png',
        },
      },
      commands: {
        translate: {
          suggested_key: {
            default: 'Alt+T',
          },
          description: 'Translate your input text with AI.',
        },
      },
      homepage_url: 'https://store.rxliuli.com/extensions/input-translator/',
    }
    if (env.browser === 'firefox') {
      manifest.browser_specific_settings = {
        gecko: {
          id: 'input-translator@rxliuli.com',
        },
      }
      // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/author
      // @ts-expect-error
      manifest.author = 'rxliuli'
    }
    if (env.browser === 'safari') {
      manifest.name = 'Input Translator'
    }
    return manifest
  },
  webExt: {
    disabled: true,
  },
})
