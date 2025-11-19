# ClienTalk - Smart Documentation System

## Overview

This directory contains a **smart documentation caching system** that ensures agents always have access to the latest documentation for **ALL** frameworks, libraries, and tools used in the project - not just Anthropic's.

### Key Features

✅ **Multi-Framework Support** - React, Next.js, Vue, shadcn/ui, Tailwind, TypeScript, and more
✅ **Smart Caching** - Fetch once, use forever (no redundant external requests)
✅ **Automatic Detection** - Automatically detects dependencies from package.json
✅ **Version Tracking** - Tracks versions to know when to update
✅ **Efficient** - Only caches documentation for dependencies actually used in the project
✅ **Agent-Ready** - All documentation structured for easy agent consumption

## How It Works

### 1. Automatic Dependency Detection
When the hook runs (on every user prompt), it:
- Scans `package.json`, `requirements.txt`, etc.
- Detects all frameworks, libraries, and tools
- Creates a dependency manifest

### 2. Smart Caching
For each detected dependency:
- Checks if documentation is already cached
- If YES → Skip (efficient!)
- If NO → Fetch and cache (one-time operation)

### 3. Documentation Access
All cached documentation is available at:
```
.claude/knowledge/
├── registry.json              # Master registry (what's cached)
├── frameworks/                # React, Next.js, Vue, etc.
├── libraries/                 # shadcn/ui, Tailwind, etc.
├── tools/                     # TypeScript, Vite, etc.
└── anthropic/                 # Claude Code, MCP, Agents, Skills
```

## Directory Structure

```
.claude/
├── README.md                          # This file
├── ORCHESTRATOR_INSTRUCTIONS.md       # Guide for orchestrator agent
├── settings.json                      # Claude Code settings and hooks
├── docs-fetch.log                     # Documentation fetch log
│
├── scripts/
│   ├── check-and-fetch-docs.sh       # Main hook script
│   ├── detect-dependencies.sh        # Dependency detection
│   └── fetch-documentation.sh        # Smart documentation fetcher
│
└── knowledge/                         # Documentation cache
    ├── registry.json                  # Master registry
    ├── KNOWLEDGE_BASE_STRUCTURE.md    # Structure documentation
    ├── frameworks/                    # Framework docs
    ├── libraries/                     # Library docs
    ├── tools/                         # Tool docs
    ├── anthropic/                     # Anthropic docs
    └── project-specific/              # Custom project docs
```

## Supported Technologies

### Frameworks
- ✅ React
- ✅ Next.js
- ✅ Vue (detection only - add fetcher)
- ✅ Angular (detection only - add fetcher)
- ✅ Svelte (detection only - add fetcher)

### UI Libraries
- ✅ shadcn/ui
- ✅ Material-UI (detection only - add fetcher)
- ✅ Ant Design (detection only - add fetcher)
- ✅ Chakra UI (detection only - add fetcher)

### CSS Frameworks
- ✅ Tailwind CSS
- ✅ Bootstrap (detection only - add fetcher)

### Tools
- ✅ TypeScript
- ✅ Vite (detection only - add fetcher)
- ✅ Webpack (detection only - add fetcher)

### Anthropic
- ✅ Claude Code
- ✅ MCP (Model Context Protocol)
- ✅ Agents
- ✅ Skills

## Usage

### For Users

The system runs **automatically in the background**. You don't need to do anything!

When you add a new framework or library to your project:
1. Install it: `npm install react` or `npm install shadcn-ui`
2. Next time you interact with Claude, the hook automatically:
   - Detects the new dependency
   - Fetches documentation (if not cached)
   - Makes it available to all agents

### For Developers

#### Check What's Cached

```bash
# View entire registry
cat .claude/knowledge/registry.json | jq '.'

# List cached frameworks
cat .claude/knowledge/registry.json | jq '.frameworks | keys'

# List cached libraries
cat .claude/knowledge/registry.json | jq '.libraries | keys'

# Check specific framework
cat .claude/knowledge/registry.json | jq '.frameworks.react'
```

#### Manual Documentation Refresh

```bash
# Force refresh all documentation
bash .claude/scripts/check-and-fetch-docs.sh

# Force refresh specific framework
rm -rf .claude/knowledge/frameworks/react
jq 'del(.frameworks.react)' .claude/knowledge/registry.json > temp.json
mv temp.json .claude/knowledge/registry.json
bash .claude/scripts/check-and-fetch-docs.sh
```

#### View Logs

```bash
# View fetch log
cat .claude/docs-fetch.log

# Watch log in real-time
tail -f .claude/docs-fetch.log
```

### For Orchestrator Agent

See `ORCHESTRATOR_INSTRUCTIONS.md` for detailed instructions on:
- How to check the registry
- How to provide documentation to spawned agents
- Best practices for efficient documentation usage
- Example workflows

**Key Points:**
1. **Always check registry first**: `cat .claude/knowledge/registry.json`
2. **Provide specific paths to agents**: Don't assume, specify exact file paths
3. **Trust the cache**: No need to fetch externally if documentation is cached

## Configuration

### Hook Configuration (settings.json)

```json
{
  "hooks": {
    "user-prompt-submit": {
      "command": "bash .claude/scripts/check-and-fetch-docs.sh",
      "description": "Checks for new frameworks/libraries and fetches latest documentation"
    }
  }
}
```

### Documentation Sources

The system fetches documentation from official sources:

**Frameworks:**
- React: https://react.dev
- Next.js: https://nextjs.org/docs
- Vue: https://vuejs.org/guide

**Libraries:**
- shadcn/ui: https://ui.shadcn.com
- Tailwind CSS: https://tailwindcss.com/docs

**Tools:**
- TypeScript: https://www.typescriptlang.org/docs

**Anthropic:**
- Claude Code: https://code.claude.com/docs
- MCP: https://modelcontextprotocol.io
- Anthropic Docs: https://docs.anthropic.com

## Adding Support for New Frameworks

Want to add support for a new framework? Edit `.claude/scripts/fetch-documentation.sh`:

### Step 1: Add Fetcher Function

```bash
fetch_vue_docs() {
    local version=$1
    local docs_dir="$KNOWLEDGE_BASE/frameworks/vue"
    mkdir -p "$docs_dir"

    # Create quick reference
    cat > "$docs_dir/quick-reference.md" << 'EOF'
# Vue Quick Reference
[Your documentation content here]
EOF

    # Create version file
    cat > "$docs_dir/version.json" << EOF
{
  "version": "$version",
  "last_updated": "$TIMESTAMP",
  "source": "https://vuejs.org"
}
EOF

    # Update registry
    local files='["frameworks/vue/quick-reference.md"]'
    update_registry "frameworks" "vue" "$version" "https://vuejs.org" "$files"
}
```

### Step 2: Add to Main Loop

In the `main()` function, add to the frameworks processing:

```bash
case "$framework" in
    "react")
        fetch_react_docs "$version"
        ;;
    "vue")
        fetch_vue_docs "$version"
        ;;
    ...
esac
```

### Step 3: Test

```bash
# Add vue to package.json
# Run hook
bash .claude/scripts/check-and-fetch-docs.sh

# Check registry
cat .claude/knowledge/registry.json | jq '.frameworks.vue'
```

## Efficiency Benefits

### Traditional Approach
❌ Fetch docs every time (slow)
❌ Re-fetch for each agent (wasteful)
❌ No version tracking (inconsistent)
❌ Network dependent (unreliable)

### Smart Caching Approach
✅ Fetch once, use forever (fast)
✅ All agents use cache (efficient)
✅ Version tracking (consistent)
✅ Works offline (reliable)

### Real-World Example

**Scenario:** Building a React + Next.js + shadcn/ui app with 10 agent spawns

**Without Caching:**
- 10 agents × 3 frameworks × 5 seconds = **150 seconds of fetch time**
- 30 external HTTP requests
- Network bandwidth: High

**With Smart Caching:**
- First agent: 3 frameworks × 5 seconds = **15 seconds**
- Next 9 agents: 0 seconds (use cache) = **0 seconds**
- 3 external HTTP requests total
- Network bandwidth: Minimal

**Savings: 135 seconds, 27 fewer HTTP requests**

## Troubleshooting

### Documentation Not Updating

```bash
# Check if hook is running
cat .claude/docs-fetch.log

# Verify hook configuration
cat .claude/settings.json

# Test hook manually
bash .claude/scripts/check-and-fetch-docs.sh
```

### Registry Corruption

```bash
# Backup registry
cp .claude/knowledge/registry.json .claude/knowledge/registry.json.backup

# Reset registry
rm .claude/knowledge/registry.json
bash .claude/scripts/check-and-fetch-docs.sh
```

### Missing jq

The system requires `jq` for JSON processing:

```bash
# macOS
brew install jq

# Linux (Ubuntu/Debian)
sudo apt-get install jq

# Linux (RHEL/CentOS)
sudo yum install jq
```

## Best Practices

### For Developers
1. **Trust the cache** - Don't manually fetch if documentation is cached
2. **Check the registry** - Always verify what's available before assuming
3. **Use the logs** - Check `.claude/docs-fetch.log` for debugging
4. **Keep it clean** - Remove unused dependencies to keep cache lean

### For Orchestrator
1. **Check registry first** - Before spawning agents, verify available docs
2. **Provide specific paths** - Give agents exact file paths to documentation
3. **Read before providing** - Review docs before instructing agents
4. **Follow the workflow** - See ORCHESTRATOR_INSTRUCTIONS.md

### For Contributing
1. **Add detection** - Update `detect-dependencies.sh` for new frameworks
2. **Create fetcher** - Add fetch function in `fetch-documentation.sh`
3. **Test thoroughly** - Verify detection, fetching, and caching
4. **Update docs** - Document new frameworks in this README

## Examples

### Example 1: Starting a New React Project

```bash
# Initialize project
npm init -y
npm install react react-dom

# On next Claude interaction, hook automatically:
# 1. Detects React in package.json
# 2. Fetches React documentation
# 3. Caches to .claude/knowledge/frameworks/react/
# 4. Updates registry

# All future agents have access to React docs!
```

### Example 2: Adding shadcn/ui

```bash
# Install shadcn/ui (adds @radix-ui/react-slot)
npx shadcn@latest init

# Hook automatically:
# 1. Detects @radix-ui/react-slot (shadcn indicator)
# 2. Fetches shadcn/ui documentation
# 3. Caches to .claude/knowledge/libraries/shadcn-ui/
# 4. Updates registry

# All agents now know how to use shadcn/ui components!
```

## Support

- **Claude Code Docs**: https://code.claude.com/docs
- **GitHub Issues**: https://github.com/anthropics/claude-code/issues
- **Log File**: `.claude/docs-fetch.log`
- **Registry**: `.claude/knowledge/registry.json`

---

**Built for efficiency. Designed for agents. Optimized for developers.**
