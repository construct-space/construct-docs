# Providers

The provider system abstracts AI model access behind a unified interface. The operator supports multiple providers simultaneously and can switch between them per-agent or per-request.

## Provider Interface

**File**: `internal/provider/provider.go`

Every provider implements:

```go
type Provider interface {
    ID() string
    Name() string
    Models() []Model
    Complete(request Request) (Response, error)
    Stream(request Request) (Stream, error)
    Ping() error
}

type Model struct {
    ID          string
    Name        string
    MaxTokens   int
    Capabilities []string   // "vision", "tools", "streaming"
}
```

`Complete()` is for one-shot calls. `Stream()` returns a channel-based stream for real-time responses.

## Supported Providers

| Provider | Package | Auth Method | Notable |
|----------|---------|-------------|---------|
| **Anthropic** | `provider/anthropic` | API key or OAuth | Primary provider, native tool use |
| **OpenAI-compatible** | `provider/openai` | API key | Covers DeepSeek, xAI, Z.ai via custom base URL |
| **OpenRouter** | `provider/openrouter` | API key | Multi-model routing |
| **GitHub Copilot** | `provider/copilot` | OAuth device code | Token-based, free tier |
| **Google Gemini** | `provider/gemini` | API key | Vision support |

### Anthropic Connector

The primary connector. Supports Claude models with native tool use, streaming, and vision:

```go
type AnthropicProvider struct {
    apiKey  string
    baseURL string   // Default: https://api.anthropic.com
}
```

Translates the operator's generic `Request` into Anthropic's message format, handling tool definitions, system prompts, and multi-modal content.

### OpenAI-Compatible Connector

A single connector that works with any OpenAI-compatible API by configuring the base URL:

```go
type OpenAIProvider struct {
    apiKey  string
    baseURL string   // e.g., https://api.deepseek.com, https://api.x.ai
    models  []Model
}
```

Used for DeepSeek, xAI (Grok), Z.ai, and any other provider exposing an OpenAI-compatible chat completions endpoint.

### GitHub Copilot Connector

Uses OAuth device code flow for authentication. Once authenticated, it accesses Copilot's chat API:

```go
type CopilotProvider struct {
    token     string
    expiresAt time.Time
}
```

Tokens are refreshed automatically before expiry.

## Provider Registry

**File**: `internal/provider/registry.go`

```go
type Registry struct {
    providers map[string]Provider
    default_  string              // Default provider ID
    mu        sync.RWMutex
}

func (r *Registry) Get(id string) (Provider, bool)
func (r *Registry) List() []Provider
func (r *Registry) Default() Provider
func (r *Registry) SetDefault(id string)
func (r *Registry) FindForModel(model string) (Provider, bool)
```

`FindForModel()` searches all providers for one that supports the requested model. This is how agent-level model preferences are resolved.

## Bootstrap

**File**: `internal/provider/bootstrap.go`

During boot, the operator discovers providers from three sources (checked in order):

### 1. OAuth Credentials

Stored in `{dataDir}/credentials.json`. These come from device code flows (e.g., GitHub Copilot) or browser-based OAuth:

```json
{
  "copilot": {
    "access_token": "ghu_...",
    "expires_at": "2026-04-01T00:00:00Z",
    "refresh_token": "ghr_..."
  }
}
```

### 2. Environment Variables

Standard environment variables for each provider:

| Variable | Provider |
|----------|----------|
| `ANTHROPIC_API_KEY` | Anthropic |
| `OPENAI_API_KEY` | OpenAI-compatible |
| `OPENROUTER_API_KEY` | OpenRouter |
| `GEMINI_API_KEY` | Google Gemini |
| `DEEPSEEK_API_KEY` | DeepSeek (via OpenAI connector) |

### 3. Settings File

User-configured keys in `{dataDir}/settings.json`:

```json
{
  "providers": {
    "anthropic": {
      "api_key": "sk-ant-...",
      "base_url": "https://api.anthropic.com"
    },
    "deepseek": {
      "api_key": "sk-...",
      "base_url": "https://api.deepseek.com"
    }
  },
  "default_provider": "anthropic"
}
```

## Request Translation

Each connector translates the operator's generic request format into the provider's native format:

```go
// Operator generic format
type Request struct {
    Model       string
    System      string
    Messages    []Message
    Tools       []ToolDefinition
    MaxTokens   int
    Temperature float64
    Stream      bool
}

// → Translated to provider-specific format
// Anthropic: /v1/messages with system as top-level field
// OpenAI:    /v1/chat/completions with system as first message
// Gemini:    /v1/models/{model}:generateContent with systemInstruction
```

Each connector handles the translation internally, including differences in tool call formats, stop reasons, and usage reporting.

## Error Handling

Provider errors are categorized:

| Error Type | Behavior |
|------------|----------|
| Rate limit (429) | Retry with exponential backoff |
| Auth error (401/403) | Mark provider as unavailable, log warning |
| Server error (500+) | Retry once, then fail |
| Network error | Retry with backoff, mark unavailable after 3 failures |
| Invalid response | Fail immediately with descriptive error |

The runner catches provider errors and can fall back to alternative providers if the primary fails.
