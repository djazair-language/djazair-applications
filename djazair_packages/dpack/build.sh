#!/usr/bin/env bash
set -e

echo "Building dpack Linux stub..."
gcc -O2 -Wall stub/stub.c -o stub/stub_linux

echo "dpack Linux stub built successfully."
