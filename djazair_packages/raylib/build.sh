#!/bin/sh
# ─────────────────────────────────────────────
#  build.sh  –  raylib extension for Djazair
#  Usage: ./build.sh <ROOT>
#    ROOT = path to the djazair-language repo root
# ─────────────────────────────────────────────
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

if ! command -v gcc >/dev/null 2>&1; then
    echo "[ERROR] gcc not found in PATH."
    echo "Install gcc (e.g. 'sudo apt install build-essential' on Debian/Ubuntu)."
    exit 1
fi

# ── OS-specific settings ──────────────────────────────────────────────────
OS="$(uname -s 2>/dev/null || echo "Linux")"
case "$OS" in
    Darwin*)
        OUT="raylib.dylib"
        SHARED="-dynamiclib"
        # macOS: uses Cocoa/OpenGL frameworks instead of Win32 libs
        PLATFORM_LIBS="-framework OpenGL -framework Cocoa -framework IOKit -framework CoreVideo"
        ;;
    MINGW*|MSYS*|CYGWIN*)
        # Running bash on Windows (e.g. Git Bash)
        OUT="raylib.dll"
        SHARED="-shared"
        PLATFORM_LIBS="-lgdi32 -lwinmm -luser32 -lshell32"
        ;;
    *)
        # Linux
        OUT="raylib.so"
        SHARED="-shared"
        # Try pkg-config first, fall back to common X11/GL libs
        if command -v pkg-config >/dev/null 2>&1 && pkg-config --exists raylib 2>/dev/null; then
            PLATFORM_LIBS="$(pkg-config --libs raylib)"
        else
            PLATFORM_LIBS="-lGL -lm -lpthread -ldl -lrt -lX11"
        fi
        ;;
esac

echo "[INFO] Platform: $OS"
echo "[INFO] Building raylib extension ($OUT)..."

gcc $SHARED -O2 -std=c99 \
    $INC_FLAGS \
    src/raylib.c src/raylib_camera.c src/raylib_core.c \
    src/raylib_helpers.c src/raylib_media.c src/raylib_shapes.c \
    -o "$OUT" \
    -L"$LIB_DIR" -ldjazair -lraylib \
    $PLATFORM_LIBS

echo "[OK] $OUT built successfully."
