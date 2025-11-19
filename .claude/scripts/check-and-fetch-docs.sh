#!/bin/bash

# Smart Documentation Hook for ClienTalk
# Ensures agents have access to latest documentation for ALL frameworks and libraries
# Only fetches documentation once - subsequent calls use cached versions

set -e

KNOWLEDGE_BASE=".claude/knowledge"
REGISTRY="$KNOWLEDGE_BASE/registry.json"
LOG_FILE=".claude/docs-fetch.log"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Function to log messages
log() {
    echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
}

# Main execution
main() {
    log "=== Smart Documentation Hook Triggered ==="

    # Ensure knowledge base structure exists
    mkdir -p "$KNOWLEDGE_BASE/frameworks" \
             "$KNOWLEDGE_BASE/libraries" \
             "$KNOWLEDGE_BASE/tools" \
             "$KNOWLEDGE_BASE/anthropic" \
             "$KNOWLEDGE_BASE/project-specific"

    # Ensure registry exists
    if [ ! -f "$REGISTRY" ]; then
        log "Creating initial registry..."
        cat > "$REGISTRY" << 'EOF'
{
  "last_updated": "",
  "version": "1.0.0",
  "frameworks": {},
  "libraries": {},
  "tools": {},
  "anthropic": {}
}
EOF
    fi

    # Run the smart documentation fetcher
    if [ -f ".claude/scripts/fetch-documentation.sh" ]; then
        log "Running smart documentation fetcher..."
        bash .claude/scripts/fetch-documentation.sh
    else
        log "WARNING: fetch-documentation.sh not found"
    fi

    log "=== Documentation Hook Complete ==="
}

# Run main function
main

# Always exit successfully (hooks should not block workflow)
exit 0
