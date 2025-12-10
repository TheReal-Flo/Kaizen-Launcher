#!/bin/bash
# Local build script for Kaizen Launcher
# Usage: ./scripts/build-local.sh [target]
# Targets: macos-arm, macos-x86, linux, windows, all

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Output directory
OUTPUT_DIR="$PROJECT_DIR/dist-builds"

# Get version from package.json
VERSION=$(grep '"version"' "$PROJECT_DIR/package.json" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Kaizen Launcher - Local Build v$VERSION     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Darwin*)  echo "macos" ;;
        Linux*)   echo "linux" ;;
        MINGW*|CYGWIN*|MSYS*) echo "windows" ;;
        *)        echo "unknown" ;;
    esac
}

# Detect architecture
detect_arch() {
    case "$(uname -m)" in
        x86_64)   echo "x86_64" ;;
        arm64|aarch64) echo "aarch64" ;;
        *)        echo "unknown" ;;
    esac
}

OS=$(detect_os)
ARCH=$(detect_arch)

echo -e "${GREEN}➤ Detected: $OS ($ARCH)${NC}"
echo ""

# Check dependencies
check_deps() {
    echo -e "${YELLOW}Checking dependencies...${NC}"

    if ! command -v node &> /dev/null; then
        echo -e "${RED}✗ Node.js not found. Please install Node.js 20+${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

    if ! command -v npm &> /dev/null; then
        echo -e "${RED}✗ npm not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ npm $(npm -v)${NC}"

    if ! command -v cargo &> /dev/null; then
        echo -e "${RED}✗ Rust/Cargo not found. Please install Rust${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Cargo $(cargo -V | cut -d' ' -f2)${NC}"

    echo ""
}

# Install dependencies
install_deps() {
    echo -e "${YELLOW}Installing npm dependencies...${NC}"
    cd "$PROJECT_DIR"
    npm ci --prefer-offline 2>/dev/null || npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""
}

# Build function
build_target() {
    local target=$1
    local target_name=$2

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Building for: $target_name ($target)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    cd "$PROJECT_DIR"

    # Add target if not installed
    rustup target add "$target" 2>/dev/null || true

    # Build
    START_TIME=$(date +%s)
    npm run tauri build -- --target "$target"
    END_TIME=$(date +%s)

    DURATION=$((END_TIME - START_TIME))
    echo -e "${GREEN}✓ Build completed in ${DURATION}s${NC}"

    # Copy artifacts
    mkdir -p "$OUTPUT_DIR"

    case "$target" in
        *darwin*)
            if [ -d "$PROJECT_DIR/src-tauri/target/$target/release/bundle/dmg" ]; then
                cp "$PROJECT_DIR/src-tauri/target/$target/release/bundle/dmg/"*.dmg "$OUTPUT_DIR/" 2>/dev/null || true
            fi
            if [ -d "$PROJECT_DIR/src-tauri/target/$target/release/bundle/macos" ]; then
                cp -r "$PROJECT_DIR/src-tauri/target/$target/release/bundle/macos/"*.app "$OUTPUT_DIR/" 2>/dev/null || true
            fi
            ;;
        *linux*)
            if [ -d "$PROJECT_DIR/src-tauri/target/$target/release/bundle/deb" ]; then
                cp "$PROJECT_DIR/src-tauri/target/$target/release/bundle/deb/"*.deb "$OUTPUT_DIR/" 2>/dev/null || true
            fi
            if [ -d "$PROJECT_DIR/src-tauri/target/$target/release/bundle/appimage" ]; then
                cp "$PROJECT_DIR/src-tauri/target/$target/release/bundle/appimage/"*.AppImage "$OUTPUT_DIR/" 2>/dev/null || true
            fi
            ;;
        *windows*)
            if [ -d "$PROJECT_DIR/src-tauri/target/$target/release/bundle/nsis" ]; then
                cp "$PROJECT_DIR/src-tauri/target/$target/release/bundle/nsis/"*.exe "$OUTPUT_DIR/" 2>/dev/null || true
            fi
            if [ -d "$PROJECT_DIR/src-tauri/target/$target/release/bundle/msi" ]; then
                cp "$PROJECT_DIR/src-tauri/target/$target/release/bundle/msi/"*.msi "$OUTPUT_DIR/" 2>/dev/null || true
            fi
            ;;
    esac

    echo ""
}

# Main
TARGET=${1:-"auto"}

check_deps
install_deps

case "$TARGET" in
    "macos-arm"|"macos-arm64")
        build_target "aarch64-apple-darwin" "macOS ARM64"
        ;;
    "macos-x86"|"macos-intel")
        build_target "x86_64-apple-darwin" "macOS x86_64"
        ;;
    "macos"|"macos-all")
        build_target "aarch64-apple-darwin" "macOS ARM64"
        build_target "x86_64-apple-darwin" "macOS x86_64"
        ;;
    "linux")
        build_target "x86_64-unknown-linux-gnu" "Linux x86_64"
        ;;
    "windows")
        build_target "x86_64-pc-windows-msvc" "Windows x86_64"
        ;;
    "all")
        if [ "$OS" = "macos" ]; then
            build_target "aarch64-apple-darwin" "macOS ARM64"
            build_target "x86_64-apple-darwin" "macOS x86_64"
        fi
        if [ "$OS" = "linux" ]; then
            build_target "x86_64-unknown-linux-gnu" "Linux x86_64"
        fi
        if [ "$OS" = "windows" ]; then
            build_target "x86_64-pc-windows-msvc" "Windows x86_64"
        fi
        ;;
    "auto"|*)
        # Auto-detect best target for current platform
        if [ "$OS" = "macos" ]; then
            if [ "$ARCH" = "aarch64" ]; then
                build_target "aarch64-apple-darwin" "macOS ARM64"
            else
                build_target "x86_64-apple-darwin" "macOS x86_64"
            fi
        elif [ "$OS" = "linux" ]; then
            build_target "x86_64-unknown-linux-gnu" "Linux x86_64"
        elif [ "$OS" = "windows" ]; then
            build_target "x86_64-pc-windows-msvc" "Windows x86_64"
        else
            echo -e "${RED}Unknown OS: $OS${NC}"
            exit 1
        fi
        ;;
esac

echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Build Complete!                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Build artifacts are in: ${BLUE}$OUTPUT_DIR${NC}"
ls -la "$OUTPUT_DIR" 2>/dev/null || true
