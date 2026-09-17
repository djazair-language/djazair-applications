# dpack - Djazair Standalone Bundler

`dpack` is the official bundler for the **Djazair Programming Language**. It allows you to package your Djazair scripts (`.dz`) and all their dependencies into a single, self-contained executable file (`.exe` on Windows, or a native binary on Linux). 

With `dpack`, you can distribute your Djazair programs to anyone, and they can run them immediately—**even if they don't have Djazair installed!**

---

## Features

- **Self-Contained Executables**: Automatically bundles the Djazair interpreter, standard library (`std`), and `prelude` into your app. (Note: the stub unpacks the embedded bundle on first launch using the system's `Expand-Archive` (Windows) or `unzip` (Linux) — see Notes & Limitations.)
- **Smart Extension Detection**: Scans your source code for `use <module>` and automatically bundles required external extensions (e.g., `raylib`, `qt`, `kasbah`).
- **Flexible Asset Management**: Intelligently bundles your media files, images, sounds, and directories. You can let it auto-bundle everything, or manually specify exactly what to include.
- **Cross-Platform**: Generates `.exe` files on Windows and native binaries on Linux.

---

## Basic Usage

To package a script, you simply write a short build script (e.g., `build.dz`) and run it.

### Example 1: The Simplest App
If you have a script named `app.dz` and you want to compile it into `app.exe`:

**`build.dz`**:
```dz
use dpack

# This will create 'app.exe' in the same directory.
# By default, it automatically bundles any assets found next to 'app.dz'.
dpack.pack("app.dz")
```
Run the build script from your terminal:
```bash
djazair build.dz
```

---

## Advanced Usage & The Options Dictionary

The `pack` function gives you complete control over how your app is built via an `options` dictionary.

```dz
dpack.pack(scriptPath, outputPath = Null, options = {})
```

### Parameters:
- **`scriptPath`** *(String)*: The relative or absolute path to the `.dz` entry script you want to package.
- **`outputPath`** *(String | Null)*: The path of the generated executable. If `Null`, `dpack` names it automatically based on your script (e.g., `app.exe`).
- **`options`** *(Dictionary)*: An optional dictionary to configure the build behavior.

### The `options` Dictionary:
The `options` dictionary accepts the following keys:

1. **`assets`** *(Bool | Array)*: Controls how external files (images, databases, sounds) are bundled.
   - **`True`** *(Default)*: Auto-bundling. `dpack` will automatically bundle **all files and folders** located in the same directory as your script (except system files like `.git`).
   - **`False`**: Disables asset bundling. Only your code and extensions are packed.
   - **`["file.png", "audio/"]`**: Explicit mode. Only the exact files and folders you list in the array will be bundled.

2. **`extensions`** *(Array)*: Sometimes you might load an extension dynamically, which hides it from the automatic scanner. You can force-include it here.
   - Example: `["sqlite", "kasbah"]`

3. **`console`** *(Bool)*:
   - **`True`** *(Default)*: Shows the console window (terminal). Output from `print()` and input from `input()` appear in the terminal.
   - **`False`**: Hides the console window completely (for GUI applications like WebView, Qt, Raylib).

4. **`portable`** *(Bool)*:
   - **`False`** *(Default)*: Extracts application cache to system `%TEMP%` / `/tmp`.
   - **`True`**: Portable mode. Places the cache folder locally next to the executable (ideal for USB flash drives and self-contained deployments).

5. **`encrypt`** / **`protect`** *(Bool)*:
   - **`False`** *(Default)*: Standard bundled files.
   - **`True`**: Source **obfuscation**. XOR-scrambles all user `.dz` scripts inside the executable so standard ZIP / decompiler tools can't read them directly.
   - ⚠️ **Honest limitation**: this is obfuscation, **not encryption or a security boundary**. The XOR key is embedded in the stub, and after the first run the decrypted scripts remain in the cache directory (`%TEMP%\dpack_app_*` on Windows, `/tmp/dpack_app_*` elsewhere). Anyone with filesystem access to that cache can read your full source. Do not rely on it to protect secrets.

6. **`quiet`** *(Bool)*: 
   - **`False`** *(Default)*: Shows detailed progress logs in the console during the build.
   - **`True`**: Hides all build logs.

---

## 📄 Project Configuration File (`dpack.json`)

You can create a `dpack.json` file in your project directory to define build settings automatically without writing a build script:

```json
{
  "main": "main.dz",
  "output": "my_app.exe",
  "console": false,
  "encrypt": true,
  "portable": true,
  "assets": true
}
```

Simply run `dpack.pack()` in your code, and it will automatically detect and load your `dpack.json` settings!

---

## 🧹 Cleaning Cache (`dpack.cleanCache()`)

To clean up old cached application build folders from system temp directory and free disk space:

```dz
use dpack

dpack.cleanCache()
```

### Example 2: Bundling a Game (Raylib)
Imagine you have a game called `snake.dz` and it uses sounds. You want the output to be called `MySnakeGame.exe` and you only want to include specific audio files.

```dz
use dpack

dpack.pack("snake.dz", "MySnakeGame.exe", {
    "assets": ["death.wav", "eat.wav", "images/"],
    "quiet": False
})
```

### Example 3: Disabling Assets for a CLI Tool
If you are building a command-line tool that doesn't need any external files, you can disable asset bundling to keep the executable size as small as possible.

```dz
use dpack

dpack.pack("cli_tool.dz", Null, {
    "assets": False,
    "extensions": ["zip"]  # Force-include the zip extension just in case
})
```

---

## 📝 Notes & Limitations

- **Runtime unpacking**: On first launch the stub unpacks the embedded bundle using the system's **`Expand-Archive` (Windows / PowerShell)** or **`unzip` (Linux)** — those tools must be available on the machine where the app runs.
- **Obfuscation ≠ security**: The `encrypt`/`protect` option is source obfuscation only (static XOR). After the first run the plain scripts are present in the cache directory (`%TEMP%\dpack_app_*`). Never store secrets in bundled `.dz` files.
- **Local imports**: Only imports inside the entry script's directory tree are supported. `import "../foo.dz"` (or any path escaping the project folder) is rejected at build time with a clear error — keep such files in the project folder or bundle them as `assets`.
- **Unicode paths (Windows)**: The stub currently uses ANSI system APIs; non-ASCII (e.g. Arabic) characters in the executable's path are not reliably supported on Windows.
- **Unsigned output**: Bundled executables are not cryptographically signed; a tampered bundle (replacing the embedded ZIP payload) will still run. Distribute through trusted channels, and keep the last 16 bytes (the dpack footer) intact.

---

## How It Works Under The Hood

When you run `dpack.pack()`, the following happens:
1. **Staging**: A temporary directory (`.dpack_stage_tmp`) is created.
2. **Copying**: Your script (renamed to `__main__.dz`), the Djazair interpreter, standard libraries, extensions, and your assets are securely copied into the staging folder.
3. **Compression**: The staging directory is zipped into a highly compressed archive.
4. **Assembly**: The archive is injected into a tiny, pre-compiled C-binary stub (`stub/stub_win.exe`).
5. **Execution**: When a user runs your final executable, the stub transparently extracts the application (via `Expand-Archive` / `unzip`) into a versioned cache directory (`%TEMP%` or locally in portable mode), executes your app seamlessly with full access to the user's working directory and arguments, and preserves the cache so subsequent launches start instantly. Old cache folders can be cleaned at any time using `dpack.cleanCache()`.
