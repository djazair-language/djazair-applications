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

## 🌐 WebView Desktop Applications (`webview_apps/`)

These desktop applications are built using the native **`webview`** extension for Djazair, which enables modern HTML/CSS/JS user interfaces powered by a C++ native backend.

| Application | Description | Key Features Demonstrated |
| :--- | :--- | :--- |
| **🍅 Pomodoro App** | A productivity Pomodoro timer application. | HTML/CSS timer UI, SQLite database integration, local statistics tracking. |
| **📊 System Dashboard** | A real-time system resource monitor. | CPU/RAM/OS metrics reporting, local IPC bridge communication. |

---

## ⚡ How to Run

To run these applications and games on your machine, you must have the **Djazair Interpreter** and the required native extensions (`raylib` or `webview`) installed.

### 1. Prerequisites
First, make sure the `djazair` command is available in your system path.

Next, install and compile the required extensions using **DPM (Djazair Package Manager)**:
```bash
# Install the extensions
dpm install raylib
dpm install webview

# Compile the native binaries (requires GCC/MinGW)
dpm build raylib
dpm build webview
```

### 2. Launching an Application or Game
To start any application or game, pass the main script file path to the `djazair` runner.

**Example (Snake Game):**
```bash
djazair raylib_games/snake/snake.dz
```

**Example (Pomodoro App):**
```bash
djazair webview_apps/pomodoro_app/main.dz
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
