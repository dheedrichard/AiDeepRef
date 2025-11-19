#!/bin/bash

# MCP Server Detection Script
# Detects installed MCP servers and the IDE being used

PROJECT_ROOT="."
OUTPUT_FILE=".claude/knowledge/.detected-mcps.json"
CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
CURSOR_CONFIG="$HOME/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json"
VSCODE_CONFIG="$HOME/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json"

# Initialize JSON output
cat > "$OUTPUT_FILE" << 'EOF'
{
  "detected_at": "",
  "ide": "unknown",
  "mcp_servers": {},
  "config_files": []
}
EOF

# Function to update timestamp
update_timestamp() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "$(jq --arg ts "$timestamp" '.detected_at = $ts' "$OUTPUT_FILE")" > "$OUTPUT_FILE"
}

# Function to set IDE
set_ide() {
    local ide=$1
    echo "$(jq --arg ide "$ide" '.ide = $ide' "$OUTPUT_FILE")" > "$OUTPUT_FILE"
}

# Function to add config file
add_config_file() {
    local config=$1
    echo "$(jq --arg cfg "$config" '.config_files += [$cfg]' "$OUTPUT_FILE")" > "$OUTPUT_FILE"
}

# Function to add MCP server
add_mcp_server() {
    local name=$1
    local type=$2
    local command=$3
    local source=$4

    local server_info=$(jq -n \
        --arg type "$type" \
        --arg cmd "$command" \
        --arg src "$source" \
        '{
            type: $type,
            command: $cmd,
            source: $src
        }')

    echo "$(jq --arg name "$name" --argjson info "$server_info" \
        '.mcp_servers[$name] = $info' \
        "$OUTPUT_FILE")" > "$OUTPUT_FILE"
}

# Detect IDE and MCP servers from Claude Desktop config
if [ -f "$CLAUDE_CONFIG" ]; then
    set_ide "claude-desktop"
    add_config_file "$CLAUDE_CONFIG"

    if command -v jq &> /dev/null; then
        # Parse MCP servers from Claude Desktop config
        if jq -e '.mcpServers' "$CLAUDE_CONFIG" > /dev/null 2>&1; then
            # Extract all MCP server names
            for server in $(jq -r '.mcpServers | keys[]' "$CLAUDE_CONFIG" 2>/dev/null); do
                command=$(jq -r ".mcpServers.\"$server\".command" "$CLAUDE_CONFIG" 2>/dev/null)

                # Determine type based on command
                if echo "$command" | grep -q "npx"; then
                    type="npm"
                    source="npm"
                elif echo "$command" | grep -q "uvx"; then
                    type="python"
                    source="pypi"
                elif echo "$command" | grep -q "docker"; then
                    type="docker"
                    source="docker"
                else
                    type="custom"
                    source="custom"
                fi

                add_mcp_server "$server" "$type" "$command" "$source"
            done
        fi
    fi
fi

# Detect Cursor
if [ -f "$CURSOR_CONFIG" ]; then
    set_ide "cursor"
    add_config_file "$CURSOR_CONFIG"

    if command -v jq &> /dev/null; then
        if jq -e '.mcpServers' "$CURSOR_CONFIG" > /dev/null 2>&1; then
            for server in $(jq -r '.mcpServers | keys[]' "$CURSOR_CONFIG" 2>/dev/null); do
                command=$(jq -r ".mcpServers.\"$server\".command" "$CURSOR_CONFIG" 2>/dev/null)

                if echo "$command" | grep -q "npx"; then
                    type="npm"
                    source="npm"
                elif echo "$command" | grep -q "uvx"; then
                    type="python"
                    source="pypi"
                else
                    type="custom"
                    source="custom"
                fi

                add_mcp_server "$server" "$type" "$command" "$source"
            done
        fi
    fi
fi

# Detect VS Code
if [ -f "$VSCODE_CONFIG" ]; then
    set_ide "vscode"
    add_config_file "$VSCODE_CONFIG"

    if command -v jq &> /dev/null; then
        if jq -e '.mcpServers' "$VSCODE_CONFIG" > /dev/null 2>&1; then
            for server in $(jq -r '.mcpServers | keys[]' "$VSCODE_CONFIG" 2>/dev/null); do
                command=$(jq -r ".mcpServers.\"$server\".command" "$VSCODE_CONFIG" 2>/dev/null)

                if echo "$command" | grep -q "npx"; then
                    type="npm"
                    source="npm"
                elif echo "$command" | grep -q "uvx"; then
                    type="python"
                    source="pypi"
                else
                    type="custom"
                    source="custom"
                fi

                add_mcp_server "$server" "$type" "$command" "$source"
            done
        fi
    fi
fi

# Check for project-specific MCP config
if [ -f ".claude/mcp-config.json" ]; then
    add_config_file ".claude/mcp-config.json"

    if command -v jq &> /dev/null; then
        if jq -e '.mcpServers' ".claude/mcp-config.json" > /dev/null 2>&1; then
            for server in $(jq -r '.mcpServers | keys[]' ".claude/mcp-config.json" 2>/dev/null); do
                command=$(jq -r ".mcpServers.\"$server\".command" ".claude/mcp-config.json" 2>/dev/null)

                if echo "$command" | grep -q "npx"; then
                    type="npm"
                    source="npm"
                elif echo "$command" | grep -q "uvx"; then
                    type="python"
                    source="pypi"
                else
                    type="custom"
                    source="custom"
                fi

                add_mcp_server "$server" "$type" "$command" "$source"
            done
        fi
    fi
fi

# Update timestamp
update_timestamp

echo "MCP detection complete. Found servers: $(jq -r '.mcp_servers | keys | join(", ")' "$OUTPUT_FILE" 2>/dev/null || echo "none")"
echo "Detected IDE: $(jq -r '.ide' "$OUTPUT_FILE" 2>/dev/null || echo "unknown")"
