# Djazair WebView Desktop Applications

This directory contains desktop applications built using the **Djazair WebView extension**.

## 🌐 About the WebView Extension

The WebView extension allows you to build modern desktop graphical user interfaces (GUIs) using web technologies (HTML, CSS, and JavaScript) rendered inside a native OS web view component, powered by a Djazair C++ backend.

By using this extension in Djazair, you can:
* Design rich, responsive UIs with HTML/CSS.
* Interoperate between frontend JS and backend Djazair via a native IPC bridge.
* Build desktop shell applications with native OS features.
* Create lightweight, multi-window desktop tools.

---

## ⚡ How to Run

### 1. Prerequisites
Make sure you have the Djazair interpreter and the `webview` extension installed:
```bash
# Install the webview package
dpm install webview

# Compile the native webview binaries (requires GCC/MinGW)
dpm build webview
```

### 2. Launching an Application
To run any application in this folder, execute its main script with the `djazair` runner.

**Usage:**
```bash
djazair webview_apps/<app_folder>/<main_file>.dz
```

**Example:**
```bash
djazair webview_apps/<app_folder>/<main_file>.dz
```
