# Knowledge Base Structure

## Overview
This knowledge base stores documentation locally for all frameworks, libraries, and tools used in the project. Documentation is fetched once and cached locally for efficiency.

## Directory Structure

```
.claude/knowledge/
├── KNOWLEDGE_BASE_STRUCTURE.md    # This file
├── registry.json                  # Master registry of all cached documentation
├── metadata.json                  # System metadata
├── README.md                      # Overview
│
├── anthropic/                     # Anthropic-specific documentation
│   ├── claude-code/
│   ├── mcp/
│   ├── agents/
│   └── skills/
│
├── frameworks/                    # Framework documentation
│   ├── react/
│   │   ├── version.json          # Version info
│   │   ├── quick-reference.md    # Quick reference
│   │   ├── core-concepts.md      # Core concepts
│   │   └── api-reference.md      # API reference
│   ├── nextjs/
│   ├── vue/
│   └── ...
│
├── libraries/                     # Library documentation
│   ├── shadcn-ui/
│   │   ├── version.json
│   │   ├── components.md         # Component reference
│   │   └── installation.md
│   ├── tailwindcss/
│   ├── axios/
│   └── ...
│
├── tools/                         # Development tools
│   ├── vite/
│   ├── webpack/
│   ├── typescript/
│   └── ...
│
└── project-specific/              # Project-specific documentation
    └── custom-patterns.md
```

## Registry Format (registry.json)

```json
{
  "last_updated": "2025-11-17T12:00:00Z",
  "frameworks": {
    "react": {
      "version": "18.3.1",
      "source": "https://react.dev",
      "cached_at": "2025-11-17T12:00:00Z",
      "status": "cached",
      "files": [
        "frameworks/react/quick-reference.md",
        "frameworks/react/core-concepts.md",
        "frameworks/react/api-reference.md"
      ]
    }
  },
  "libraries": {
    "shadcn-ui": {
      "version": "latest",
      "source": "https://ui.shadcn.com",
      "cached_at": "2025-11-17T12:00:00Z",
      "status": "cached",
      "files": [
        "libraries/shadcn-ui/components.md",
        "libraries/shadcn-ui/installation.md"
      ]
    }
  },
  "tools": {},
  "anthropic": {
    "claude-code": {
      "version": "latest",
      "source": "https://code.claude.com/docs",
      "cached_at": "2025-11-17T12:00:00Z",
      "status": "cached"
    }
  }
}
```

## Caching Strategy

1. **Fetch Once**: Documentation is fetched once and stored locally
2. **Version Tracking**: Track versions to know when to update
3. **Smart Updates**: Only re-fetch if:
   - Version changes in project dependencies
   - Documentation is older than 7 days (for "latest")
   - Manual refresh requested
4. **Project-Specific**: Only cache documentation for dependencies actually used

## Documentation Sources

### Frameworks
- React: https://react.dev
- Next.js: https://nextjs.org/docs
- Vue: https://vuejs.org/guide
- Angular: https://angular.io/docs
- Svelte: https://svelte.dev/docs

### UI Libraries
- shadcn/ui: https://ui.shadcn.com
- Material-UI: https://mui.com
- Ant Design: https://ant.design
- Chakra UI: https://chakra-ui.com

### CSS Frameworks
- Tailwind CSS: https://tailwindcss.com/docs
- Bootstrap: https://getbootstrap.com/docs

### Tools
- TypeScript: https://www.typescriptlang.org/docs
- Vite: https://vitejs.dev/guide
- Webpack: https://webpack.js.org/concepts

### Anthropic
- Claude Code: https://code.claude.com/docs
- MCP: https://modelcontextprotocol.io
- Anthropic Docs: https://docs.anthropic.com
