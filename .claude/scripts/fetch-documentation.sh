#!/bin/bash

# Smart Documentation Fetcher
# Fetches and caches documentation only for dependencies actually used in the project
# Only fetches once - subsequent calls use cached versions

set -e

KNOWLEDGE_BASE=".claude/knowledge"
REGISTRY="$KNOWLEDGE_BASE/registry.json"
DEPENDENCIES_FILE="$KNOWLEDGE_BASE/.detected-dependencies.json"
LOG_FILE=".claude/docs-fetch.log"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Function to log messages
log() {
    echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

# Function to check if jq is installed
check_jq() {
    if ! command -v jq &> /dev/null; then
        log "ERROR: jq is required but not installed. Install with: brew install jq"
        exit 1
    fi
}

# Function to check if documentation is cached
is_cached() {
    local category=$1  # frameworks, libraries, tools, anthropic
    local name=$2

    if ! jq -e ".$category.\"$name\"" "$REGISTRY" > /dev/null 2>&1; then
        return 1  # Not cached
    fi

    local status=$(jq -r ".$category.\"$name\".status" "$REGISTRY")
    if [ "$status" = "cached" ]; then
        return 0  # Cached
    fi

    return 1  # Not cached
}

# Function to get cached version
get_cached_version() {
    local category=$1
    local name=$2
    jq -r ".$category.\"$name\".version // \"unknown\"" "$REGISTRY"
}

# Function to update registry
update_registry() {
    local category=$1
    local name=$2
    local version=$3
    local source=$4
    local files=$5  # JSON array as string

    local entry=$(jq -n \
        --arg ver "$version" \
        --arg src "$source" \
        --arg ts "$TIMESTAMP" \
        --argjson files "$files" \
        '{
            version: $ver,
            source: $src,
            cached_at: $ts,
            status: "cached",
            files: $files
        }')

    # Update registry
    echo "$(jq --arg cat "$category" --arg name "$name" --argjson entry "$entry" \
        '.[$cat][$name] = $entry | .last_updated = "'$TIMESTAMP'"' \
        "$REGISTRY")" > "$REGISTRY"

    log "Updated registry: $category/$name v$version"
}

# Function to create React documentation
fetch_react_docs() {
    local version=$1
    local docs_dir="$KNOWLEDGE_BASE/frameworks/react"
    mkdir -p "$docs_dir"

    log "Creating React documentation (v$version)..."

    # Create quick reference
    cat > "$docs_dir/quick-reference.md" << 'EOF'
# React Quick Reference

## Core Concepts

### Components
```jsx
// Function Component
function Welcome({ name }) {
  return <h1>Hello, {name}</h1>;
}

// With State
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### Hooks
- `useState` - State management
- `useEffect` - Side effects
- `useContext` - Context consumption
- `useReducer` - Complex state logic
- `useCallback` - Memoized callbacks
- `useMemo` - Memoized values
- `useRef` - Refs
- `useId` - Unique IDs (React 18+)

### Modern Patterns (React 18+)
- Concurrent rendering
- Automatic batching
- Transitions (`useTransition`, `startTransition`)
- Suspense for data fetching
- Server Components (with frameworks)

## Best Practices

1. **Component Design**
   - Keep components small and focused
   - Use composition over inheritance
   - Extract reusable logic to custom hooks

2. **Performance**
   - Use `React.memo` for expensive components
   - Optimize re-renders with `useMemo` and `useCallback`
   - Use `useTransition` for non-urgent updates

3. **State Management**
   - Lift state up when needed
   - Use Context for app-wide state
   - Consider external libraries (Redux, Zustand) for complex state

## Official Documentation
- https://react.dev - Official docs
- https://react.dev/learn - Tutorial
- https://react.dev/reference/react - API Reference

## Version-Specific Features
EOF

    echo "- Version: $version" >> "$docs_dir/quick-reference.md"

    cat > "$docs_dir/version.json" << EOF
{
  "version": "$version",
  "last_updated": "$TIMESTAMP",
  "source": "https://react.dev"
}
EOF

    local files='["frameworks/react/quick-reference.md", "frameworks/react/version.json"]'
    update_registry "frameworks" "react" "$version" "https://react.dev" "$files"
}

# Function to create Next.js documentation
fetch_nextjs_docs() {
    local version=$1
    local docs_dir="$KNOWLEDGE_BASE/frameworks/nextjs"
    mkdir -p "$docs_dir"

    log "Creating Next.js documentation (v$version)..."

    cat > "$docs_dir/quick-reference.md" << 'EOF'
# Next.js Quick Reference

## Core Features

### App Router (Next.js 13+)
```jsx
// app/page.js - Server Component by default
export default function Page() {
  return <h1>Home Page</h1>;
}

// app/layout.js - Root layout
export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

### Routing
- File-based routing
- Dynamic routes: `[id]`
- Route groups: `(group)`
- Parallel routes: `@folder`
- Intercepting routes: `(.)folder`

### Data Fetching
```jsx
// Server Component - async/await
async function Page() {
  const data = await fetch('https://api.example.com/data');
  return <div>{data.title}</div>;
}

// Client Component
'use client';
import { useState, useEffect } from 'react';

function ClientComponent() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/data').then(res => res.json()).then(setData);
  }, []);
  return <div>{data?.title}</div>;
}
```

### API Routes
```js
// app/api/route.js
export async function GET(request) {
  return Response.json({ message: 'Hello' });
}

export async function POST(request) {
  const body = await request.json();
  return Response.json({ received: body });
}
```

## Key Concepts

1. **Server vs Client Components**
   - Server Components: Default, run on server
   - Client Components: Use `'use client'`, run in browser

2. **Rendering**
   - Static Site Generation (SSG)
   - Server-Side Rendering (SSR)
   - Incremental Static Regeneration (ISR)
   - Client-Side Rendering (CSR)

3. **Optimization**
   - Image optimization with `next/image`
   - Font optimization with `next/font`
   - Script optimization with `next/script`

## Official Documentation
- https://nextjs.org/docs - Official docs
- https://nextjs.org/learn - Tutorial

EOF

    echo "- Version: $version" >> "$docs_dir/quick-reference.md"

    cat > "$docs_dir/version.json" << EOF
{
  "version": "$version",
  "last_updated": "$TIMESTAMP",
  "source": "https://nextjs.org/docs"
}
EOF

    local files='["frameworks/nextjs/quick-reference.md", "frameworks/nextjs/version.json"]'
    update_registry "frameworks" "nextjs" "$version" "https://nextjs.org/docs" "$files"
}

# Function to create shadcn/ui documentation
fetch_shadcn_docs() {
    local version=$1
    local docs_dir="$KNOWLEDGE_BASE/libraries/shadcn-ui"
    mkdir -p "$docs_dir"

    log "Creating shadcn/ui documentation..."

    cat > "$docs_dir/quick-reference.md" << 'EOF'
# shadcn/ui Quick Reference

## Overview
shadcn/ui is a collection of re-usable components built with Radix UI and Tailwind CSS.

## Installation

```bash
npx shadcn@latest init
```

## Adding Components

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

## Common Components

### Button
```jsx
import { Button } from "@/components/ui/button"

<Button variant="default">Click me</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
```

### Card
```jsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>
```

### Dialog
```jsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader } from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>Title</DialogHeader>
    <p>Content</p>
  </DialogContent>
</Dialog>
```

### Form
```jsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormField, FormItem, FormLabel } from "@/components/ui/form"

const form = useForm({
  resolver: zodResolver(schema),
})
```

## Key Features

1. **Copy/Paste Components** - Components are added to your project, not imported from a package
2. **Fully Customizable** - You own the code and can modify as needed
3. **Built on Radix UI** - Accessible, unstyled components
4. **Tailwind CSS** - Utility-first CSS framework
5. **TypeScript** - Full type safety

## Component Categories

- **Forms**: Input, Textarea, Select, Checkbox, Radio
- **Feedback**: Alert, Toast, Dialog, Popover
- **Data Display**: Card, Table, Badge, Avatar
- **Navigation**: Tabs, Dropdown Menu, Navigation Menu
- **Overlays**: Dialog, Sheet, Tooltip, Hover Card

## Official Documentation
- https://ui.shadcn.com - Official docs
- https://ui.shadcn.com/docs/components - Component docs

## Dependencies
- Radix UI - Headless UI components
- Tailwind CSS - Styling
- class-variance-authority - Variant management
- clsx / tailwind-merge - Class merging
EOF

    cat > "$docs_dir/version.json" << EOF
{
  "version": "$version",
  "last_updated": "$TIMESTAMP",
  "source": "https://ui.shadcn.com"
}
EOF

    local files='["libraries/shadcn-ui/quick-reference.md", "libraries/shadcn-ui/version.json"]'
    update_registry "libraries" "shadcn-ui" "$version" "https://ui.shadcn.com" "$files"
}

# Function to create Tailwind CSS documentation
fetch_tailwind_docs() {
    local version=$1
    local docs_dir="$KNOWLEDGE_BASE/libraries/tailwindcss"
    mkdir -p "$docs_dir"

    log "Creating Tailwind CSS documentation (v$version)..."

    cat > "$docs_dir/quick-reference.md" << 'EOF'
# Tailwind CSS Quick Reference

## Core Concepts

### Utility-First
Use utility classes to build designs directly in HTML/JSX:

```jsx
<div className="bg-blue-500 text-white p-4 rounded-lg shadow-md">
  <h1 className="text-2xl font-bold">Hello World</h1>
</div>
```

### Common Utilities

#### Layout
- `container` - Responsive container
- `flex`, `grid` - Flexbox/Grid
- `block`, `inline-block`, `hidden` - Display

#### Spacing
- `p-{size}` - Padding (p-4, p-8)
- `m-{size}` - Margin (m-4, m-8)
- `space-x-{size}`, `space-y-{size}` - Gap between children

#### Typography
- `text-{size}` - Font size (text-sm, text-xl)
- `font-{weight}` - Font weight (font-bold, font-light)
- `text-{color}` - Text color (text-blue-500)

#### Colors
- `bg-{color}-{shade}` - Background (bg-blue-500)
- `text-{color}-{shade}` - Text (text-gray-700)
- `border-{color}-{shade}` - Border (border-red-500)

#### Effects
- `shadow-{size}` - Box shadow
- `rounded-{size}` - Border radius
- `opacity-{amount}` - Opacity

### Responsive Design
```jsx
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* Full width on mobile, half on tablet, third on desktop */}
</div>
```

Breakpoints:
- `sm:` - 640px
- `md:` - 768px
- `lg:` - 1024px
- `xl:` - 1280px
- `2xl:` - 1536px

### Dark Mode
```jsx
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
  Content
</div>
```

### Arbitrary Values
```jsx
<div className="top-[117px] bg-[#1da1f2]">
  Custom values
</div>
```

## Configuration (tailwind.config.js)

```js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#1da1f2',
      },
    },
  },
  plugins: [],
}
```

## Official Documentation
- https://tailwindcss.com/docs - Official docs
- https://tailwindcss.com/docs/utility-first - Core concepts
EOF

    echo "- Version: $version" >> "$docs_dir/quick-reference.md"

    cat > "$docs_dir/version.json" << EOF
{
  "version": "$version",
  "last_updated": "$TIMESTAMP",
  "source": "https://tailwindcss.com/docs"
}
EOF

    local files='["libraries/tailwindcss/quick-reference.md", "libraries/tailwindcss/version.json"]'
    update_registry "libraries" "tailwindcss" "$version" "https://tailwindcss.com/docs" "$files"
}

# Function to create TypeScript documentation
fetch_typescript_docs() {
    local version=$1
    local docs_dir="$KNOWLEDGE_BASE/tools/typescript"
    mkdir -p "$docs_dir"

    log "Creating TypeScript documentation (v$version)..."

    cat > "$docs_dir/quick-reference.md" << 'EOF'
# TypeScript Quick Reference

## Basic Types

```typescript
// Primitives
let name: string = "John";
let age: number = 30;
let isActive: boolean = true;

// Arrays
let numbers: number[] = [1, 2, 3];
let names: Array<string> = ["John", "Jane"];

// Objects
let user: { name: string; age: number } = {
  name: "John",
  age: 30
};

// Functions
function greet(name: string): string {
  return `Hello, ${name}`;
}

const add = (a: number, b: number): number => a + b;
```

## Interfaces & Types

```typescript
// Interface
interface User {
  id: number;
  name: string;
  email?: string;  // Optional
  readonly createdAt: Date;  // Readonly
}

// Type Alias
type ID = string | number;
type Status = "active" | "inactive";

// Extending
interface Admin extends User {
  role: string;
}
```

## Generics

```typescript
function identity<T>(arg: T): T {
  return arg;
}

interface Box<T> {
  value: T;
}

const stringBox: Box<string> = { value: "hello" };
```

## React with TypeScript

```typescript
// Component Props
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ label, onClick, disabled }) => {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
};

// State
const [count, setCount] = useState<number>(0);
const [user, setUser] = useState<User | null>(null);

// Event Handlers
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  console.log(e.currentTarget);
};

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  console.log(e.target.value);
};
```

## Utility Types

```typescript
// Partial - Make all properties optional
type PartialUser = Partial<User>;

// Required - Make all properties required
type RequiredUser = Required<User>;

// Pick - Select specific properties
type UserPreview = Pick<User, "id" | "name">;

// Omit - Exclude specific properties
type UserWithoutEmail = Omit<User, "email">;

// Record - Object with specific key/value types
type UserRoles = Record<string, "admin" | "user">;
```

## Official Documentation
- https://www.typescriptlang.org/docs - Official docs
- https://www.typescriptlang.org/docs/handbook/intro.html - Handbook
EOF

    echo "- Version: $version" >> "$docs_dir/quick-reference.md"

    cat > "$docs_dir/version.json" << EOF
{
  "version": "$version",
  "last_updated": "$TIMESTAMP",
  "source": "https://www.typescriptlang.org/docs"
}
EOF

    local files='["tools/typescript/quick-reference.md", "tools/typescript/version.json"]'
    update_registry "tools" "typescript" "$version" "https://www.typescriptlang.org/docs" "$files"
}

# Function to create VS Code documentation
fetch_vscode_docs() {
    local docs_dir="$KNOWLEDGE_BASE/ide/vscode"
    mkdir -p "$docs_dir"

    log "Creating VS Code MCP configuration documentation..."

    cat > "$docs_dir/mcp-setup.md" << 'EOF'
# VS Code - MCP Setup Guide

## Overview
VS Code uses the Claude Dev (Cline) extension to connect to MCP servers.

## Installation

1. **Install Claude Dev Extension**
   ```
   code --install-extension saoudrizwan.claude-dev
   ```

2. **Access MCP Settings**
   - Open Command Palette (Cmd+Shift+P)
   - Search for "Claude Dev: Open MCP Settings"
   - Or navigate to: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

## Configuration Format

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-package"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

## Common MCP Server Installations

### Filesystem Server
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/directory"]
    }
  }
}
```

### GitHub Server
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token"
      }
    }
  }
}
```

### Brave Search Server
```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Troubleshooting

### MCP Server Not Starting
1. Check logs in Output panel (select "Claude Dev" from dropdown)
2. Verify command and args are correct
3. Ensure environment variables are set

### Permission Issues
- Make sure paths in filesystem server are accessible
- Check API keys are valid and not expired

## Official Resources
- Claude Dev Extension: https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev
- MCP Documentation: https://modelcontextprotocol.io
- GitHub: https://github.com/saoudrizwan/claude-dev
EOF

    cat > "$docs_dir/version.json" << EOF
{
  "version": "latest",
  "last_updated": "$TIMESTAMP",
  "source": "https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev"
}
EOF

    local files='["ide/vscode/mcp-setup.md", "ide/vscode/version.json"]'
    update_registry "ide" "vscode" "latest" "https://marketplace.visualstudio.com" "$files"
}

# Function to create Cursor documentation
fetch_cursor_docs() {
    local docs_dir="$KNOWLEDGE_BASE/ide/cursor"
    mkdir -p "$docs_dir"

    log "Creating Cursor MCP configuration documentation..."

    cat > "$docs_dir/mcp-setup.md" << 'EOF'
# Cursor - MCP Setup Guide

## Overview
Cursor uses the Claude Dev (Cline) extension to connect to MCP servers, similar to VS Code.

## Configuration Location
MCP settings are stored at:
```
~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

## Configuration Format

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-package"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

## Common MCP Server Installations

### Filesystem Server
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/directory"]
    }
  }
}
```

### GitHub Server
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token"
      }
    }
  }
}
```

### Python uvx Servers
```json
{
  "mcpServers": {
    "python-server": {
      "command": "uvx",
      "args": ["mcp-server-package"]
    }
  }
}
```

## Accessing MCP Settings in Cursor

1. Open Command Palette (Cmd+Shift+P)
2. Search for "Claude Dev: Open MCP Settings"
3. Or manually edit the JSON file at the path above

## Troubleshooting

### Server Not Connecting
- Check the Output panel for errors
- Verify npx/uvx is in PATH
- Ensure JSON syntax is valid

### Environment Variables
- Set in `env` object within server config
- Can reference system environment variables

## Official Resources
- Cursor: https://cursor.sh
- MCP Documentation: https://modelcontextprotocol.io
- Claude Dev: https://github.com/saoudrizwan/claude-dev
EOF

    cat > "$docs_dir/version.json" << EOF
{
  "version": "latest",
  "last_updated": "$TIMESTAMP",
  "source": "https://cursor.sh"
}
EOF

    local files='["ide/cursor/mcp-setup.md", "ide/cursor/version.json"]'
    update_registry "ide" "cursor" "latest" "https://cursor.sh" "$files"
}

# Function to create Claude Desktop documentation
fetch_claude_desktop_docs() {
    local docs_dir="$KNOWLEDGE_BASE/ide/claude-desktop"
    mkdir -p "$docs_dir"

    log "Creating Claude Desktop MCP configuration documentation..."

    cat > "$docs_dir/mcp-setup.md" << 'EOF'
# Claude Desktop - MCP Setup Guide

## Overview
Claude Desktop app has native MCP support.

## Configuration Location
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

## Configuration Format

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-package"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

## Installation Steps

1. **Edit Config File**
   ```bash
   open ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. **Add MCP Server**
   Add server configuration to `mcpServers` object

3. **Restart Claude Desktop**
   Quit and relaunch the app for changes to take effect

## Example Configurations

### Filesystem
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/username/Documents"]
    }
  }
}
```

### GitHub
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

### Multiple Servers
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/username/Projects"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_token"
      }
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "BSA_api_key"
      }
    }
  }
}
```

## Verifying Installation

1. Open Claude Desktop
2. Look for MCP icon/indicator in the UI
3. Check available tools in the conversation

## Troubleshooting

### Server Not Appearing
- Verify JSON syntax is correct
- Check that npx is installed: `which npx`
- Restart Claude Desktop completely

### Permission Errors
- Ensure paths in filesystem server exist and are accessible
- Check API keys are valid

## Official Resources
- Claude Desktop: https://claude.ai/download
- MCP Documentation: https://modelcontextprotocol.io
- Setup Guide: https://docs.anthropic.com/claude/docs/mcp
EOF

    cat > "$docs_dir/version.json" << EOF
{
  "version": "latest",
  "last_updated": "$TIMESTAMP",
  "source": "https://claude.ai"
}
EOF

    local files='["ide/claude-desktop/mcp-setup.md", "ide/claude-desktop/version.json"]'
    update_registry "ide" "claude-desktop" "latest" "https://claude.ai" "$files"
}

# Function to create MCP server-specific documentation
fetch_mcp_server_docs() {
    local server_name=$1
    local docs_dir="$KNOWLEDGE_BASE/mcp-servers/$server_name"
    mkdir -p "$docs_dir"

    log "Creating documentation for MCP server: $server_name..."

    case "$server_name" in
        "filesystem")
            cat > "$docs_dir/quick-reference.md" << 'EOF'
# MCP Filesystem Server

## Overview
Provides file system access to Claude through MCP protocol.

## Installation

```bash
# Via npm
npx -y @modelcontextprotocol/server-filesystem /path/to/directory

# Via Claude Desktop config
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/directory"]
    }
  }
}
```

## Capabilities

### Tools
- **read_file** - Read file contents
- **write_file** - Write to files
- **list_directory** - List directory contents
- **create_directory** - Create new directories
- **move_file** - Move/rename files
- **search_files** - Search for files

### Resources
- **file://path** - Access specific files
- **directory://path** - Access directories

## Security

The server only provides access to explicitly allowed directories. Always specify the most restrictive path needed.

## Examples

```javascript
// Read a file
await use_mcp_tool("filesystem", "read_file", {
  path: "/path/to/file.txt"
});

// Write to a file
await use_mcp_tool("filesystem", "write_file", {
  path: "/path/to/output.txt",
  content: "Hello, world!"
});

// List directory
await use_mcp_tool("filesystem", "list_directory", {
  path: "/path/to/directory"
});
```

## Official Documentation
- GitHub: https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem
- MCP Docs: https://modelcontextprotocol.io
EOF
            ;;

        "github")
            cat > "$docs_dir/quick-reference.md" << 'EOF'
# MCP GitHub Server

## Overview
Provides GitHub API access through MCP protocol.

## Installation

```bash
# Set GitHub token
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_your_token"

# Run server
npx -y @modelcontextprotocol/server-github
```

## Configuration

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

## Capabilities

### Tools
- **create_or_update_file** - Create or update files in repos
- **search_repositories** - Search GitHub repositories
- **create_repository** - Create new repositories
- **get_file_contents** - Read file from repository
- **push_files** - Push multiple files
- **create_issue** - Create GitHub issues
- **create_pull_request** - Create PRs
- **fork_repository** - Fork repositories
- **create_branch** - Create branches

## Authentication

Requires GitHub Personal Access Token with appropriate scopes:
- `repo` - Full repository access
- `workflow` - Update GitHub Action workflows
- `admin:org` - Manage organizations (if needed)

## Examples

```javascript
// Search repositories
await use_mcp_tool("github", "search_repositories", {
  query: "language:typescript stars:>1000"
});

// Get file contents
await use_mcp_tool("github", "get_file_contents", {
  owner: "anthropics",
  repo: "anthropic-sdk-typescript",
  path: "README.md"
});

// Create issue
await use_mcp_tool("github", "create_issue", {
  owner: "username",
  repo: "repo-name",
  title: "Bug report",
  body: "Description of the issue"
});
```

## Official Documentation
- GitHub: https://github.com/modelcontextprotocol/servers/tree/main/src/github
- GitHub API: https://docs.github.com/en/rest
EOF
            ;;

        "brave-search")
            cat > "$docs_dir/quick-reference.md" << 'EOF'
# MCP Brave Search Server

## Overview
Provides web search capabilities through Brave Search API.

## Installation

```bash
# Set API key
export BRAVE_API_KEY="BSA_your_api_key"

# Run server
npx -y @modelcontextprotocol/server-brave-search
```

## Configuration

```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "BSA_your_api_key_here"
      }
    }
  }
}
```

## Getting API Key

1. Visit https://brave.com/search/api/
2. Sign up for API access
3. Get your API key (starts with "BSA_")

## Capabilities

### Tools
- **brave_web_search** - Search the web
- **brave_local_search** - Local business search

## Examples

```javascript
// Web search
await use_mcp_tool("brave-search", "brave_web_search", {
  query: "latest TypeScript features",
  count: 10
});

// Local search
await use_mcp_tool("brave-search", "brave_local_search", {
  query: "coffee shops",
  count: 5
});
```

## Official Documentation
- GitHub: https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search
- Brave Search API: https://brave.com/search/api/
EOF
            ;;

        *)
            cat > "$docs_dir/quick-reference.md" << EOF
# MCP Server: $server_name

## Overview
Custom MCP server: $server_name

## Configuration
Check your MCP configuration file for details on this server.

## Documentation
Refer to the server's README or documentation for specific capabilities and usage.

## Official Resources
- MCP Documentation: https://modelcontextprotocol.io
- MCP Servers: https://github.com/modelcontextprotocol/servers
EOF
            ;;
    esac

    cat > "$docs_dir/version.json" << EOF
{
  "version": "latest",
  "last_updated": "$TIMESTAMP",
  "source": "https://github.com/modelcontextprotocol/servers"
}
EOF

    local files="[\"mcp-servers/$server_name/quick-reference.md\", \"mcp-servers/$server_name/version.json\"]"
    update_registry "mcp_servers" "$server_name" "latest" "https://github.com/modelcontextprotocol/servers" "$files"
}

# Main execution
main() {
    check_jq

    log "Starting smart documentation fetch..."

    # Run dependency detection
    if [ -f ".claude/scripts/detect-dependencies.sh" ]; then
        bash .claude/scripts/detect-dependencies.sh
    else
        log "WARNING: detect-dependencies.sh not found"
        exit 0
    fi

    # Check if dependencies were detected
    if [ ! -f "$DEPENDENCIES_FILE" ]; then
        log "No dependencies detected"
        exit 0
    fi

    log "Processing detected dependencies..."

    # Process frameworks
    for framework in $(jq -r '.frameworks | keys[]' "$DEPENDENCIES_FILE" 2>/dev/null); do
        version=$(jq -r ".frameworks.\"$framework\".version" "$DEPENDENCIES_FILE")

        if is_cached "frameworks" "$framework"; then
            cached_version=$(get_cached_version "frameworks" "$framework")
            log "Framework $framework already cached (v$cached_version)"
        else
            log "Fetching documentation for $framework v$version..."
            case "$framework" in
                "react")
                    fetch_react_docs "$version"
                    ;;
                "nextjs")
                    fetch_nextjs_docs "$version"
                    ;;
                *)
                    log "No documentation fetcher for $framework yet"
                    ;;
            esac
        fi
    done

    # Process libraries
    for library in $(jq -r '.libraries | keys[]' "$DEPENDENCIES_FILE" 2>/dev/null); do
        version=$(jq -r ".libraries.\"$library\".version" "$DEPENDENCIES_FILE")

        if is_cached "libraries" "$library"; then
            cached_version=$(get_cached_version "libraries" "$library")
            log "Library $library already cached (v$cached_version)"
        else
            log "Fetching documentation for $library v$version..."
            case "$library" in
                "shadcn-ui")
                    fetch_shadcn_docs "$version"
                    ;;
                "tailwindcss")
                    fetch_tailwind_docs "$version"
                    ;;
                *)
                    log "No documentation fetcher for $library yet"
                    ;;
            esac
        fi
    done

    # Process tools
    for tool in $(jq -r '.tools | keys[]' "$DEPENDENCIES_FILE" 2>/dev/null); do
        version=$(jq -r ".tools.\"$tool\".version" "$DEPENDENCIES_FILE")

        if is_cached "tools" "$tool"; then
            cached_version=$(get_cached_version "tools" "$tool")
            log "Tool $tool already cached (v$cached_version)"
        else
            log "Fetching documentation for $tool v$version..."
            case "$tool" in
                "typescript")
                    fetch_typescript_docs "$version"
                    ;;
                *)
                    log "No documentation fetcher for $tool yet"
                    ;;
            esac
        fi
    done

    # Run MCP server detection
    if [ -f ".claude/scripts/detect-mcp-servers.sh" ]; then
        log "Detecting MCP servers..."
        bash .claude/scripts/detect-mcp-servers.sh
    fi

    # Process IDE documentation
    MCP_FILE="$KNOWLEDGE_BASE/.detected-mcps.json"
    if [ -f "$MCP_FILE" ]; then
        ide=$(jq -r '.ide' "$MCP_FILE" 2>/dev/null)

        if [ "$ide" != "unknown" ] && [ "$ide" != "null" ]; then
            if ! is_cached "ide" "$ide"; then
                log "Fetching IDE documentation for $ide..."
                case "$ide" in
                    "vscode")
                        fetch_vscode_docs
                        ;;
                    "cursor")
                        fetch_cursor_docs
                        ;;
                    "claude-desktop")
                        fetch_claude_desktop_docs
                        ;;
                esac
            else
                log "IDE documentation for $ide already cached"
            fi
        fi

        # Process MCP servers
        for server in $(jq -r '.mcp_servers | keys[]' "$MCP_FILE" 2>/dev/null); do
            if ! is_cached "mcp_servers" "$server"; then
                log "Fetching MCP server documentation for $server..."
                fetch_mcp_server_docs "$server"
            else
                log "MCP server $server documentation already cached"
            fi
        done
    fi

    log "Documentation fetch complete!"
}

main
