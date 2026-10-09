#!/bin/sh
set -e

DJAZAIR_DIR="$1"
[ -z "$DJAZAIR_DIR" ] && [ -n "$DJAZAIR_HOME" ] && DJAZAIR_DIR="$DJAZAIR_HOME"
[ -z "$DJAZAIR_DIR" ] && [ -n "$DJAZAIR_ROOT" ] && DJAZAIR_DIR="$DJAZAIR_ROOT"

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
    echo "[ERROR] Djazair SDK not found."
    exit 1
fi

INC_FLAGS="-I$DJAZAIR_DIR/include"
if [ -d "$DJAZAIR_DIR/src/include" ]; then
    INC_FLAGS="-I$DJAZAIR_DIR/src/include -I$DJAZAIR_DIR/src/core -I$DJAZAIR_DIR/src/libs"
fi

LIB_DIR="$DJAZAIR_DIR/lib"
if [ -f "$DJAZAIR_DIR/build/bin/libdjazair.a" ]; then
    LIB_DIR="$DJAZAIR_DIR/build/bin"
fi

OS="$(uname -s 2>/dev/null || echo "Linux")"
case "$OS" in
    Darwin*)  OUT="net.dylib" ; SHARED="-dynamiclib" ;;
    *)        OUT="net.so"    ; SHARED="-shared"     ;;
esac

echo "[INFO] Building net extension ($OUT)..."
gcc $SHARED -O2 -std=c99     $INC_FLAGS     net.c net_socket.c net_ssl.c     -o "$OUT"     -L"$LIB_DIR" -ldjazair -lssl -lcrypto

echo "[OK] $OUT built successfully."
