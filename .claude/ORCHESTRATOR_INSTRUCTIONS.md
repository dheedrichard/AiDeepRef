# Orchestrator Agent Instructions

## Purpose
This document provides instructions for the orchestrator agent on how to manage spawned agents and ensure they have access to the latest documentation for ALL frameworks, libraries, and tools used in the project.

## Core Principles

### Smart Caching System
- Documentation is fetched **ONCE** and cached locally
- Cached documentation is available to all future agents
- No redundant external fetches - efficiency first
- Only project-specific documentation is cached

### Multi-Framework Support
The system supports documentation for:
- **Frameworks**: React, Next.js, Vue, Angular, Svelte, etc.
- **UI Libraries**: shadcn/ui, Material-UI, Ant Design, Chakra UI, etc.
- **CSS Frameworks**: Tailwind CSS, Bootstrap, etc.
- **Tools**: TypeScript, Vite, Webpack, etc.
- **Anthropic**: Claude Code, MCP, Agents, Skills

## Documentation Registry

### Location
`.claude/knowledge/registry.json`

### Structure
```json
{
  "last_updated": "2025-11-17T12:00:00Z",
  "version": "1.0.0",
  "frameworks": {
    "react": {
      "version": "^18.3.1",
      "source": "https://react.dev",
      "cached_at": "2025-11-17T12:00:00Z",
      "status": "cached",
      "files": ["frameworks/react/quick-reference.md"]
    }
  },
  "libraries": {
    "shadcn-ui": {
      "version": "latest",
      "source": "https://ui.shadcn.com",
      "cached_at": "2025-11-17T12:00:00Z",
      "status": "cached",
      "files": ["libraries/shadcn-ui/quick-reference.md"]
    }
  },
  "tools": {},
  "anthropic": {}
}
```

## Knowledge Base Structure

```
.claude/knowledge/
├── registry.json                      # Master registry (CHECK THIS FIRST!)
├── KNOWLEDGE_BASE_STRUCTURE.md        # Structure documentation
│
├── anthropic/                         # Anthropic documentation
│   ├── claude-code/
│   │   └── quick-reference.md
│   ├── mcp/
│   │   └── quick-reference.md
│   ├── agents/
│   │   └── quick-reference.md
│   └── skills/
│       └── quick-reference.md
│
├── frameworks/                        # Framework documentation
│   ├── react/
│   │   ├── version.json
│   │   └── quick-reference.md
│   ├── nextjs/
│   └── ...
│
├── libraries/                         # Library documentation
│   ├── shadcn-ui/
│   │   ├── version.json
│   │   └── quick-reference.md
│   ├── tailwindcss/
│   └── ...
│
├── tools/                             # Tool documentation
│   ├── typescript/
│   └── ...
│
└── project-specific/                  # Custom project docs
```

## Orchestrator Workflow

### Step 1: Check Registry FIRST

Before spawning any agent, **ALWAYS** check the registry to see what documentation is available:

```bash
# Check registry
cat .claude/knowledge/registry.json | jq '.frameworks | keys'
cat .claude/knowledge/registry.json | jq '.libraries | keys'
```

### Step 2: Provide Documentation Paths to Agents

When spawning agents, provide them with **SPECIFIC** paths to cached documentation:

```markdown
AGENT PROMPT TEMPLATE:

[Task Description]

DOCUMENTATION ACCESS:
You have access to locally cached documentation at:

Frameworks:
- React: .claude/knowledge/frameworks/react/quick-reference.md
- Next.js: .claude/knowledge/frameworks/nextjs/quick-reference.md

Libraries:
- shadcn/ui: .claude/knowledge/libraries/shadcn-ui/quick-reference.md
- Tailwind CSS: .claude/knowledge/libraries/tailwindcss/quick-reference.md

Tools:
- TypeScript: .claude/knowledge/tools/typescript/quick-reference.md

Anthropic:
- Claude Code: .claude/knowledge/anthropic/claude-code/quick-reference.md
- MCP: .claude/knowledge/anthropic/mcp/quick-reference.md
- Agents: .claude/knowledge/anthropic/agents/quick-reference.md

IMPORTANT:
- Review relevant documentation BEFORE implementing
- Use latest patterns and APIs documented
- These docs are CACHED LOCALLY - no external fetches needed
- All documentation is project-specific and up to date

[Specific task instructions]
```

### Step 3: Automatic Caching

The hook system automatically:
1. Detects dependencies from package.json, requirements.txt, etc.
2. Checks registry for cached documentation
3. Fetches and caches documentation if not present
4. Skips external fetch if already cached

**YOU DON'T NEED TO MANUALLY TRIGGER THIS** - it happens automatically on every user prompt.

## Example: Spawning Agent with Documentation

### Scenario: Build a React component with shadcn/ui

```javascript
// 1. Check registry first
// registry.json shows: react (cached), shadcn-ui (cached), tailwindcss (cached)

// 2. Spawn agent with documentation context
{
  "subagent_type": "general-purpose",
  "description": "Build React component",
  "prompt": `
    Build a user profile card component using React and shadcn/ui.

    CACHED DOCUMENTATION AVAILABLE:
    - React: .claude/knowledge/frameworks/react/quick-reference.md
    - shadcn/ui: .claude/knowledge/libraries/shadcn-ui/quick-reference.md
    - Tailwind CSS: .claude/knowledge/libraries/tailwindcss/quick-reference.md
    - TypeScript: .claude/knowledge/tools/typescript/quick-reference.md

    BEFORE IMPLEMENTING:
    1. Read shadcn/ui quick reference for Card component usage
    2. Review React quick reference for component patterns
    3. Check TypeScript quick reference for proper typing

    REQUIREMENTS:
    - Use shadcn/ui Card, CardHeader, CardTitle, CardContent components
    - Include TypeScript types for props
    - Use Tailwind CSS for additional styling
    - Follow React best practices from documentation

    Task: Create a reusable ProfileCard component that displays:
    - User avatar
    - Name and title
    - Bio text
    - Contact button
  `
}
```

## How Caching Works

### First Time (Framework Added)
1. User adds React to package.json
2. Hook system detects React dependency
3. System checks registry → React NOT cached
4. System fetches React documentation
5. Documentation saved to `.claude/knowledge/frameworks/react/`
6. Registry updated with cache status
7. **External fetch happens ONCE**

### Subsequent Uses
1. User asks to build React component
2. Hook system detects React dependency
3. System checks registry → React IS cached
4. **NO external fetch** - uses cached docs
5. Orchestrator provides agents with cached doc paths
6. Agents read local files (fast, efficient)

## Adding New Frameworks/Libraries

When you detect a need for documentation that isn't cached:

### Option 1: Automatic (Recommended)
Just use the framework! The system will:
1. Detect it automatically (if in package.json)
2. Fetch documentation
3. Cache it for future use

### Option 2: Manual Addition
If the automatic system doesn't support a framework yet:

```bash
# 1. Create directory
mkdir -p .claude/knowledge/frameworks/vue

# 2. Create documentation
cat > .claude/knowledge/frameworks/vue/quick-reference.md << 'EOF'
# Vue Quick Reference
[Add documentation content]
EOF

# 3. Update registry
# Use jq to add entry to registry.json
```

## Best Practices

### DO:
✅ **Always check registry first** before spawning agents
✅ **Provide specific doc paths** to agents
✅ **Trust the cache** - documentation is kept up to date
✅ **Use Read tool** to inspect documentation before providing to agents
✅ **Reference specific sections** when instructing agents
✅ **Keep registry.json as source of truth**

### DON'T:
❌ **Don't fetch externally** if documentation is cached
❌ **Don't assume** what documentation exists - check registry
❌ **Don't skip** providing documentation paths to agents
❌ **Don't duplicate** documentation - use cache
❌ **Don't bypass** the caching system

## Supported Frameworks/Libraries

### Currently Implemented
- ✅ React
- ✅ Next.js
- ✅ shadcn/ui
- ✅ Tailwind CSS
- ✅ TypeScript
- ✅ Claude Code (Anthropic)
- ✅ MCP (Anthropic)
- ✅ Agents (Anthropic)
- ✅ Skills (Anthropic)

### Adding New Support
To add support for a new framework/library, update `.claude/scripts/fetch-documentation.sh`:

1. Add detection in `detect-dependencies.sh`
2. Create fetch function in `fetch-documentation.sh`
3. Add case statement to main processing loop
4. Test with sample project

## Efficiency Metrics

### Traditional Approach (Bad)
- Fetch documentation every time: 🔴 Slow, wasteful
- Re-fetch for each agent: 🔴 Redundant, expensive
- No version tracking: 🔴 Inconsistent

### Smart Caching Approach (Good)
- Fetch once, use forever: ✅ Fast, efficient
- All agents use cache: ✅ Consistent, reliable
- Version tracking: ✅ Know when to update

## Troubleshooting

### Documentation Not Found
```bash
# Check registry
cat .claude/knowledge/registry.json | jq '.'

# Force refresh
rm .claude/knowledge/registry.json
bash .claude/scripts/check-and-fetch-docs.sh
```

### Outdated Documentation
```bash
# Remove specific cached docs
rm -rf .claude/knowledge/frameworks/react
jq 'del(.frameworks.react)' .claude/knowledge/registry.json > temp.json
mv temp.json .claude/knowledge/registry.json

# Re-run hook
bash .claude/scripts/check-and-fetch-docs.sh
```

### Check What's Cached
```bash
# List all cached frameworks
jq '.frameworks | keys[]' .claude/knowledge/registry.json

# List all cached libraries
jq '.libraries | keys[]' .claude/knowledge/registry.json

# Check specific item
jq '.frameworks.react' .claude/knowledge/registry.json
```

## Example Workflows

### Workflow 1: New React + shadcn/ui Project

```bash
# User creates package.json with react and shadcn/ui
# Hook runs automatically on next prompt

# Orchestrator checks registry
$ cat .claude/knowledge/registry.json
# Shows: react (cached), shadcn-ui (cached)

# Orchestrator spawns agent with doc paths
Agent prompt includes:
- .claude/knowledge/frameworks/react/quick-reference.md
- .claude/knowledge/libraries/shadcn-ui/quick-reference.md

# Agent reads local files and implements
# NO external fetches needed!
```

### Workflow 2: Adding New Library

```bash
# User runs: npm install axios
# Hook detects axios in package.json
# System fetches axios docs (if fetcher exists)
# Caches to .claude/knowledge/libraries/axios/
# Updates registry

# Future agents automatically have access
```

## Performance

### Before Smart Caching
- 🔴 Fetch time: 5-30 seconds per framework
- 🔴 Network requests: Every time
- 🔴 Redundancy: High

### After Smart Caching
- ✅ Fetch time: 0 seconds (cached)
- ✅ Network requests: Once per framework
- ✅ Redundancy: None

## MCP Installation Workflow

### When an MCP is Installed

The system automatically provides **THREE types of documentation**:

1. **Claude Code MCP Integration** - `.claude/knowledge/anthropic/mcp/quick-reference.md`
2. **IDE Configuration** - `.claude/knowledge/ide/[vscode|cursor|claude-desktop]/mcp-setup.md`
3. **MCP Server Specific** - `.claude/knowledge/mcp-servers/[server-name]/quick-reference.md`

### MCP Detection

The system detects MCPs from:
- Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`
- VS Code: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- Cursor: `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

### Orchestrator Responsibilities for MCP Tasks

When a user asks to install or use an MCP:

#### Step 1: Check What's Available
```bash
# Check detected MCPs
cat .claude/knowledge/.detected-mcps.json | jq '.'

# Check cached documentation
cat .claude/knowledge/registry.json | jq '.ide'
cat .claude/knowledge/registry.json | jq '.mcp_servers'
```

#### Step 2: Provide Complete Documentation Context

```markdown
AGENT PROMPT TEMPLATE FOR MCP INSTALLATION:

Task: Install [MCP Server Name]

DOCUMENTATION PROVIDED:
You have access to the following locally cached documentation:

1. MCP Protocol Understanding:
   - .claude/knowledge/anthropic/mcp/quick-reference.md

2. IDE Configuration ([Detected IDE]):
   - .claude/knowledge/ide/[vscode|cursor|claude-desktop]/mcp-setup.md

3. MCP Server Documentation (if available):
   - .claude/knowledge/mcp-servers/[server-name]/quick-reference.md

BEFORE INSTALLING:
1. Read MCP protocol documentation to understand how MCPs work
2. Review IDE-specific documentation for correct configuration format
3. Check server-specific docs for:
   - Installation requirements
   - API keys or credentials needed
   - Available tools and capabilities

INSTALLATION STEPS:
1. [Specific instructions based on MCP]
2. [Configuration details]
3. [Verification steps]

VERIFICATION:
After installation, verify the MCP is working by:
- Checking it appears in available tools
- Testing a simple operation
- Confirming API keys/credentials are valid
```

#### Step 3: Supported MCP Servers

**Fully Documented:**
- `filesystem` - File system access
- `github` - GitHub API integration
- `brave-search` - Web search

**Auto-Detected (generic docs):**
- All other MCPs get generic documentation
- Still cached and available to agents

### Example: Installing GitHub MCP

```markdown
USER: "Install the GitHub MCP server so I can search repos"

ORCHESTRATOR ACTIONS:

1. Check registry:
   $ cat .claude/knowledge/registry.json | jq '.ide'
   → Detected: claude-desktop ✅

   $ cat .claude/knowledge/registry.json | jq '.mcp_servers.github'
   → GitHub docs: ✅ Cached

2. Spawn agent with full context:

Task: Install and configure GitHub MCP server

DOCUMENTATION:
- MCP Protocol: .claude/knowledge/anthropic/mcp/quick-reference.md
- Claude Desktop Config: .claude/knowledge/ide/claude-desktop/mcp-setup.md
- GitHub MCP: .claude/knowledge/mcp-servers/github/quick-reference.md

BEFORE IMPLEMENTING:
1. Review GitHub MCP docs for:
   - Required GitHub Personal Access Token
   - Necessary token scopes (repo, workflow, etc.)
   - Available tools (search_repositories, create_issue, etc.)

2. Review Claude Desktop MCP setup for:
   - Config file location
   - JSON format requirements
   - How to add environment variables

REQUIREMENTS:
- User needs GitHub Personal Access Token
- Token needs 'repo' scope minimum
- Server command: npx -y @modelcontextprotocol/server-github

IMPLEMENTATION:
1. Ask user for GitHub token (if not provided)
2. Edit ~/Library/Application Support/Claude/claude_desktop_config.json
3. Add GitHub MCP server configuration
4. Instruct user to restart Claude Desktop
5. Verify installation by checking available tools

3. Agent reads docs, implements, verifies
4. Future agents have access to same docs (no re-fetch)
```

### MCP Best Practices

#### DO:
✅ **Provide all three documentation types** (MCP protocol + IDE config + Server-specific)
✅ **Check registry first** to see what's cached
✅ **Read docs before providing** to understand requirements
✅ **Verify MCP works** before considering task complete
✅ **Use cached docs** for all future MCP tasks

#### DON'T:
❌ **Don't assume MCP docs exist** - check registry first
❌ **Don't skip IDE-specific docs** - configuration varies by IDE
❌ **Don't forget API keys** - most MCPs need credentials
❌ **Don't skip verification** - ensure MCP is actually working

### MCP Registry Structure

```json
{
  "ide": {
    "claude-desktop": {
      "version": "latest",
      "cached_at": "2025-11-17T12:00:00Z",
      "status": "cached",
      "files": ["ide/claude-desktop/mcp-setup.md"]
    }
  },
  "mcp_servers": {
    "github": {
      "version": "latest",
      "cached_at": "2025-11-17T12:00:00Z",
      "status": "cached",
      "files": ["mcp-servers/github/quick-reference.md"]
    },
    "filesystem": {
      "version": "latest",
      "cached_at": "2025-11-17T12:00:00Z",
      "status": "cached",
      "files": ["mcp-servers/filesystem/quick-reference.md"]
    }
  }
}
```

### Troubleshooting MCP Issues

**MCP Not Working:**
1. Check `.claude/docs-fetch.log` for detection errors
2. Verify MCP appears in `.detected-mcps.json`
3. Ensure documentation was cached in registry
4. Review agent's implementation against docs

**Missing Documentation:**
1. Check if MCP server has custom fetcher in `fetch-documentation.sh`
2. If not, agent gets generic MCP documentation
3. Consider adding custom fetcher for frequently-used MCPs

---

**Remember**: The goal is **efficiency through intelligent caching**. Fetch once, use forever. For MCPs, always provide agents with all three documentation types: MCP protocol understanding, IDE-specific configuration, and server-specific capabilities. This ensures successful MCP installation and usage every time.
