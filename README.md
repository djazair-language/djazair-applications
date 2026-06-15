# Djazair Applications & Games

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Organization](https://img.shields.io/badge/organization-djazair--language-blue.svg)](https://github.com/djazair-language)
[![Language: Djazair](https://img.shields.io/badge/language-Djazair-orange.svg)](https://github.com/djazair-language/djazair)

**A curated collection of games and applications built using the Djazair Programming Language.**

[Raylib Games](#-raylib-games-raylib_games) · [WebView Apps](#-webview-desktop-applications-webview_apps) · [How to Run](#-how-to-run) · [Contributing](#-contributing)

</div>

---

This repository showcases practical applications and graphical projects built with **Djazair**. These examples demonstrate how the language's high-level syntax blends with low-level native extensions to create fast, interactive software.

---

## 🎮 Raylib Games (`raylib_games/`)

This directory contains graphical games built using the native **`raylib`** extension for Djazair. Raylib is a lightweight and easy-to-use library for game programming, supporting 2D/3D graphics, input handling (keyboard, mouse, gamepad), and audio playback.

See the [raylib_games/README.md](raylib_games/README.md) for more details.

---

## 🌐 WebView Desktop Applications (`webview_apps/`)

This directory contains desktop applications built using the native **`webview`** extension for Djazair. The WebView extension allows developers to build modern desktop graphical user interfaces (GUIs) using standard web technologies (HTML, CSS, and JavaScript) powered by a fast Djazair C++ backend.

See the [webview_apps/README.md](webview_apps/README.md) for more details.

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

**Usage:**
```bash
djazair <category_folder>/<project_folder>/<main_file>.dz
```

**Examples:**
```bash
# To run a Raylib game:
djazair raylib_games/<game_folder>/<main_file>.dz

# To run a WebView app:
djazair webview_apps/<app_folder>/<main_file>.dz
```

---

## 🤝 Contributing

Have you built a cool game or application in Djazair? We would love to feature it here!

1. **Fork** this repository.
2. Create your project folder under the appropriate directory (`raylib_games/` or `webview_apps/`).
3. Commit your changes and push them to your fork.
4. Open a **Pull Request** with a brief description of what your app does.

---

## 📄 License

This repository is licensed under the MIT License. See [LICENSE](LICENSE) for details.
