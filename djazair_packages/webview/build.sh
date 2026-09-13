#!/bin/sh
# =============================================================================
# Project:      Djazair WebView Desktop Application Framework
# File:         build.sh
# Description:  Unix/Linux/macOS/POSIX Cross-Platform Native Extension Compiler
# Author:       Harizi Riyadh (hariziriyadh@gmail.com)
# Copyright:    (c) 2026 Harizi Riyadh / Djazair Language Project. All rights reserved.
# License:      MIT License
# =============================================================================
set -e

# Locate Djazair SDK / Installation (General Use)
DJAZAIR_DIR="$1"

if [ -z "$DJAZAIR_DIR" ] && [ -n "$DJAZAIR_HOME" ]; then
    DJAZAIR_DIR="$DJAZAIR_HOME"
fi

if [ -z "$DJAZAIR_DIR" ] && [ -n "$DJAZAIR_ROOT" ]; then
    DJAZAIR_DIR="$DJAZAIR_ROOT"
fi

if [ -z "$DJAZAIR_DIR" ]; then
    EXE_PATH="$(command -v djazair 2>/dev/null || true)"
    if [ -n "$EXE_PATH" ]; then
        BIN_DIR="$(dirname "$EXE_PATH")"
        if [ -f "$BIN_DIR/../../src/include/djazair_api.h" ]; then
            DJAZAIR_DIR="$(cd "$BIN_DIR/../.." && pwd)"
        elif [ -f "$BIN_DIR/../include/djazair_api.h" ]; then
            DJAZAIR_DIR="$(cd "$BIN_DIR/.." && pwd)"
        fi
    fi
fi

if [ -z "$DJAZAIR_DIR" ]; then
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
    for CANDIDATE in "$SCRIPT_DIR/../../djazair-language" "$SCRIPT_DIR/../../../djazair-language" "$SCRIPT_DIR/../djazair-language" "$SCRIPT_DIR/../.."; do
        if [ -f "$CANDIDATE/src/include/djazair_api.h" ]; then
            DJAZAIR_DIR="$(cd "$CANDIDATE" && pwd)"
            break
        fi
    done
fi

if [ -z "$DJAZAIR_DIR" ]; then
    echo "[ERROR] Djazair SDK / installation not found in PATH or DJAZAIR_HOME."
    echo "Please install Djazair and add it to your PATH, or set DJAZAIR_HOME."
    exit 1
fi

INC_FLAGS="-I$DJAZAIR_DIR/include"
if [ -d "$DJAZAIR_DIR/src/include" ]; then
    INC_FLAGS="-I$DJAZAIR_DIR/src/include -I$DJAZAIR_DIR/src/core -I$DJAZAIR_DIR/src/libs"
fi

LIB_DIR="$DJAZAIR_DIR/lib"
if [ -f "$DJAZAIR_DIR/build/bin/libdjazair.a" ] || [ -f "$DJAZAIR_DIR/build/bin/libdjazair.so" ]; then
    LIB_DIR="$DJAZAIR_DIR/build/bin"
fi

if ! command -v g++ >/dev/null 2>&1; then
    echo "[ERROR] g++ not found in PATH."
    echo "Install g++ (e.g. 'sudo apt install g++' on Debian/Ubuntu)."
    exit 1
fi

# ── OS-specific settings ──────────────────────────────────────────────────
OS="$(uname -s 2>/dev/null || echo "Linux")"
case "$OS" in
    Darwin*)
        OUT="webview.dylib"
        SHARED="-dynamiclib"
        PLATFORM_FLAGS=""
        PLATFORM_LIBS="-framework WebKit -framework Cocoa"
        ;;
    MINGW*|MSYS*|CYGWIN*)
        OUT="webview.dll"
        SHARED="-shared"
        PLATFORM_FLAGS="-DUNICODE -D_UNICODE"
        PLATFORM_LIBS="-lole32 -lshell32 -lshlwapi -luser32 -lversion -lcomdlg32 -ladvapi32 -ldwmapi -luuid"
        ;;
    *)
        # Linux — requires libwebkit2gtk-4.0-dev and libgtk-3-dev
        OUT="webview.so"
        SHARED="-shared"
        PLATFORM_FLAGS=""
        if command -v pkg-config >/dev/null 2>&1 && pkg-config --exists webkit2gtk-4.0 2>/dev/null; then
            PLATFORM_LIBS="$(pkg-config --cflags --libs webkit2gtk-4.0 gtk+-3.0)"
        else
            echo "[WARNING] webkit2gtk-4.0 not found via pkg-config."
            echo "Install: sudo apt install libwebkit2gtk-4.0-dev libgtk-3-dev"
            PLATFORM_LIBS="-lwebkit2gtk-4.0 -lgtk-3"
        fi
        ;;
esac

echo "[INFO] Platform: $OS"
echo "[INFO] Building webview extension ($OUT)..."

g++ $SHARED -O2 -std=c++14 \
    $INC_FLAGS \
    src/webview_native.cc \
    -o "$OUT" \
    -L"$LIB_DIR" -ldjazair \
    $PLATFORM_LIBS $PLATFORM_FLAGS

echo "[OK] $OUT built successfully."
