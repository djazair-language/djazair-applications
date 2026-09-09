/**
 * [ Djazair Programming Language - Raylib Extension ]
 * File: src/raylib_helpers.c
 * Description: Robust data conversion and extraction helpers between Djazair runtime and Raylib C structs.
 * Role: Converts colors, vectors, and rectangles transparently from Djazair types/arrays to Raylib C structs.
 * Author: Harizi Riyadh (hariziriyadh@gmail.com)
 */

#include "raylib_common.h"

/**
 * Extracts a Raylib Color struct from a Djazair value.
 * Supports:
 *  - Djazair Array: [r, g, b] or [r, g, b, a]
 *  - Djazair Color instance: instance with fields .r, .g, .b, .a or .raw
 */
Color getColor(djazairVM *vm, djazair_value val) {
    if (djazair_is_array(val)) {
        int count = djazair_array_len(vm, val);
        if (count >= 3) {
            unsigned char r = (unsigned char)AS_NUMBER(djazair_array_get(vm, val, 0));
            unsigned char g = (unsigned char)AS_NUMBER(djazair_array_get(vm, val, 1));
            unsigned char b = (unsigned char)AS_NUMBER(djazair_array_get(vm, val, 2));
            unsigned char a = (count >= 4) ? (unsigned char)AS_NUMBER(djazair_array_get(vm, val, 3)) : 255;
            return (Color){r, g, b, a};
        }
    } else if (djazair_is_instance(val)) {
        djazair_value raw = djazair_instance_get(vm, val, djazair_str(vm, "raw"));
        if (djazair_is_array(raw)) {
            return getColor(vm, raw);
        }
        unsigned char r = (unsigned char)getInstanceFloat(vm, val, "r", 0.0f);
        unsigned char g = (unsigned char)getInstanceFloat(vm, val, "g", 0.0f);
        unsigned char b = (unsigned char)getInstanceFloat(vm, val, "b", 0.0f);
        unsigned char a = (unsigned char)getInstanceFloat(vm, val, "a", 255.0f);
        return (Color){r, g, b, a};
    }
    return BLACK;
}

/**
 * Extracts a Raylib Vector2 struct from a Djazair value.
 * Supports:
 *  - Djazair Array: [x, y]
 *  - Djazair Vector2 instance: instance with fields .x, .y
 */
Vector2 getVector2(djazairVM *vm, djazair_value val) {
    if (djazair_is_array(val)) {
        int count = djazair_array_len(vm, val);
        if (count >= 2) {
            float x = (float)AS_NUMBER(djazair_array_get(vm, val, 0));
            float y = (float)AS_NUMBER(djazair_array_get(vm, val, 1));
            return (Vector2){x, y};
        }
    } else if (djazair_is_instance(val)) {
        float x = getInstanceFloat(vm, val, "x", 0.0f);
        float y = getInstanceFloat(vm, val, "y", 0.0f);
        return (Vector2){x, y};
    }
    return (Vector2){0.0f, 0.0f};
}

/**
 * Extracts a Raylib Rectangle struct from a Djazair value.
 * Supports:
 *  - Djazair Array: [x, y, w, h]
 *  - Djazair Rectangle instance: instance with fields .x, .y, .w, .h
 */
Rectangle getRectangle(djazairVM *vm, djazair_value val) {
    if (djazair_is_array(val)) {
        int count = djazair_array_len(vm, val);
        if (count >= 4) {
            float x = (float)AS_NUMBER(djazair_array_get(vm, val, 0));
            float y = (float)AS_NUMBER(djazair_array_get(vm, val, 1));
            float w = (float)AS_NUMBER(djazair_array_get(vm, val, 2));
            float h = (float)AS_NUMBER(djazair_array_get(vm, val, 3));
            return (Rectangle){x, y, w, h};
        }
    } else if (djazair_is_instance(val)) {
        float x = getInstanceFloat(vm, val, "x", 0.0f);
        float y = getInstanceFloat(vm, val, "y", 0.0f);
        float w = getInstanceFloat(vm, val, "w", 0.0f);
        float h = getInstanceFloat(vm, val, "h", 0.0f);
        return (Rectangle){x, y, w, h};
    }
    return (Rectangle){0.0f, 0.0f, 0.0f, 0.0f};
}

/**
 * Helper to safely extract a float property from an instance field.
 */
float getInstanceFloat(djazairVM *vm, djazair_value inst, const char *key, float fallback) {
    djazair_value k = djazair_str(vm, key);
    djazair_value v = djazair_instance_get(vm, inst, k);
    return djazair_is_number(v) ? (float)AS_NUMBER(v) : fallback;
}
