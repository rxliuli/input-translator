import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

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
    await setSyncSettings(newSettings)
  }

  return (
    <div className="container mx-auto max-w-3xl py-6 md:py-10">
      <header className="mb-6 px-6 md:px-0 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Input Translator</h1>
        <a
          href="https://discord.gg/fErBc3wYrC"
          target="_blank"
          rel="noreferrer"
        >
          <Button variant="outline" size="icon" aria-label="Join Discord">
            <FaDiscord className="h-5 w-5 text-blue-500" />
          </Button>
        </a>
      </header>
      <Card>
        <CardContent>
          <form className="grid gap-6">
            <div className="grid gap-2">
              <Label>Translate Language</Label>
              <Select
                value={settings?.to ?? defaultSettings.to}
                onValueChange={(value) => handleChange({ to: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(langs).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Engine</Label>
              <Select
                value={settings?.engine ?? defaultSettings.engine}
                onValueChange={(value) =>
                  handleChange({ engine: value as Settings['engine'] })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an engine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.engine === 'openai' && (
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label>OpenAI API Key</Label>
                  <Input
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => handleChange({ apiKey: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>OpenAI Model</Label>
                  <Input
                    type="text"
                    value={settings.model ?? defaultSettings.model}
                    onChange={(e) => handleChange({ model: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>OpenAI Base URL</Label>
                  <Input
                    type="text"
                    value={settings.baseUrl ?? defaultSettings.baseUrl}
                    onChange={(e) => handleChange({ baseUrl: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>OpenAI Prompt</Label>
                  <Textarea
                    rows={4}
                    value={settings.prompt ?? defaultSettings.prompt}
                    onChange={(e) => handleChange({ prompt: e.target.value })}
                  />
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
