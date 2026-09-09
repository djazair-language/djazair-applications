/**
 * [ Djazair Programming Language - Raylib Extension ]
 * File: src/raylib_shapes.c
 * Description: 2D basic geometric shapes drawing functions bindings.
 * Role: Provides flexible overloads for drawing rectangles, circles, lines, triangles, and polygons.
 * Author: Harizi Riyadh (hariziriyadh@gmail.com)
 */

#include "raylib_common.h"

/* ============================================================
 * Rectangles
 * ============================================================ */

/**
 * Draws a solid rectangle.
 * Overloads:
 *  - drawRectangle(rec: Rectangle | Array, color: Color | Array)
 *  - drawRectangle(posX: Num, posY: Num, width: Num, height: Num, color: Color | Array)
 */
DJAZAIR_FUNC(raylibDrawRectangleNative) {
    if (argCount == 2) {
        Rectangle rec = getRectangle(vm, args[0]);
        Color col = getColor(vm, args[1]);
        DrawRectangleRec(rec, col);
        return djazair_null();
    } else if (argCount == 5) {
        DrawRectangle((int)djazair_as_num(args[0]), (int)djazair_as_num(args[1]),
                      (int)djazair_as_num(args[2]), (int)djazair_as_num(args[3]),
                      getColor(vm, args[4]));
        return djazair_null();
    }
    djazair_error("raylib.drawRectangle expects (rec, color) or (x, y, w, h, color).");
    return djazair_null();
}

/**
 * Draws outline of a rectangle.
 * Overloads:
 *  - drawRectangleLines(rec: Rectangle | Array, color: Color | Array)
 *  - drawRectangleLines(posX: Num, posY: Num, width: Num, height: Num, color: Color | Array)
 */
DJAZAIR_FUNC(raylibDrawRectangleLinesNative) {
    if (argCount == 2) {
        Rectangle rec = getRectangle(vm, args[0]);
        Color col = getColor(vm, args[1]);
        DrawRectangleLines((int)rec.x, (int)rec.y, (int)rec.width, (int)rec.height, col);
        return djazair_null();
    } else if (argCount == 5) {
        DrawRectangleLines((int)djazair_as_num(args[0]), (int)djazair_as_num(args[1]),
                           (int)djazair_as_num(args[2]), (int)djazair_as_num(args[3]),
                           getColor(vm, args[4]));
        return djazair_null();
    }
    djazair_error("raylib.drawRectangleLines expects (rec, color) or (x, y, w, h, color).");
    return djazair_null();
}

/**
 * Draws a vertical-gradient-filled rectangle.
 * Signature: drawRectangleGradientV(x, y, w, h, colorTop, colorBottom)
 */
DJAZAIR_FUNC(raylibDrawRectangleGradientVNative) {
    djazair_check_args(6, argCount);
    DrawRectangleGradientV((int)djazair_as_num(args[0]), (int)djazair_as_num(args[1]),
                           (int)djazair_as_num(args[2]), (int)djazair_as_num(args[3]),
                           getColor(vm, args[4]), getColor(vm, args[5]));
    return djazair_null();
}

/**
 * Draws a rectangle with rounded corners.
 * Overloads:
 *  - drawRectangleRounded(rec: Rectangle | Array, roundness: Float, segments: Int, color: Color | Array)
 *  - drawRectangleRounded(posX, posY, width, height, roundness: Float, segments: Int, color: Color | Array)
 */
DJAZAIR_FUNC(raylibDrawRectangleRoundedNative) {
    if (argCount == 4) {
        Rectangle rec = getRectangle(vm, args[0]);
        float roundness = (float)djazair_as_num(args[1]);
        int segments = (int)djazair_as_num(args[2]);
        Color col = getColor(vm, args[3]);
        DrawRectangleRounded(rec, roundness, segments, col);
        return djazair_null();
    } else if (argCount == 7) {
        Rectangle rec = {(float)djazair_as_num(args[0]), (float)djazair_as_num(args[1]),
                         (float)djazair_as_num(args[2]), (float)djazair_as_num(args[3])};
        float roundness = (float)djazair_as_num(args[4]);
        int segments = (int)djazair_as_num(args[5]);
        Color col = getColor(vm, args[6]);
        DrawRectangleRounded(rec, roundness, segments, col);
        return djazair_null();
    }
    djazair_error("raylib.drawRectangleRounded expects (rec, roundness, segments, color) or (x, y, w, h, roundness, segments, color).");
    return djazair_null();
}

/* ============================================================
 * Circles & Ellipses
 * ============================================================ */

/**
 * Draws a solid circle.
 * Overloads:
 *  - drawCircle(center: Vector2 | Array, radius: Float, color: Color | Array)
 *  - drawCircle(centerX: Int, centerY: Int, radius: Float, color: Color | Array)
 */
DJAZAIR_FUNC(raylibDrawCircleNative) {
    if (argCount == 3) {
        Vector2 center = getVector2(vm, args[0]);
        float radius = (float)djazair_as_num(args[1]);
        Color col = getColor(vm, args[2]);
        DrawCircleV(center, radius, col);
        return djazair_null();
    } else if (argCount == 4) {
        DrawCircle((int)djazair_as_num(args[0]), (int)djazair_as_num(args[1]),
                   (float)djazair_as_num(args[2]), getColor(vm, args[3]));
        return djazair_null();
    }
    djazair_error("raylib.drawCircle expects (center, radius, color) or (x, y, radius, color).");
    return djazair_null();
}

/**
 * Draws outline of a circle.
 * Overloads:
 *  - drawCircleLines(center: Vector2 | Array, radius: Float, color: Color | Array)
 *  - drawCircleLines(centerX: Int, centerY: Int, radius: Float, color: Color | Array)
 */
DJAZAIR_FUNC(raylibDrawCircleLinesNative) {
    if (argCount == 3) {
        Vector2 center = getVector2(vm, args[0]);
        float radius = (float)djazair_as_num(args[1]);
        Color col = getColor(vm, args[2]);
        DrawCircleLines((int)center.x, (int)center.y, radius, col);
        return djazair_null();
    } else if (argCount == 4) {
        DrawCircleLines((int)djazair_as_num(args[0]), (int)djazair_as_num(args[1]),
                        (float)djazair_as_num(args[2]), getColor(vm, args[3]));
        return djazair_null();
    }
    djazair_error("raylib.drawCircleLines expects (center, radius, color) or (x, y, radius, color).");
    return djazair_null();
}

/**
 * Draws a solid ellipse.
 * Signature: drawEllipse(centerX: Int, centerY: Int, radiusH: Float, radiusV: Float, color: Color | Array)
 */
DJAZAIR_FUNC(raylibDrawEllipseNative) {
    djazair_check_args(5, argCount);
    DrawEllipse((int)djazair_as_num(args[0]), (int)djazair_as_num(args[1]),
                (float)djazair_as_num(args[2]), (float)djazair_as_num(args[3]),
                getColor(vm, args[4]));
    return djazair_null();
}

/* ============================================================
 * Lines
 * ============================================================ */

/**
 * Draws a 1-pixel line.
 * Overloads:
 *  - drawLine(startPos: Vector2 | Array, endPos: Vector2 | Array, color: Color | Array)
 *  - drawLine(startPosX, startPosY, endPosX, endPosY, color: Color | Array)
 */
DJAZAIR_FUNC(raylibDrawLineNative) {
    if (argCount == 3) {
        Vector2 start = getVector2(vm, args[0]);
        Vector2 end = getVector2(vm, args[1]);
        Color col = getColor(vm, args[2]);
        DrawLineV(start, end, col);
        return djazair_null();
    } else if (argCount == 5) {
        DrawLine((int)djazair_as_num(args[0]), (int)djazair_as_num(args[1]),
                 (int)djazair_as_num(args[2]), (int)djazair_as_num(args[3]),
                 getColor(vm, args[4]));
        return djazair_null();
    }
    djazair_error("raylib.drawLine expects (startPos, endPos, color) or (x1, y1, x2, y2, color).");
    return djazair_null();
}

/**
 * Draws a line with given thickness.
 * Overloads:
 *  - drawLineEx(startPos: Vector2 | Array, endPos: Vector2 | Array, thick: Float, color: Color | Array)
 *  - drawLineEx(startPosX, startPosY, endPosX, endPosY, thick: Float, color: Color | Array)
 */
DJAZAIR_FUNC(raylibDrawLineExNative) {
    if (argCount == 4) {
        Vector2 start = getVector2(vm, args[0]);
        Vector2 end = getVector2(vm, args[1]);
        float thick = (float)djazair_as_num(args[2]);
        Color col = getColor(vm, args[3]);
        DrawLineEx(start, end, thick, col);
        return djazair_null();
    } else if (argCount == 6) {
        Vector2 start = {(float)djazair_as_num(args[0]), (float)djazair_as_num(args[1])};
        Vector2 end = {(float)djazair_as_num(args[2]), (float)djazair_as_num(args[3])};
        float thick = (float)djazair_as_num(args[4]);
        Color col = getColor(vm, args[5]);
        DrawLineEx(start, end, thick, col);
        return djazair_null();
    }
    djazair_error("raylib.drawLineEx expects (startPos, endPos, thick, color) or (x1, y1, x2, y2, thick, color).");
    return djazair_null();
}

/* ============================================================
 * Triangles & Polygons
 * ============================================================ */

/**
 * Draws a solid color triangle.
 * Overloads:
 *  - drawTriangle(v1: Vector2 | Array, v2: Vector2 | Array, v3: Vector2 | Array, color: Color | Array)
 *  - drawTriangle(x1, y1, x2, y2, x3, y3, color: Color | Array)
 */
DJAZAIR_FUNC(raylibDrawTriangleNative) {
    if (argCount == 4) {
        Vector2 v1 = getVector2(vm, args[0]);
        Vector2 v2 = getVector2(vm, args[1]);
        Vector2 v3 = getVector2(vm, args[2]);
        Color col = getColor(vm, args[3]);
        DrawTriangle(v1, v2, v3, col);
        return djazair_null();
    } else if (argCount == 7) {
        Vector2 v1 = {(float)djazair_as_num(args[0]), (float)djazair_as_num(args[1])};
        Vector2 v2 = {(float)djazair_as_num(args[2]), (float)djazair_as_num(args[3])};
        Vector2 v3 = {(float)djazair_as_num(args[4]), (float)djazair_as_num(args[5])};
        Color col = getColor(vm, args[6]);
        DrawTriangle(v1, v2, v3, col);
        return djazair_null();
    }
    djazair_error("raylib.drawTriangle expects (v1, v2, v3, color) or (x1, y1, x2, y2, x3, y3, color).");
    return djazair_null();
}

/**
 * Draws outline of a triangle.
 * Overloads:
 *  - drawTriangleLines(v1: Vector2 | Array, v2: Vector2 | Array, v3: Vector2 | Array, color: Color | Array)
 *  - drawTriangleLines(x1, y1, x2, y2, x3, y3, color: Color | Array)
 */
DJAZAIR_FUNC(raylibDrawTriangleLinesNative) {
    if (argCount == 4) {
        Vector2 v1 = getVector2(vm, args[0]);
        Vector2 v2 = getVector2(vm, args[1]);
        Vector2 v3 = getVector2(vm, args[2]);
        Color col = getColor(vm, args[3]);
        DrawTriangleLines(v1, v2, v3, col);
        return djazair_null();
    } else if (argCount == 7) {
        Vector2 v1 = {(float)djazair_as_num(args[0]), (float)djazair_as_num(args[1])};
        Vector2 v2 = {(float)djazair_as_num(args[2]), (float)djazair_as_num(args[3])};
        Vector2 v3 = {(float)djazair_as_num(args[4]), (float)djazair_as_num(args[5])};
        Color col = getColor(vm, args[6]);
        DrawTriangleLines(v1, v2, v3, col);
        return djazair_null();
    }
    djazair_error("raylib.drawTriangleLines expects (v1, v2, v3, color) or (x1, y1, x2, y2, x3, y3, color).");
    return djazair_null();
}

/**
 * Draws a regular polygon.
 * Overloads:
 *  - drawPoly(center: Vector2 | Array, sides: Int, radius: Float, rotation: Float, color: Color | Array)
 *  - drawPoly(centerX, centerY, sides: Int, radius: Float, rotation: Float, color: Color | Array)
 */
DJAZAIR_FUNC(raylibDrawPolyNative) {
    if (argCount == 5) {
        Vector2 center = getVector2(vm, args[0]);
        int sides = (int)djazair_as_num(args[1]);
        float radius = (float)djazair_as_num(args[2]);
        float rotation = (float)djazair_as_num(args[3]);
        Color col = getColor(vm, args[4]);
        DrawPoly(center, sides, radius, rotation, col);
        return djazair_null();
    } else if (argCount == 6) {
        Vector2 center = {(float)djazair_as_num(args[0]), (float)djazair_as_num(args[1])};
        int sides = (int)djazair_as_num(args[2]);
        float radius = (float)djazair_as_num(args[3]);
        float rotation = (float)djazair_as_num(args[4]);
        Color col = getColor(vm, args[5]);
        DrawPoly(center, sides, radius, rotation, col);
        return djazair_null();
    }
    djazair_error("raylib.drawPoly expects (center, sides, radius, rotation, color) or (x, y, sides, radius, rotation, color).");
    return djazair_null();
}
