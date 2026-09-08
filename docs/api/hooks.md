# Hooks & Safety Reference

Hooks provide a mechanism to intercept and control tool execution, implement safety policies, and enforce business rules. They're executed at specific points in the tool lifecycle.

## Hook Types

### pre_tool

Executed before a tool is invoked. Can validate input, modify parameters, or block execution.

```typescript
interface PreToolHook {
  id: string;
  type: "pre_tool";
  tools: string[];        // Tool names this hook applies to
  command: string;        // Shell command to execute
  blocking: boolean;      // If true, can block tool execution
}
```

**Use cases:**
- Validate tool parameters before execution
- Check permissions before running sensitive operations
- Log tool invocations for audit trails
- Modify inputs based on business rules

### post_tool

Executed after a tool completes successfully. Can filter output or enforce post-execution actions.

```typescript
interface PostToolHook {
  id: string;
  type: "post_tool";
  tools: string[];        // Tool names this hook applies to
  command: string;        // Shell command to execute
  blocking: boolean;      // If true, can block based on output
}
```

**Use cases:**
- Filter sensitive data from tool output
- Send notifications after deployments
- Clean up temporary files
- Update audit logs

## Hook Configuration

Hooks are defined in `agent/hooks/safety.json`:

```json
{
  "hooks": [
    {
      "id": "validate-sql",
      "type": "pre_tool",
      "tools": ["bash"],
      "command": "bash scripts/validate-sql.sh",
      "blocking": true
    },
    {
      "id": "log-execution",
      "type": "post_tool",
      "tools": ["bash", "write", "edit"],
      "command": "bash scripts/log-tool.sh",
      "blocking": false
    },
    {
      "id": "block-rm",
      "type": "pre_tool",
      "tools": ["bash"],
      "command": "bash scripts/block-dangerous.sh",
      "blocking": true
    }
  ]
}
```

## Hook Schema

```typescript
interface HookConfiguration {
  hooks: Hook[];
}

interface Hook {
  id: string;                        // Unique hook identifier
  type: "pre_tool" | "post_tool";    // Execution phase
  tools: string[];                   // Tools this hook applies to
  command: string;                   // Shell command (Handlebars template)
  blocking: boolean;                 // Can hook block execution?
}
```

Hook definitions are validated when the space loads. Invalid hooks are logged as warnings and skipped.

## Command Execution

Hook commands are executed as shell scripts with input passed via environment variables.

### Environment Variables

**Tool input** is passed to hook commands as JSON in `$TOOL_INPUT`:

```bash
#!/bin/bash
# Hook command receives tool invocation

# Parse the tool input
tool_name=$(echo $TOOL_INPUT | jq -r '.tool')
tool_args=$(echo $TOOL_INPUT | jq -r '.input')

# Validate or process
if [[ "$tool_name" == "bash" ]]; then
  command=$(echo $tool_args | jq -r '.command')
  # Check if command is safe
fi
```

**Additional variables:**

```bash
TOOL_NAME         # Name of the tool being invoked
TOOL_ID           # Tool ID
AGENT_ID          # ID of the agent invoking the tool
SESSION_ID        # Current session ID
USER_ID           # User ID (if authenticated)
```

### Return Values

Hook commands return decisions via exit codes:

| Code | Meaning | blocking=true | blocking=false |
|------|---------|---------------|----------------|
| 0 | Allow/continue | Allow tool execution | Continue processing |
| 1 | Block/reject | Block tool execution | Skip post-processing |
| 2 | Error | Fail session with error | Log warning, continue |

### Output Format

For pre_tool hooks that modify input, return JSON on stdout:

```bash
#!/bin/bash
# Pre-tool hook that modifies parameters

input=$(cat <<EOF
$TOOL_INPUT
EOF
)

# Modify input
modified=$(echo "$input" | jq '.input.timeout = 30')

# Return modified input
echo "$modified"
exit 0
```

The operator will use the returned JSON as the new tool input.

## Blocking vs Allowing

### Blocking (blocking: true)

Pre-tool hooks can prevent tool execution:

```bash
#!/bin/bash
# scripts/block-dangerous.sh
# Block dangerous bash commands

command=$(echo $TOOL_INPUT | jq -r '.input.command')

if [[ "$command" =~ ^rm.* ]]; then
  echo '{"block": true, "message": "Destructive rm command not allowed"}'
  exit 1
fi

echo '{"block": false}'
exit 0
```

Response format:

```typescript
interface HookResponse {
  block: boolean;           // Whether to block execution
  message?: string;         // Reason for blocking
  modified_input?: object;  // Modified tool input (pre_tool only)
}
```

### Allowing (blocking: false)

Hooks with `blocking: false` can't prevent execution but can still take actions:

```bash
#!/bin/bash
# scripts/log-tool.sh
# Log all tool executions

timestamp=$(date -Iseconds)
echo "[${timestamp}] Tool: ${TOOL_NAME}, Agent: ${AGENT_ID}" >> /var/log/construct-tools.log

exit 0
```

## Built-in Safety Patterns

Construct includes built-in safety patterns for common scenarios:

### Blocking Dangerous Commands

```bash
#!/bin/bash
# Prevent destructive operations

command=$(echo $TOOL_INPUT | jq -r '.input.command // ""')

# Dangerous patterns
if [[ "$command" =~ rm[[:space:]]+-rf ]]; then
  exit 1  # Block
fi

if [[ "$command" =~ git[[:space:]]+push[[:space:]]+--force ]]; then
  exit 1  # Block
fi

if [[ "$command" =~ drop[[:space:]]+database ]]; then
  exit 1  # Block
fi

exit 0  # Allow
```

### SQL Injection Prevention

```bash
#!/bin/bash
# Validate SQL queries

query=$(echo $TOOL_INPUT | jq -r '.input.query // ""')

# Check for dangerous patterns
if [[ "$query" =~ DROP[[:space:]]+TABLE ]]; then
  exit 1
fi

if [[ "$query" =~ DELETE[[:space:]]+FROM.*WHERE ]]; then
  # Allow but require explicit WHERE clause
  if [[ "$query" =~ WHERE[[:space:]]+ ]]; then
    exit 0
  else
    exit 1
  fi
fi

exit 0
```

### Environment Variable Validation

```bash
#!/bin/bash
# Prevent exposure of secrets

command=$(echo $TOOL_INPUT | jq -r '.input.command // ""')

# Block if command accesses secrets
if echo "$command" | grep -qE "echo.*\$.*PASSWORD|echo.*\$.*TOKEN|cat.*\.env"; then
  exit 1
fi

exit 0
```

## Hook Runtime States

Hook state is tracked in `hook-states.json` for monitoring and debugging:

```json
{
  "hooks": {
    "validate-sql": {
      "id": "validate-sql",
      "enabled": true,
      "lastExecuted": "2026-03-29T10:15:30Z",
      "totalRuns": 1247,
      "blockedCount": 13,
      "errorCount": 2,
      "avgExecutionMs": 45
    },
    "log-execution": {
      "id": "log-execution",
      "enabled": true,
      "lastExecuted": "2026-03-29T10:15:42Z",
      "totalRuns": 5821,
      "blockedCount": 0,
      "errorCount": 0,
      "avgExecutionMs": 12
    }
  }
}
```

### State Fields

```typescript
interface HookRuntimeState {
  id: string;
  enabled: boolean;                // Hook is active
  lastExecuted: string;            // ISO 8601 timestamp of last run
  totalRuns: number;               // Total invocations
  blockedCount: number;            // Times hook blocked execution
  errorCount: number;              // Times hook errored
  avgExecutionMs: number;          // Average execution duration
  lastError?: string;              // Last error message if applicable
}
```

## Example Hook Implementations

### Audit Logging Hook

```bash
#!/bin/bash
# agent/hooks/audit-log.sh
# Log all tool executions for compliance

timestamp=$(date -Iseconds)
tool_name=$TOOL_NAME
agent_id=$AGENT_ID
user_id=$USER_ID

# Write to audit log
cat >> /var/log/construct-audit.jsonl <<EOF
{
  "timestamp": "$timestamp",
  "tool": "$tool_name",
  "agent": "$agent_id",
  "user": "$user_id",
  "session": "$SESSION_ID",
  "input": $(echo $TOOL_INPUT | jq -c .)
}
EOF

exit 0
```

### Rate Limiting Hook

```bash
#!/bin/bash
# agent/hooks/rate-limit.sh
# Limit tool invocations per agent per minute

agent_id=$AGENT_ID
tool_name=$TOOL_NAME
key="${agent_id}:${tool_name}"

# Use a simple counter file (in production, use Redis or similar)
counter_file="/tmp/construct-rate-limit-${key}"

count=$(cat "$counter_file" 2>/dev/null || echo 0)

if [ $count -gt 10 ]; then
  echo '{"block": true, "message": "Rate limit exceeded for this tool"}'
  exit 1
fi

# Increment counter
echo $((count + 1)) > "$counter_file"

# Reset counter every minute (simplified)
(sleep 60; rm "$counter_file") &

exit 0
```

### Input Validation Hook

```bash
#!/bin/bash
# agent/hooks/validate-bash.sh
# Validate bash command parameters

command=$(echo $TOOL_INPUT | jq -r '.input.command // ""')

# Only allow whitelisted commands
if [[ ! "$command" =~ ^(ls|pwd|cat|grep|find|echo|date).*$ ]]; then
  echo '{"block": true, "message": "Command not in whitelist"}'
  exit 1
fi

exit 0
```

## Hook Development Workflow

1. **Create hook script** in `agent/hooks/`
2. **Register in configuration** in `agent/hooks/safety.json`
3. **Test locally** with sample tool inputs
4. **Enable blocking** once validated
5. **Monitor state** in `hook-states.json` for issues
6. **Iterate** based on block/error rates

## Performance Considerations

Hooks add latency to tool execution:

- **Pre-tool hooks**: Add latency before tool runs (typical: 10-100ms)
- **Post-tool hooks**: Add latency after tool completes (typical: 10-100ms)

**Optimization tips:**

1. **Keep hooks fast**: Avoid expensive I/O or computation
2. **Cache results**: Cache validation results when possible
3. **Use non-blocking hooks** for logging/monitoring
4. **Batch operations**: Combine multiple hook checks
5. **Monitor state**: Check `avgExecutionMs` in hook states

## Troubleshooting

### Hook not executing

Check:
1. Hook is registered in `safety.json`
2. Tool name matches hook's `tools` array
3. Hook script has execute permissions: `chmod +x agent/hooks/script.sh`
4. No syntax errors in hook script

### Hook blocking unexpectedly

Debug:
1. Log the `$TOOL_INPUT` in hook script
2. Check exit code: `echo "Exit code: $?"`
3. Review `hook-states.json` for error logs
4. Test hook script directly: `TOOL_INPUT='{}' bash agent/hooks/script.sh`

### Hook errors

Check:
1. Script doesn't have unhandled exceptions
2. Dependencies are available (jq, grep, etc.)
3. File permissions are correct for logging directories
4. Environment variables are properly quoted

## Best Practices

1. **Write idempotent hooks**: Don't assume execution order
2. **Log decisions**: Help users understand why execution was blocked
3. **Return clear messages**: Error messages should be actionable
4. **Test thoroughly**: Test both allow and block paths
5. **Monitor performance**: Track hook execution times
6. **Use appropriate blocking**: Only blocking for safety-critical hooks
7. **Document purpose**: Comment hooks explaining their intent
8. **Version hooks**: Keep hook scripts in version control
