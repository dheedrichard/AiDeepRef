#!/bin/bash

# Dependency Detection Script
# Detects all frameworks, libraries, and tools used in the project

PROJECT_ROOT="."
OUTPUT_FILE=".claude/knowledge/.detected-dependencies.json"

# Initialize JSON output
cat > "$OUTPUT_FILE" << 'EOF'
{
  "detected_at": "",
  "frameworks": {},
  "libraries": {},
  "tools": {},
  "package_managers": []
}
EOF

# Function to update timestamp
update_timestamp() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    # Use a temp file for JSON manipulation
    echo "$(jq --arg ts "$timestamp" '.detected_at = $ts' "$OUTPUT_FILE")" > "$OUTPUT_FILE"
}

# Function to add framework
add_framework() {
    local name=$1
    local version=$2
    echo "$(jq --arg name "$name" --arg ver "$version" \
        '.frameworks[$name] = {"version": $ver, "detected_from": "package.json"}' \
        "$OUTPUT_FILE")" > "$OUTPUT_FILE"
}

# Function to add library
add_library() {
    local name=$1
    local version=$2
    local source=${3:-"package.json"}
    echo "$(jq --arg name "$name" --arg ver "$version" --arg src "$source" \
        '.libraries[$name] = {"version": $ver, "detected_from": $src}' \
        "$OUTPUT_FILE")" > "$OUTPUT_FILE"
}

# Function to add tool
add_tool() {
    local name=$1
    local version=$2
    echo "$(jq --arg name "$name" --arg ver "$version" \
        '.tools[$name] = {"version": $ver, "detected_from": "package.json"}' \
        "$OUTPUT_FILE")" > "$OUTPUT_FILE"
}

# Function to add package manager
add_package_manager() {
    local pm=$1
    echo "$(jq --arg pm "$pm" '.package_managers += [$pm]' "$OUTPUT_FILE")" > "$OUTPUT_FILE"
}

# Detect Node.js/JavaScript projects
if [ -f "package.json" ]; then
    add_package_manager "npm"

    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        echo "Warning: jq not installed. Using basic parsing."
        update_timestamp
        exit 0
    fi

    # Parse package.json for dependencies
    if [ -f "package.json" ]; then
        # Detect frameworks
        if jq -e '.dependencies.react or .devDependencies.react' package.json > /dev/null 2>&1; then
            version=$(jq -r '(.dependencies.react // .devDependencies.react)' package.json)
            add_framework "react" "$version"
        fi

        if jq -e '.dependencies.next or .devDependencies.next' package.json > /dev/null 2>&1; then
            version=$(jq -r '(.dependencies.next // .devDependencies.next)' package.json)
            add_framework "nextjs" "$version"
        fi

        if jq -e '.dependencies.vue or .devDependencies.vue' package.json > /dev/null 2>&1; then
            version=$(jq -r '(.dependencies.vue // .devDependencies.vue)' package.json)
            add_framework "vue" "$version"
        fi

        if jq -e '.dependencies.angular or .devDependencies."@angular/core"' package.json > /dev/null 2>&1; then
            version=$(jq -r '(.dependencies.angular // .devDependencies."@angular/core")' package.json)
            add_framework "angular" "$version"
        fi

        if jq -e '.dependencies.svelte or .devDependencies.svelte' package.json > /dev/null 2>&1; then
            version=$(jq -r '(.dependencies.svelte // .devDependencies.svelte)' package.json)
            add_framework "svelte" "$version"
        fi

        # Detect UI libraries
        if jq -e '.dependencies."@radix-ui/react-slot" or .devDependencies."@radix-ui/react-slot"' package.json > /dev/null 2>&1; then
            # shadcn/ui uses radix-ui
            add_library "shadcn-ui" "latest" "detected"
        fi

        if jq -e '.dependencies."@mui/material" or .devDependencies."@mui/material"' package.json > /dev/null 2>&1; then
            version=$(jq -r '(.dependencies."@mui/material" // .devDependencies."@mui/material")' package.json)
            add_library "material-ui" "$version"
        fi

        if jq -e '.dependencies.antd or .devDependencies.antd' package.json > /dev/null 2>&1; then
            version=$(jq -r '(.dependencies.antd // .devDependencies.antd)' package.json)
            add_library "ant-design" "$version"
        fi

        if jq -e '.dependencies."@chakra-ui/react" or .devDependencies."@chakra-ui/react"' package.json > /dev/null 2>&1; then
            version=$(jq -r '(.dependencies."@chakra-ui/react" // .devDependencies."@chakra-ui/react")' package.json)
            add_library "chakra-ui" "$version"
        fi

        # Detect CSS frameworks
        if jq -e '.dependencies.tailwindcss or .devDependencies.tailwindcss' package.json > /dev/null 2>&1; then
            version=$(jq -r '(.dependencies.tailwindcss // .devDependencies.tailwindcss)' package.json)
            add_library "tailwindcss" "$version"
        fi

        if jq -e '.dependencies.bootstrap or .devDependencies.bootstrap' package.json > /dev/null 2>&1; then
            version=$(jq -r '(.dependencies.bootstrap // .devDependencies.bootstrap)' package.json)
            add_library "bootstrap" "$version"
        fi

        # Detect popular libraries
        if jq -e '.dependencies.axios or .devDependencies.axios' package.json > /dev/null 2>&1; then
            version=$(jq -r '(.dependencies.axios // .devDependencies.axios)' package.json)
            add_library "axios" "$version"
        fi

        if jq -e '.dependencies."react-query" or .dependencies."@tanstack/react-query"' package.json > /dev/null 2>&1; then
            version=$(jq -r '(.dependencies."react-query" // .dependencies."@tanstack/react-query")' package.json)
            add_library "react-query" "$version"
        fi

        if jq -e '.dependencies.zustand or .devDependencies.zustand' package.json > /dev/null 2>&1; then
            version=$(jq -r '(.dependencies.zustand // .devDependencies.zustand)' package.json)
            add_library "zustand" "$version"
        fi

        if jq -e '.dependencies.redux or .dependencies."@reduxjs/toolkit"' package.json > /dev/null 2>&1; then
            version=$(jq -r '(.dependencies.redux // .dependencies."@reduxjs/toolkit")' package.json)
            add_library "redux" "$version"
        fi

        # Detect build tools
        if jq -e '.devDependencies.vite' package.json > /dev/null 2>&1; then
            version=$(jq -r '.devDependencies.vite' package.json)
            add_tool "vite" "$version"
        fi

        if jq -e '.devDependencies.webpack' package.json > /dev/null 2>&1; then
            version=$(jq -r '.devDependencies.webpack' package.json)
            add_tool "webpack" "$version"
        fi

        if jq -e '.devDependencies.typescript' package.json > /dev/null 2>&1; then
            version=$(jq -r '.devDependencies.typescript' package.json)
            add_tool "typescript" "$version"
        fi
    fi
fi

# Detect Python projects
if [ -f "requirements.txt" ]; then
    add_package_manager "pip"

    # Detect Python frameworks
    if grep -q "^django" requirements.txt; then
        version=$(grep "^django" requirements.txt | cut -d'=' -f2)
        add_framework "django" "$version"
    fi

    if grep -q "^flask" requirements.txt; then
        version=$(grep "^flask" requirements.txt | cut -d'=' -f2)
        add_framework "flask" "$version"
    fi

    if grep -q "^fastapi" requirements.txt; then
        version=$(grep "^fastapi" requirements.txt | cut -d'=' -f2)
        add_framework "fastapi" "$version"
    fi
fi

# Detect Python projects with pyproject.toml
if [ -f "pyproject.toml" ]; then
    add_package_manager "poetry"
fi

# Detect Rust projects
if [ -f "Cargo.toml" ]; then
    add_package_manager "cargo"
fi

# Detect Go projects
if [ -f "go.mod" ]; then
    add_package_manager "go"
fi

# Update timestamp
update_timestamp

echo "Dependencies detected and saved to $OUTPUT_FILE"
