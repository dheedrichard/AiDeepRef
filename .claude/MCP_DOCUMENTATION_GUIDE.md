# MCP Documentation System

## Overview

When an MCP server is installed, the system automatically fetches and caches documentation for:
1. **Claude Code** - Latest MCP integration patterns
2. **Your IDE** - VS Code, Cursor, or Claude Desktop configuration
3. **The specific MCP server** - Tools, capabilities, and usage

## How It Works

### Automatic Detection

The system detects MCP installations from:
- **Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Cursor**: `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- **VS Code**: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- **Project Config**: `.claude/mcp-config.json` (if present)

### Smart Caching for MCPs

When an MCP is detected:
1. **Check Cache**: Is this MCP already documented?
   - YES → Skip (efficient!)
   - NO → Fetch documentation

2. **Fetch Three Types of Docs**:
   - Claude Code MCP documentation (if not cached)
   - IDE-specific MCP setup (if not cached)
   - MCP server-specific docs (if not cached)

3. **Cache Locally**: Save all documentation to knowledge base

4. **Available to All Agents**: Every agent can access the docs instantly

## Documentation Structure

```
.claude/knowledge/
├── anthropic/
│   ├── claude-code/quick-reference.md      # Claude Code features
│   └── mcp/quick-reference.md              # MCP protocol basics
│
├── ide/
│   ├── vscode/mcp-setup.md                 # VS Code MCP configuration
│   ├── cursor/mcp-setup.md                 # Cursor MCP configuration
│   └── claude-desktop/mcp-setup.md         # Claude Desktop MCP config
│
└── mcp-servers/
    ├── filesystem/quick-reference.md       # Filesystem MCP server
    ├── github/quick-reference.md           # GitHub MCP server
    ├── brave-search/quick-reference.md     # Brave Search MCP server
    └── [custom-server]/quick-reference.md  # Custom MCP servers
```

## Example Workflow

### Scenario: Installing GitHub MCP Server

```bash
# 1. User edits Claude Desktop config
cat > ~/Library/Application\ Support/Claude/claude_desktop_config.json << 'EOF'
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token"
      }
    }
  }
}
EOF

# 2. User interacts with Claude (hook triggers)
# → System detects MCP installation
# → Checks cache:
#    - Claude Code docs? ✅ Already cached
#    - Claude Desktop IDE docs? ❌ Not cached → Fetch
#    - GitHub MCP server docs? ❌ Not cached → Fetch

# 3. Documentation fetched and cached to:
#    - .claude/knowledge/ide/claude-desktop/mcp-setup.md
#    - .claude/knowledge/mcp-servers/github/quick-reference.md

# 4. Registry updated

# 5. Orchestrator spawns agent with docs:
#    - "Review: .claude/knowledge/ide/claude-desktop/mcp-setup.md"
#    - "GitHub MCP: .claude/knowledge/mcp-servers/github/quick-reference.md"
#    - "MCP Protocol: .claude/knowledge/anthropic/mcp/quick-reference.md"

# 6. Agent reads local docs and implements GitHub integration

# 7. Future agents automatically have access (no re-fetch!)
```

## Supported MCP Servers

### Fully Documented
- ✅ **filesystem** - File system access
- ✅ **github** - GitHub API integration
- ✅ **brave-search** - Web search

### Auto-Detected (generic docs)
- All other MCP servers get generic documentation
- Add custom fetchers in `fetch-documentation.sh` for detailed docs

## Supported IDEs

- ✅ **Claude Desktop** - Native MCP support
- ✅ **VS Code** - Via Claude Dev extension
- ✅ **Cursor** - Via Claude Dev extension

## Registry Structure

### IDE Section
```json
{
  "ide": {
    "claude-desktop": {
      "version": "latest",
      "source": "https://claude.ai",
      "cached_at": "2025-11-17T12:00:00Z",
      "status": "cached",
      "files": ["ide/claude-desktop/mcp-setup.md"]
    }
  }
}
```

### MCP Servers Section
```json
{
  "mcp_servers": {
    "github": {
      "version": "latest",
      "source": "https://github.com/modelcontextprotocol/servers",
      "cached_at": "2025-11-17T12:00:00Z",
      "status": "cached",
      "files": ["mcp-servers/github/quick-reference.md"]
    }
  }
}
```

## For Orchestrator Agents

### Before Installing an MCP

```markdown
Task: Install GitHub MCP server

DOCUMENTATION TO PROVIDE TO AGENT:
1. Check registry for cached docs
2. Provide paths to:
   - .claude/knowledge/anthropic/mcp/quick-reference.md (MCP protocol)
   - .claude/knowledge/ide/[detected-ide]/mcp-setup.md (IDE config)
   - .claude/knowledge/mcp-servers/github/quick-reference.md (if installing GitHub)

AGENT INSTRUCTIONS:
Before installing, review:
1. MCP protocol documentation for understanding
2. IDE-specific setup for configuration format
3. Server-specific docs for requirements (API keys, etc.)

Then:
1. Install/configure the MCP server
2. Verify it's working
3. Test available tools
```

### After Installing an MCP

```markdown
The system automatically:
1. Detects new MCP in config file
2. Fetches documentation if not cached
3. Makes available to all future agents

You (orchestrator) should:
1. Verify docs were cached (check registry)
2. Provide agents with specific doc paths
3. Ensure agents use the MCP correctly
```

## Manual Commands

### Check Detected MCPs
```bash
# View detected MCPs
cat .claude/knowledge/.detected-mcps.json | jq '.'

# See IDE
cat .claude/knowledge/.detected-mcps.json | jq '.ide'

# List all MCP servers
cat .claude/knowledge/.detected-mcps.json | jq '.mcp_servers | keys'
```

### Check Cached Documentation
```bash
# View IDE docs in registry
cat .claude/knowledge/registry.json | jq '.ide'

# View MCP server docs in registry
cat .claude/knowledge/registry.json | jq '.mcp_servers'

# Check specific MCP
cat .claude/knowledge/registry.json | jq '.mcp_servers.github'
```

### Force Refresh MCP Documentation
```bash
# Remove MCP server docs
rm -rf .claude/knowledge/mcp-servers/github
jq 'del(.mcp_servers.github)' .claude/knowledge/registry.json > temp.json
mv temp.json .claude/knowledge/registry.json

# Re-run detection and fetch
bash .claude/scripts/check-and-fetch-docs.sh
```

## Adding Support for New MCP Servers

To add detailed documentation for a new MCP server, edit `.claude/scripts/fetch-documentation.sh`:

```bash
fetch_mcp_server_docs() {
    local server_name=$1
    local docs_dir="$KNOWLEDGE_BASE/mcp-servers/$server_name"
    mkdir -p "$docs_dir"

    case "$server_name" in
        # ... existing cases ...

        "your-new-mcp")
            cat > "$docs_dir/quick-reference.md" << 'EOF'
# Your New MCP Server

## Overview
Description of what this MCP does

## Installation
How to install and configure

## Capabilities
What tools and resources it provides

## Examples
Usage examples
EOF
            ;;
    esac

    # ... rest of function
}
```

## Best Practices

### For Users
1. **Install MCPs normally** - System detects automatically
2. **Check logs** - See what was detected: `cat .claude/docs-fetch.log`
3. **Verify cache** - Check registry after installation

### For Orchestrator
1. **Always provide three types of docs**:
   - MCP protocol (general knowledge)
   - IDE configuration (how to set it up)
   - Server-specific (what it can do)

2. **Check registry first** - Don't assume what's cached

3. **Test MCP before complex tasks** - Have agent verify MCP is working

### For Developers
1. **Add MCP server documentation** - Edit fetch-documentation.sh
2. **Keep docs focused** - Quick reference, not full manual
3. **Include examples** - Show actual usage patterns

## Efficiency Benefits

### Traditional Approach
❌ Look up MCP docs online every time
❌ Re-read IDE configuration docs
❌ Search for examples repeatedly
❌ Inconsistent information

### Smart Caching Approach
✅ Fetch once, use forever
✅ All agents have instant access
✅ Consistent, up-to-date information
✅ Works offline

### Real Numbers

**Installing 3 MCP servers (filesystem, github, brave-search) with 5 agent spawns:**

**Without Caching:**
- 5 agents × 3 MCPs × 10 seconds = **150 seconds** looking up docs
- 15 external searches/page loads
- Inconsistent information across agents

**With Smart Caching:**
- First time: ~30 seconds (fetch all docs once)
- Next 4 agents: **0 seconds** (use cache)
- 1 fetch operation total
- Consistent docs for all agents

**Savings: 120 seconds + more consistent implementation!**

## Troubleshooting

### MCP Not Detected
```bash
# Check detection
bash .claude/scripts/detect-mcp-servers.sh
cat .claude/knowledge/.detected-mcps.json

# Verify config file exists
ls -la ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### Documentation Not Created
```bash
# Check logs
cat .claude/docs-fetch.log | grep -i mcp

# Force refresh
bash .claude/scripts/check-and-fetch-docs.sh
```

### Wrong IDE Detected
```bash
# View detected IDE
cat .claude/knowledge/.detected-mcps.json | jq '.ide'

# Manually set (if needed)
# Edit .detected-mcps.json
```

---

**The system ensures that whenever you install an MCP, all agents immediately have access to complete, accurate, locally-cached documentation for using it effectively.**
