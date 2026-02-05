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
import {
  isChromeAIAvailable,
  checkLanguageModel,
  downloadLanguageModel,
} from '@/lib/translate/chrome-ai'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
                  {import.meta.env.CHROME && isChromeAIAvailable() && (
                    <SelectItem value="chrome-ai">Chrome AI</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {settings.engine === 'openai' && (
              <OpenAISettings settings={settings} onChange={handleChange} />
            )}
            {settings.engine === 'chrome-ai' && (
              <ChromeAISettings settings={settings} onChange={handleChange} />
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
        </CardContent>
      </Card>
    </div>
  )
}

function ChromeAISettings(props: {
  settings: Settings
  onChange: (value: Partial<Settings>) => void
}) {
  const { settings, onChange } = props
  const [modelStatus, setModelStatus] = useState<
    'checking' | 'available' | 'downloadable' | 'unavailable'
  >('checking')
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

  const sourceLanguage =
    settings.chromeAiSourceLanguage ?? defaultSettings.chromeAiSourceLanguage!
  const targetLanguage = settings.to ?? defaultSettings.to!

  useEffect(() => {
    const checkModel = async () => {
      setModelStatus('checking')
      const status = await checkLanguageModel(sourceLanguage, targetLanguage)
      setModelStatus(status)
    }
    checkModel()
  }, [sourceLanguage, targetLanguage])

  const handleDownload = async () => {
    try {
      setDownloading(true)
      setDownloadProgress(0)
      await downloadLanguageModel(sourceLanguage, targetLanguage, (progress) => {
        setDownloadProgress(progress)
      })
      setModelStatus('available')
    } catch (error) {
      console.error('Failed to download language model:', error)
    } finally {
      setDownloading(false)
      setDownloadProgress(0)
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Label>Source Language (Input Language)</Label>
        <Select
          value={sourceLanguage}
          onValueChange={(value) =>
            onChange({ chromeAiSourceLanguage: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select source language" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(langs)
              .filter(([key]) => key !== 'auto')
              .map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Language Model Status</Label>
        {modelStatus === 'checking' && (
          <Alert>
            <AlertDescription>Checking language model...</AlertDescription>
          </Alert>
        )}
        {modelStatus === 'available' && (
          <Alert>
            <AlertDescription>
              Language model for {sourceLanguage} → {targetLanguage} is
              available
            </AlertDescription>
          </Alert>
        )}
        {modelStatus === 'downloadable' && (
          <div className="grid gap-2">
            <Alert>
              <AlertDescription>
                Language model for {sourceLanguage} → {targetLanguage} needs to
                be downloaded before use
              </AlertDescription>
            </Alert>
            {!downloading && (
              <Button onClick={handleDownload}>Download Language Model</Button>
            )}
            {downloading && (
              <div className="grid gap-2">
                <Progress value={downloadProgress} />
                <p className="text-sm text-muted-foreground">
                  Downloading... {Math.round(downloadProgress)}%
                </p>
              </div>
            )}
          </div>
        )}
        {modelStatus === 'unavailable' && (
          <Alert variant="destructive">
            <AlertDescription>
              Language model for {sourceLanguage} → {targetLanguage} is not
              supported
            </AlertDescription>
          </Alert>
        )}
      </div>
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
