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
            <NativeSelectOption value="microsoft">Microsoft</NativeSelectOption>
            <NativeSelectOption value="google">Google</NativeSelectOption>
            <NativeSelectOption value="openai">OpenAI</NativeSelectOption>
          </NativeSelect>
        </div>

        {settings.engine === 'openai' && (
          <OpenAISettings settings={settings} onChange={handleChange} />
        )}

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
