# Contributing to Djazair WebView

This document defines the **code and documentation standards** every contribution must follow. It targets both the Djazair backend modules (`.dz`) and the native bridge (`src/webview_native.cc`).

## Repository Layout

| Path | Contents |
|------|----------|
| `README.md` | User guide — install, quick start, full API overview. |
| `docs/index.html` | Reference manual — expanded user-facing documentation. |
| `examples/` | Runnable, numbered examples (each with a header banner). |
| `application/` | `App` class: lifecycle, single-instance, primary window. |
| `window/` | `Window` class: geometry, visuals, content, events. |
| `bridge/` | Async IPC bridge and virtual-asset loader. |
| `menu/`, `tray/`, `notification/`, `protocol/`, `dialog/` | Native UI subsystems. |
| `utils/` | Logging and config helpers. |
| `src/webview_native.cc` | Native bindings (WIn32 + WebView2). |
| `src/webview.h` | Vendored engine header — **do not edit**. |

## Code Standards

- **Language of code and comments:** English. Djazair keywords/identifiers remain in Djazair.
- **Djazair modules**: one class or subsystem per file, with a `# ====` header banner describing the file's role. Indentation: 4 spaces.
- **Naming convention:** `camelCase` for methods and local variables, `PascalCase` for classes, `_leadingUnderscore` for private members, `SCREAMING_SNAKE` for constants.
- **No `TODO`/`FIXME` in committed code.** Open an issue instead or resolve in the same PR.
- **No dead code, no debug prints in production paths.** `sysLog("error", ...)` is the sanctioned channel for diagnostics.

## Documentation Standards (Mandatory)

The library is **self-documenting**: the source is the reference. Every public API must carry a docblock that matches the file's existing style.

### `.dz` modules — docblock template

```dz
# <One imperative sentence: what the caller gets or what happens.>
#
# @param  <name> {Type}  <description> (default: X)
# @return <Type> <description>
```

- Add one block above **every** public method/property of `App` and `Window`.
- Document callback signatures in `@param`, e.g. `@param callback {Function} Receives (x, y)`.
- `@param` / `@return` types: `String`, `Number`, `Bool`, `Object`, `HashMap`, `Function`, `Window`, `Void`.
- Upgrade existing brief comments rather than stacking a second block.

### Native module — docblock template

```cc
//
// Native binding: "<bridge-name>"
// <1-2 line description of what it does and when it is called>
// Args: <names of the Djazair-side args, inferred from the body>
// Returns: <type or "Void">
//
```

- `<bridge-name>` must match the string in the `native_bindings[]` table, so bindings are cross-referencable.
- Add docblocks to internal helpers (`set_callback`, `invoke_callback_*`, `attach_navigation_completed`, ...) only when missing.
- Never edit `src/webview.h`.

### Rules that apply everywhere

1. **Comment-only changes are first-class**: document existing APIs without altering behavior, and verify with `git diff` that all added/removed lines are comments (or blank lines flanking them).
2. Never use the `write` tool on `.dz`/`.cc` files you are documenting in place — use `edit`, which preserves bytes (no BOM).
3. No emojis in comments or docs. No inline copyright noise.
4. Keep docblocks short: 1 summary sentence + a few `@param`/`@return` lines.

## Build & Verification

```bash
# From the webview/ directory
cmd /c build.bat            # compile src/webview_native.cc -> webview.dll
```

Verification workflow before submitting:

```bash
# 1. Re-link the extension into the interpreter packages (if pkg is a junction):
cmd /c mklink /J "D:\Programing\Djazair Programming Language\djazair-language\packages\webview" "D:\Programing\Djazair Programming Language\djazair-extensions\webview"

# 2. Smoke-run an example, confirm expected console output, then:
cmd /c rmdir "D:\Programing\Djazair Programming Language\djazair-language\packages\webview"
```

The junction is a temporary testing link and must be removed after verification. Never commit it.

## Commit & PR Conventions

- **Format:** `type(scope): summary` — e.g. `fix(webview): virtualHostDir routing on navigation`.
- Types: `fix`, `feat`, `docs`, `refactor`, `perf`, `build`, `test`.
- One logical change per commit; stage only intended files; never commit `webview/reports/` (git-ignored) or generated `.dll`s unless the repo's packaging requires it.
- PRs should include a short description of user-visible impact and, when behavior changes, evidence of a smoke run.

## Documentation Coverage (Definition of Done)

A change that adds a public feature must update, where applicable:

- this README (API overview / learning-path table),
- `docs/index.html` (full guide),
- a numbered example under `examples/`,
- the corresponding `.dz` docblock and native binding comment.

Coverage ladder required for the library overall: **Installation → Beginner (first app) → Intermediate (events/IPC/dialogs) → Advanced (menus/tray/protocols/multi-window) → Professional (frameless, display APIs, cache/cookies/UA/printing, single-instance, deployment) + Troubleshooting.**