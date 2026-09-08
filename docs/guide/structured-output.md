# Structured Output

Structured output is a powerful pattern for ensuring AI agents return data in a consistent, typed format. This guide explains how Construct uses JSON Schema as a contract layer across LLM providers.

## What is Structured Output?

Structured output uses **JSON Schema** to define expected data shapes, which are enforced at the provider level. Instead of getting free-form text, agents return JSON that matches the schema.

**Traditional approach:**

```
Agent: "The file is 1,234 bytes, created on March 15, 2024"
→ Parse by hand, fragile to format changes
```

**Structured output approach:**

```json
{
  "fileName": "index.ts",
  "sizeBytes": 1234,
  "createdAt": "2024-03-15T14:30:00Z"
}
```

The provider guarantees the output matches the schema, eliminating parsing fragility.

## JSON Schema as Contract

Construct treats JSON Schema as a **contract layer** between agent code and consuming code:

```
Agent Code
    ↓
JSON Schema Contract
    ↓
LLM Provider (Anthropic, OpenAI, etc.)
    ↓
Typed SDK Response
    ↓
Consumer Code (Spaces, UI, tools)
```

The schema is the source of truth for:
- What data the agent will return
- What properties are required vs. optional
- Data types and validation rules
- Examples and descriptions

## Supported Providers

Construct supports structured output across major LLM providers:

| Provider | Support | Method |
|----------|---------|--------|
| **Anthropic** | Full | `messages.claude_3_5_sonnet_20241022` with `tool_choice` |
| **OpenAI** | Full | `response_format` with `json_schema` |
| **DeepSeek** | Full | Extended `tools` parameter |
| **Ollama** | Limited | Via JSON prompt instructions |

Each provider has different syntax, but Construct abstracts this with a unified SDK.

## Schema Definition

Schemas are defined as JSON Schema Draft 2020-12:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "severity": {
            "type": "string",
            "enum": ["critical", "high", "medium", "low"]
          },
          "category": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "line": {
            "type": "integer"
          },
          "suggestion": {
            "type": "string"
          }
        },
        "required": ["severity", "category", "description", "line"]
      }
    },
    "overallScore": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Code quality score 0-100"
    },
    "summary": {
      "type": "string"
    }
  },
  "required": ["findings", "overallScore", "summary"]
}
```

## TypeScript SDK Helpers

Construct provides typed SDK helpers to use with agents:

```typescript
import { defineStructuredOutput } from '@construct-space/sdk'

// Define typed output structure
interface CodeReviewResult {
  findings: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low'
    category: string
    description: string
    line: number
    suggestion: string
  }>
  overallScore: number
  summary: string
}

// Create schema from TypeScript type
const reviewSchema = defineStructuredOutput<CodeReviewResult>({
  findings: {
    type: 'array',
    items: {
      severity: { enum: ['critical', 'high', 'medium', 'low'] },
      category: { type: 'string' },
      description: { type: 'string' },
      line: { type: 'integer' },
      suggestion: { type: 'string' }
    }
  },
  overallScore: { type: 'number', min: 0, max: 100 },
  summary: { type: 'string' }
})

// Use with agent
const agent = useAgent()
const result = await agent.execute(prompt, {
  schema: reviewSchema
})

// result is typed as CodeReviewResult
console.log(result.overallScore) // IDE autocomplete works!
```

## Using Structured Output in Agents

In agent configuration (`agent/config.md`):

```markdown
---
model: claude-3-5-sonnet-20241022
structuredOutput:
  enabled: true
  schema: tools/review-schema.json
---

# Code Review Agent

You analyze code and return structured findings.

When analyzing code, return JSON matching this structure:
```json
{
  "findings": [
    {
      "severity": "high",
      "category": "security",
      "description": "SQL injection vulnerability",
      "line": 42,
      "suggestion": "Use parameterized queries"
    }
  ],
  "overallScore": 65,
  "summary": "Code has security issues that need addressing"
}
```

Ensure your response is valid JSON matching the schema.
```

Then reference the schema file:

**tools/review-schema.json:**

```json
{
  "type": "object",
  "properties": {
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "severity": { "enum": ["critical", "high", "medium", "low"] },
          "category": { "type": "string" },
          "description": { "type": "string" },
          "line": { "type": "integer" },
          "suggestion": { "type": "string" }
        },
        "required": ["severity", "category", "description", "line"]
      }
    },
    "overallScore": { "type": "number", "minimum": 0, "maximum": 100 },
    "summary": { "type": "string" }
  },
  "required": ["findings", "overallScore", "summary"]
}
```

## Streaming with Structured Output

Structured output works with streaming for real-time feedback:

```typescript
const stream = agent.executeStream(prompt, {
  schema: reviewSchema,
  onPartial: (partial: Partial<CodeReviewResult>) => {
    // Update UI with partial results as they arrive
    updateFindings(partial.findings || [])
  },
  onComplete: (complete: CodeReviewResult) => {
    // Full result received and validated
    displayFinalResult(complete)
  }
})
```

With streaming, consumers see progressive updates while the agent reasons.

## Schema Validation

Construct validates output against the schema at multiple levels:

1. **Provider Level:** LLM enforces schema during generation (most providers)
2. **Operator Level:** Go operator validates response matches schema
3. **Consumer Level:** TypeScript SDK validates before returning to consumer

This multi-layer validation ensures type safety throughout the pipeline.

```typescript
// If validation fails, you get a helpful error
try {
  const result = await agent.execute(prompt, { schema })
} catch (error) {
  if (error.type === 'SCHEMA_VALIDATION_ERROR') {
    console.error('Agent output did not match schema:', error.details)
    // e.g., "Property 'overallScore' must be number but got string"
  }
}
```

## Schema Best Practices

### 1. Keep Schemas Focused

Don't try to capture everything. Structured output works best for specific, focused outputs:

```json
// Good: Specific, focused
{
  "severity": "high",
  "line": 42,
  "suggestion": "Use parameterized queries"
}

// Bad: Too broad
{
  "everything": "agent output as string"
}
```

### 2. Use Enums for Categories

Restrict free-form strings to known values:

```json
{
  "severity": { "enum": ["critical", "high", "medium", "low"] },
  "category": { "enum": ["security", "performance", "style", "testing"] }
}
```

### 3. Provide Examples

Include examples in schema descriptions:

```json
{
  "properties": {
    "suggestion": {
      "type": "string",
      "description": "Actionable improvement. Example: 'Use parameterized queries instead of string concatenation'"
    }
  }
}
```

### 4. Use Required Fields

Mark fields that must always be present:

```json
{
  "required": ["severity", "description", "suggestion"]
  // optional: "category", "line"
}
```

### 5. Validate Business Logic

Schemas enforce type safety but not business logic. Use post-processing for complex validation:

```typescript
const result = await agent.execute(prompt, { schema })

// Schema validates types, but we validate business logic
if (result.findings.length === 0 && result.overallScore < 50) {
  throw new Error('Inconsistent findings: no issues but low score')
}
```

## Examples

### Code Review Schema

```json
{
  "type": "object",
  "properties": {
    "issues": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": { "enum": ["bug", "style", "performance", "security"] },
          "severity": { "enum": ["critical", "high", "medium", "low"] },
          "location": { "type": "string" },
          "description": { "type": "string" },
          "fix": { "type": "string" }
        },
        "required": ["type", "severity", "location", "description"]
      }
    },
    "score": { "type": "number", "minimum": 0, "maximum": 100 },
    "passed": { "type": "boolean" }
  },
  "required": ["issues", "score", "passed"]
}
```

### Task Extraction Schema

```json
{
  "type": "object",
  "properties": {
    "tasks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "description": { "type": "string" },
          "priority": { "enum": ["high", "medium", "low"] },
          "estimatedHours": { "type": "number" },
          "dependencies": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["title", "priority"]
      }
    }
  },
  "required": ["tasks"]
}
```

### Design Feedback Schema

```json
{
  "type": "object",
  "properties": {
    "overallImpression": { "type": "string" },
    "strengths": {
      "type": "array",
      "items": { "type": "string" }
    },
    "improvements": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "area": { "enum": ["typography", "color", "spacing", "hierarchy", "accessibility"] },
          "feedback": { "type": "string" },
          "priority": { "enum": ["critical", "high", "medium", "low"] }
        },
        "required": ["area", "feedback"]
      }
    },
    "designScore": { "type": "number", "minimum": 0, "maximum": 10 }
  },
  "required": ["overallImpression", "strengths", "improvements"]
}
```

## Troubleshooting

### "Output did not match schema"

**Problem:** Agent output doesn't validate against schema.

**Solution:**
1. Simplify the schema (fewer required fields)
2. Make instructions clearer in agent prompt
3. Include explicit JSON examples
4. Use stricter providers (Anthropic preferred)
5. Lower temperature for more deterministic output

### "Type mismatch in streaming partial"

**Problem:** Partial updates don't match final schema.

**Solution:** Provide default values for optional fields:

```typescript
const partial: Partial<Result> = {
  findings: [], // Default empty array
  score: 0      // Default score
}
```

### "Schema too large"

**Problem:** Provider rejects schema (too complex).

**Solution:** Split into multiple schemas:

```typescript
// Instead of one huge schema
// Use multiple smaller schemas for different tasks
const reviewSchema = defineStructuredOutput<ReviewResult>({...})
const suggestionSchema = defineStructuredOutput<SuggestionResult>({...})
```

## Migration from Free-form Output

If migrating from free-form text output to structured:

**Before:**

```typescript
const result = await agent.execute('Review this code')
// Returns: "Line 42: SQL injection risk..."
// Must parse manually
const lines = result.split('\n')
```

**After:**

```typescript
const result = await agent.execute('Review this code', {
  schema: reviewSchema
})
// Returns: { findings: [...], score: 65 }
// Type-safe, no parsing needed
```

## Next Steps

- See [Agents and Tools](/guide/agents-and-tools) for agent configuration
- Check [@construct-space/sdk](/api/sdk) for `defineStructuredOutput` API
- Explore built-in spaces for structured output examples
- Read provider docs for schema syntax specifics
