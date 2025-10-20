#!/bin/bash
# Pre-commit check script
# Run this before committing to ensure code quality

set -e  # Exit on error

echo "🔍 Running pre-commit checks..."
echo ""

# 1. Rust formatting check
echo "📝 Checking Rust formatting..."
cargo fmt --all -- --check
if [ $? -eq 0 ]; then
    echo "✅ Rust formatting OK"
else
    echo "❌ Rust formatting failed. Running cargo fmt..."
    cargo fmt --all
    echo "✅ Formatting fixed. Please review changes."
fi
echo ""

# 2. Rust clippy check
echo "🔎 Running Clippy..."
cargo clippy --all-targets --all-features -- -D warnings
if [ $? -eq 0 ]; then
    echo "✅ Clippy check passed"
else
    echo "❌ Clippy check failed. Please fix warnings."
    exit 1
fi
echo ""

# 3. Rust tests
echo "🧪 Running Rust tests..."
cargo test --all-features
if [ $? -eq 0 ]; then
    echo "✅ All tests passed"
else
    echo "❌ Tests failed. Please fix failing tests."
    exit 1
fi
echo ""

# 4. Build WASM
echo "🔨 Building WASM..."
cd crates/analytics
CC=clang AR=llvm-ar wasm-pack build --target web --out-dir ../../frontend/src/wasm/pkg
if [ $? -eq 0 ]; then
    echo "✅ WASM build successful"
else
    echo "❌ WASM build failed."
    exit 1
fi
cd ../..
echo ""

# 5. Frontend TypeScript check and build
echo "📦 Checking frontend..."
cd frontend
pnpm run build
if [ $? -eq 0 ]; then
    echo "✅ Frontend build successful"
else
    echo "❌ Frontend build failed."
    exit 1
fi
cd ..
echo ""

echo "✨ All checks passed! Ready to commit."
echo ""
echo "Next steps:"
echo "  git add -A"
echo "  git commit -m \"your message\""
echo "  git push origin main"

