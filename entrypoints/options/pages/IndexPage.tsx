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
            <NativeSelectOption value="openai">OpenAI</NativeSelectOption>
            {import.meta.env.CHROME && isChromeAIAvailable() && (
              <NativeSelectOption value="chrome-ai">
                Chrome AI
              </NativeSelectOption>
            )}
          </NativeSelect>
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
        <NativeSelect
          value={sourceLanguage}
          onChange={(e) => onChange({ chromeAiSourceLanguage: e.target.value })}
        >
          {Object.entries(langs)
            .filter(([key]) => key !== 'auto')
            .map(([key, value]) => (
              <NativeSelectOption key={key} value={key}>
                {value}
              </NativeSelectOption>
            ))}
        </NativeSelect>
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
