# Djazair WebView Desktop Applications

This directory contains desktop applications built using the **Djazair WebView extension**. These applications utilize a modern frontend (HTML, CSS, and JavaScript) rendered inside a native OS web view component, combined with a native **Djazair** backend in C++.

## 📂 Included Applications

### 1. 🍅 Pomodoro App (`pomodoro_app/`)
A clean, desktop Pomodoro timer app designed to boost productivity.
* **Frontend**: HTML5, CSS3, and JavaScript timer interface.
* **Backend**: Djazair script (`main.dz`) handling IPC events, timer state, and database persistence.
* **Database**: Uses `sqlite` to save work session statistics locally.

### 2. 📊 System Dashboard (`system_dashboard/`)
A real-time hardware resource and system dashboard.
* **Frontend**: Beautiful dark-themed HTML layout displaying dials, graphs, and performance charts.
* **Backend**: Djazair script (`main.dz`) querying system metrics (CPU usage, RAM allocation, OS details) and bridging them to the frontend via WebView's IPC messaging.

---

## ⚡ How to Run

### Prerequisites
Make sure you have installed the native `webview` and `sqlite` extensions:
```bash
dpm install webview
dpm install sqlite

dpm build webview
dpm build sqlite
```

### Launching the Apps

#### To run the Pomodoro App:
```bash
djazair webview_apps/pomodoro_app/main.dz
```

#### To run the System Dashboard:
```bash
djazair webview_apps/system_dashboard/main.dz
```
