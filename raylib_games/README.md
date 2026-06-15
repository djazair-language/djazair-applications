# Djazair Raylib Games

This directory contains interactive games and graphical applications built using the **Djazair Raylib extension**.

## 🎮 About the Raylib Extension

The Raylib extension provides native bindings to the popular [Raylib](https://www.raylib.com/) library, a simple and easy-to-use library to learn videogames programming. 

By using this extension in Djazair, you can:
* Render 2D and 3D graphics.
* Handle input from the keyboard, mouse, and gamepads.
* Load and play audio effects (`.wav`, `.ogg`) and background music.
* Perform high-performance game-loop updates directly in Djazair.

---

## ⚡ How to Run

### 1. Prerequisites
Make sure you have the Djazair interpreter and the `raylib` extension installed:
```bash
# Install the raylib package
dpm install raylib

# Compile the native raylib binaries (requires GCC/MinGW)
dpm build raylib
```

### 2. Launching a Game
To run any game in this folder, execute its main script with the `djazair` runner.

**Usage:**
```bash
djazair raylib_games/<game_folder>/<main_file>.dz
```

**Example:**
```bash
djazair raylib_games/snake/snake.dz
```
