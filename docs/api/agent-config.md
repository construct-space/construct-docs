# Agent Configuration Reference

Agent configurations define how agents behave, what tools they can access, which models they use, and system prompt templates. Each space contains agent definitions that are loaded at runtime.

## Configuration File Location

Agents are defined in `agent/config.md` files within a space directory structure. The operator loads all agent configs when a space initializes.

Example path: `spaces/architect/agent/config.md`

## YAML Frontmatter

Agent configurations use YAML frontmatter to define metadata and behavior:

```yaml
---
id: architect
name: "Code Architect"
category: "development"
maxIterations: 25
blockedTools:
  - "rm"
  - "git_push"
canInvokeAgents:
  - "agent_debugger"
  - "agent_tester"
canSpawn: true
---
```

### Field Reference

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | string | yes | — | Unique identifier for the agent within the space. Used to reference the agent in requests. Must be kebab-case. |
| `name` | string | yes | — | Human-readable display name for the agent. Shown in UI. |
| `category` | string | no | "general" | Category for organizing agents. Examples: "development", "infrastructure", "content", "analysis". |
| `maxIterations` | number | no | 25 | Maximum number of turns before the agent stops. Prevents infinite loops. |
| `blockedTools` | string[] | no | [] | Array of tool names that this agent cannot invoke, even if available in context. Useful for safety restrictions. |
| `canInvokeAgents` | string[] | no | [] | Array of agent IDs this agent can spawn or invoke. If empty, agent cannot spawn other agents. |
| `canSpawn` | boolean | no | false | Whether this agent can spawn new sessions (fork behavior). |

## Handlebars Template System

System prompts use Handlebars templates to dynamically inject context. Templates are evaluated at runtime with a context object containing project and space information.

### Available Context Variables

```handlebars
{{context.project.name}}           {{!-- Project name --}}
{{context.project.path}}           {{!-- Project filesystem path --}}
{{context.space.id}}               {{!-- Space ID --}}
{{context.space.name}}             {{!-- Space display name --}}
{{context.agent.id}}               {{!-- Current agent ID --}}
{{context.agent.name}}             {{!-- Current agent name --}}
{{context.user.id}}                {{!-- User ID (if authenticated) --}}
{{context.user.email}}             {{!-- User email --}}
```

### Conditional Blocks

```handlebars
{{#if context.project}}
  You are working in project: {{context.project.name}}
{{else}}
  No project context available.
{{/if}}

{{#unless context.user}}
  This is an anonymous session.
{{/unless}}
```

### Loops

```handlebars
{{#each context.tools}}
  - {{this}}
{{/each}}
```

## Example Agent Configurations

### Code Architect Agent

```yaml
---
id: architect
name: "Code Architect"
category: "development"
maxIterations: 25
blockedTools:
  - "rm"
  - "git_push"
canInvokeAgents:
  - "debugger"
  - "tester"
canSpawn: true
---

You are the Code Architect for {{context.project.name}}.

Your role:
- Design and refactor code structures
- Suggest architectural improvements
- Plan feature implementations
- Review code for maintainability

Current project: {{context.project.path}}

You have access to bash, read, write, edit, glob, and grep tools.
You can invoke the debugger and tester agents when needed.

When proposing changes:
1. Analyze the existing codebase
2. Identify architectural issues
3. Suggest improvements with rationale
4. Provide implementation steps
```

### QA Testing Agent

```yaml
---
id: tester
name: "QA Tester"
category: "testing"
maxIterations: 15
blockedTools:
  - "rm"
canInvokeAgents: []
canSpawn: false
---

You are a QA testing specialist for {{context.project.name}}.

Your responsibilities:
- Write and run test suites
- Identify bugs and edge cases
- Verify fixes
- Report test results

When testing:
1. Review existing tests
2. Identify gaps in coverage
3. Write new tests for edge cases
4. Run full test suite
5. Report results with pass/fail counts
```

### DevOps Agent

```yaml
---
id: devops
name: "DevOps Engineer"
category: "infrastructure"
maxIterations: 30
blockedTools:
  - "rm -rf"
  - "reboot"
canInvokeAgents:
  - "architect"
canSpawn: true
---

You are the DevOps engineer for {{context.project.name}}.

Focus areas:
- Infrastructure as code
- Deployment pipelines
- System monitoring
- Performance optimization

{{#if context.user}}
Authenticated as: {{context.user.email}}
{{/if}}

Use tools to:
- Analyze system logs
- Check deployment status
- Optimize resource usage
- Troubleshoot infrastructure issues
```

## Agent Selection

Agents are selected per space based on the `agentID` parameter in dispatch requests:

```json
{
  "type": "dispatch",
  "agentID": "architect",
  "messages": [{ "role": "user", "content": [{ "type": "text", "text": "..." }] }]
}
```

If the specified agent ID doesn't exist, the operator returns an error with code `AGENT_NOT_FOUND`.

## Provider and Model Configuration

Agent models are selected via environment variables or Space Config. The priority order is:

1. **Agent-specific config** (if defined in agent config)
2. **Space config** (space.config.ts)
3. **Operator defaults** (environment: `CONSTRUCT_MODEL`, defaults to `claude-3-5-sonnet`)

### Example: Claude 3.5 Sonnet

```yaml
---
id: architect
name: "Code Architect"
model: "claude-3-5-sonnet-20241022"
provider: "anthropic"
---
```

### Model Configuration in Space Config

See [Space Manifest Reference](./space-manifest.md#space-config) for configuring default models for a space.

## System Prompt Injection

The final system prompt is constructed as:

```
[Default system instructions]

[Agent-specific frontmatter content]

Project: {{context.project.name}}
Space: {{context.space.name}}
Agent: {{context.agent.name}}

Available tools: [tool list]
```

Templates are rendered after loading but before first use, so context is always fresh.

## Best Practices

1. **Keep maxIterations reasonable**: 25-30 for general purpose agents, 15-20 for specialized agents
2. **Block dangerous tools**: Always block `rm`, `git push --force`, and destructive operations
3. **Document agent purpose**: Use clear frontmatter comments explaining the agent's role
4. **Test templates**: Verify Handlebars rendering with different project contexts
5. **Name agents descriptively**: Use clear names like "code-architect" not "a1"
6. **Limit agent spawning**: Only allow agent spawning when necessary for the workflow
7. **Use categories**: Organize agents with consistent category naming

## Loading and Initialization

At space startup, the operator:

1. Scans `agent/` directory for `*.md` files
2. Parses YAML frontmatter from each file
3. Validates required fields (id, name)
4. Compiles Handlebars templates
5. Registers agents in the agent registry
6. Loads agent-specific hooks from `agent/hooks/`

If an agent config is invalid, the operator logs a warning and skips that agent. The space continues to load with remaining valid agents.
