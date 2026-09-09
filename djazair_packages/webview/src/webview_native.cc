/**
 * @file webview_native.cc
 * @brief Webview Desktop Framework native module for Djazair Programming Language
 * @author Harizi Riyadh (hariziriyadh@gmail.com)
 * @copyright Copyright (c) 2026 Djazair Language Project
 *
 * Implements high-performance desktop WebView integration powered by Microsoft WebView2 on Windows,
 * WebKitGTK on Linux, and Cocoa/WebKit on macOS. Provides seamless bidirectional IPC bridging,
 * window lifecycle management, dialogs, menus, and system tray integration.
 */

#include <string.h>
#include <stdlib.h>
#include <string>
#include <mutex>
#include <unordered_map>
#include <vector>
#include <algorithm>

extern "C" {
#include "djazair_api.h"
}

#if defined(__APPLE__)
    #include <TargetConditionals.h>
    #include <objc/objc.h>
    #include <objc/message.h>
    #include <objc/runtime.h>
    #include <CoreFoundation/CoreFoundation.h>
#elif defined(__linux__)
    #include <gtk/gtk.h>
#elif defined(_WIN32)
    #include <windows.h>
    #include <dwmapi.h>
    #include <shlobj.h>
    #include <shellapi.h>
    #include <commdlg.h>
#endif

#define WEBVIEW_IMPLEMENTATION
#include "webview.h"

// ---------------------------------------------------------------------------
// Context Structures
// ---------------------------------------------------------------------------

struct WindowContext {
    webview::webview* wv;
    djazairVM*        vm;
    Value             dispatcher;
    Value             close_callback;
    Value             error_callback;
    Value             move_callback;
    Value             resize_callback;
    Value             focus_callback;
    Value             blur_callback;
    Value             maximize_callback;
    Value             minimize_callback;
    Value             restore_callback;
    Value             navigate_callback;
    Value             title_callback;
    Value             load_callback;
    int               id;
    std::string       current_url;
    double            zoom_level;
    bool              has_navigated;
    bool              can_go_forward;
    bool              is_fullscreen;
    std::vector<int>  menu_items;

#if defined(WEBVIEW_PLATFORM_WINDOWS)
    WINDOWPLACEMENT   saved_placement;
    LONG              saved_style;
    LONG              saved_exstyle;
    WNDPROC           original_wndproc;
    HICON             last_icon_small;
    HICON             last_icon_big;
#endif

    WindowContext()
        : wv(nullptr), vm(nullptr)
        , dispatcher(NULL_VAL), close_callback(NULL_VAL), error_callback(NULL_VAL)
        , move_callback(NULL_VAL), resize_callback(NULL_VAL)
        , focus_callback(NULL_VAL), blur_callback(NULL_VAL)
        , maximize_callback(NULL_VAL), minimize_callback(NULL_VAL), restore_callback(NULL_VAL)
        , navigate_callback(NULL_VAL), title_callback(NULL_VAL), load_callback(NULL_VAL)
        , id(0), zoom_level(1.0), has_navigated(false), can_go_forward(false), is_fullscreen(false)
#if defined(WEBVIEW_PLATFORM_WINDOWS)
        , saved_style(0), saved_exstyle(0)
        , original_wndproc(nullptr)
        , last_icon_small(nullptr), last_icon_big(nullptr)
#endif
    {}
};

#if defined(WEBVIEW_PLATFORM_WINDOWS)
#define WM_TRAYICON_MSG (WM_USER + 105)

struct TrayContext {
    int         id;
    HWND        hwnd;
    HICON       hicon;
    HMENU       hmenu;
    std::string tooltip;
    bool        active;
};
#endif

// ---------------------------------------------------------------------------
// Global Registries & Thread Safety
// ---------------------------------------------------------------------------

static std::mutex g_ctx_mtx;
static std::unordered_map<int, WindowContext*> g_contexts;
static int g_next_id = 100;

static std::mutex g_menu_mtx;
static std::unordered_map<int, Value> g_menu_callbacks;
static int g_next_menu_id = 1000;

#if defined(WEBVIEW_PLATFORM_WINDOWS)
static std::mutex g_tray_mtx;
static std::unordered_map<int, TrayContext*> g_trays;
static int g_next_tray_id = 500;
static HANDLE g_single_instance_mutex = NULL;

/**
 * @brief Converts a UTF-8 encoded string to a Windows wide string (UTF-16).
 */
static std::wstring utf8_to_wide(const char* utf8_str) {
    if (!utf8_str || !*utf8_str) return std::wstring();
    int len = MultiByteToWideChar(CP_UTF8, 0, utf8_str, -1, NULL, 0);
    if (len <= 1) return std::wstring();
    std::wstring wstr(len - 1, L'\0');
    MultiByteToWideChar(CP_UTF8, 0, utf8_str, -1, &wstr[0], len);
    return wstr;
}

struct FocusTarget {
    std::wstring title;
    HWND foundHwnd;
};

static BOOL CALLBACK EnumWindowsFocusProc(HWND hwnd, LPARAM lParam) {
    FocusTarget* target = (FocusTarget*)lParam;
    if (!IsWindowVisible(hwnd)) return TRUE;
    wchar_t windowTitle[512];
    int len = GetWindowTextW(hwnd, windowTitle, 512);
    if (len > 0) {
        if (wcsstr(windowTitle, target->title.c_str()) != NULL) {
            target->foundHwnd = hwnd;
            return FALSE;
        }
    }
    return TRUE;
}
#endif

// ---------------------------------------------------------------------------
// Isolated GC Root Management
// ---------------------------------------------------------------------------

/**
 * @brief Retrieves the native _webview module instance from the VM's nativeModules table.
 * Used to store protected callback references in module->globals instead of polluting vm->builtins.
 */
static ObjModule* get_webview_module(djazairVM* vm) {
    if (!vm) return nullptr;
    Value mod_val = NULL_VAL;
    ObjString* mod_name = copyString(vm, "_webview", 8);
    push(vm, OBJ_VAL(mod_name));
    bool found = tableGet(vm, &vm->nativeModules, OBJ_VAL(mod_name), &mod_val);
    pop(vm);
    if (found && IS_MODULE(mod_val)) {
        return AS_MODULE(mod_val);
    }
    return nullptr;
}

static std::string gc_key(const char* prefix, int id) {
    return std::string(prefix) + "_" + std::to_string(id);
}

static void gc_protect(djazairVM* vm, const char* key, int key_len, Value val) {
    if (!vm || IS_NULL(val)) return;
    ObjModule* mod = get_webview_module(vm);
    Table* target_table = mod ? &mod->globals : &vm->globals;
    ObjString* k = copyString(vm, key, key_len);
    push(vm, OBJ_VAL(k));
    tableSet(vm, target_table, OBJ_VAL(k), val);
    pop(vm);
}

static void gc_unprotect(djazairVM* vm, const char* key, int key_len) {
    if (!vm) return;
    ObjModule* mod = get_webview_module(vm);
    Table* target_table = mod ? &mod->globals : &vm->globals;
    ObjString* k = copyString(vm, key, key_len);
    push(vm, OBJ_VAL(k));
    tableDelete(vm, target_table, OBJ_VAL(k));
    pop(vm);
}

// ---------------------------------------------------------------------------
// Safe Callback Invocations (VM Stack Discipline)
// ---------------------------------------------------------------------------

static void invoke_callback_0(WindowContext* c, Value cb) {
    if (c && c->vm && !IS_NULL(cb)) {
        djazairVM* vm = c->vm;
        push(vm, cb);
        int savedFC = vm->frameCount;
        if (!callValue(vm, cb, 0)) {
            if (!vm->exceptionCaught) { pop(vm); }
            return;
        }
        if (vm->frameCount > savedFC) {
            if (run(vm, savedFC) != DJAZAIR_OK) {
                return;
            }
        }
        if (vm->stackTop > vm->stack) {
            pop(vm);
        }
    }
}

static void invoke_callback_2(WindowContext* c, Value cb, double a, double b) {
    if (c && c->vm && !IS_NULL(cb)) {
        djazairVM* vm = c->vm;
        push(vm, cb);
        push(vm, djazair_float(a));
        push(vm, djazair_float(b));
        int savedFC = vm->frameCount;
        if (!callValue(vm, cb, 2)) {
            if (!vm->exceptionCaught) { pop(vm); pop(vm); pop(vm); }
            return;
        }
        if (vm->frameCount > savedFC) {
            if (run(vm, savedFC) != DJAZAIR_OK) {
                return;
            }
        }
        if (vm->stackTop > vm->stack) {
            pop(vm);
        }
    }
}

static void invoke_callback_str(WindowContext* c, Value cb, const char* text) {
    if (c && c->vm && !IS_NULL(cb)) {
        djazairVM* vm = c->vm;
        push(vm, cb);
        push(vm, djazair_str(vm, text ? text : ""));
        int savedFC = vm->frameCount;
        if (!callValue(vm, cb, 1)) {
            if (!vm->exceptionCaught) { pop(vm); pop(vm); }
            return;
        }
        if (vm->frameCount > savedFC) {
            if (run(vm, savedFC) != DJAZAIR_OK) {
                return;
            }
        }
        if (vm->stackTop > vm->stack) {
            pop(vm);
        }
    }
}

// ---------------------------------------------------------------------------
// Platform Window Proc & Message Hooking (Windows)
// ---------------------------------------------------------------------------

#if defined(WEBVIEW_PLATFORM_WINDOWS)
static HWND get_hwnd(webview::webview* wv) {
    return (HWND)webview_get_window((webview_t)wv);
}

static void pump_windows_messages() {
    MSG msg;
    while (PeekMessageW(&msg, nullptr, 0, 0, PM_REMOVE)) {
        TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }
}

static void menu_handle_command(WindowContext* c, int item_id);

static LRESULT CALLBACK WebviewWndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    WindowContext* c = nullptr;
    {
        std::lock_guard<std::mutex> lock(g_ctx_mtx);
        for (auto& pair : g_contexts) {
            if (pair.second->wv && (HWND)webview_get_window((webview_t)pair.second->wv) == hwnd) {
                c = pair.second;
                break;
            }
        }
    }
    if (!c) return DefWindowProcW(hwnd, msg, wParam, lParam);

    switch (msg) {
        case WM_CLOSE:
            if (!IS_NULL(c->close_callback)) {
                c->wv->dispatch([c]() {
                    invoke_callback_0(c, c->close_callback);
                });
                return 0; // Managed by Djazair close handler
            }
            break;

        case WM_MOVE:
            c->wv->dispatch([c, lParam]() {
                invoke_callback_2(c, c->move_callback, (double)(short)LOWORD(lParam), (double)(short)HIWORD(lParam));
            });
            break;

        case WM_SIZE:
            c->wv->dispatch([c, lParam]() {
                invoke_callback_2(c, c->resize_callback, (double)LOWORD(lParam), (double)HIWORD(lParam));
            });
            break;

        case WM_SETFOCUS:
            c->wv->dispatch([c]() { invoke_callback_0(c, c->focus_callback); });
            break;

        case WM_KILLFOCUS:
            c->wv->dispatch([c]() { invoke_callback_0(c, c->blur_callback); });
            break;

        case WM_COMMAND:
            if (lParam == 0) {
                menu_handle_command(c, (int)LOWORD(wParam));
            }
            break;

        case WM_SYSCOMMAND:
            switch (wParam & 0xFFF0) {
                case SC_MAXIMIZE:
                    c->wv->dispatch([c]() { invoke_callback_0(c, c->maximize_callback); });
                    break;
                case SC_MINIMIZE:
                    c->wv->dispatch([c]() { invoke_callback_0(c, c->minimize_callback); });
                    break;
                case SC_RESTORE:
                    c->wv->dispatch([c]() { invoke_callback_0(c, c->restore_callback); });
                    break;
            }
            break;
    }

    if (c->original_wndproc) {
        return CallWindowProcW(c->original_wndproc, hwnd, msg, wParam, lParam);
    }
    return DefWindowProcW(hwnd, msg, wParam, lParam);
}

static void hook_window_proc(WindowContext* c) {
    if (!c || !c->wv) return;
    HWND hwnd = get_hwnd(c->wv);
    if (!hwnd) return;
    c->original_wndproc = (WNDPROC)SetWindowLongPtrW(hwnd, GWLP_WNDPROC, (LONG_PTR)WebviewWndProc);
}
#else
static void hook_window_proc(WindowContext*) {}
#endif

// ---------------------------------------------------------------------------
// JSON Serialization for IPC Bridge
// ---------------------------------------------------------------------------

static std::string json_escape_string(const std::string& raw) {
    std::string escaped;
    escaped.reserve(raw.size() + 2);
    for (unsigned char c : raw) {
        if (c == '"') escaped += "\\\"";
        else if (c == '\\') escaped += "\\\\";
        else if (c == '\n') escaped += "\\n";
        else if (c == '\r') escaped += "\\r";
        else if (c == '\t') escaped += "\\t";
        else escaped += c;
    }
    return "\"" + escaped + "\"";
}

static std::string value_to_json_result(djazairVM *vm, Value value) {
    if (IS_NULL(value)) return "null";
    if (IS_BOOL(value)) return AS_BOOL(value) ? "true" : "false";
    if (IS_NUMBER(value)) {
        char buf[64];
        snprintf(buf, sizeof(buf), "%.17g", AS_NUMBER(value));
        return std::string(buf);
    }
    if (IS_STRING(value)) {
        std::string raw = AS_CSTRING(value);
        bool is_json = !raw.empty() && (
            raw.front() == '{' || raw.front() == '[' || raw.front() == '"' ||
            raw == "null" || raw == "true" || raw == "false" ||
            (raw.front() >= '0' && raw.front() <= '9') || raw.front() == '-'
        );
        return is_json ? raw : json_escape_string(raw);
    }
    char *text = valueToCString(vm, value);
    std::string result = text ? json_escape_string(text) : "null";
    free(text);
    return result;
}

#define GET_WINDOW(idx) \
    int g_win_id = (int)AS_NUMBER(args[idx]); \
    WindowContext* wc = nullptr; \
    { \
        std::lock_guard<std::mutex> lock(g_ctx_mtx); \
        auto g_win_it = g_contexts.find(g_win_id); \
        if (g_win_it == g_contexts.end()) return djazair_null(); \
        wc = g_win_it->second; \
    } \
    if (!wc || !wc->wv) return djazair_null()

// ===========================================================================
// APP LIFECYCLE API
// ===========================================================================

extern "C" DJAZAIR_FUNC(nativeAppRun) {
    djazair_check_args(0, argCount);
    WindowContext* active_ctx = nullptr;
    {
        std::lock_guard<std::mutex> lock(g_ctx_mtx);
        if (!g_contexts.empty()) {
            active_ctx = g_contexts.begin()->second;
        }
    }
    if (active_ctx && active_ctx->wv) {
        active_ctx->wv->run();
    }
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeAppQuit) {
    djazair_check_args(0, argCount);
    std::vector<webview::webview*> all_wv;
    {
        std::lock_guard<std::mutex> lock(g_ctx_mtx);
        for (auto &pair : g_contexts) {
            if (pair.second->wv) all_wv.push_back(pair.second->wv);
        }
    }
    for (auto* wv : all_wv) {
        if (wv) wv->terminate();
    }
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    if (g_single_instance_mutex != NULL) {
        CloseHandle(g_single_instance_mutex);
        g_single_instance_mutex = NULL;
    }
    PostQuitMessage(0);
#endif
    return djazair_null();
}

/**
 * @brief Requests a single-instance application lock via a Named Mutex on Windows.
 *
 * @param vm Active Djazair VM instance.
 * @param argCount Must be 1 (app identifier string).
 * @param args Stack pointer.
 * @return Value BOOL_VAL indicating whether this process successfully acquired the lock.
 */
extern "C" DJAZAIR_FUNC(nativeAppRequestSingleInstanceLock) {
    djazair_check_args(1, argCount);
    djazair_check_str(0);
    const char* app_id = AS_CSTRING(args[0]);

#if defined(WEBVIEW_PLATFORM_WINDOWS)
    if (g_single_instance_mutex != NULL) {
        // Already holding lock in current process
        return djazair_bool(true);
    }

    std::wstring sanitized_id;
    for (const char* p = app_id; *p; ++p) {
        if ((*p >= 'a' && *p <= 'z') || (*p >= 'A' && *p <= 'Z') || (*p >= '0' && *p <= '9') || *p == '_' || *p == '-') {
            sanitized_id += (wchar_t)*p;
        } else {
            sanitized_id += L'_';
        }
    }

    std::wstring mutex_name = L"Local\\DjazairApp_" + sanitized_id;
    HANDLE hMutex = CreateMutexW(NULL, TRUE, mutex_name.c_str());
    if (hMutex == NULL || GetLastError() == ERROR_ALREADY_EXISTS) {
        if (hMutex != NULL) {
            CloseHandle(hMutex);
        }
        return djazair_bool(false);
    }

    g_single_instance_mutex = hMutex;
    return djazair_bool(true);
#else
    (void)app_id;
    return djazair_bool(true);
#endif
}

/**
 * @brief Finds and brings to the foreground an existing running instance of the application window.
 *
 * @param vm Active Djazair VM instance.
 * @param argCount Must be 1 (window title or identifier string).
 * @param args Stack pointer.
 * @return Value BOOL_VAL indicating whether an existing window was successfully found and focused.
 */
extern "C" DJAZAIR_FUNC(nativeAppFocusExistingInstance) {
    djazair_check_args(1, argCount);
    djazair_check_str(0);
    const char* title = AS_CSTRING(args[0]);

#if defined(WEBVIEW_PLATFORM_WINDOWS)
    std::wstring w_title = utf8_to_wide(title);
    HWND hwnd = FindWindowW(NULL, w_title.c_str());
    if (!hwnd && !w_title.empty()) {
        FocusTarget target = { w_title, NULL };
        EnumWindows(EnumWindowsFocusProc, (LPARAM)&target);
        hwnd = target.foundHwnd;
    }
    if (hwnd) {
        if (IsIconic(hwnd)) {
            ShowWindow(hwnd, SW_RESTORE);
        } else {
            ShowWindow(hwnd, SW_SHOW);
        }
        SetForegroundWindow(hwnd);
        SetFocus(hwnd);
        return djazair_bool(true);
    }
#else
    (void)title;
#endif
    return djazair_bool(false);
}

// ===========================================================================
// WINDOW CREATION & LIFECYCLE
// ===========================================================================

extern "C" DJAZAIR_FUNC(nativeWindowCreate) {
    djazair_check_args(12, argCount);
    djazair_check_str(0); djazair_check_num(1); djazair_check_num(2);
    djazair_check_num(3); djazair_check_num(4);
    djazair_check_bool(5); djazair_check_bool(6);
    djazair_check_num(7); djazair_check_num(8);
    djazair_check_num(9); djazair_check_num(10);
    djazair_check_bool(11);

    const char *title = AS_CSTRING(args[0]);
    int width = (int)AS_NUMBER(args[1]);
    int height = (int)AS_NUMBER(args[2]);
    bool frameless = AS_BOOL(args[5]);
    bool resizable = AS_BOOL(args[6]);
    int min_w = (int)AS_NUMBER(args[7]);
    int min_h = (int)AS_NUMBER(args[8]);
    int max_w = (int)AS_NUMBER(args[9]);
    int max_h = (int)AS_NUMBER(args[10]);
    bool debug = AS_BOOL(args[11]);

    auto c = new WindowContext();
    c->id = g_next_id++;
    c->vm = vm;

    try {
        c->wv = new webview::webview(debug, nullptr);
    } catch (...) {
        delete c;
        return djazair_null();
    }

#if defined(WEBVIEW_PLATFORM_WINDOWS)
    pump_windows_messages();
    HWND hwnd_cr = get_hwnd(c->wv);
    if (hwnd_cr) {
        SetWindowPos(hwnd_cr, NULL, 0, 0, width > 0 ? width : 800,
                     height > 0 ? height : 600,
                     SWP_NOMOVE | SWP_NOZORDER | SWP_SHOWWINDOW);
        UpdateWindow(hwnd_cr);
        pump_windows_messages();
    }
#endif

    c->wv->set_title(title);
    c->wv->set_size(width, height, WEBVIEW_HINT_NONE);
    if (!resizable) c->wv->set_size(width, height, WEBVIEW_HINT_FIXED);

    if (frameless) {
#if defined(WEBVIEW_PLATFORM_WINDOWS)
        HWND hwnd = get_hwnd(c->wv);
        if (hwnd) {
            LONG style = GetWindowLongW(hwnd, GWL_STYLE);
            style &= ~(WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU);
            SetWindowLongW(hwnd, GWL_STYLE, style);
            SetWindowPos(hwnd, NULL, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
            pump_windows_messages();
        }
#elif defined(WEBVIEW_PLATFORM_LINUX)
        GtkWidget* gtk_win = GTK_WIDGET(webview_get_window((webview_t)c->wv));
        if (!gtk_widget_get_realized(gtk_win)) gtk_widget_realize(gtk_win);
        gtk_window_set_decorated(GTK_WINDOW(gtk_win), FALSE);
#endif
    }

    if (min_w > 0 && min_h > 0) c->wv->set_size(min_w, min_h, WEBVIEW_HINT_MIN);
    if (max_w > 0 && max_h > 0) c->wv->set_size(max_w, max_h, WEBVIEW_HINT_MAX);

    {
        std::lock_guard<std::mutex> lock(g_ctx_mtx);
        g_contexts[c->id] = c;
    }
    hook_window_proc(c);

    return djazair_int(c->id);
}

extern "C" DJAZAIR_FUNC(nativeWindowDestroy) {
    djazair_check_args(1, argCount);
    int id = (int)AS_NUMBER(args[0]);
    WindowContext* c = nullptr;
    {
        std::lock_guard<std::mutex> lock(g_ctx_mtx);
        auto it = g_contexts.find(id);
        if (it == g_contexts.end()) return djazair_null();
        c = it->second;
    }

#if defined(WEBVIEW_PLATFORM_WINDOWS)
    pump_windows_messages();
#endif

    if (c->wv) {
        c->wv->terminate();
        delete c->wv;
        c->wv = nullptr;
    }

#if defined(WEBVIEW_PLATFORM_WINDOWS)
    if (c->last_icon_small) { DestroyIcon(c->last_icon_small); c->last_icon_small = nullptr; }
    if (c->last_icon_big)   { DestroyIcon(c->last_icon_big);   c->last_icon_big   = nullptr; }
#endif

    auto gc_cleanup = [&](const char* prefix, Value val) {
        if (!IS_NULL(val)) {
            std::string k = gc_key(prefix, c->id);
            gc_unprotect(c->vm, k.c_str(), (int)k.length());
        }
    };
    gc_cleanup("__wv_disp", c->dispatcher);
    gc_cleanup("__wv_close", c->close_callback);
    gc_cleanup("__wv_move", c->move_callback);
    gc_cleanup("__wv_resize", c->resize_callback);
    gc_cleanup("__wv_focus", c->focus_callback);
    gc_cleanup("__wv_blur", c->blur_callback);
    gc_cleanup("__wv_max", c->maximize_callback);
    gc_cleanup("__wv_min", c->minimize_callback);
    gc_cleanup("__wv_restore", c->restore_callback);
    gc_cleanup("__wv_nav", c->navigate_callback);
    gc_cleanup("__wv_title", c->title_callback);
    gc_cleanup("__wv_load", c->load_callback);

    // Clean up menu items owned by this window
    {
        std::lock_guard<std::mutex> lock(g_menu_mtx);
        for (int item_id : c->menu_items) {
            auto it = g_menu_callbacks.find(item_id);
            if (it != g_menu_callbacks.end()) {
                std::string k = gc_key("__wv_mcb", item_id);
                gc_unprotect(c->vm, k.c_str(), (int)k.length());
                g_menu_callbacks.erase(it);
            }
        }
    }

    delete c;

    bool is_empty = false;
    {
        std::lock_guard<std::mutex> lock(g_ctx_mtx);
        g_contexts.erase(id);
        is_empty = g_contexts.empty();
    }

#if defined(WEBVIEW_PLATFORM_WINDOWS)
    if (is_empty) {
        PostQuitMessage(0);
    }
#endif

    return djazair_null();
}

// ===========================================================================
// WINDOW GEOMETRY & STATE
// ===========================================================================

extern "C" DJAZAIR_FUNC(nativeWindowSetVirtualHostMapping) {
    djazair_check_args(3, argCount);
    djazair_check_num(0);
    djazair_check_str(1);
    djazair_check_str(2);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    auto* controller = (ICoreWebView2Controller*)webview_get_native_handle((webview_t)wc->wv, WEBVIEW_NATIVE_HANDLE_KIND_BROWSER_CONTROLLER);
    if (controller) {
        ICoreWebView2* webview = nullptr;
        HRESULT hr = controller->get_CoreWebView2(&webview);
        if (SUCCEEDED(hr) && webview) {
            static const IID local_IID_ICoreWebView2_3 = {0xA0D6DF20,0x3B92,0x416D,{0xAA,0x0C,0x43,0x7A,0x9C,0x72,0x78,0x57}};
            ICoreWebView2_3* webview3 = nullptr;
            hr = webview->QueryInterface(local_IID_ICoreWebView2_3, (void**)&webview3);
            if (SUCCEEDED(hr) && webview3) {
                const char* host = AS_CSTRING(args[1]);
                const char* folder = AS_CSTRING(args[2]);

                int host_len = MultiByteToWideChar(CP_UTF8, 0, host, -1, NULL, 0);
                wchar_t* w_host = new wchar_t[host_len];
                MultiByteToWideChar(CP_UTF8, 0, host, -1, w_host, host_len);

                int folder_len = MultiByteToWideChar(CP_UTF8, 0, folder, -1, NULL, 0);
                wchar_t* w_folder = new wchar_t[folder_len];
                MultiByteToWideChar(CP_UTF8, 0, folder, -1, w_folder, folder_len);

                HRESULT map_hr = webview3->SetVirtualHostNameToFolderMapping(w_host, w_folder, COREWEBVIEW2_HOST_RESOURCE_ACCESS_KIND_ALLOW);

                delete[] w_host;
                delete[] w_folder;
                webview3->Release();
                webview->Release();

                if (SUCCEEDED(map_hr)) {
                    return djazair_bool(true);
                }
            } else {
                webview->Release();
            }
        }
    }
#endif
    return djazair_bool(false);
}

extern "C" DJAZAIR_FUNC(nativeWindowSetTitle) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    pump_windows_messages();
#endif
    if (djazair_is_string(args[1])) wc->wv->set_title(AS_CSTRING(args[1]));
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowGetTitle) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    HWND hwnd = get_hwnd(wc->wv);
    int len = GetWindowTextLengthW(hwnd);
    if (len == 0) return djazair_str(vm, "");
    std::wstring wbuf(len + 1, L'\0');
    GetWindowTextW(hwnd, &wbuf[0], len + 1);
    int utf8_len = WideCharToMultiByte(CP_UTF8, 0, wbuf.c_str(), len, nullptr, 0, nullptr, nullptr);
    std::string utf8_buf(utf8_len, '\0');
    WideCharToMultiByte(CP_UTF8, 0, wbuf.c_str(), len, &utf8_buf[0], utf8_len, nullptr, nullptr);
    return djazair_str(vm, utf8_buf.c_str());
#elif defined(WEBVIEW_PLATFORM_LINUX)
    const gchar *title = gtk_window_get_title(GTK_WINDOW(webview_get_window((webview_t)wc->wv)));
    return djazair_str(vm, title ? title : "");
#else
    return djazair_str(vm, "");
#endif
}

extern "C" DJAZAIR_FUNC(nativeWindowSetSize) {
    djazair_check_args(3, argCount);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    pump_windows_messages();
#endif
    if (djazair_is_number(args[1]) && djazair_is_number(args[2]))
        wc->wv->set_size((int)AS_NUMBER(args[1]), (int)AS_NUMBER(args[2]), WEBVIEW_HINT_NONE);
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowGetSize) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
    int w = 0, h = 0;
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    HWND hwnd = get_hwnd(wc->wv);
    RECT r;
    GetClientRect(hwnd, &r);
    w = (int)(r.right - r.left); h = (int)(r.bottom - r.top);
#elif defined(WEBVIEW_PLATFORM_LINUX)
    gtk_window_get_size(GTK_WINDOW(webview_get_window((webview_t)wc->wv)), &w, &h);
#endif
    Value arr = djazair_new_array(vm);
    djazair_array_push(vm, arr, djazair_int(w));
    djazair_array_push(vm, arr, djazair_int(h));
    return arr;
}

extern "C" DJAZAIR_FUNC(nativeWindowSetPosition) {
    djazair_check_args(3, argCount);
    GET_WINDOW(0);
    if (djazair_is_number(args[1]) && djazair_is_number(args[2])) {
#if defined(WEBVIEW_PLATFORM_WINDOWS)
        pump_windows_messages();
        HWND hwnd = get_hwnd(wc->wv);
        SetWindowPos(hwnd, NULL, (int)AS_NUMBER(args[1]), (int)AS_NUMBER(args[2]), 0, 0, SWP_NOSIZE | SWP_NOZORDER);
#elif defined(WEBVIEW_PLATFORM_LINUX)
        gtk_window_move(GTK_WINDOW(webview_get_window((webview_t)wc->wv)), (int)AS_NUMBER(args[1]), (int)AS_NUMBER(args[2]));
#endif
    }
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowGetPosition) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
    int x = 0, y = 0;
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    HWND hwnd = get_hwnd(wc->wv);
    RECT r;
    GetWindowRect(hwnd, &r);
    x = (int)r.left; y = (int)r.top;
#elif defined(WEBVIEW_PLATFORM_LINUX)
    gtk_window_get_position(GTK_WINDOW(webview_get_window((webview_t)wc->wv)), &x, &y);
#endif
    Value arr = djazair_new_array(vm);
    djazair_array_push(vm, arr, djazair_int(x));
    djazair_array_push(vm, arr, djazair_int(y));
    return arr;
}

extern "C" DJAZAIR_FUNC(nativeWindowMinimize) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    pump_windows_messages();
    ShowWindow(get_hwnd(wc->wv), SW_MINIMIZE);
#elif defined(WEBVIEW_PLATFORM_DARWIN)
    id win = (id)webview_get_window((webview_t)wc->wv);
    objc_msgSend(win, sel_getUid("miniaturize:"), nil);
#elif defined(WEBVIEW_PLATFORM_LINUX)
    gtk_window_iconify(GTK_WINDOW(webview_get_window((webview_t)wc->wv)));
#endif
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowMaximize) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    pump_windows_messages();
    ShowWindow(get_hwnd(wc->wv), SW_MAXIMIZE);
    wc->wv->dispatch([wc]() { invoke_callback_0(wc, wc->maximize_callback); });
#elif defined(WEBVIEW_PLATFORM_DARWIN)
    id win = (id)webview_get_window((webview_t)wc->wv);
    objc_msgSend(win, sel_getUid("zoom:"), nil);
#elif defined(WEBVIEW_PLATFORM_LINUX)
    gtk_window_maximize(GTK_WINDOW(webview_get_window((webview_t)wc->wv)));
#endif
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowRestore) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    pump_windows_messages();
    ShowWindow(get_hwnd(wc->wv), SW_RESTORE);
#elif defined(WEBVIEW_PLATFORM_DARWIN)
    id win = (id)webview_get_window((webview_t)wc->wv);
    objc_msgSend(win, sel_getUid("deminiaturize:"), nil);
#elif defined(WEBVIEW_PLATFORM_LINUX)
    gtk_window_unfullscreen(GTK_WINDOW(webview_get_window((webview_t)wc->wv)));
    gtk_window_unmaximize(GTK_WINDOW(webview_get_window((webview_t)wc->wv)));
    gtk_window_present(GTK_WINDOW(webview_get_window((webview_t)wc->wv)));
#endif
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowHide) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    pump_windows_messages();
    ShowWindow(get_hwnd(wc->wv), SW_HIDE);
#elif defined(WEBVIEW_PLATFORM_DARWIN)
    id win = (id)webview_get_window((webview_t)wc->wv);
    objc_msgSend(win, sel_getUid("orderOut:"), nil);
#elif defined(WEBVIEW_PLATFORM_LINUX)
    gtk_widget_hide(GTK_WIDGET(webview_get_window((webview_t)wc->wv)));
#endif
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowShow) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    pump_windows_messages();
    ShowWindow(get_hwnd(wc->wv), SW_SHOW);
#elif defined(WEBVIEW_PLATFORM_DARWIN)
    id win = (id)webview_get_window((webview_t)wc->wv);
    objc_msgSend(win, sel_getUid("makeKeyAndOrderFront:"), nil);
#elif defined(WEBVIEW_PLATFORM_LINUX)
    gtk_widget_show(GTK_WIDGET(webview_get_window((webview_t)wc->wv)));
    gtk_window_present(GTK_WINDOW(webview_get_window((webview_t)wc->wv)));
#endif
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowFocus) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    pump_windows_messages();
    SetFocus(get_hwnd(wc->wv));
#elif defined(WEBVIEW_PLATFORM_LINUX)
    gtk_window_present(GTK_WINDOW(webview_get_window((webview_t)wc->wv)));
#endif
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowIsMaximized) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    return djazair_bool(IsZoomed(get_hwnd(wc->wv)));
#elif defined(WEBVIEW_PLATFORM_LINUX)
    GdkWindow *gdk_win = gtk_widget_get_window(GTK_WIDGET(webview_get_window((webview_t)wc->wv)));
    if (gdk_win) {
        GdkWindowState state = gdk_window_get_state(gdk_win);
        return djazair_bool(state & GDK_WINDOW_STATE_MAXIMIZED);
    }
    return djazair_bool(false);
#else
    return djazair_bool(false);
#endif
}

extern "C" DJAZAIR_FUNC(nativeWindowIsMinimized) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    return djazair_bool(IsIconic(get_hwnd(wc->wv)));
#elif defined(WEBVIEW_PLATFORM_LINUX)
    GdkWindow *gdk_win = gtk_widget_get_window(GTK_WIDGET(webview_get_window((webview_t)wc->wv)));
    if (gdk_win) {
        GdkWindowState state = gdk_window_get_state(gdk_win);
        return djazair_bool(state & GDK_WINDOW_STATE_ICONIFIED);
    }
    return djazair_bool(false);
#else
    return djazair_bool(false);
#endif
}

extern "C" DJAZAIR_FUNC(nativeWindowIsVisible) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    return djazair_bool(IsWindowVisible(get_hwnd(wc->wv)));
#elif defined(WEBVIEW_PLATFORM_LINUX)
    return djazair_bool(gtk_widget_get_visible(GTK_WIDGET(webview_get_window((webview_t)wc->wv))));
#else
    return djazair_bool(true);
#endif
}

extern "C" DJAZAIR_FUNC(nativeWindowSetResizable) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    if (djazair_is_bool(args[1])) {
#if defined(WEBVIEW_PLATFORM_WINDOWS)
        pump_windows_messages();
        HWND hwnd = get_hwnd(wc->wv);
        LONG style = GetWindowLongW(hwnd, GWL_STYLE);
        if (AS_BOOL(args[1])) style |= WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX;
        else style &= ~(WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX);
        SetWindowLongW(hwnd, GWL_STYLE, style);
        SetWindowPos(hwnd, NULL, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
#elif defined(WEBVIEW_PLATFORM_LINUX)
        gtk_window_set_resizable(GTK_WINDOW(webview_get_window((webview_t)wc->wv)), AS_BOOL(args[1]) ? TRUE : FALSE);
#endif
    }
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowSetMinSize) {
    djazair_check_args(3, argCount);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    pump_windows_messages();
#endif
    if (djazair_is_number(args[1]) && djazair_is_number(args[2]))
        wc->wv->set_size((int)AS_NUMBER(args[1]), (int)AS_NUMBER(args[2]), WEBVIEW_HINT_MIN);
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowSetMaxSize) {
    djazair_check_args(3, argCount);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    pump_windows_messages();
#endif
    if (djazair_is_number(args[1]) && djazair_is_number(args[2]))
        wc->wv->set_size((int)AS_NUMBER(args[1]), (int)AS_NUMBER(args[2]), WEBVIEW_HINT_MAX);
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowSetBackgroundColor) {
    djazair_check_args(5, argCount);
    djazair_check_num(0);
    djazair_check_num(1);
    djazair_check_num(2);
    djazair_check_num(3);
    djazair_check_num(4);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    auto* ctrl = (ICoreWebView2Controller*)webview_get_native_handle(
        (webview_t)wc->wv, WEBVIEW_NATIVE_HANDLE_KIND_BROWSER_CONTROLLER);
    if (ctrl) {
        ICoreWebView2Controller2* ctrl2 = nullptr;
        static const IID local_IID_ICoreWebView2Controller2 = {0xc979903e,0xd4ca,0x4228,{0x92,0xeb,0x47,0xee,0x3f,0xa9,0x6e,0xab}};
        if (SUCCEEDED(ctrl->QueryInterface(local_IID_ICoreWebView2Controller2, (void**)&ctrl2)) && ctrl2) {
            COREWEBVIEW2_COLOR color;
            color.R = (BYTE)AS_NUMBER(args[1]);
            color.G = (BYTE)AS_NUMBER(args[2]);
            color.B = (BYTE)AS_NUMBER(args[3]);
            color.A = (BYTE)AS_NUMBER(args[4]);
            ctrl2->put_DefaultBackgroundColor(color);
            ctrl2->Release();
        }
    }
#endif
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowSetDarkMode) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    if (djazair_is_bool(args[1])) {
#if defined(WEBVIEW_PLATFORM_WINDOWS)
        HWND hwnd = get_hwnd(wc->wv);
        BOOL is_dark = AS_BOOL(args[1]) ? TRUE : FALSE;
        DwmSetWindowAttribute(hwnd, 20, &is_dark, sizeof(is_dark));
        DwmSetWindowAttribute(hwnd, 19, &is_dark, sizeof(is_dark));
        SetWindowPos(hwnd, NULL, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
        RedrawWindow(hwnd, NULL, NULL, RDW_FRAME | RDW_INVALIDATE | RDW_UPDATENOW);
#endif
    }
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowSetFullscreen) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    if (djazair_is_bool(args[1])) {
#if defined(WEBVIEW_PLATFORM_WINDOWS)
        HWND hwnd = get_hwnd(wc->wv);
        bool fs = AS_BOOL(args[1]);
        if (fs && !wc->is_fullscreen) {
            wc->saved_placement.length = sizeof(WINDOWPLACEMENT);
            GetWindowPlacement(hwnd, &wc->saved_placement);
            wc->saved_style = GetWindowLongW(hwnd, GWL_STYLE);
            wc->saved_exstyle = GetWindowLongW(hwnd, GWL_EXSTYLE);
            HMONITOR monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
            MONITORINFO mi = { sizeof(MONITORINFO) };
            GetMonitorInfoW(monitor, &mi);
            SetWindowLongW(hwnd, GWL_STYLE, wc->saved_style & ~(WS_CAPTION | WS_THICKFRAME));
            SetWindowLongW(hwnd, GWL_EXSTYLE, wc->saved_exstyle & ~(WS_EX_DLGMODALFRAME | WS_EX_WINDOWEDGE | WS_EX_CLIENTEDGE));
            SetWindowPos(hwnd, HWND_TOP,
                mi.rcMonitor.left, mi.rcMonitor.top,
                mi.rcMonitor.right - mi.rcMonitor.left,
                mi.rcMonitor.bottom - mi.rcMonitor.top,
                SWP_FRAMECHANGED | SWP_SHOWWINDOW);
            wc->is_fullscreen = true;
        } else if (!fs && wc->is_fullscreen) {
            SetWindowLongW(hwnd, GWL_STYLE, wc->saved_style);
            SetWindowLongW(hwnd, GWL_EXSTYLE, wc->saved_exstyle);
            SetWindowPlacement(hwnd, &wc->saved_placement);
            SetWindowPos(hwnd, NULL, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
            wc->is_fullscreen = false;
        }
#elif defined(WEBVIEW_PLATFORM_LINUX)
        GtkWindow* gtk_win = GTK_WINDOW(webview_get_window((webview_t)wc->wv));
        if (AS_BOOL(args[1])) gtk_window_fullscreen(gtk_win);
        else gtk_window_unfullscreen(gtk_win);
#endif
    }
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowIsFullscreen) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
    return djazair_bool(wc->is_fullscreen);
}

extern "C" DJAZAIR_FUNC(nativeWindowSetAlwaysOnTop) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    if (djazair_is_bool(args[1])) {
#if defined(WEBVIEW_PLATFORM_WINDOWS)
        HWND hwnd = get_hwnd(wc->wv);
        SetWindowPos(hwnd, AS_BOOL(args[1]) ? HWND_TOPMOST : HWND_NOTOPMOST,
            0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE);
#endif
    }
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowCenter) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    HWND hwnd = get_hwnd(wc->wv);
    RECT r;
    GetWindowRect(hwnd, &r);
    int w = r.right - r.left;
    int h = r.bottom - r.top;
    int sw = GetSystemMetrics(SM_CXSCREEN);
    int sh = GetSystemMetrics(SM_CYSCREEN);
    SetWindowPos(hwnd, NULL, (sw - w) / 2, (sh - h) / 2, 0, 0, SWP_NOSIZE | SWP_NOZORDER);
#elif defined(WEBVIEW_PLATFORM_LINUX)
    gtk_window_set_position(GTK_WINDOW(webview_get_window((webview_t)wc->wv)), GTK_WIN_POS_CENTER);
#endif
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowSetIcon) {
    djazair_check_args(2, argCount);
    djazair_check_str(1);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    HWND hwnd = get_hwnd(wc->wv);
    HICON hIcon = (HICON)LoadImageA(NULL, AS_CSTRING(args[1]), IMAGE_ICON,
        0, 0, LR_LOADFROMFILE | LR_DEFAULTSIZE);
    if (hIcon) {
        SendMessageW(hwnd, WM_SETICON, ICON_SMALL, (LPARAM)hIcon);
        SendMessageW(hwnd, WM_SETICON, ICON_BIG, (LPARAM)hIcon);
        if (wc->last_icon_small) DestroyIcon(wc->last_icon_small);
        if (wc->last_icon_big)   DestroyIcon(wc->last_icon_big);
        wc->last_icon_small = hIcon;
        wc->last_icon_big = hIcon;
    }
#endif
    return djazair_null();
}

/**
 * @brief Begins interactive native window dragging by mouse.
 *
 * Typically invoked when the user presses mousedown on a custom HTML titlebar
 * in a frameless window. Sends WM_NCLBUTTONDOWN with HTCAPTION to the native window.
 *
 * @param vm Active Djazair VM instance.
 * @param argCount Must be 1 (window ID).
 * @param args Stack pointer.
 * @return Value NULL_VAL.
 */
extern "C" DJAZAIR_FUNC(nativeWindowStartDragging) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    HWND hwnd = get_hwnd(wc->wv);
    if (hwnd) {
        ReleaseCapture();
        SendMessageW(hwnd, WM_NCLBUTTONDOWN, HTCAPTION, 0);
    }
#elif defined(WEBVIEW_PLATFORM_LINUX)
    GtkWidget* gtk_win = GTK_WIDGET(webview_get_window((webview_t)wc->wv));
    if (gtk_win) {
        gtk_window_begin_move_drag(GTK_WINDOW(gtk_win), 1, 0, 0, GDK_CURRENT_TIME);
    }
#endif
    return djazair_null();
}

/**
 * @brief Flashes the window frame and taskbar button to alert the user.
 *
 * @param vm Active Djazair VM instance.
 * @param argCount Must be 2 (window ID, bool enable).
 * @param args Stack pointer.
 * @return Value NULL_VAL.
 */
extern "C" DJAZAIR_FUNC(nativeWindowFlash) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    if (djazair_is_bool(args[1])) {
        bool enable = AS_BOOL(args[1]);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
        HWND hwnd = get_hwnd(wc->wv);
        if (hwnd) {
            FLASHWINFO fi;
            ZeroMemory(&fi, sizeof(fi));
            fi.cbSize = sizeof(FLASHWINFO);
            fi.hwnd = hwnd;
            fi.dwFlags = enable ? (FLASHW_ALL | FLASHW_TIMERNOFG) : FLASHW_STOP;
            fi.uCount = 0;
            fi.dwTimeout = 0;
            FlashWindowEx(&fi);
        }
#elif defined(WEBVIEW_PLATFORM_LINUX)
        GtkWidget* gtk_win = GTK_WIDGET(webview_get_window((webview_t)wc->wv));
        if (gtk_win) {
            gtk_window_set_urgency_hint(GTK_WINDOW(gtk_win), enable ? TRUE : FALSE);
        }
#endif
    }
    return djazair_null();
}

/**
 * @brief Checks if the native window currently has active system keyboard focus.
 *
 * @param vm Active Djazair VM instance.
 * @param argCount Must be 1 (window ID).
 * @param args Stack pointer.
 * @return Value BOOL_VAL indicating focus state.
 */
extern "C" DJAZAIR_FUNC(nativeWindowIsFocused) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    HWND hwnd = get_hwnd(wc->wv);
    if (hwnd) {
        HWND foreground = GetForegroundWindow();
        bool focused = (foreground != NULL && (foreground == hwnd || IsChild(hwnd, foreground)));
        return djazair_bool(focused);
    }
#elif defined(WEBVIEW_PLATFORM_LINUX)
    GtkWidget* gtk_win = GTK_WIDGET(webview_get_window((webview_t)wc->wv));
    if (gtk_win) {
        return djazair_bool(gtk_window_is_active(GTK_WINDOW(gtk_win)));
    }
#endif
    return djazair_bool(false);
}

extern "C" DJAZAIR_FUNC(nativeWindowGetScreenSize) {
    djazair_check_args(0, argCount);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    int w = GetSystemMetrics(SM_CXSCREEN);
    int h = GetSystemMetrics(SM_CYSCREEN);
#else
    int w = 1920, h = 1080;
#endif
    Value arr = djazair_new_array(vm);
    djazair_array_push(vm, arr, djazair_int(w));
    djazair_array_push(vm, arr, djazair_int(h));
    return arr;
}

extern "C" DJAZAIR_FUNC(nativeWindowGetAvailableSize) {
    djazair_check_args(0, argCount);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    RECT r;
    SystemParametersInfoW(SPI_GETWORKAREA, 0, &r, 0);
    int w = r.right - r.left;
    int h = r.bottom - r.top;
#else
    int w = 1920, h = 1040;
#endif
    Value arr = djazair_new_array(vm);
    djazair_array_push(vm, arr, djazair_int(w));
    djazair_array_push(vm, arr, djazair_int(h));
    return arr;
}

extern "C" DJAZAIR_FUNC(nativeWindowSetOpacity) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    if (djazair_is_number(args[1])) {
#if defined(WEBVIEW_PLATFORM_WINDOWS)
        HWND hwnd = get_hwnd(wc->wv);
        BYTE alpha = (BYTE)(AS_NUMBER(args[1]) * 255.0);
        SetWindowLongW(hwnd, GWL_EXSTYLE, GetWindowLongW(hwnd, GWL_EXSTYLE) | WS_EX_LAYERED);
        SetLayeredWindowAttributes(hwnd, 0, alpha, LWA_ALPHA);
#endif
    }
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowSetUserAgent) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    if (djazair_is_string(args[1])) {
#if defined(WEBVIEW_PLATFORM_WINDOWS)
        auto* ctrl = (ICoreWebView2Controller*)webview_get_native_handle(
            (webview_t)wc->wv, WEBVIEW_NATIVE_HANDLE_KIND_BROWSER_CONTROLLER);
        if (ctrl) {
            ICoreWebView2* wv2 = nullptr;
            if (SUCCEEDED(ctrl->get_CoreWebView2(&wv2))) {
                ICoreWebView2Settings* settings = nullptr;
                if (SUCCEEDED(wv2->get_Settings(&settings))) {
                    IID IID_ICoreWebView2Settings2 = {0xee9a0f68,0xf46c,0x4e32,{0xac,0x23,0xef,0x8c,0xac,0x22,0x4d,0x2a}};
                    ICoreWebView2Settings2* settings2 = nullptr;
                    HRESULT hr = settings->QueryInterface(IID_ICoreWebView2Settings2, (void**)&settings2);
                    if (SUCCEEDED(hr) && settings2) {
                        const char* ua = AS_CSTRING(args[1]);
                        int ua_len = MultiByteToWideChar(CP_UTF8, 0, ua, -1, NULL, 0);
                        wchar_t* w_ua = new wchar_t[ua_len];
                        MultiByteToWideChar(CP_UTF8, 0, ua, -1, w_ua, ua_len);
                        settings2->put_UserAgent(w_ua);
                        delete[] w_ua;
                        settings2->Release();
                    }
                    settings->Release();
                }
                wv2->Release();
            }
        }
#endif
    }
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowClearCache) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    auto* ctrl = (ICoreWebView2Controller*)webview_get_native_handle(
        (webview_t)wc->wv, WEBVIEW_NATIVE_HANDLE_KIND_BROWSER_CONTROLLER);
    if (ctrl) {
        ICoreWebView2* wv2 = nullptr;
        if (SUCCEEDED(ctrl->get_CoreWebView2(&wv2))) {
            wv2->CallDevToolsProtocolMethod(L"Network.clearCache", L"{}", nullptr);
            wv2->Release();
        }
    }
#endif
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowClearCookies) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    auto* ctrl = (ICoreWebView2Controller*)webview_get_native_handle(
        (webview_t)wc->wv, WEBVIEW_NATIVE_HANDLE_KIND_BROWSER_CONTROLLER);
    if (ctrl) {
        ICoreWebView2* wv2 = nullptr;
        if (SUCCEEDED(ctrl->get_CoreWebView2(&wv2))) {
            wv2->CallDevToolsProtocolMethod(L"Network.clearBrowserCookies", L"{}", nullptr);
            wv2->Release();
        }
    }
#endif
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowPrint) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
    wc->wv->eval("window.print()");
    return djazair_null();
}

// ===========================================================================
// WEBVIEW ENGINE OPERATIONS
// ===========================================================================

extern "C" DJAZAIR_FUNC(nativeWindowNavigate) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    if (djazair_is_string(args[1])) {
        wc->current_url = AS_CSTRING(args[1]);
        wc->has_navigated = true;
        wc->can_go_forward = false;
        wc->wv->navigate(wc->current_url.c_str());
        std::string cur_url = wc->current_url;
        wc->wv->dispatch([wc, cur_url]() {
            invoke_callback_str(wc, wc->navigate_callback, cur_url.c_str());
        });
    }
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowSetHtml) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    if (djazair_is_string(args[1])) {
        wc->current_url = "about:blank";
        wc->has_navigated = true;
        wc->wv->set_html(AS_CSTRING(args[1]));
        wc->wv->dispatch([wc]() {
            invoke_callback_0(wc, wc->load_callback);
        });
    }
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowEval) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    if (djazair_is_string(args[1])) wc->wv->eval(AS_CSTRING(args[1]));
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowInit) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    if (djazair_is_string(args[1])) wc->wv->init(AS_CSTRING(args[1]));
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowReload) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
    wc->wv->eval("location.reload()");
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowGoBack) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
    wc->can_go_forward = true;
    wc->wv->eval("history.back()");
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowGoForward) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
    wc->can_go_forward = false;
    wc->wv->eval("history.forward()");
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowCanGoBack) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
    return djazair_bool(wc->has_navigated);
}

extern "C" DJAZAIR_FUNC(nativeWindowCanGoForward) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
    return djazair_bool(wc->can_go_forward);
}

extern "C" DJAZAIR_FUNC(nativeWindowSetZoomLevel) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    if (djazair_is_number(args[1])) {
        wc->zoom_level = AS_NUMBER(args[1]);
        char buf[64];
        snprintf(buf, sizeof(buf), "document.body.style.zoom = '%f'", wc->zoom_level);
        wc->wv->eval(buf);
    }
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowGetZoomLevel) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
    return djazair_float(wc->zoom_level);
}

extern "C" DJAZAIR_FUNC(nativeWindowOpenDevTools) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    pump_windows_messages();
    auto* ctrl = (ICoreWebView2Controller*)webview_get_native_handle(
        (webview_t)wc->wv, WEBVIEW_NATIVE_HANDLE_KIND_BROWSER_CONTROLLER);
    if (ctrl) {
        ICoreWebView2* wv2 = nullptr;
        if (SUCCEEDED(ctrl->get_CoreWebView2(&wv2))) {
            wv2->OpenDevToolsWindow();
            wv2->Release();
        }
    }
#elif defined(WEBVIEW_PLATFORM_LINUX)
    auto* insp = (WebKitWebInspector*)webview_get_native_handle(
        (webview_t)wc->wv, WEBVIEW_NATIVE_HANDLE_KIND_BROWSER_CONTROLLER);
    if (insp) webkit_web_inspector_show(insp);
#elif defined(WEBVIEW_PLATFORM_DARWIN)
    id wk = (id)webview_get_native_handle(
        (webview_t)wc->wv, WEBVIEW_NATIVE_HANDLE_KIND_BROWSER_CONTROLLER);
    if (wk) {
        id prefs = (id)objc_msgSend(wk, sel_getUid("preferences"));
        objc_msgSend(prefs, sel_getUid("setDeveloperExtrasEnabled:"), (BOOL)YES);
        id inspector = (id)objc_msgSend(wk, sel_getUid("inspector"));
        objc_msgSend(inspector, sel_getUid("show:"));
    }
#endif
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowGetUrl) {
    djazair_check_args(1, argCount);
    GET_WINDOW(0);
    return djazair_str(vm, wc->current_url.c_str());
}

extern "C" DJAZAIR_FUNC(nativeWindowSetContextMenu) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    if (djazair_is_bool(args[1])) {
#if defined(WEBVIEW_PLATFORM_WINDOWS)
        pump_windows_messages();
        auto* ctrl = (ICoreWebView2Controller*)webview_get_native_handle(
            (webview_t)wc->wv, WEBVIEW_NATIVE_HANDLE_KIND_BROWSER_CONTROLLER);
        if (ctrl) {
            ICoreWebView2* wv2 = nullptr;
            if (SUCCEEDED(ctrl->get_CoreWebView2(&wv2))) {
                ICoreWebView2Settings* settings = nullptr;
                if (SUCCEEDED(wv2->get_Settings(&settings))) {
                    settings->put_AreDefaultContextMenusEnabled(
                        AS_BOOL(args[1]) ? TRUE : FALSE);
                    settings->Release();
                }
                wv2->Release();
            }
        }
#elif defined(WEBVIEW_PLATFORM_LINUX)
        if (!AS_BOOL(args[1])) {
            wc->wv->eval(
                "document.addEventListener('contextmenu',function(e){"
                "e.stopImmediatePropagation();e.preventDefault();},true)");
        } else {
            wc->wv->eval(
                "document.addEventListener('contextmenu',function(e){"
                "return true;},true)");
        }
#endif
    }
    return djazair_null();
}

// ===========================================================================
// CALLBACK REGISTRATION
// ===========================================================================

static void set_callback(WindowContext* wc, djazairVM* vm, const char* prefix, Value& field, Value cb) {
    std::string k = gc_key(prefix, wc->id);
    if (!IS_NULL(field)) gc_unprotect(wc->vm, k.c_str(), (int)k.length());
    field = cb;
    if (!IS_NULL(cb)) gc_protect(vm, k.c_str(), (int)k.length(), cb);
}

extern "C" DJAZAIR_FUNC(nativeWindowSetCloseCallback) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    set_callback(wc, vm, "__wv_close", wc->close_callback, args[1]);
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowSetDispatcher) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    set_callback(wc, vm, "__wv_disp", wc->dispatcher, args[1]);
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowSetErrorCallback) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    set_callback(wc, vm, "__wv_err", wc->error_callback, args[1]);
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowSetMoveCallback) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    set_callback(wc, vm, "__wv_move", wc->move_callback, args[1]);
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowSetResizeCallback) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    set_callback(wc, vm, "__wv_resize", wc->resize_callback, args[1]);
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowSetFocusCallback) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    set_callback(wc, vm, "__wv_focus", wc->focus_callback, args[1]);
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowSetBlurCallback) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    set_callback(wc, vm, "__wv_blur", wc->blur_callback, args[1]);
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowSetMaximizeCallback) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    set_callback(wc, vm, "__wv_max", wc->maximize_callback, args[1]);
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowSetMinimizeCallback) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    set_callback(wc, vm, "__wv_min", wc->minimize_callback, args[1]);
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowSetRestoreCallback) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    set_callback(wc, vm, "__wv_restore", wc->restore_callback, args[1]);
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowSetNavigateCallback) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    set_callback(wc, vm, "__wv_nav", wc->navigate_callback, args[1]);
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowSetTitleCallback) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    set_callback(wc, vm, "__wv_title", wc->title_callback, args[1]);
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowSetLoadCallback) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    set_callback(wc, vm, "__wv_load", wc->load_callback, args[1]);
    return djazair_null();
}

// ===========================================================================
// IPC BIDIRECTIONAL BIND
// ===========================================================================

extern "C" DJAZAIR_FUNC(nativeWindowBind) {
    djazair_check_args(3, argCount);
    GET_WINDOW(0);
    if (!djazair_is_string(args[1])) return djazair_null();
    std::string name(AS_CSTRING(args[1]));
    int captured_id = wc->id;

    wc->wv->bind(name, [captured_id, vm, name](const std::string& seq, const std::string& req, void*) {
        WindowContext* wc2 = nullptr;
        {
            std::lock_guard<std::mutex> lock(g_ctx_mtx);
            auto it = g_contexts.find(captured_id);
            if (it == g_contexts.end() || !it->second->wv) return;
            wc2 = it->second;
        }

        if (IS_NULL(wc2->dispatcher)) {
            wc2->wv->resolve(seq, 0, "null");
            return;
        }

        push(vm, wc2->dispatcher);
        ObjString* name_arg = copyString(vm, name.c_str(), (int)name.length());
        push(vm, OBJ_VAL(name_arg));
        ObjString* req_arg = copyString(vm, req.c_str(), (int)req.length());
        push(vm, OBJ_VAL(req_arg));

        int savedFC = vm->frameCount;
        std::string result_str = "null";
        if (callValue(vm, wc2->dispatcher, 2)) {
            if (vm->frameCount > savedFC) {
                DjazairResult res = run(vm, savedFC);
                if (res == DJAZAIR_OK) {
                    Value ret = pop(vm);
                    result_str = value_to_json_result(vm, ret);
                }
            }
        } else {
            if (!vm->exceptionCaught) { pop(vm); pop(vm); pop(vm); }
        }

        wc2->wv->resolve(seq, 0, result_str);
    }, nullptr);

    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeWindowUnbind) {
    djazair_check_args(2, argCount);
    GET_WINDOW(0);
    if (djazair_is_string(args[1])) wc->wv->unbind(AS_CSTRING(args[1]));
    return djazair_null();
}

// ===========================================================================
// NATIVE DIALOGS
// ===========================================================================

extern "C" DJAZAIR_FUNC(nativeDialogMessage) {
    djazair_check_args(7, argCount);
    djazair_check_str(0); djazair_check_str(1); djazair_check_str(2);
    djazair_check_str(3); djazair_check_str(4);
    djazair_check_num(5); djazair_check_num(6);

    const char *type = AS_CSTRING(args[0]);
    const char *title = AS_CSTRING(args[1]);
    const char *message = AS_CSTRING(args[2]);
    const char *detail = AS_CSTRING(args[3]);

#if defined(_WIN32)
    UINT uType = MB_OK;
    if (strcmp(type, "info") == 0) uType |= MB_ICONINFORMATION;
    else if (strcmp(type, "warning") == 0) uType |= MB_ICONWARNING;
    else if (strcmp(type, "error") == 0) uType |= MB_ICONERROR;
    else if (strcmp(type, "question") == 0) uType |= MB_ICONQUESTION;

    const char *buttons = AS_CSTRING(args[4]);
    if (strcmp(buttons, "ok") == 0) uType |= MB_OK;
    else if (strcmp(buttons, "ok-cancel") == 0) uType |= MB_OKCANCEL;
    else if (strcmp(buttons, "yes-no") == 0) uType |= MB_YESNO;
    else if (strcmp(buttons, "yes-no-cancel") == 0) uType |= MB_YESNOCANCEL;
    else if (strcmp(buttons, "retry-cancel") == 0) uType |= MB_RETRYCANCEL;

    std::string fullMsg = message;
    if (detail && strlen(detail) > 0) { fullMsg += "\n"; fullMsg += detail; }

    int result = MessageBoxA(NULL, fullMsg.c_str(), title, uType);
    const char *resultStr = "cancel";
    if (result == IDOK) resultStr = "ok";
    else if (result == IDCANCEL) resultStr = "cancel";
    else if (result == IDYES) resultStr = "yes";
    else if (result == IDNO) resultStr = "no";
    else if (result == IDRETRY) resultStr = "retry";
    return djazair_str(vm, resultStr);
#else
    printf("[%s] %s: %s\n", type, title, message);
    return djazair_str(vm, "ok");
#endif
}

extern "C" DJAZAIR_FUNC(nativeDialogOpenFile) {
    djazair_check_args(5, argCount);
    djazair_check_str(0); djazair_check_str(1);
    djazair_check_arr(2); djazair_check_bool(3); djazair_check_arr(4);

    const char *title = AS_CSTRING(args[0]);
    bool multi = AS_BOOL(args[3]);

#if defined(_WIN32)
    OPENFILENAMEA ofn = {0};
    char fileName[32768] = {0};

    ofn.lStructSize = sizeof(ofn);
    ofn.hwndOwner = NULL;
    ofn.lpstrFile = fileName;
    ofn.nMaxFile = sizeof(fileName);
    ofn.lpstrTitle = title;
    ofn.Flags = OFN_FILEMUSTEXIST | OFN_HIDEREADONLY | OFN_EXPLORER;
    if (multi) ofn.Flags |= OFN_ALLOWMULTISELECT;

    std::string filterStr;
    Value filters = args[2];
    int filterLen = djazair_array_len(vm, filters);
    for (int i = 0; i < filterLen; i++) {
        Value filter = djazair_array_get(vm, filters, i);
        Value nameKey = djazair_str(vm, "name");
        Value extKey = djazair_str(vm, "extensions");
        Value nameVal = NULL_VAL, extVal = NULL_VAL;
        djazair_map_get(vm, filter, nameKey, &nameVal);
        djazair_map_get(vm, filter, extKey, &extVal);
        const char *fname = IS_STRING(nameVal) ? AS_CSTRING(nameVal) : "Files";
        filterStr += fname; filterStr += '\0';
        if (IS_ARRAY(extVal)) {
            int extLen = djazair_array_len(vm, extVal);
            for (int j = 0; j < extLen; j++) {
                Value ext = djazair_array_get(vm, extVal, j);
                if (IS_STRING(ext)) {
                    if (j > 0) filterStr += ";";
                    std::string extStr = AS_CSTRING(ext);
                    if (extStr.size() >= 2 && extStr.substr(0, 2) == "*.") extStr = extStr.substr(2);
                    filterStr += "*."; filterStr += extStr;
                }
            }
        }
        filterStr += '\0';
    }
    if (filterStr.empty()) filterStr = "All Files\0*.*\0";
    else filterStr += '\0';
    ofn.lpstrFilter = filterStr.data();

    if (GetOpenFileNameA(&ofn)) {
        if (!multi) {
            return djazair_str(vm, fileName);
        }
        std::string dir(fileName);
        char* p = fileName + dir.length() + 1;
        if (*p == '\0') {
            return djazair_str(vm, fileName);
        }
        Value arr = djazair_new_array(vm);
        std::string sep = "\\";
        if (dir.back() == '\\') sep = "";
        while (*p) {
            std::string full = dir + sep + p;
            djazair_array_push(vm, arr, djazair_str(vm, full.c_str()));
            p += strlen(p) + 1;
        }
        return arr;
    }
#endif
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeDialogSaveFile) {
    djazair_check_args(3, argCount);
    djazair_check_str(0); djazair_check_str(1); djazair_check_arr(2);

    const char *title = AS_CSTRING(args[0]);
    const char *defaultPath = AS_CSTRING(args[1]);

#if defined(_WIN32)
    OPENFILENAMEA ofn = {0};
    char fileName[MAX_PATH] = {0};
    if (defaultPath && strlen(defaultPath) > 0) strncpy(fileName, defaultPath, MAX_PATH - 1);

    ofn.lStructSize = sizeof(ofn);
    ofn.hwndOwner = NULL;
    ofn.lpstrFile = fileName;
    ofn.nMaxFile = MAX_PATH;
    ofn.lpstrTitle = title;
    ofn.Flags = OFN_OVERWRITEPROMPT | OFN_HIDEREADONLY;

    std::string filterStr;
    Value filters = args[2];
    int filterLen = djazair_array_len(vm, filters);
    for (int i = 0; i < filterLen; i++) {
        Value filter = djazair_array_get(vm, filters, i);
        Value nameKey = djazair_str(vm, "name");
        Value extKey = djazair_str(vm, "extensions");
        Value nameVal = NULL_VAL, extVal = NULL_VAL;
        djazair_map_get(vm, filter, nameKey, &nameVal);
        djazair_map_get(vm, filter, extKey, &extVal);
        const char *fname = IS_STRING(nameVal) ? AS_CSTRING(nameVal) : "Files";
        filterStr += fname; filterStr += '\0';
        if (IS_ARRAY(extVal)) {
            int extLen = djazair_array_len(vm, extVal);
            for (int j = 0; j < extLen; j++) {
                Value ext = djazair_array_get(vm, extVal, j);
                if (IS_STRING(ext)) {
                    if (j > 0) filterStr += ";";
                    std::string extStr = AS_CSTRING(ext);
                    if (extStr.size() >= 2 && extStr.substr(0, 2) == "*.") extStr = extStr.substr(2);
                    filterStr += "*."; filterStr += extStr;
                }
            }
        }
        filterStr += '\0';
    }
    if (filterStr.empty()) {
        filterStr = "All Files\0*.*\0\0";
    } else {
        filterStr += '\0';
    }
    ofn.lpstrFilter = filterStr.data();

    if (GetSaveFileNameA(&ofn)) return djazair_str(vm, fileName);
#endif
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeDialogOpenFolder) {
    djazair_check_args(2, argCount);
    djazair_check_str(0); djazair_check_str(1);

    const char *title = AS_CSTRING(args[0]);
#if defined(_WIN32)
    IFileOpenDialog *pFileOpen;
    HRESULT hr = CoCreateInstance(CLSID_FileOpenDialog, NULL, CLSCTX_ALL, 
            IID_IFileOpenDialog, reinterpret_cast<void**>(&pFileOpen));

    if (SUCCEEDED(hr)) {
        DWORD dwOptions;
        if (SUCCEEDED(pFileOpen->GetOptions(&dwOptions))) {
            pFileOpen->SetOptions(dwOptions | FOS_PICKFOLDERS | FOS_FORCEFILESYSTEM);
        }

        int titleLen = MultiByteToWideChar(CP_UTF8, 0, title, -1, NULL, 0);
        if (titleLen > 0) {
            std::wstring wTitle(titleLen, 0);
            MultiByteToWideChar(CP_UTF8, 0, title, -1, &wTitle[0], titleLen);
            pFileOpen->SetTitle(wTitle.c_str());
        }

        if (SUCCEEDED(pFileOpen->Show(NULL))) {
            IShellItem *pItem;
            if (SUCCEEDED(pFileOpen->GetResult(&pItem))) {
                PWSTR pszFilePath;
                if (SUCCEEDED(pItem->GetDisplayName(SIGDN_FILESYSPATH, &pszFilePath))) {
                    int utf8Len = WideCharToMultiByte(CP_UTF8, 0, pszFilePath, -1, NULL, 0, NULL, NULL);
                    if (utf8Len > 0) {
                        std::string utf8Path(utf8Len - 1, 0);
                        WideCharToMultiByte(CP_UTF8, 0, pszFilePath, -1, &utf8Path[0], utf8Len, NULL, NULL);
                        CoTaskMemFree(pszFilePath);
                        pItem->Release();
                        pFileOpen->Release();
                        return djazair_str(vm, utf8Path.c_str());
                    }
                    CoTaskMemFree(pszFilePath);
                }
                pItem->Release();
            }
        }
        pFileOpen->Release();
        return djazair_null();
    }

    BROWSEINFOA bi = {0};
    bi.lpszTitle = title;
    bi.ulFlags = BIF_RETURNONLYFSDIRS | BIF_NEWDIALOGSTYLE;
    LPITEMIDLIST pidl = SHBrowseForFolderA(&bi);
    if (pidl) {
        char path[MAX_PATH];
        if (SHGetPathFromIDListA(pidl, path)) {
            IMalloc *imalloc = NULL;
            if (SUCCEEDED(SHGetMalloc(&imalloc))) { imalloc->Free(pidl); imalloc->Release(); }
            return djazair_str(vm, path);
        }
        IMalloc *imalloc = NULL;
        if (SUCCEEDED(SHGetMalloc(&imalloc))) { imalloc->Free(pidl); imalloc->Release(); }
    }
#endif
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeDialogPickColor) {
    djazair_check_args(1, argCount);
    djazair_check_str(0);

#if defined(_WIN32)
    CHOOSECOLORA cc = {0};
    COLORREF crCust[16] = {0};
    cc.lStructSize = sizeof(cc);
    cc.hwndOwner = NULL;
    cc.lpCustColors = crCust;
    cc.Flags = CC_RGBINIT | CC_FULLOPEN;
    if (ChooseColorA(&cc)) {
        Value result = djazair_new_map(vm);
        djazair_map_set(vm, result, djazair_str(vm, "r"), djazair_int(GetRValue(cc.rgbResult)));
        djazair_map_set(vm, result, djazair_str(vm, "g"), djazair_int(GetGValue(cc.rgbResult)));
        djazair_map_set(vm, result, djazair_str(vm, "b"), djazair_int(GetBValue(cc.rgbResult)));
        djazair_map_set(vm, result, djazair_str(vm, "a"), djazair_int(255));
        return result;
    }
#endif
    return djazair_null();
}

// ===========================================================================
// MENUS (Native Win32 HMENU Implementation)
// ===========================================================================

static void menu_handle_command(WindowContext* c, int item_id) {
    Value cb = NULL_VAL;
    {
        std::lock_guard<std::mutex> lock(g_menu_mtx);
        auto it = g_menu_callbacks.find(item_id);
        if (it != g_menu_callbacks.end()) cb = it->second;
    }
    if (!IS_NULL(cb) && c && c->wv) {
        c->wv->dispatch([c, cb]() {
            invoke_callback_0(c, cb);
        });
    }
}

extern "C" DJAZAIR_FUNC(nativeMenuCreate) {
    djazair_check_args(1, argCount);
    djazair_check_str(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    HMENU hmenu = CreatePopupMenu();
    return djazair_float((double)(intptr_t)hmenu);
#else
    return djazair_null();
#endif
}

extern "C" DJAZAIR_FUNC(nativeMenuCreateSubmenu) {
    djazair_check_args(2, argCount);
    djazair_check_str(1);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    HMENU parent = (HMENU)(intptr_t)AS_NUMBER(args[0]);
    HMENU sub = CreatePopupMenu();
    AppendMenuA(parent, MF_STRING | MF_POPUP, (UINT_PTR)sub, AS_CSTRING(args[1]));
    return djazair_float((double)(intptr_t)sub);
#else
    return djazair_null();
#endif
}

extern "C" DJAZAIR_FUNC(nativeMenuAddSeparator) {
    djazair_check_args(1, argCount);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    HMENU hmenu = (HMENU)(intptr_t)AS_NUMBER(args[0]);
    AppendMenuA(hmenu, MF_SEPARATOR, 0, NULL);
#endif
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeMenuAddItem) {
    djazair_check_args(3, argCount);
    djazair_check_str(1);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    HMENU hmenu = (HMENU)(intptr_t)AS_NUMBER(args[0]);
    const char* label = AS_CSTRING(args[1]);
    int item_id = g_next_menu_id++;
    AppendMenuA(hmenu, MF_STRING, item_id, label);
    Value cb = args[2];
    if (!IS_NULL(cb)) {
        std::string k = gc_key("__wv_mcb", item_id);
        gc_protect(vm, k.c_str(), (int)k.length(), cb);
        std::lock_guard<std::mutex> lock(g_menu_mtx);
        g_menu_callbacks[item_id] = cb;
    }
#endif
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeMenuSetCallback) {
    djazair_check_args(3, argCount);
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeMenuPopup) {
    djazair_check_args(2, argCount);
    djazair_check_num(1);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    int win_id = (int)AS_NUMBER(args[0]);
    HMENU hmenu = (HMENU)(intptr_t)AS_NUMBER(args[1]);
    HWND hwnd = nullptr;
    {
        std::lock_guard<std::mutex> lock(g_ctx_mtx);
        auto it = g_contexts.find(win_id);
        if (it != g_contexts.end() && it->second->wv) {
            hwnd = get_hwnd(it->second->wv);
        }
    }
    if (hwnd && hmenu) {
        POINT pt;
        GetCursorPos(&pt);
        SetForegroundWindow(hwnd);
        TrackPopupMenu(hmenu, TPM_LEFTALIGN | TPM_RIGHTBUTTON, pt.x, pt.y, 0, hwnd, NULL);
        PostMessageW(hwnd, WM_NULL, 0, 0);
    }
#endif
    return djazair_null();
}

// ===========================================================================
// NOTIFICATIONS
// ===========================================================================

extern "C" DJAZAIR_FUNC(nativeNotificationShow) {
    djazair_check_args(6, argCount);
    djazair_check_str(0); djazair_check_str(1); djazair_check_str(2);
    djazair_check_bool(3); djazair_check_str(4); djazair_check_num(5);

#if defined(_WIN32)
    NOTIFYICONDATAA nid = {0};
    nid.cbSize = sizeof(NOTIFYICONDATAA);
    HWND hwnd = NULL;
    {
        std::lock_guard<std::mutex> lock(g_ctx_mtx);
        if (!g_contexts.empty()) {
            hwnd = get_hwnd(g_contexts.begin()->second->wv);
        }
    }
    nid.hWnd = hwnd;
    nid.uID = 8888;
    nid.uFlags = NIF_INFO | NIF_ICON;
    nid.dwInfoFlags = NIIF_INFO;
    if (!AS_BOOL(args[3])) nid.dwInfoFlags |= NIIF_NOSOUND;
    nid.uTimeout = (UINT)(AS_NUMBER(args[5]) * 1000);
    nid.hIcon = LoadIcon(NULL, IDI_APPLICATION);

    strncpy(nid.szInfoTitle, AS_CSTRING(args[0]), sizeof(nid.szInfoTitle) - 1);
    strncpy(nid.szInfo, AS_CSTRING(args[1]), sizeof(nid.szInfo) - 1);

    Shell_NotifyIconA(NIM_ADD, &nid);
    Shell_NotifyIconA(NIM_MODIFY, &nid);
#endif
    return djazair_null();
}

// ===========================================================================
// SYSTEM TRAY (Active Win32 Implementation)
// ===========================================================================

#if defined(WEBVIEW_PLATFORM_WINDOWS)
static LRESULT CALLBACK TrayWndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    if (msg == WM_TRAYICON_MSG) {
        if (lParam == WM_RBUTTONUP || lParam == WM_CONTEXTMENU) {
            int tray_id = (int)wParam;
            TrayContext* tc = nullptr;
            {
                std::lock_guard<std::mutex> lock(g_tray_mtx);
                auto it = g_trays.find(tray_id);
                if (it != g_trays.end()) tc = it->second;
            }
            if (tc && tc->hmenu) {
                POINT pt;
                GetCursorPos(&pt);
                SetForegroundWindow(hwnd);
                TrackPopupMenu(tc->hmenu, TPM_LEFTALIGN | TPM_RIGHTBUTTON, pt.x, pt.y, 0, hwnd, NULL);
                PostMessageW(hwnd, WM_NULL, 0, 0);
            }
        }
        return 0;
    } else if (msg == WM_COMMAND) {
        int item_id = (int)LOWORD(wParam);
        WindowContext* active_ctx = nullptr;
        {
            std::lock_guard<std::mutex> lock(g_ctx_mtx);
            if (!g_contexts.empty()) active_ctx = g_contexts.begin()->second;
        }
        if (active_ctx) {
            menu_handle_command(active_ctx, item_id);
        }
        return 0;
    }
    return DefWindowProcW(hwnd, msg, wParam, lParam);
}
#endif

extern "C" DJAZAIR_FUNC(nativeTrayCreate) {
    djazair_check_args(2, argCount);
    djazair_check_str(0); djazair_check_str(1);

#if defined(WEBVIEW_PLATFORM_WINDOWS)
    auto tc = new TrayContext();
    tc->id = g_next_tray_id++;
    tc->hmenu = NULL;
    tc->hicon = NULL;
    tc->active = false;
    tc->tooltip = AS_CSTRING(args[0]);

    WNDCLASSEXW wc = {0};
    wc.cbSize = sizeof(WNDCLASSEXW);
    wc.lpfnWndProc = TrayWndProc;
    wc.hInstance = GetModuleHandle(NULL);
    wc.lpszClassName = L"DjazairWebviewTrayClass";
    RegisterClassExW(&wc);

    tc->hwnd = CreateWindowExW(0, L"DjazairWebviewTrayClass", L"DjazairTrayMsgWin",
        0, 0, 0, 0, 0, HWND_MESSAGE, NULL, GetModuleHandle(NULL), NULL);

    const char* iconPath = AS_CSTRING(args[1]);
    if (iconPath && strlen(iconPath) > 0) {
        tc->hicon = (HICON)LoadImageA(NULL, iconPath, IMAGE_ICON, 0, 0, LR_LOADFROMFILE | LR_DEFAULTSIZE);
    }
    if (!tc->hicon) {
        tc->hicon = LoadIcon(NULL, IDI_APPLICATION);
    }

    NOTIFYICONDATAA nid = {0};
    nid.cbSize = sizeof(NOTIFYICONDATAA);
    nid.hWnd = tc->hwnd;
    nid.uID = tc->id;
    nid.uFlags = NIF_MESSAGE | NIF_ICON | NIF_TIP;
    nid.uCallbackMessage = WM_TRAYICON_MSG;
    nid.hIcon = tc->hicon;
    strncpy(nid.szTip, tc->tooltip.c_str(), sizeof(nid.szTip) - 1);

    if (Shell_NotifyIconA(NIM_ADD, &nid)) {
        tc->active = true;
    }

    {
        std::lock_guard<std::mutex> lock(g_tray_mtx);
        g_trays[tc->id] = tc;
    }
    return djazair_int(tc->id);
#else
    return djazair_int(1);
#endif
}

extern "C" DJAZAIR_FUNC(nativeTraySetIcon) {
    djazair_check_args(2, argCount);
    djazair_check_num(0); djazair_check_str(1);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    int tray_id = (int)AS_NUMBER(args[0]);
    TrayContext* tc = nullptr;
    {
        std::lock_guard<std::mutex> lock(g_tray_mtx);
        auto it = g_trays.find(tray_id);
        if (it != g_trays.end()) tc = it->second;
    }
    if (tc && tc->active) {
        HICON newIcon = (HICON)LoadImageA(NULL, AS_CSTRING(args[1]), IMAGE_ICON, 0, 0, LR_LOADFROMFILE | LR_DEFAULTSIZE);
        if (newIcon) {
            tc->hicon = newIcon;
            NOTIFYICONDATAA nid = {0};
            nid.cbSize = sizeof(NOTIFYICONDATAA);
            nid.hWnd = tc->hwnd;
            nid.uID = tc->id;
            nid.uFlags = NIF_ICON;
            nid.hIcon = tc->hicon;
            Shell_NotifyIconA(NIM_MODIFY, &nid);
        }
    }
#endif
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeTraySetMenu) {
    djazair_check_args(2, argCount);
    djazair_check_num(0); djazair_check_num(1);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    int tray_id = (int)AS_NUMBER(args[0]);
    HMENU hmenu = (HMENU)(intptr_t)AS_NUMBER(args[1]);
    std::lock_guard<std::mutex> lock(g_tray_mtx);
    auto it = g_trays.find(tray_id);
    if (it != g_trays.end()) {
        it->second->hmenu = hmenu;
    }
#endif
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeTraySetTooltip) {
    djazair_check_args(2, argCount);
    djazair_check_num(0); djazair_check_str(1);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    int tray_id = (int)AS_NUMBER(args[0]);
    TrayContext* tc = nullptr;
    {
        std::lock_guard<std::mutex> lock(g_tray_mtx);
        auto it = g_trays.find(tray_id);
        if (it != g_trays.end()) tc = it->second;
    }
    if (tc && tc->active) {
        tc->tooltip = AS_CSTRING(args[1]);
        NOTIFYICONDATAA nid = {0};
        nid.cbSize = sizeof(NOTIFYICONDATAA);
        nid.hWnd = tc->hwnd;
        nid.uID = tc->id;
        nid.uFlags = NIF_TIP;
        strncpy(nid.szTip, tc->tooltip.c_str(), sizeof(nid.szTip) - 1);
        Shell_NotifyIconA(NIM_MODIFY, &nid);
    }
#endif
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeTrayDestroy) {
    djazair_check_args(1, argCount);
    djazair_check_num(0);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    int tray_id = (int)AS_NUMBER(args[0]);
    TrayContext* tc = nullptr;
    {
        std::lock_guard<std::mutex> lock(g_tray_mtx);
        auto it = g_trays.find(tray_id);
        if (it != g_trays.end()) {
            tc = it->second;
            g_trays.erase(it);
        }
    }
    if (tc) {
        if (tc->active) {
            NOTIFYICONDATAA nid = {0};
            nid.cbSize = sizeof(NOTIFYICONDATAA);
            nid.hWnd = tc->hwnd;
            nid.uID = tc->id;
            Shell_NotifyIconA(NIM_DELETE, &nid);
        }
        if (tc->hwnd) DestroyWindow(tc->hwnd);
        if (tc->hicon) DestroyIcon(tc->hicon);
        delete tc;
    }
#endif
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeTrayShowBalloon) {
    djazair_check_args(4, argCount);
    djazair_check_num(0); djazair_check_str(1);
    djazair_check_str(2); djazair_check_num(3);
#if defined(WEBVIEW_PLATFORM_WINDOWS)
    int tray_id = (int)AS_NUMBER(args[0]);
    TrayContext* tc = nullptr;
    {
        std::lock_guard<std::mutex> lock(g_tray_mtx);
        auto it = g_trays.find(tray_id);
        if (it != g_trays.end()) tc = it->second;
    }
    if (tc && tc->active) {
        NOTIFYICONDATAA nid = {0};
        nid.cbSize = sizeof(NOTIFYICONDATAA);
        nid.hWnd = tc->hwnd;
        nid.uID = tc->id;
        nid.uFlags = NIF_INFO;
        nid.dwInfoFlags = NIIF_INFO;
        nid.uTimeout = (UINT)(AS_NUMBER(args[3]) * 1000);
        strncpy(nid.szInfoTitle, AS_CSTRING(args[1]), sizeof(nid.szInfoTitle) - 1);
        strncpy(nid.szInfo, AS_CSTRING(args[2]), sizeof(nid.szInfo) - 1);
        Shell_NotifyIconA(NIM_MODIFY, &nid);
    }
#endif
    return djazair_null();
}

// ===========================================================================
// PROTOCOL SCHEMES
// ===========================================================================

extern "C" DJAZAIR_FUNC(nativeProtocolRegister) {
    djazair_check_args(2, argCount);
    djazair_check_str(0);
    return djazair_null();
}

extern "C" DJAZAIR_FUNC(nativeProtocolUnregister) {
    djazair_check_args(1, argCount);
    djazair_check_str(0);
    return djazair_null();
}

// ===========================================================================
// NATIVE METHOD TABLE & MODULE INITIALIZATION
// ===========================================================================

static NativeMethod webview_methods[] = {
    // App lifecycle
    {"appRun",                   nativeAppRun,                   0},
    {"appQuit",                  nativeAppQuit,                  0},
    {"appRequestSingleInstanceLock", nativeAppRequestSingleInstanceLock, 1},
    {"appFocusExistingInstance",   nativeAppFocusExistingInstance,   1},

    // Window management
    {"windowCreate",             nativeWindowCreate,             12},
    {"windowDestroy",            nativeWindowDestroy,            1},
    {"windowSetTitle",           nativeWindowSetTitle,           2},
    {"windowGetTitle",           nativeWindowGetTitle,           1},
    {"windowSetSize",            nativeWindowSetSize,            3},
    {"windowGetSize",            nativeWindowGetSize,            1},
    {"windowSetPosition",        nativeWindowSetPosition,        3},
    {"windowGetPosition",        nativeWindowGetPosition,        1},
    {"windowMinimize",           nativeWindowMinimize,           1},
    {"windowMaximize",           nativeWindowMaximize,           1},
    {"windowRestore",            nativeWindowRestore,            1},
    {"windowHide",               nativeWindowHide,               1},
    {"windowShow",               nativeWindowShow,               1},
    {"windowFocus",              nativeWindowFocus,              1},
    {"windowIsMaximized",        nativeWindowIsMaximized,        1},
    {"windowIsMinimized",        nativeWindowIsMinimized,        1},
    {"windowIsVisible",          nativeWindowIsVisible,          1},
    {"windowIsFocused",          nativeWindowIsFocused,          1},
    {"windowSetResizable",       nativeWindowSetResizable,       2},
    {"windowSetMinSize",         nativeWindowSetMinSize,         3},
    {"windowSetMaxSize",         nativeWindowSetMaxSize,         3},
    {"windowSetBackgroundColor", nativeWindowSetBackgroundColor, 5},
    {"windowSetDarkMode",        nativeWindowSetDarkMode,        2},
    {"windowSetVirtualHostMapping", nativeWindowSetVirtualHostMapping, 3},
    {"windowSetFullscreen",      nativeWindowSetFullscreen,      2},
    {"windowIsFullscreen",       nativeWindowIsFullscreen,       1},
    {"windowSetAlwaysOnTop",     nativeWindowSetAlwaysOnTop,     2},
    {"windowCenter",             nativeWindowCenter,             1},
    {"windowSetIcon",            nativeWindowSetIcon,            2},
    {"windowStartDragging",      nativeWindowStartDragging,      1},
    {"windowFlash",              nativeWindowFlash,              2},
    {"windowGetScreenSize",      nativeWindowGetScreenSize,      0},
    {"windowGetAvailableSize",   nativeWindowGetAvailableSize,   0},
    {"windowSetOpacity",         nativeWindowSetOpacity,         2},
    {"windowSetUserAgent",       nativeWindowSetUserAgent,       2},
    {"windowClearCache",         nativeWindowClearCache,         1},
    {"windowClearCookies",       nativeWindowClearCookies,       1},
    {"windowPrint",              nativeWindowPrint,              1},

    // WebView Core
    {"windowNavigate",           nativeWindowNavigate,           2},
    {"windowSetHtml",            nativeWindowSetHtml,            2},
    {"windowEval",               nativeWindowEval,               2},
    {"windowInit",               nativeWindowInit,               2},
    {"windowReload",             nativeWindowReload,             1},
    {"windowGoBack",             nativeWindowGoBack,             1},
    {"windowGoForward",          nativeWindowGoForward,          1},
    {"windowCanGoBack",          nativeWindowCanGoBack,          1},
    {"windowCanGoForward",       nativeWindowCanGoForward,       1},
    {"windowSetZoomLevel",       nativeWindowSetZoomLevel,       2},
    {"windowGetZoomLevel",       nativeWindowGetZoomLevel,       1},
    {"windowOpenDevTools",       nativeWindowOpenDevTools,       1},
    {"windowGetUrl",             nativeWindowGetUrl,             1},
    {"windowSetContextMenu",     nativeWindowSetContextMenu,     2},
    {"windowBind",               nativeWindowBind,               3},
    {"windowUnbind",             nativeWindowUnbind,             2},

    // Event Callbacks
    {"windowSetCloseCallback",   nativeWindowSetCloseCallback,   2},
    {"windowSetDispatcher",      nativeWindowSetDispatcher,      2},
    {"windowSetErrorCallback",   nativeWindowSetErrorCallback,   2},
    {"windowSetMoveCallback",    nativeWindowSetMoveCallback,    2},
    {"windowSetResizeCallback",  nativeWindowSetResizeCallback,  2},
    {"windowSetFocusCallback",   nativeWindowSetFocusCallback,   2},
    {"windowSetBlurCallback",    nativeWindowSetBlurCallback,    2},
    {"windowSetMaximizeCallback",nativeWindowSetMaximizeCallback,2},
    {"windowSetMinimizeCallback",nativeWindowSetMinimizeCallback,2},
    {"windowSetRestoreCallback", nativeWindowSetRestoreCallback, 2},
    {"windowSetNavigateCallback",nativeWindowSetNavigateCallback,2},
    {"windowSetTitleCallback",   nativeWindowSetTitleCallback,   2},
    {"windowSetLoadCallback",    nativeWindowSetLoadCallback,    2},

    // Dialogs
    {"dialogMessage",            nativeDialogMessage,            7},
    {"dialogOpenFile",           nativeDialogOpenFile,           5},
    {"dialogSaveFile",           nativeDialogSaveFile,           3},
    {"dialogOpenFolder",         nativeDialogOpenFolder,         2},
    {"dialogPickColor",          nativeDialogPickColor,          1},

    // Menus
    {"menuCreate",               nativeMenuCreate,               1},
    {"menuCreateSubmenu",        nativeMenuCreateSubmenu,        2},
    {"menuAddSeparator",         nativeMenuAddSeparator,         1},
    {"menuAddItem",              nativeMenuAddItem,              3},
    {"menuSetCallback",          nativeMenuSetCallback,          3},
    {"menuPopup",                nativeMenuPopup,                2},

    // Notifications
    {"notificationShow",         nativeNotificationShow,         6},

    // System Tray
    {"trayCreate",               nativeTrayCreate,               2},
    {"traySetIcon",              nativeTraySetIcon,              2},
    {"traySetMenu",              nativeTraySetMenu,              2},
    {"traySetTooltip",           nativeTraySetTooltip,           2},
    {"trayDestroy",              nativeTrayDestroy,              1},
    {"trayShowBalloon",          nativeTrayShowBalloon,          4},

    // Protocol Schemes
    {"protocolRegister",         nativeProtocolRegister,         2},
    {"protocolUnregister",       nativeProtocolUnregister,       1},

    {NULL, NULL, 0}
};

extern "C" {
    DJAZAIR_EXTENSION(webview, webview_methods)
}
