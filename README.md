# Input Translator

A lightweight browser extension for instant text translation in any input field.

## Features

- **Instant Translation** - Translate directly in input fields without switching tabs
- **Free by Default** - Uses Google Translate, no configuration required
- **AI Support** - Configure OpenAI API or compatible LLM providers (OpenRouter, etc.)
- **Universal Compatibility** - Works with text inputs and rich text editors

## Quick Start

1. Install the extension
2. Type in any input field
3. Press space 3 times to translate

## Usage

### Translation Triggers

- **Triple Space** - Press space 3 times to translate current input
- **Hotkey** - `Alt+T` (customizable)
- **Context Menu** - Right-click and select "Translate Text"

## Configuration

### Basic Settings

- Source Language: Auto-detect or manual selection
- Target Language: Set your preferred target language
- Custom hotkey configuration

### API Configuration (Optional)

**OpenAI:**

```sh
API Provider: OpenAI
API Key: sk-...
Model: gpt-4.1-mini
```

**OpenRouter or Compatible Services:**

```sh
API Provider: OpenAI
API Base URL: https://openrouter.ai/api/v1
API Key: your-api-key
Model: openai/gpt-4.1-mini
```

## Privacy

- No personal data collection
- API keys stored locally in browser
- Text only sent to configured translation service

## Installation

### Chrome/Edge

Download from [Chrome Web Store](https://chromewebstore.google.com/detail/namibphobdcighbjjojlhcflpnhobjeo) or install manually from releases

## License

GPL-3.0

---

[Report Issue](https://discord.gg/fErBc3wYrC) | [Star on GitHub](https://github.com/rxliuli/input-translator)
