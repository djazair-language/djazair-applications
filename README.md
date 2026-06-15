# Djazair Applications & Games

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Organization](https://img.shields.io/badge/organization-djazair--language-blue.svg)](https://github.com/djazair-language)
[![Language: Djazair](https://img.shields.io/badge/language-Djazair-orange.svg)](https://github.com/djazair-language/djazair)

**A curated showcase of interactive applications, utilities, and classic arcade games written in the Djazair Programming Language.**

[Available Games](#-available-games) · [How to Run](#-how-to-run) · [Contributing](#-contributing)

</div>

---

This repository serves as a showcase for practical applications and graphical games built with **Djazair**. These examples demonstrate how the language's high-level syntax blends with low-level native extensions (like `raylib`) to create fast, interactive, and media-rich software.

---

## 🎮 Available Games (`raylib_games/`)

All games in this folder are powered by the native **`raylib`** extension for Djazair.

| Game | Description | Key Features Demonstrated |
| :--- | :--- | :--- |
| **🕹️ Arkanoid** | The classic block-breaking arcade game. | Collision detection, paddle physics, grid level generation. |
| **🐦 Floppy** | A bird-flapping obstacle avoidance game. | Gravity physics, procedurally scrolling pipes, high-score tracking. |
| **🦠 Game of Life** | Conway's famous cellular automaton simulation. | Grid manipulation, neighborhood calculations, state updates. |
| **💣 Minesweeper** | The classic grid puzzle of finding hidden mines. | Grid reveal algorithms, cell flagging, win/loss state management. |
| **🐍 Snake** | The retro arcade snake game with audio. | Snake movement queue, collision bounds, dynamic food spawning, native audio integration (`.wav`). |
| **🧱 Tetris** | The classic block-falling puzzle. | Rotation matrices, line-clearing checks, grid locking, score multipliers. |

---

## ⚡ How to Run

To run these games on your machine, you must have the **Djazair Interpreter** and the **`raylib`** extension installed.

### 1. Prerequisites
First, make sure the `djazair` command is available in your system path.

Next, install and compile the `raylib` extension using **DPM (Djazair Package Manager)**:
```bash
# Install the extension
dpm install raylib

# Compile the native raylib binaries (requires GCC/MinGW)
dpm build raylib
```

### 2. Launching a Game
To start any game, simply pass the main script file path to the `djazair` runner.

**Example (Snake):**
```bash
# On Windows / Linux / macOS
djazair raylib_games/snake/snake.dz
```

**Example (Tetris):**
```bash
djazair raylib_games/tetris/tetris.dz
```

---

## 🤝 Contributing

Have you built a cool game or application in Djazair? We would love to feature it here!

1. **Fork** this repository.
2. Create your app folder (e.g. `raylib_games/space_invaders/`).
3. Commit your changes and push them to your fork.
4. Open a **Pull Request** with a brief description and gameplay explanation.

---

## 📄 License

This repository is licensed under the MIT License. See [LICENSE](LICENSE) for details.
