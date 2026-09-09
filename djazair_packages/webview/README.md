# Djazair WebView — Desktop Application Framework

Build modern desktop GUI applications for Windows using **HTML, CSS, and JavaScript** for the frontend and **Djazair** for the backend. Powered by Microsoft Edge WebView2 (Chromium).

---

## Table of Contents

1. [Installation](#1-installation)
2. [Your First App](#2-your-first-app)
3. [App Lifecycle](#3-app-lifecycle)
4. [Window Management](#4-window-management)
5. [Window Events](#5-window-events)
6. [Content & Navigation](#6-content--navigation)
7. [IPC Bridge: Djazair ↔ JavaScript](#7-ipc-bridge-djazair--javascript)
8. [Native System Dialogs](#8-native-system-dialogs)
9. [Context Menus](#9-context-menus)
10. [System Tray Icon](#10-system-tray-icon)
11. [Toast Notifications](#11-toast-notifications)
12. [Custom URL Protocols](#12-custom-url-protocols)
13. [Logging System](#13-logging-system)
14. [Complete Examples](#14-complete-examples)

---

## 1. Installation

### Prerequisites

- **Windows 10 or 11** with Microsoft Edge WebView2 Runtime (built-in on modern Windows 11)
- **Djazair Language** installed (includes `dpm` package manager)
- **MinGW-w64** with `g++` supporting C++14 (for building the native module)

### Install & Build

```bash
dpm install webview
dpm build webview
```

The build step compiles `src/webview_native.cc` into `webview.dll`. This only needs to happen once after installation.

---

## 2. Your First App

Here is the simplest possible WebView application:

```djazair
use webview

let app = webview.createWindow({
    "title": "Hello Djazair",
    "width": 800,
    "height": 600
})

app.onReady(fn()
    app.window.setHtml("
        <html>
        <body style='display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;
                     background:#1a1a2e;color:#eee;margin:0'>
            <h1>Hello from Djazair!</h1>
        </body>
        </html>
    ")
end)

app.run()
```

Run it:

```bash
djazair myapp.dz
```

A native window opens displaying the HTML content. The `app.run()` call blocks until the window closes.

---

## 3. App Lifecycle

### Creating an App

`webview.createWindow(options)` returns an `App` instance.

Available options with defaults:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | String | `"Djazair App"` | Window title |
| `width` | Number | `1024` | Initial width in pixels |
| `height` | Number | `768` | Initial height in pixels |
| `x` | Number | `-1` | X position (`-1` = OS default) |
| `y` | Number | `-1` | Y position (`-1` = OS default) |
| `resizable` | Bool | `True` | Allow window resizing |
| `frameless` | Bool | `False` | Remove title bar and borders |
| `minWidth` | Number | `400` | Minimum width constraint |
| `minHeight` | Number | `300` | Minimum height constraint |
| `maxWidth` | Number | `0` | Maximum width (`0` = unlimited) |
| `maxHeight` | Number | `0` | Maximum height (`0` = unlimited) |
| `closable` | Bool | `True` | Allow closing via window button |
| `debug` | Bool | `False` | Enable DevTools + JS console forwarding |
| `singleInstance` | Bool | `False` | Prevent duplicate instances; focus existing window on launch |
| `appId` | String | `""` | Unique app identifier for singleInstance lock (defaults to title) |

### Lifecycle Methods

```djazair
let app = webview.createWindow({"title": "My App", "debug": True})

# Called once before the event loop starts
app.onReady(fn()
    print("App is ready!")
end)

# Called when the application is quitting
app.onQuit(fn()
    print("Goodbye!")
end)

# Catches bridge/internal errors
app.onError(fn(err)
    print("Error: " + err)
end)

# Start the event loop (blocks until window closes)
app.run()

# Other control methods (call before run() or from handlers):
# app.quit()   — clean exit
# app.close()  — close the current window
# app.isValid() — check if window is still open
# app.setDebug(True) — toggle DevTools at runtime
```

### Multiple Windows

You can create multiple windows. Call `run()` once — it drives all windows:

```djazair
let app1 = webview.createWindow({"title": "Window 1", "width": 600, "height": 400})
let app2 = webview.createWindow({"title": "Window 2", "width": 400, "height": 300})

app1.onReady(fn()
    app1.window.setHtml("<h1>First Window</h1>")
end)

app2.onReady(fn()
    app2.window.setHtml("<h1>Second Window</h1>")
end)

app1.run()
```

---

## 4. Window Management

Access the active window through `app.window`.

### Title

```djazair
app.window.setTitle("New Title")
let current = app.window.title()
```

### Size & Position

```djazair
# Size
app.window.setSize(800, 600)
let size = app.window.getSize()     # [width, height]

# Position
app.window.setPosition(100, 200)
let pos = app.window.getPosition()   # [x, y]
```

### State Control

```djazair
app.window.show()
app.window.hide()
app.window.minimize()
app.window.maximize()
app.window.restore()
app.window.focus()

app.window.isVisible()     # Bool
app.window.isMaximized()   # Bool
app.window.isMinimized()   # Bool
app.window.isFocused()     # Bool: True if active foreground window

# Taskbar attention flash
app.window.flash(True)           # Flash taskbar icon until focused
app.window.flash(False)          # Stop flashing
app.window.requestAttention()    # Convenience alias for flash(True)
```

### Frameless Window Dragging

When building a custom frameless window (`"frameless": True`), you can initiate native window dragging from either Djazair or frontend HTML/CSS:

**HTML / JavaScript:**
```html
<!-- Any HTML element can serve as a draggable titlebar -->
<div class="titlebar" style="user-select: none;" onmousedown="window.djazair.startDragging()">
    <span>My App Title</span>
</div>
```

**Djazair Backend:**
```djazair
app.window.startDragging()
```

### Constraints

```djazair
app.window.setResizable(False)
app.window.setMinimumSize(400, 300)
app.window.setMaximumSize(1920, 1080)
```

### Visual

```djazair
# Set background color behind the web view (eliminates white flash on load)
app.window.setBackgroundColor(13, 17, 23)  # r, g, b, a=255

# Zoom level (0.5 = 50%, 2.0 = 200%)
app.window.setZoomLevel(1.25)
let zoom = app.window.zoomLevel()

# Disable browser right-click menu
app.window.setContextMenuEnabled(False)
```

---

## 5. Window Events

Register callbacks on `app.window` to react to window state changes:

```djazair
app.window.onMove(fn(x, y)
    print("Window moved to ${x}, ${y}")
end)

app.window.onResize(fn(width, height)
    print("Window resized to ${width}x${height}")
end)

app.window.onFocus(fn()
    print("Window gained focus")
end)

app.window.onBlur(fn()
    print("Window lost focus")
end)

app.window.onMaximize(fn()
    print("Window maximized")
end)

app.window.onMinimize(fn()
    print("Window minimized")
end)

app.window.onRestore(fn()
    print("Window restored")
end)

app.window.onClose(fn()
    print("Window closing")
end)

app.window.onLoad(fn()
    print("Page fully loaded: ${app.window.getUrl()}")
end)

app.window.onNavigate(fn(url)
    print("Navigating to: ${url}")
end)

app.window.onTitleChange(fn(title)
    print("Document title changed: ${title}")
end)
```

---

## 6. Content & Navigation

### Loading Content

Three ways to display content:

```djazair
# 1. Load raw HTML string
app.window.setHtml("<h1>Hello</h1>")

# 2. Navigate to a URL
app.window.navigate("https://example.com")

# 3. Load a local file (auto-mapped to http://djazair.local/ to avoid CORS)
app.window.navigate("index.html")

# 4. Load a local file from a subdirectory
app.window.navigate("views/main.html")
```

### JavaScript Execution

```djazair
# Execute JavaScript in the page
app.window.eval("document.title = 'Modified by Djazair'")

# Inject JavaScript before any page script runs (runs on every navigation)
app.window.initJs("window.__APP_VERSION = '1.0.0'")
```

### Navigation Controls

```djazair
app.window.reload()
app.window.goBack()
app.window.goForward()
app.window.canGoBack()      # Bool
app.window.canGoForward()   # Bool
app.window.getUrl()         # Current URL string
```

### Developer Tools

```djazair
app.window.openDevTools()
```

---

## 7. IPC Bridge: Djazair ↔ JavaScript

The `app.bridge` object enables seamless communication between Djazair and the JavaScript environment.

### Djazair → JavaScript (Push Events)

Send data from Djazair to the frontend at any time:

```djazair
# Djazair side
app.bridge.send("notification", {"message": "Hello from backend!"})
```

```javascript
// JavaScript side
window.djazair.on("notification", function(data) {
    console.log(data.message);  // "Hello from backend!"
});
```

Remove listeners:

```javascript
window.djazair.off("notification", myCallback);
window.djazair.off("notification");       // removes all
```

### JavaScript → Djazair (Request/Response)

Call Djazair handlers from JavaScript and get results back via Promises:

```djazair
# Djazair side — register a handler
app.bridge.on("add", fn(payload)
    return payload["a"] + payload["b"]
end)

app.bridge.on("getUser", fn(payload)
    return {"name": "Riad", "age": 24}
end)

app.bridge.on("willFail", fn(payload)
    throw "Something went wrong!"
end)
```

```javascript
// JavaScript side — invoke returns a Promise
let sum = await window.djazair.invoke("add", {a: 10, b: 32});
console.log(sum);  // 42

let user = await window.djazair.invoke("getUser");
console.log(user.name);  // "Riad"

try {
    await window.djazair.invoke("willFail");
} catch (e) {
    console.error(e.message);  // "Something went wrong!"
}
```

### Expose Native Bindings

Expose a Djazair function directly on the global `window` object in JavaScript:

```djazair
# Djazair side
app.bridge.expose("nativeAdd", fn(args)
    return args[0] + args[1]
end)

app.bridge.expose("nativeGreet", fn(args)
    return "Hello, ${args[0]}!"
end)
```

```javascript
// JavaScript side — callable as window.nativeAdd(...)
let result = await window.nativeAdd(10, 32);  // 42
let msg = await window.nativeGreet("World");  // "Hello, World!"
```

### Complete Bridge Example

Put it all together in a working app:

```djazair
use webview

let app = webview.createWindow({"title": "Bridge Demo", "debug": True})

app.onReady(fn()
    # Register handlers for JS to invoke
    app.bridge.on("add", fn(payload)
        return payload["a"] + payload["b"]
    end)

    app.bridge.on("getUser", fn(payload)
        return {"name": "Riad", "age": 24}
    end)

    app.bridge.on("willFail", fn(payload)
        throw "Something went wrong!"
    end)

    # Push event handler: JS requests a push
    app.bridge.on("sendPush", fn(payload)
        app.bridge.send("notification", {"message": "Hello from backend!"})
        return True
    end)

    # Expose native bindings on window.*
    app.bridge.expose("nativeAdd", fn(args)
        return args[0] + args[1]
    end)

    app.bridge.expose("nativeGreet", fn(args)
        return "Hello, ${args[0]}!"
    end)

    app.window.setHtml("
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', sans-serif; background: #0d1117;
                       color: #c9d1d9; padding: 24px; max-width: 600px; margin: 0 auto; }
                h1 { color: #58a6ff; margin-bottom: 16px; font-size: 1.3rem; }
                .card { background: #161b22; border: 1px solid #30363d;
                        border-radius: 8px; padding: 16px; margin-bottom: 12px; }
                button { background: #21262d; border: 1px solid #30363d;
                         color: #c9d1d9; padding: 8px 16px; border-radius: 6px;
                         cursor: pointer; font-size: 13px; margin: 4px; }
                button:hover { background: #30363d; }
                .out { margin-top: 8px; padding: 8px; background: #0d1117;
                       border-radius: 4px; font-family: monospace; font-size: 12px;
                       color: #3fb950; min-height: 20px; }
            </style>
        </head>
        <body>
            <h1>IPC Bridge Demo</h1>
            <div class='card'>
                <button onclick='testAdd()'>add(10, 32)</button>
                <button onclick='testGetUser()'>getUser()</button>
                <button onclick='testError()'>willFail()</button>
                <button onclick='testPush()'>Push Event</button>
                <button onclick='testNative()'>nativeAdd(10, 32)</button>
                <div class='out' id='out'>Click a button</div>
            </div>
            <script>
                var out = document.getElementById('out');
                async function testAdd() {
                    var r = await window.djazair.invoke('add', {a:10, b:32});
                    out.innerText = 'add(10, 32) = ' + r;
                }
                async function testGetUser() {
                    var r = await window.djazair.invoke('getUser');
                    out.innerText = JSON.stringify(r);
                }
                async function testError() {
                    try { await window.djazair.invoke('willFail'); }
                    catch(e) { out.innerText = 'Error: ' + e.message; }
                }
                async function testPush() {
                    window.djazair.on('notification', function(d) {
                        out.innerText = 'Push received: ' + JSON.stringify(d);
                        window.djazair.off('notification');
                    });
                    await window.djazair.invoke('sendPush');
                }
                async function testNative() {
                    var r = await window.nativeAdd(10, 32);
                    out.innerText = 'nativeAdd(10, 32) = ' + r;
                }
            </script>
        </body>
        </html>
    ")
end)

app.run()
```

### Auto-Serialization

The bridge handles JSON serialization automatically:
- JavaScript objects/arrays/numbers/strings/booleans/null → automatically parsed in Djazair
- Djazair maps/arrays/numbers/strings/booleans/Null → automatically serialized to JavaScript
- No manual `parse()` or `stringify()` needed

### JavaScript Client API Reference

The bridge injects `window.djazair` automatically via `initJs()`:

| Method | Description |
|--------|-------------|
| `djazair.invoke(channel, data)` | Call a Djazair handler. Returns `Promise<any>` |
| `djazair.on(channel, callback)` | Subscribe to push events from Djazair |
| `djazair.off(channel, callback?)` | Unsubscribe. Omitting callback removes all |
| `djazair.send(channel, data)` | (Internal) Dispatches data to JS listeners |

---

## 8. Native System Dialogs

### Message Box

```djazair
let result = webview.showMessageBox({
    "type": "info",          # "info" | "warning" | "error" | "question"
    "title": "Information",
    "message": "File saved successfully.",
    "detail": "The document was exported.",
    "buttons": "ok",         # "ok" | "ok-cancel" | "yes-no" | "yes-no-cancel" | "retry-cancel"
    "defaultId": 0,
    "cancelId": 0
})
# Returns: "ok" | "cancel" | "yes" | "no" | "retry"
```

### Open File Dialog

```djazair
# Single file
let path = webview.showOpenFileDialog({
    "title": "Select a File",
    "defaultPath": "",
    "filters": [
        {"name": "Documents", "extensions": ["txt", "json", "md"]},
        {"name": "All Files", "extensions": ["*"]}
    ],
    "multiSelections": False,
    "properties": []
})
# Returns: path string, or Null if cancelled

# Multi-file selection
let paths = webview.showOpenFileDialog({
    "title": "Select Multiple Files",
    "multiSelections": True,
    "filters": [{"name": "All Files", "extensions": ["*"]}]
})
# Returns: array of path strings, or Null if cancelled
```

### Save File Dialog

```djazair
let path = webview.showSaveFileDialog({
    "title": "Save As",
    "defaultPath": "output.json",
    "filters": [
        {"name": "JSON", "extensions": ["json"]},
        {"name": "Text", "extensions": ["txt"]}
    ]
})
# Returns: path string, or Null if cancelled
```

### Folder Picker

```djazair
let path = webview.showOpenFolderDialog({
    "title": "Select a Folder",
    "defaultPath": ""
})
# Returns: path string, or Null if cancelled
```

### Color Picker

```djazair
let color = webview.showColorPicker({
    "title": "Pick a Color"
})
# Returns: {"r": 255, "g": 128, "b": 0, "a": 255} or Null if cancelled
```

---

## 9. Context Menus

Build native Windows context menus (popup menus):

```djazair
# Create a menu
let menu = webview.menuCreate("My Menu")

# Add items with callbacks
webview.menuAddItem(menu, "Option A", fn()
    print("Option A clicked")
end)

webview.menuAddItem(menu, "Option B", fn()
    print("Option B clicked")
end)

# Add a separator line
webview.menuAddSeparator(menu)

# Create a submenu
let sub = webview.menuCreateSubmenu(menu, "More Options")
webview.menuAddItem(sub, "Sub Item 1", fn()
    print("Sub item clicked")
end)

# Show the menu at the current cursor position
# Pass app.window._handle as the first argument
webview.menuPopup(app.window._handle, menu)
```

Typical pattern — trigger from JavaScript right-click:

```djazair
# Djazair side
app.bridge.on("showContextMenu", fn(data)
    webview.menuPopup(app.window._handle, menu)
    return True
end)
```

```html
<!-- HTML side -->
<body oncontextmenu='event.preventDefault(); window.djazair.invoke("showContextMenu")'>
```

Complete working example:

### Object-Oriented Style (Recommended)

```djazair
use webview
let menu = new webview.Menu("Context Menu")
menu.addItem("Option A", fn() print("Option A clicked") end)
menu.addItem("Option B", fn() print("Option B clicked") end)
menu.addSeparator()

let sub = menu.addSubmenu("More Options")
sub.addItem("Sub Item 1", fn() print("Sub item clicked") end)

# Display popup on window
menu.popup(app.window)
# Or window.popupMenu(menu)
```

### Procedural Style

```djazair
use webview

let app = webview.createWindow({"title": "Menu Demo", "debug": True})

app.onReady(fn()
    let menu = webview.menuCreate("My Menu")

    webview.menuAddItem(menu, "Option A", fn()
        print("Option A clicked")
    end)

    webview.menuAddItem(menu, "Option B", fn()
        print("Option B clicked")
    end)

    webview.menuAddSeparator(menu)

    let sub = webview.menuCreateSubmenu(menu, "More Options")
    webview.menuAddItem(sub, "Sub Item 1", fn()
        print("Sub item clicked")
    end)

    app.window.setHtml("
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', sans-serif; display: flex;
                       align-items: center; justify-content: center; height: 100vh;
                       margin: 0; background: #1a1a2e; color: #e2e8f0;
                       user-select: none; }
                .msg { text-align: center; }
                .msg h2 { color: #a78bfa; margin-bottom: 8px; }
                .msg p { color: #94a3b8; font-size: 14px; }
            </style>
        </head>
        <body oncontextmenu='event.preventDefault(); window.djazair.invoke(\"showContextMenu\")'>
            <div class='msg'>
                <h2>Right-Click Anywhere</h2>
                <p>Try the native context menu!</p>
            </div>
        </body>
        </html>
    ")

    app.bridge.on("showContextMenu", fn(data)
        webview.menuPopup(app.window, menu)
        return True
    end)
end)

app.run()
```

Menu methods and functions:

| OOP Method | Procedural Function | Description |
|---|---|---|
| `new webview.Menu(label)` | `menuCreate(label)` | Create a new popup menu |
| `menu.addItem(label, callback)` | `menuAddItem(menu, label, cb)` | Add a clickable item |
| `menu.addSeparator()` | `menuAddSeparator(menu)` | Add a horizontal divider |
| `menu.addSubmenu(label)` | `menuCreateSubmenu(menu, label)` | Create a nested submenu |
| `menu.popup(window)` | `menuPopup(window, menu)` | Show menu at current cursor |
| `window.popupMenu(menu)` | — | Convenience method on Window |

---

## 10. System Tray Icon

Create and manage a system tray icon (notification area):

### Object-Oriented Style (Recommended)

```djazair
let tray = new webview.Tray("Djazair Application v1.0", "icon.ico")
tray.setMenu(menu)
tray.showBalloon("Title", "Message text", 5)
tray.destroy()
```

### Procedural Style

```djazair
# Create a tray icon
let tray = webview.trayCreate("Djazair App", "icon.ico")

# Set tooltip text (appears on hover)
webview.traySetTooltip(tray, "Djazair Application v1.0")

# Show a balloon notification from the tray icon
webview.trayShowBalloon(tray, "Title", "Message text", 5)  # timeout in seconds

# Destroy the tray icon
webview.trayDestroy(tray)
```

Tray methods and functions:

| OOP Method | Procedural Function | Description |
|---|---|---|
| `new webview.Tray(tooltip, iconPath)` | `trayCreate(label, iconPath)` | Create tray icon |
| `tray.setIcon(iconPath)` | `traySetIcon(handle, iconPath)` | Change the tray icon image |
| `tray.setMenu(menu)` | `traySetMenu(handle, menu)` | Attach a context menu |
| `tray.setTooltip(tooltip)` | `traySetTooltip(handle, tooltip)` | Set hover tooltip text |
| `tray.showBalloon(title, msg, timeout)` | `trayShowBalloon(handle, title, msg, timeout)` | Show balloon notification |
| `tray.destroy()` | `trayDestroy(handle)` | Remove the tray icon |

> **Note:** Tray functionality requires a valid `.ico` file path. On Linux/macOS these are stub implementations.

---

## 11. Toast Notifications

Show Windows 10/11 Action Center notifications:

```djazair
webview.notificationShow(
    "Djazair App",          # title
    "Hello from Djazair!",  # message
    "Notification Subtitle", # subtitle (optional)
    True,                   # play sound (optional, default False)
    "",                     # icon path (optional)
    5                       # timeout in seconds (optional, default 5)
)
```

---

## 12. Custom URL Protocols

Register custom protocol schemes to intercept navigation requests:

```djazair
webview.protocolRegister("myapp", fn(request)
    # Handle request, return response data
    return "Custom response"
end)

webview.protocolUnregister("myapp")
```

---

## 13. Logging System

The library has a built-in logging system with levels and colored console output:

```djazair
# Set global log level: "none" | "error" | "warn" | "info" | "debug"
webview.setLogLevel("debug")

# Enable/disable ANSI color output
webview.setLogColors(True)

# Log to a file in addition to the console
webview.setLogFile("app.log")

# Custom timestamp format (uses datetime module format)
webview.setLogTimeFormat("%Y-%m-%d %H:%M:%S")

# Log a message from anywhere
webview.log("Application started")            # level defaults to "info"
webview.log("Something suspicious", "warn")
webview.log("Database connection failed", "error")
webview.log("Verbose debug info", "debug")
```

When `debug: True` is set in `createWindow()`, console messages from JavaScript (`console.log`, `console.warn`, `console.error`, `console.info`) are forwarded to the Djazair terminal automatically.

---

## 14. Complete Examples

### Example 1: Counter App with Bridge

A simple counter app demonstrating invoke, send, and push events:

```djazair
use webview

let app = webview.createWindow({
    "title": "Counter App",
    "width": 500,
    "height": 400,
    "debug": True
})

app.onReady(fn()
    let count = 0

    app.bridge.on("increment", fn(p)
        count = count + 1
        app.bridge.send("countUpdated", count)
        return count
    end)

    app.bridge.on("decrement", fn(p)
        count = count - 1
        app.bridge.send("countUpdated", count)
        return count
    end)

    app.bridge.on("reset", fn(p)
        count = 0
        app.bridge.send("countUpdated", count)
        return count
    end)

    app.window.setHtml("
        <html>
        <head>
            <style>
                body {
                    font-family: 'Segoe UI', sans-serif;
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    height: 100vh; margin: 0;
                    background: #0f172a; color: #e2e8f0;
                }
                h1 { font-size: 4rem; margin: 20px 0; color: #38bdf8; }
                button {
                    font-size: 1.2rem; padding: 12px 24px; margin: 8px;
                    border: none; border-radius: 8px; cursor: pointer;
                    background: #1e293b; color: #94a3b8;
                    transition: all 0.2s;
                }
                button:hover { background: #334155; color: #fff; }
                button.primary { background: #3b82f6; color: white; }
                button.primary:hover { background: #2563eb; }
                button.danger { background: #ef4444; color: white; }
                button.danger:hover { background: #dc2626; }
            </style>
        </head>
        <body>
            <h1 id='counter'>0</h1>
            <div>
                <button class='primary' onclick='inc()'>+ Increment</button>
                <button onclick='dec()'>- Decrement</button>
                <button class='danger' onclick='rst()'>Reset</button>
            </div>
            <script>
                window.djazair.on('countUpdated', function(val) {
                    document.getElementById('counter').innerText = val;
                });
                function inc() { window.djazair.invoke('increment'); }
                function dec() { window.djazair.invoke('decrement'); }
                function rst() { window.djazair.invoke('reset'); }
            </script>
        </body>
        </html>
    ")
end)

app.run()
```

### Example 2: File Editor

Demonstrates dialogs, file I/O, and bridge communication:

```djazair
use webview
use file

let app = webview.createWindow({
    "title": "Djazair File Editor",
    "width": 900,
    "height": 650,
    "debug": True
})

app.onReady(fn()
    app.bridge.on("openFile", fn(p)
        let path = webview.showOpenFileDialog({
            "title": "Open Text File",
            "filters": [
                {"name": "Text Files", "extensions": ["txt", "md", "dz"]},
                {"name": "All Files", "extensions": ["*"]}
            ]
        })
        if isNull(path) return {"error": "Cancelled"} end
        let content = file.read(path)
        return {"path": path, "content": content}
    end)

    app.bridge.on("saveFile", fn(p)
        let path = p["currentPath"]
        if isNull(path) or path == ""
            path = webview.showSaveFileDialog({
                "title": "Save File",
                "defaultPath": p["suggestedName"],
                "filters": [{"name": "Text Files", "extensions": ["txt"]}]
            })
            if isNull(path) return {"error": "Cancelled"} end
        end
        file.write(path, p["content"])
        return {"path": path}
    end)

    app.bridge.on("showInfo", fn(p)
        webview.showMessageBox({
            "type": "info",
            "title": p["title"],
            "message": p["message"]
        })
        return True
    end)

    app.window.setHtml("
        <html>
        <head>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: 'Segoe UI', sans-serif;
                    background: #0d1117; color: #c9d1d9;
                    display: flex; flex-direction: column; height: 100vh;
                }
                .toolbar {
                    display: flex; gap: 8px; padding: 10px 16px;
                    background: #161b22; border-bottom: 1px solid #30363d;
                }
                button {
                    background: #21262d; border: 1px solid #30363d;
                    color: #c9d1d9; padding: 8px 16px; border-radius: 6px;
                    cursor: pointer; font-size: 13px;
                }
                button:hover { background: #30363d; }
                .status {
                    padding: 8px 16px; background: #161b22;
                    border-bottom: 1px solid #30363d;
                    font-size: 12px; color: #8b949e;
                }
                textarea {
                    flex: 1; padding: 16px; font-family: 'Cascadia Code', 'Fira Code', monospace;
                    font-size: 14px; background: #0d1117; color: #c9d1d9;
                    border: none; outline: none; resize: none;
                }
            </style>
        </head>
        <body>
            <div class='toolbar'>
                <button onclick='openFile()'>Open</button>
                <button onclick='saveFile()'>Save</button>
                <button onclick='showAbout()'>About</button>
            </div>
            <div class='status' id='status'>No file open</div>
            <textarea id='editor' placeholder='Start typing...'></textarea>
            <script>
                var currentPath = '';
                async function openFile() {
                    var r = await window.djazair.invoke('openFile');
                    if (r.error) return;
                    currentPath = r.path;
                    document.getElementById('editor').value = r.content;
                    document.getElementById('status').innerText = r.path;
                }
                async function saveFile() {
                    var content = document.getElementById('editor').value;
                    var name = currentPath.split('/').pop().split('\\\\').pop() || 'untitled.txt';
                    var r = await window.djazair.invoke('saveFile', {
                        content: content, suggestedName: name, currentPath: currentPath
                    });
                    if (r.error) return;
                    currentPath = r.path;
                    document.getElementById('status').innerText = 'Saved: ' + r.path;
                }
                async function showAbout() {
                    await window.djazair.invoke('showInfo', {
                        title: 'About',
                        message: 'Djazair File Editor\\nBuilt with WebView extension'
                    });
                }
            </script>
        </body>
        </html>
    ")
end)

app.run()
```

### Example 3: Full-Featured Application

A complete app combining all major features:

```djazair
use webview
use file
use json as *

let app = webview.createWindow({
    "title": "Djazair Desktop Suite",
    "width": 1024,
    "height": 768,
    "debug": True,
    "minWidth": 600,
    "minHeight": 400
})

app.onError(fn(err)
    print("[ERROR] " + err)
end)

app.onReady(fn()
    # ── Native Context Menu ──────────────────────────────────
    let ctxMenu = webview.menuCreate("Main Menu")
    webview.menuAddItem(ctxMenu, "Show Notification", fn()
        webview.notificationShow("Menu Action", "Triggered from context menu!", "", True)
    end)
    webview.menuAddSeparator(ctxMenu)

    let viewSub = webview.menuCreateSubmenu(ctxMenu, "View")
    webview.menuAddItem(viewSub, "Fullscreen Hint", fn()
        webview.showMessageBox({"type": "info", "title": "Hint",
            "message": "Press F11 for fullscreen (not yet implemented)"})
    end)

    webview.menuAddSeparator(ctxMenu)
    webview.menuAddItem(ctxMenu, "Quit", fn() app.quit() end)

    # ── System Tray ──────────────────────────────────────────
    let tray = Null
    try
        tray = webview.trayCreate("Djazair Suite", "")
        webview.traySetTooltip(tray, "Djazair Desktop Suite")
    catch err
        print("Tray not available: " + err)
    end

    # ── Bridge Handlers ──────────────────────────────────────
    app.bridge.on("showContextMenu", fn(d)
        webview.menuPopup(app.window._handle, ctxMenu)
        return True
    end)

    app.bridge.on("dialogMessage", fn(d)
        return webview.showMessageBox({
            "type": d["type"],
            "title": d["title"],
            "message": d["message"],
            "buttons": d["buttons"]
        })
    end)

    app.bridge.on("dialogOpenFile", fn(d)
        return webview.showOpenFileDialog({
            "title": d["title"],
            "filters": d["filters"]
        })
    end)

    app.bridge.on("getWindowInfo", fn(d)
        return {
            "title": app.window.title(),
            "size": app.window.getSize(),
            "position": app.window.getPosition(),
            "zoom": app.window.zoomLevel(),
            "visible": app.window.isVisible(),
            "maximized": app.window.isMaximized(),
            "url": app.window.getUrl()
        }
    end)

    # ── UI ───────────────────────────────────────────────────
    app.window.setHtml(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: 'Segoe UI', -apple-system, sans-serif;
                    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
                    color: #e2e8f0; min-height: 100vh;
                    display: flex; align-items: center; justify-content: center;
                    user-select: none;
                }
                .card {
                    background: rgba(255,255,255,0.05);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255,255,255,0.1);
                    padding: 48px; border-radius: 20px;
                    text-align: center; max-width: 520px; width: 90%;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                }
                h1 {
                    background: linear-gradient(135deg, #a78bfa, #38bdf8);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    font-size: 2.8rem; margin-bottom: 8px;
                }
                p { color: #94a3b8; margin-bottom: 24px; font-size: 15px; }
                .row { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
                button {
                    background: rgba(255,255,255,0.08);
                    border: 1px solid rgba(255,255,255,0.12);
                    color: #e2e8f0; padding: 12px 20px; border-radius: 10px;
                    cursor: pointer; font-size: 14px; font-weight: 500;
                    transition: all 0.25s ease; flex: 1; min-width: 120px;
                }
                button:hover { background: rgba(255,255,255,0.15); transform: translateY(-2px); }
                button.accent { background: linear-gradient(135deg, #8b5cf6, #3b82f6); border: none; }
                button.accent:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(139,92,246,0.3); }
                button.danger { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.3); }
                #info { margin-top: 20px; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 8px; font-family: monospace; font-size: 13px; color: #38bdf8; word-break: break-all; }
            </style>
        </head>
        <body oncontextmenu='event.preventDefault(); window.djazair.invoke("showContextMenu")'>
            <div class='card'>
                <h1>Djazair Suite</h1>
                <p>Right-click anywhere for native context menu.</p>
                <div class='row'>
                    <button onclick='showInfo()'>Info Dialog</button>
                    <button onclick='showWarning()'>Warning</button>
                    <button onclick='showError()'>Error</button>
                </div>
                <div class='row' style='margin-top:8px'>
                    <button onclick='pickFile()'>Open File</button>
                    <button onclick='saveFile()'>Save File</button>
                    <button onclick='pickFolder()'>Pick Folder</button>
                </div>
                <div class='row' style='margin-top:8px'>
                    <button class='accent' onclick='getInfo()'>Window Info</button>
                    <button class='danger' onclick='quit()'>Quit</button>
                </div>
                <div id='info'>Ready.</div>
            </div>
            <script>
                var info = document.getElementById('info');
                function setInfo(msg) { info.innerText = msg; }

                async function showInfo() {
                    var r = await window.djazair.invoke('dialogMessage', {type:'info', title:'Info', message:'This is an information dialog.', buttons:'ok'});
                    setInfo('Result: ' + r);
                }
                async function showWarning() {
                    var r = await window.djazair.invoke('dialogMessage', {type:'warning', title:'Warning', message:'Are you sure?', buttons:'yes-no'});
                    setInfo('Result: ' + r);
                }
                async function showError() {
                    var r = await window.djazair.invoke('dialogMessage', {type:'error', title:'Error', message:'Something went wrong.', buttons:'ok-cancel'});
                    setInfo('Result: ' + r);
                }
                async function pickFile() {
                    var r = await window.djazair.invoke('dialogOpenFile', {title:'Select File', filters:[{name:'All Files', extensions:['*']}]});
                    setInfo(r ? 'Selected: ' + r : 'Cancelled');
                }
                async function saveFile() {
                    var r = await window.djazair.invoke('dialogMessage', {type:'info', title:'Save', message:'Save dialog would open here.', buttons:'ok'});
                }
                async function pickFolder() {
                    var r = await window.djazair.invoke('dialogMessage', {type:'info', title:'Folder', message:'Folder picker would open.', buttons:'ok'});
                }
                async function getInfo() {
                    var r = await window.djazair.invoke('getWindowInfo');
                    setInfo(JSON.stringify(r, null, 2));
                }
                async function quit() {
                    var r = await window.djazair.invoke('dialogMessage', {type:'question', title:'Quit', message:'Are you sure you want to quit?', buttons:'yes-no'});
                    if (r === 'yes') { window.djazair.invoke('quit'); }
                }
            </script>
        </body>
        </html>
    `)

    # Add quit handler exposed via bridge
    app.bridge.on("quit", fn(d)
        app.quit()
        return True
    end)
end)

app.run()
```

---

## API Reference Summary

### App Methods

| Method | Description |
|--------|-------------|
| `run()` | Start the event loop (blocks) |
| `quit()` | Cleanly exit the application |
| `close()` | Close the current window |
| `isValid()` | Check if window is still open |
| `onReady(cb)` | Register ready callback |
| `onQuit(cb)` | Register quit callback |
| `onError(cb)` | Register error callback |
| `setDebug(bool)` | Toggle DevTools at runtime |

### Window Methods

| Method | Description |
|--------|-------------|
| `setTitle(t)` / `title()` | Set/get window title |
| `setSize(w,h)` / `getSize()` | Set/get window size |
| `setPosition(x,y)` / `getPosition()` | Set/get window position |
| `show()` / `hide()` | Show/hide window |
| `minimize()` / `maximize()` / `restore()` | Window state |
| `focus()` | Bring window to front |
| `isMaximized()` / `isMinimized()` / `isVisible()` | State queries |
| `setResizable(bool)` | Toggle resize capability |
| `setMinimumSize(w,h)` / `setMaximumSize(w,h)` | Size constraints |
| `setBackgroundColor(r,g,b,a)` | Set webview background |
| `navigate(url)` | Load URL or local file |
| `setHtml(html)` | Load raw HTML |
| `eval(js)` | Execute JavaScript |
| `initJs(js)` | Inject JS before page scripts |
| `reload()` / `goBack()` / `goForward()` | Navigation |
| `canGoBack()` / `canGoForward()` | History check |
| `setZoomLevel(l)` / `zoomLevel()` | Zoom control |
| `openDevTools()` | Open DevTools window |
| `getUrl()` | Current page URL |
| `setContextMenuEnabled(bool)` | Toggle right-click menu |
| `isLoaded()` | Check if page loaded |
| `onClose(cb)` / `onMove(cb)` / `onResize(cb)` | Event callbacks |
| `onFocus(cb)` / `onBlur(cb)` | Focus events |
| `onMaximize(cb)` / `onMinimize(cb)` / `onRestore(cb)` | State events |
| `onNavigate(cb)` / `onTitleChange(cb)` / `onLoad(cb)` | Content events |

### Bridge Methods

| Method | Description |
|--------|-------------|
| `bridge.on(channel, handler)` | Register Djazair handler for JS invoke |
| `bridge.send(channel, data)` | Push event to JS listeners |
| `bridge.invoke(jsCode)` | Evaluate JS from Djazair |
| `bridge.expose(name, handler)` | Expose function on `window[name]` |

### JS Frontend API (`window.djazair`)

| Method | Description |
|--------|-------------|
| `djazair.invoke(channel, data)` | Call Djazair handler, returns Promise |
| `djazair.on(channel, callback)` | Listen for Djazair push events |
| `djazair.off(channel, callback?)` | Remove listener(s) |

### Dialogs

| Function | Description |
|----------|-------------|
| `showMessageBox(options)` | Native message dialog |
| `showOpenFileDialog(options)` | File open dialog (single or multi) |
| `showSaveFileDialog(options)` | Save file dialog |
| `showOpenFolderDialog(options)` | Folder picker |
| `showColorPicker(options)` | Color picker dialog |

### Menus & Tray & Notifications

| Function | Description |
|----------|-------------|
| `menuCreate(label)` | Create popup menu |
| `menuAddItem(menu, label, cb)` | Add menu item |
| `menuAddSeparator(menu)` | Add divider |
| `menuCreateSubmenu(menu, label)` | Create submenu |
| `menuPopup(windowHandle, menu)` | Show menu at cursor |
| `trayCreate(label, iconPath)` | Create tray icon |
| `traySetTooltip(handle, text)` | Set tray hover text |
| `trayShowBalloon(handle, title, msg, timeout)` | Show balloon |
| `trayDestroy(handle)` | Remove tray icon |
| `notificationShow(title, msg, subtitle, sound, icon, timeout)` | System toast |
| `protocolRegister(scheme, handler)` | Register custom protocol |

### Logging

| Function | Description |
|----------|-------------|
| `setLogLevel(level)` | Set log level (none/error/warn/info/debug) |
| `setLogColors(bool)` | Toggle ANSI colors |
| `setLogFile(path)` | Log to file |
| `setLogTimeFormat(pattern)` | Set timestamp format |
| `log(message, level?)` | Convenience logging |
