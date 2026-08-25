import { Label } from '@/components/ui/label'
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select'
import { langs } from './constants/lang'
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  getDefaultSettings,
  getSettings,
  setSyncSettings,
  Settings,
} from '@/lib/settings'
import { messaging } from '@/lib/messaging'
import { IMP_CONNECT_URL } from '@/lib/imp'
import { cn } from '@/lib/utils'
import { FaDiscord } from 'react-icons/fa'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

const defaultSettings = getDefaultSettings()

export function IndexPage() {
  const [settings, setSettings] = useState<Settings>({})

  useEffect(() => {
    ;(async () => {
      const settings = await getSettings()
      if (settings) {
        setSettings(settings)
      }
    })()
  }, [])

  // Reload settings whenever storage changes so the options page picks up a
  // new Imp key the connect flow writes in the background (engine + imp)
  // without a manual refresh — the Connected badge re-renders and re-checks
  // because it depends on the key.
  useEffect(() => {
    const listener = () => {
      ;(async () => {
        const settings = await getSettings()
        if (settings) setSettings(settings)
      })()
    }
    browser.storage.onChanged.addListener(listener)
    return () => browser.storage.onChanged.removeListener(listener)
  }, [])

  async function handleChange(value: Partial<Settings>) {
    const newSettings = {
      ...settings,
      ...value,
    } as Settings
    setSettings(newSettings)
    console.log('Saving settings:', newSettings)
    await setSyncSettings(newSettings)
  }

  return (
    <div className="mx-auto max-w-md p-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Input Translator</h1>
          <a
            href="https://store.rxliuli.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Explore our other extensions
          </a>
        </div>
        <a
          href="https://discord.gg/gFhKUthc88"
          target="_blank"
          rel="noreferrer"
        >
          <Button variant="outline" size="icon" aria-label="Join Discord">
            <FaDiscord className="h-5 w-5 text-blue-500" />
          </Button>
        </a>
      </header>
      <form className="grid gap-6">
        <div className="grid gap-2">
          <Label>Translate Language</Label>
          <NativeSelect
            value={settings?.to ?? defaultSettings.to}
            onChange={(e) => handleChange({ to: e.target.value })}
          >
            {Object.entries(langs).map(([key, value]) => (
              <NativeSelectOption key={key} value={key}>
                {value}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="grid gap-2">
          <Label>Engine</Label>
          <NativeSelect
            value={settings?.engine ?? defaultSettings.engine}
            onChange={(e) =>
              handleChange({ engine: e.target.value as Settings['engine'] })
            }
          >
            <NativeSelectOption value="google">Google</NativeSelectOption>
            <NativeSelectOption value="microsoft">Microsoft</NativeSelectOption>
            <NativeSelectOption value="imp">Imp Credits</NativeSelectOption>
            <NativeSelectOption value="openai">OpenAI</NativeSelectOption>
          </NativeSelect>
        </div>

        {settings.engine === 'openai' && (
          <OpenAISettings settings={settings} onChange={handleChange} />
        )}

        {settings.engine === 'imp' && <ImpCreditsSection settings={settings} />}

        <div className="grid gap-2">
          <Label htmlFor="triple-space">Triple-Space to Translate</Label>
          <Switch
            id="triple-space"
            checked={settings?.enableTripleSpace ?? defaultSettings.enableTripleSpace}
            onCheckedChange={(checked) => handleChange({ enableTripleSpace: checked })}
          />
        </div>
      </form>
    </div>
  )
}

function OpenAISettings(props: {
  settings: Settings
  onChange: (value: Partial<Settings>) => void
}) {
  const { settings, onChange } = props
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Label>OpenAI API Key</Label>
        <Input
          type="password"
          value={settings.apiKey}
          onChange={(e) => onChange({ apiKey: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>OpenAI Model</Label>
        <Input
          type="text"
          value={settings.model ?? defaultSettings.model}
          onChange={(e) => onChange({ model: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>OpenAI Base URL</Label>
        <Input
          type="text"
          value={settings.baseUrl ?? defaultSettings.baseUrl}
          onChange={(e) => onChange({ baseUrl: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>OpenAI Prompt</Label>
        <Textarea
          rows={4}
          value={settings.prompt ?? defaultSettings.prompt}
          onChange={(e) => onChange({ prompt: e.target.value })}
        />
      </div>
    </div>
  )
}

function ImpCreditsSection({ settings }: { settings: Settings }) {
  const connected = !!settings.imp?.apiKey
  const [connStatus, setConnStatus] = useState<
    'idle' | 'checking' | 'connected' | 'disconnected' | 'unknown'
  >('idle')

  // Auto-verify the stored Imp key when this section shows (and whenever the
  // key changes), so the Connected badge reflects whether the key is still
  // valid rather than just "we have a stored key". Never calls the model —
  // see background.ts's checkConnection handler.
  useEffect(() => {
    if (!connected) {
      setConnStatus('idle')
      return
    }
    let cancelled = false
    setConnStatus('checking')
    ;(async () => {
      let next: 'connected' | 'disconnected' | 'unknown'
      try {
        const result = await messaging.sendMessage('checkConnection')
        next = result.ok ? 'connected' : 'disconnected'
      } catch {
        next = 'unknown'
      }
      if (!cancelled) setConnStatus(next)
    })()
    return () => {
      cancelled = true
    }
  }, [connected, settings.imp?.apiKey])

  function connect() {
    browser.tabs.create({ url: IMP_CONNECT_URL })
  }

  const statusInfo = {
    idle: { dot: 'bg-muted', label: 'Not connected' },
    checking: {
      dot: 'bg-muted animate-pulse',
      label: 'Checking connection…',
    },
    connected: { dot: 'bg-green-500', label: 'Connected to Imp Credits' },
    disconnected: {
      dot: 'bg-red-500',
      label: 'Connection lost — reconnect',
    },
    unknown: { dot: 'bg-amber-500', label: "Couldn't verify connection" },
  }[connStatus]

  return (
    <div className="grid gap-4">
      {connected ? (
        <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span
              className={cn('size-2 shrink-0 rounded-full', statusInfo.dot)}
            />
            <span className="truncate">{statusInfo.label}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={connect}>
              Reconnect
            </Button>
          </div>
        </div>
      ) : (
        <Button className="w-full" onClick={connect}>
          Connect Imp Credits
        </Button>
      )}
    </div>
  )
}
