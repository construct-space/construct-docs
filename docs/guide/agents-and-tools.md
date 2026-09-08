# Agents and Tools

Agents are the reasoning layer of Construct. Each agent is an LLM with a specific role, configured tools, safety hooks, and iterative reasoning loop. This guide explains how agents work and how to configure and extend them.

## What is an Agent?

An agent is a configured LLM instance that can:

1. **Reason:** Process user input and decide what to do
2. **Plan:** Break tasks into sub-steps
3. **Execute:** Call tools to perform actions
4. **Iterate:** Refine results based on feedback (up to 25 times by default)
5. **Learn:** Improve responses based on context and history

Agents power every space in Construct. The Code space has a code review agent, the Terminal space has a shell expert agent, etc.

## Pre-configured Agents

Construct includes 10+ pre-configured agents optimized for different workflows:

| Agent | Space | Specialty | Tools |
|-------|-------|-----------|-------|
| **Code Review** | Code | Code analysis and refactoring | read, write, edit, bash, grep |
| **Chat Assistant** | Chat | Conversation and reasoning | chat history, web search (optional) |
| **Design Expert** | Design | UI/UX and design tokens | component browser, CSS |
| **Shell Expert** | Terminal | Bash and command-line | bash, read, write, edit |
| **Git Master** | Git | Version control | bash (git), read, diff |
| **Task Manager** | Tasks | Task tracking and prioritization | list, update, create |
| **Doc Writer** | Docs | Documentation and writing | read, write, markdown |
| **Note Taker** | Notes | Note organization and search | create, edit, tag, search |
| **Calendar Maestro** | Calendar | Event and time management | create, update, schedule |
| **Design Reviewer** | Design | Visual design critique | component analysis |

Each agent is configured in its space's `agent/config.md` file.

## Agent Configuration (agent/config.md)

Agents are configured as markdown files with YAML frontmatter:

```markdown
---
# Agent metadata
model: claude-3-5-sonnet-20241022
temperature: 0.7
maxIterations: 25
provider: anthropic
canSpawn: false

# Tool configuration
tools:
  - id: read
    enabled: true
  - id: write
    enabled: true
  - id: bash
    enabled: true
    restricted: false

# Hooks and safety
hooks:
  - type: preToolExecution
    toolId: bash
    check: confirmDangerousCommands
---

# Code Review Agent

You are an expert code reviewer with deep knowledge of software design, testing, and best practices.

Your role is to:
1. Analyze code for correctness and quality
2. Identify potential bugs and security issues
3. Suggest improvements
4. Explain your reasoning clearly

When reviewing, prioritize:
- **Correctness:** Does the code work as intended?
- **Security:** Are there vulnerabilities or unsafe patterns?
- **Performance:** Are there efficiency issues?
- **Maintainability:** Is the code readable and maintainable?
- **Testing:** Is there adequate test coverage?

## Your Process

1. Read and understand the code
2. Analyze for issues systematically
3. Provide specific, actionable feedback
4. Suggest concrete improvements with examples

## Tools You Can Use

- **read:** Read file contents
- **write:** Create new files
- **edit:** Modify existing files
- **bash:** Run shell commands for analysis
- **grep:** Search for patterns in code

## Important Context

- Current project: {{projectPath}}
- Active file: {{currentFile}}
- User preferences: {{userPreferences}}

Never make changes without explicit user approval.
```

## Agent Frontmatter Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| **model** | string | claude-3-5-sonnet | LLM to use (provider-specific model ID) |
| **temperature** | number | 0.7 | Creativity level (0.0 = deterministic, 1.0 = creative) |
| **maxIterations** | number | 25 | Max reasoning loops before stopping |
| **provider** | string | anthropic | LLM provider (anthropic, openai, deepseek, ollama) |
| **canSpawn** | boolean | false | Allow this agent to spawn sub-agents |
| **tools** | array | - | List of tools this agent can use |
| **hooks** | array | - | Safety checks (pre/post tool execution) |

## Tools: 22+ Built-in + Custom

### Built-in Tools

Construct provides 22+ built-in tools available to agents:

#### File System Tools

**read**
```
read(path: string, start?: number, end?: number): string
```
Read file contents. Optionally specify line range.

**write**
```
write(path: string, content: string): void
```
Create or overwrite a file.

**edit**
```
edit(path: string, oldText: string, newText: string): void
```
Replace text within a file (supports multiple edits).

**listdir**
```
listdir(path: string, recursive?: boolean): FileInfo[]
```
List directory contents. Optionally recursive.

**glob**
```
glob(pattern: string): string[]
```
Find files matching glob pattern (e.g., `**/*.js`).

**grep**
```
grep(pattern: string, path: string): Match[]
```
Search for text matching regex in file.

#### Execution Tools

**bash**
```
bash(command: string, cwd?: string): ExecutionResult
```
Run bash/shell commands. Returns stdout, stderr, exit code.

#### Specialized Tools

**diff**
```
diff(file1: string, file2: string): string
```
Compare two files and return unified diff.

**tree**
```
tree(path: string, depth?: number): string
```
Show directory tree structure.

**find**
```
find(path: string, name?: string, type?: string): string[]
```
Find files by name or type.

**chmod**
```
chmod(path: string, mode: string): void
```
Change file permissions.

**mkdir**
```
mkdir(path: string): void
```
Create directories.

**rm**
```
rm(path: string, recursive?: boolean): void
```
Remove files or directories.

And more specialized tools for Git, environment inspection, process management, etc.

### Custom Tools

Define custom tools in markdown files within `agent/tools/`:

**Example: agent/tools/reviewCode.md**

```markdown
# reviewCode

Perform a comprehensive code review.

## Parameters

- **filePath** (string, required): Path to the file to review
- **depth** (string, optional): Review depth (quick, thorough, comprehensive)
- **focusAreas** (string[], optional): Areas to focus on (security, performance, testing)

## Description

This tool analyzes code quality, identifies issues, and provides detailed feedback.

## Implementation Details

The tool:
1. Reads the file content
2. Parses the code structure
3. Checks against quality metrics
4. Generates a detailed report

## Example

```
reviewCode(filePath="src/components/Agent.vue", depth="thorough")
```

## Returns

A structured review with:
- Summary of findings
- Specific issues by category
- Actionable recommendations
```

**Registering Custom Tools:**

In `agent/config.md`:

```markdown
---
tools:
  - id: read
    enabled: true
  - id: bash
    enabled: true
  - id: reviewCode
    path: tools/reviewCode.md
    enabled: true
---
```

## Providers: LLM Backends

Agents can use different LLM providers. Construct supports:

### Anthropic (Primary)

```yaml
provider: anthropic
model: claude-3-5-sonnet-20241022
apiKey: ${ANTHROPIC_API_KEY}
```

**Supported models:**
- claude-3-5-sonnet-20241022 (default, best balance)
- claude-3-5-haiku-20241022 (fast, cheaper)
- claude-opus-4-20250805 (most capable, slowest)

### OpenAI

```yaml
provider: openai
model: gpt-4o
apiKey: ${OPENAI_API_KEY}
```

**Supported models:**
- gpt-4o (most capable)
- gpt-4-turbo
- gpt-3.5-turbo (fast, cheaper)

### DeepSeek

```yaml
provider: deepseek
model: deepseek-coder
apiKey: ${DEEPSEEK_API_KEY}
```

**Supported models:**
- deepseek-coder (code-specific)
- deepseek-chat (general)

### Ollama (Local)

```yaml
provider: ollama
model: llama2
baseUrl: http://localhost:11434
```

**Supported models:**
- Any model available in Ollama
- Runs locally, no API key needed
- Great for privacy and offline development

## Hooks & Safety

Safety hooks run before and after tool execution to prevent misuse:

```json
{
  "hooks": [
    {
      "type": "preToolExecution",
      "toolId": "bash",
      "check": "confirmDangerousCommands",
      "patterns": ["rm -rf /", "sudo", "chmod 777"],
      "message": "This command looks dangerous. Are you sure?"
    },
    {
      "type": "preToolExecution",
      "toolId": "*",
      "check": "confirmUser",
      "riskLevel": "high"
    },
    {
      "type": "postToolExecution",
      "toolId": "*",
      "check": "validateOutput",
      "maxSize": 100000
    }
  ]
}
```

**Hook Types:**

| Type | Purpose |
|------|---------|
| **confirmDangerousCommands** | Detect and block dangerous shell commands |
| **confirmUser** | Require user approval before execution |
| **validateOutput** | Validate tool output format and size |
| **rateLimit** | Limit execution frequency (e.g., max 5 calls/minute) |
| **sandbox** | Restrict execution scope (e.g., project directory only) |

## Skills: Reusable Prompt Templates

Skills are reusable prompt templates triggered by keywords. They allow agents to execute predefined behaviors without user setup.

**Define a skill in agent/skills/:**

```markdown
# refactor-code

Refactor code for readability and performance.

## Triggers

- refactor
- clean up
- improve code
- optimize

## Template

You are a code refactoring expert. The user has asked you to refactor code.

Your approach:
1. Understand the current code
2. Identify improvement opportunities
3. Refactor incrementally with tests
4. Explain the changes

The code is located at: {{filePath}}

Use your tools to:
- Read the current code
- Write refactored versions
- Run tests to ensure correctness
```

**Using Skills:**

When a user types a trigger keyword, the agent automatically loads the skill:

```
User: "refactor src/components/Button.vue"
→ Loads refactor-code skill
→ Substitutes {{filePath}} = "src/components/Button.vue"
→ Agent executes the skill template
```

## Agent Iteration Loop

Agents operate in a loop, refining answers based on results:

```
1. Receive user request
2. Decide which tools to use
3. Execute tools
4. Evaluate results
5. Decide: done or iterate?
6. If not done, go to step 2 (max 25 iterations)
7. Return final response
```

**Max Iterations:** Configurable per agent (default 25). Prevents infinite loops while allowing complex reasoning.

## Sub-agent Spawning

Agents with `canSpawn: true` can spawn child agents for parallel or specialized work:

```markdown
---
canSpawn: true
---

# Code Review Agent

You can spawn a "Security Agent" for security-specific reviews.

When you need security analysis:
1. Spawn the Security Agent
2. Pass relevant code
3. Wait for results
4. Incorporate findings
```

**Spawning:**

```typescript
const child = await agent.spawn({
  name: 'SecurityReviewer',
  systemPrompt: 'You are a security expert...',
  tools: ['read', 'bash']
})

const result = await child.execute('Review for SQL injection vulnerabilities')
```

## Temperature and Creativity

The `temperature` parameter controls creativity:

- **0.0:** Deterministic (always same response)
- **0.3-0.5:** Focused (good for analysis, code, structured tasks)
- **0.7:** Balanced (good for general use, conversation)
- **0.9-1.0:** Creative (good for brainstorming, design)

**Recommendations:**

- Code analysis: 0.3-0.5
- Chat and conversation: 0.7
- Creative writing: 0.8-1.0
- System prompts: 0.1-0.3

## Debugging Agents

### View Agent Logs

```bash
# Set log level to debug
export OPERATOR_LOG_LEVEL=debug

# Run app
bun run dev

# Check terminal for detailed agent logs
```

### Test Agent Independently

```bash
# Run operator with specific agent
cd operator
OPERATOR_LOG_LEVEL=debug go run main.go
```

### Check Tool Execution

```typescript
import { useAgentSession } from 'frontend/operator/useAgentSession'

const { session } = useAgentSession()

// View tool calls
console.log(session.toolCalls)

// View reasoning
console.log(session.reasoning)
```

## Best Practices

1. **Clear system prompts:** Be specific about the agent's role and constraints
2. **Minimal tools:** Give agents only the tools they need
3. **Safe by default:** Use hooks to prevent dangerous operations
4. **Test thoroughly:** Test agents with various inputs and edge cases
5. **Version configurations:** Track agent config changes in git
6. **Monitor performance:** Check iteration counts and tool usage
7. **Gather feedback:** Iterate based on user feedback and logs
8. **Document tools:** Clearly document what each tool does and parameters

## Next Steps

- [Building a Space](/guide/building-a-space) — Create a space with a custom agent
- [Structured Output](/guide/structured-output) — Use JSON Schema for typed agent output
- Operator documentation — Deep dive into agent execution engine
