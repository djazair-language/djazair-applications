/**
 * [ Djazair Programming Language - Raylib Extension ]
 * File: src/raylib_core.c
 * Description: Window management, timing, input handling, and collision detection bindings.
 * Role: Core functionality bridging Raylib 5.5 to Djazair VM with strict type safety.
 * Author: Harizi Riyadh (hariziriyadh@gmail.com)
 */

#include "raylib_common.h"

/* ============================================================
 * Window & Core System Functions
 * ============================================================ */

/**
 * Initializes window and OpenGL context.
 * Signature: init(width: Int, height: Int, title: String) -> Null
 */
DJAZAIR_FUNC(raylibInitNative) {
    djazair_check_args(3, argCount);
    djazair_check_num(0);
    djazair_check_num(1);
    djazair_check_str(2);

    int width  = (int)djazair_as_num(args[0]);
    int height = (int)djazair_as_num(args[1]);
    const char *title = djazair_as_str(args[2]);

    InitWindow(width, height, title);
    return djazair_null();
}

/**
 * Closes window and unloads OpenGL context.
 * Signature: close() -> Null
 */
DJAZAIR_FUNC(raylibCloseNative) {
    (void)argCount; (void)args;
    CloseWindow();
    return djazair_null();
}

/**
 * Checks if KEY_ESCAPE or Close icon was pressed.
 * Signature: shouldClose() -> Bool
 */
DJAZAIR_FUNC(raylibShouldCloseNative) {
    (void)argCount; (void)args;
    return djazair_bool(WindowShouldClose());
}

/**
 * Sets target FPS (maximum frame rate).
 * Signature: setTargetFPS(fps: Int) -> Null
 */
DJAZAIR_FUNC(raylibSetTargetFPSNative) {
    djazair_check_args(1, argCount);
    djazair_check_num(0);
    SetTargetFPS((int)djazair_as_num(args[0]));
    return djazair_null();
}

/**
 * Returns current frames per second.
 * Signature: getFPS() -> Int
 */
DJAZAIR_FUNC(raylibGetFPSNative) {
    (void)argCount; (void)args;
    return djazair_int(GetFPS());
}

/**
 * Returns time in seconds for last frame drawn (delta time).
 * Signature: getFrameTime() -> Float
 */
DJAZAIR_FUNC(raylibGetFrameTimeNative) {
    (void)argCount; (void)args;
    return djazair_float(GetFrameTime());
}

/**
 * Returns current screen / window width.
 * Signature: getScreenWidth() -> Int
 */
DJAZAIR_FUNC(raylibGetScreenWidthNative) {
    (void)argCount; (void)args;
    return djazair_int(GetScreenWidth());
}

/**
 * Returns current screen / window height.
 * Signature: getScreenHeight() -> Int
 */
DJAZAIR_FUNC(raylibGetScreenHeightNative) {
    (void)argCount; (void)args;
    return djazair_int(GetScreenHeight());
}

/**
 * Sets title for current window.
 * Signature: setWindowTitle(title: String) -> Null
 */
DJAZAIR_FUNC(raylibSetWindowTitleNative) {
    djazair_check_args(1, argCount);
    djazair_check_str(0);
    SetWindowTitle(djazair_as_str(args[0]));
    return djazair_null();
}

/**
 * Sets window dimensions.
 * Signature: setWindowSize(width: Int, height: Int) -> Null
 */
DJAZAIR_FUNC(raylibSetWindowSizeNative) {
    djazair_check_args(2, argCount);
    djazair_check_num(0);
    djazair_check_num(1);
    SetWindowSize((int)djazair_as_num(args[0]), (int)djazair_as_num(args[1]));
    return djazair_null();
}

/* ============================================================
 * Drawing State Functions
 * ============================================================ */

/**
 * Sets up canvas (framebuffer) to start drawing.
 * Signature: beginDrawing() -> Null
 */
DJAZAIR_FUNC(raylibBeginDrawingNative) {
    (void)argCount; (void)args;
    BeginDrawing();
    return djazair_null();
}

/**
 * Ends canvas drawing and swaps backbuffer.
 * Signature: endDrawing() -> Null
 */
DJAZAIR_FUNC(raylibEndDrawingNative) {
    (void)argCount; (void)args;
    EndDrawing();
    return djazair_null();
}

/**
 * Sets background color (framebuffer clear color).
 * Signature: clearBackground(color: Color | Array) -> Null
 */
DJAZAIR_FUNC(raylibClearBackgroundNative) {
    djazair_check_args(1, argCount);
    ClearBackground(getColor(vm, args[0]));
    return djazair_null();
}

/**
 * Draws text using default font.
 * Signature: drawText(text: String, posX: Int, posY: Int, fontSize: Int, color: Color | Array) -> Null
 */
DJAZAIR_FUNC(raylibDrawTextNative) {
    djazair_check_args(5, argCount);
    djazair_check_str(0);
    djazair_check_num(1);
    djazair_check_num(2);
    djazair_check_num(3);

    DrawText(djazair_as_str(args[0]),
             (int)djazair_as_num(args[1]),
             (int)djazair_as_num(args[2]),
             (int)djazair_as_num(args[3]),
             getColor(vm, args[4]));
    return djazair_null();
}

/**
 * Measures string width in pixels for default font.
 * Signature: measureText(text: String, fontSize: Int) -> Int
 */
DJAZAIR_FUNC(raylibMeasureTextNative) {
    djazair_check_args(2, argCount);
    djazair_check_str(0);
    djazair_check_num(1);

    return djazair_int(MeasureText(djazair_as_str(args[0]), (int)djazair_as_num(args[1])));
}

/* ============================================================
 * Input Handling: Keyboard
 * ============================================================ */

DJAZAIR_FUNC(raylibIsKeyDownNative) {
    djazair_check_args(1, argCount);
    djazair_check_num(0);
    return djazair_bool(IsKeyDown((int)djazair_as_num(args[0])));
}

DJAZAIR_FUNC(raylibIsKeyPressedNative) {
    djazair_check_args(1, argCount);
    djazair_check_num(0);
    return djazair_bool(IsKeyPressed((int)djazair_as_num(args[0])));
}

DJAZAIR_FUNC(raylibIsKeyReleasedNative) {
    djazair_check_args(1, argCount);
    djazair_check_num(0);
    return djazair_bool(IsKeyReleased((int)djazair_as_num(args[0])));
}

DJAZAIR_FUNC(raylibIsKeyUpNative) {
    djazair_check_args(1, argCount);
    djazair_check_num(0);
    return djazair_bool(IsKeyUp((int)djazair_as_num(args[0])));
}

DJAZAIR_FUNC(raylibGetKeyPressedNative) {
    (void)argCount; (void)args;
    return djazair_int(GetKeyPressed());
}

DJAZAIR_FUNC(raylibGetCharPressedNative) {
    (void)argCount; (void)args;
    return djazair_int(GetCharPressed());
}

/* ============================================================
 * Input Handling: Mouse
 * ============================================================ */

DJAZAIR_FUNC(raylibGetMouseXNative) {
    (void)argCount; (void)args;
    return djazair_int(GetMouseX());
}

DJAZAIR_FUNC(raylibGetMouseYNative) {
    (void)argCount; (void)args;
    return djazair_int(GetMouseY());
}

DJAZAIR_FUNC(raylibIsMouseButtonPressedNative) {
    djazair_check_args(1, argCount);
    djazair_check_num(0);
    return djazair_bool(IsMouseButtonPressed((int)djazair_as_num(args[0])));
}

DJAZAIR_FUNC(raylibIsMouseButtonDownNative) {
    djazair_check_args(1, argCount);
    djazair_check_num(0);
    return djazair_bool(IsMouseButtonDown((int)djazair_as_num(args[0])));
}

DJAZAIR_FUNC(raylibIsMouseButtonReleasedNative) {
    djazair_check_args(1, argCount);
    djazair_check_num(0);
    return djazair_bool(IsMouseButtonReleased((int)djazair_as_num(args[0])));
}

DJAZAIR_FUNC(raylibIsMouseButtonUpNative) {
    djazair_check_args(1, argCount);
    djazair_check_num(0);
    return djazair_bool(IsMouseButtonUp((int)djazair_as_num(args[0])));
}

DJAZAIR_FUNC(raylibGetMouseWheelMoveNative) {
    (void)argCount; (void)args;
    return djazair_float(GetMouseWheelMove());
}

/* ============================================================
 * Collision Detection
 * ============================================================ */

DJAZAIR_FUNC(raylibCheckCollisionRecsNative) {
    djazair_check_args(8, argCount);
    Rectangle r1 = {(float)djazair_as_num(args[0]), (float)djazair_as_num(args[1]),
                    (float)djazair_as_num(args[2]), (float)djazair_as_num(args[3])};
    Rectangle r2 = {(float)djazair_as_num(args[4]), (float)djazair_as_num(args[5]),
                    (float)djazair_as_num(args[6]), (float)djazair_as_num(args[7])};
    return djazair_bool(CheckCollisionRecs(r1, r2));
}

DJAZAIR_FUNC(raylibCheckCollisionCirclesNative) {
    djazair_check_args(6, argCount);
    Vector2 p1 = {(float)djazair_as_num(args[0]), (float)djazair_as_num(args[1])};
    Vector2 p2 = {(float)djazair_as_num(args[3]), (float)djazair_as_num(args[4])};
    return djazair_bool(CheckCollisionCircles(p1, (float)djazair_as_num(args[2]),
                                              p2, (float)djazair_as_num(args[5])));
}

DJAZAIR_FUNC(raylibCheckCollisionCircleRecNative) {
    djazair_check_args(7, argCount);
    Vector2 center = {(float)djazair_as_num(args[0]), (float)djazair_as_num(args[1])};
    float radius = (float)djazair_as_num(args[2]);
    Rectangle rec = {(float)djazair_as_num(args[3]), (float)djazair_as_num(args[4]),
                     (float)djazair_as_num(args[5]), (float)djazair_as_num(args[6])};
    return djazair_bool(CheckCollisionCircleRec(center, radius, rec));
}

DJAZAIR_FUNC(raylibCheckCollisionPointRecNative) {
    djazair_check_args(6, argCount);
    Vector2 point = {(float)djazair_as_num(args[0]), (float)djazair_as_num(args[1])};
    Rectangle rec = {(float)djazair_as_num(args[2]), (float)djazair_as_num(args[3]),
                     (float)djazair_as_num(args[4]), (float)djazair_as_num(args[5])};
    return djazair_bool(CheckCollisionPointRec(point, rec));
}

/* ============================================================
 * Utility & System Functions
 * ============================================================ */

DJAZAIR_FUNC(raylibGetRandomValueNative) {
    djazair_check_args(2, argCount);
    djazair_check_num(0);
    djazair_check_num(1);
    return djazair_int(GetRandomValue((int)djazair_as_num(args[0]),
                                     (int)djazair_as_num(args[1])));
}

DJAZAIR_FUNC(raylibHideCursorNative) {
    (void)argCount; (void)args;
    HideCursor();
    return djazair_null();
}

DJAZAIR_FUNC(raylibShowCursorNative) {
    (void)argCount; (void)args;
    ShowCursor();
    return djazair_null();
}

DJAZAIR_FUNC(raylibGetTimeNative) {
    (void)argCount; (void)args;
    return djazair_float((float)GetTime());
}

DJAZAIR_FUNC(raylibToggleFullscreenNative) {
    (void)argCount; (void)args;
    ToggleFullscreen();
    return djazair_null();
}

DJAZAIR_FUNC(raylibIsWindowResizedNative) {
    (void)argCount; (void)args;
    return djazair_bool(IsWindowResized());
}
