# Agent Architecture Quick Reference

## Agent Types in Claude Code

### 1. General Purpose Agent
- Complex multi-step tasks
- Code search and exploration
- Research and analysis

### 2. Explore Agent
- Fast codebase exploration
- Pattern matching
- Quick searches

### 3. Plan Agent
- Task planning
- Architecture design
- Implementation strategy

## Orchestrator Pattern

When spawning agents, the orchestrator must:

1. **Provide Context**: Share relevant documentation from knowledge base
2. **Define Scope**: Clear task boundaries
3. **Enable Communication**: Allow agents to report back
4. **Manage State**: Track agent progress and results

## Best Practices

- Spawn agents in parallel when possible
- Provide agents with relevant documentation upfront
- Use Task tool with appropriate subagent_type
- Share knowledge base path with all agents

