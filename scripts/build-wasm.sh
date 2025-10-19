#!/bin/bash
set -e

echo "Building WASM module..."

cd crates/analytics

# Check if wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo "wasm-pack is not installed. Installing..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

# Build WASM
wasm-pack build --target web --out-dir ../../frontend/src/wasm/pkg

echo "WASM build complete!"
echo "Package generated at: frontend/src/wasm/pkg"

