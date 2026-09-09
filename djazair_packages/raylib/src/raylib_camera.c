/**
 * [ Djazair Programming Language - Raylib Extension ]
 * File: src/raylib_camera.c
 * Description: 2D Camera system bindings (Camera2D) for viewport transformations.
 * Role: Converts world coordinates to screen and vice versa, and manages 2D camera viewport state.
 * Author: Harizi Riyadh (hariziriyadh@gmail.com)
 */

#include "raylib_common.h"

DJAZAIR_FUNC(raylibBeginMode2DNative) {
    djazair_check_args(1, argCount);
    djazair_check_instance(0);

    Camera2D camera = {0};
    camera.offset.x  = getInstanceFloat(vm, args[0], "offset_x", 0.0f);
    camera.offset.y  = getInstanceFloat(vm, args[0], "offset_y", 0.0f);
    camera.target.x  = getInstanceFloat(vm, args[0], "target_x", 0.0f);
    camera.target.y  = getInstanceFloat(vm, args[0], "target_y", 0.0f);
    camera.rotation  = getInstanceFloat(vm, args[0], "rotation", 0.0f);
    camera.zoom      = getInstanceFloat(vm, args[0], "zoom", 1.0f);

    BeginMode2D(camera);
    return djazair_null();
}

DJAZAIR_FUNC(raylibEndMode2DNative) {
    (void)argCount; (void)args;
    EndMode2D();
    return djazair_null();
}

DJAZAIR_FUNC(raylibGetScreenToWorld2DNative) {
    djazair_check_args(3, argCount);
    djazair_check_num(0);
    djazair_check_num(1);
    djazair_check_instance(2);

    Vector2 position = {(float)djazair_as_num(args[0]), (float)djazair_as_num(args[1])};
    Camera2D camera = {0};
    camera.offset.x  = getInstanceFloat(vm, args[2], "offset_x", 0.0f);
    camera.offset.y  = getInstanceFloat(vm, args[2], "offset_y", 0.0f);
    camera.target.x  = getInstanceFloat(vm, args[2], "target_x", 0.0f);
    camera.target.y  = getInstanceFloat(vm, args[2], "target_y", 0.0f);
    camera.rotation  = getInstanceFloat(vm, args[2], "rotation", 0.0f);
    camera.zoom      = getInstanceFloat(vm, args[2], "zoom", 1.0f);

    Vector2 worldPos = GetScreenToWorld2D(position, camera);

    djazair_value arr = djazair_new_array(vm);
    djazair_array_push(vm, arr, djazair_float(worldPos.x));
    djazair_array_push(vm, arr, djazair_float(worldPos.y));
    return arr;
}

DJAZAIR_FUNC(raylibGetWorldToScreen2DNative) {
    djazair_check_args(3, argCount);
    djazair_check_num(0);
    djazair_check_num(1);
    djazair_check_instance(2);

    Vector2 position = {(float)djazair_as_num(args[0]), (float)djazair_as_num(args[1])};
    Camera2D camera = {0};
    camera.offset.x  = getInstanceFloat(vm, args[2], "offset_x", 0.0f);
    camera.offset.y  = getInstanceFloat(vm, args[2], "offset_y", 0.0f);
    camera.target.x  = getInstanceFloat(vm, args[2], "target_x", 0.0f);
    camera.target.y  = getInstanceFloat(vm, args[2], "target_y", 0.0f);
    camera.rotation  = getInstanceFloat(vm, args[2], "rotation", 0.0f);
    camera.zoom      = getInstanceFloat(vm, args[2], "zoom", 1.0f);

    Vector2 screenPos = GetWorldToScreen2D(position, camera);

    djazair_value arr = djazair_new_array(vm);
    djazair_array_push(vm, arr, djazair_float(screenPos.x));
    djazair_array_push(vm, arr, djazair_float(screenPos.y));
    return arr;
}
