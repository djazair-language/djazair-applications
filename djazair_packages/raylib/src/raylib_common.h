/**
 * [ Djazair Programming Language - Raylib Extension ]
 * File: src/raylib_common.h
 * Description: Common definitions, types, and native method declarations for the Raylib extension.
 * Role: Bridges Raylib 5.5 C functions with Djazair VM native module interface.
 * Author: Harizi Riyadh (hariziriyadh@gmail.com)
 */

#ifndef DJAZAIR_RAYLIB_COMMON_H
#define DJAZAIR_RAYLIB_COMMON_H

#include "raylib.h"
#include "djazair_api.h"
#include <string.h>

/* ============================================================
 * Internal Helper Functions
 * ============================================================ */

/**
 * Extracts a Raylib Color from a Djazair value (Array [r, g, b, a], or Color instance).
 */
Color getColor(djazairVM *vm, djazair_value val);

/**
 * Extracts a Raylib Vector2 from a Djazair value (Array [x, y], or Vector2 instance).
 */
Vector2 getVector2(djazairVM *vm, djazair_value val);

/**
 * Extracts a Raylib Rectangle from a Djazair value (Array [x, y, w, h], or Rectangle instance).
 */
Rectangle getRectangle(djazairVM *vm, djazair_value val);

/**
 * Helper to safely extract a float property from an instance field.
 */
float getInstanceFloat(djazairVM *vm, djazair_value inst, const char *key, float fallback);

/* ============================================================
 * Native Function Declarations
 * ============================================================ */

/* Window & Core */
DJAZAIR_FUNC(raylibInitNative);
DJAZAIR_FUNC(raylibCloseNative);
DJAZAIR_FUNC(raylibShouldCloseNative);
DJAZAIR_FUNC(raylibSetTargetFPSNative);
DJAZAIR_FUNC(raylibGetFPSNative);
DJAZAIR_FUNC(raylibGetFrameTimeNative);
DJAZAIR_FUNC(raylibGetScreenWidthNative);
DJAZAIR_FUNC(raylibGetScreenHeightNative);
DJAZAIR_FUNC(raylibSetWindowTitleNative);
DJAZAIR_FUNC(raylibSetWindowSizeNative);

/* Drawing */
DJAZAIR_FUNC(raylibBeginDrawingNative);
DJAZAIR_FUNC(raylibEndDrawingNative);
DJAZAIR_FUNC(raylibClearBackgroundNative);
DJAZAIR_FUNC(raylibDrawTextNative);
DJAZAIR_FUNC(raylibMeasureTextNative);

/* Shapes */
DJAZAIR_FUNC(raylibDrawRectangleNative);
DJAZAIR_FUNC(raylibDrawRectangleLinesNative);
DJAZAIR_FUNC(raylibDrawRectangleGradientVNative);
DJAZAIR_FUNC(raylibDrawCircleNative);
DJAZAIR_FUNC(raylibDrawCircleLinesNative);
DJAZAIR_FUNC(raylibDrawLineNative);
DJAZAIR_FUNC(raylibDrawLineExNative);
DJAZAIR_FUNC(raylibDrawTriangleNative);
DJAZAIR_FUNC(raylibDrawTriangleLinesNative);
DJAZAIR_FUNC(raylibDrawPolyNative);
DJAZAIR_FUNC(raylibDrawRectangleRoundedNative);
DJAZAIR_FUNC(raylibDrawEllipseNative);

/* Input: Keyboard */
DJAZAIR_FUNC(raylibIsKeyDownNative);
DJAZAIR_FUNC(raylibIsKeyPressedNative);
DJAZAIR_FUNC(raylibIsKeyReleasedNative);
DJAZAIR_FUNC(raylibIsKeyUpNative);
DJAZAIR_FUNC(raylibGetKeyPressedNative);
DJAZAIR_FUNC(raylibGetCharPressedNative);

/* Input: Mouse */
DJAZAIR_FUNC(raylibGetMouseXNative);
DJAZAIR_FUNC(raylibGetMouseYNative);
DJAZAIR_FUNC(raylibIsMouseButtonPressedNative);
DJAZAIR_FUNC(raylibIsMouseButtonDownNative);
DJAZAIR_FUNC(raylibIsMouseButtonReleasedNative);
DJAZAIR_FUNC(raylibIsMouseButtonUpNative);
DJAZAIR_FUNC(raylibGetMouseWheelMoveNative);

/* Collision Detection */
DJAZAIR_FUNC(raylibCheckCollisionRecsNative);
DJAZAIR_FUNC(raylibCheckCollisionCirclesNative);
DJAZAIR_FUNC(raylibCheckCollisionCircleRecNative);
DJAZAIR_FUNC(raylibCheckCollisionPointRecNative);

/* Utility & System */
DJAZAIR_FUNC(raylibGetRandomValueNative);
DJAZAIR_FUNC(raylibHideCursorNative);
DJAZAIR_FUNC(raylibShowCursorNative);
DJAZAIR_FUNC(raylibGetTimeNative);
DJAZAIR_FUNC(raylibToggleFullscreenNative);
DJAZAIR_FUNC(raylibIsWindowResizedNative);

/* Textures */
DJAZAIR_FUNC(raylibLoadTextureNative);
DJAZAIR_FUNC(raylibDrawTextureNative);
DJAZAIR_FUNC(raylibUnloadTextureNative);
DJAZAIR_FUNC(raylibDrawTextureRecNative);
DJAZAIR_FUNC(raylibDrawTextureExNative);

/* Audio */
DJAZAIR_FUNC(raylibInitAudioNative);
DJAZAIR_FUNC(raylibCloseAudioNative);
DJAZAIR_FUNC(raylibLoadSoundNative);
DJAZAIR_FUNC(raylibPlaySoundNative);
DJAZAIR_FUNC(raylibUnloadSoundNative);
DJAZAIR_FUNC(raylibLoadMusicStreamNative);
DJAZAIR_FUNC(raylibPlayMusicStreamNative);
DJAZAIR_FUNC(raylibUpdateMusicStreamNative);
DJAZAIR_FUNC(raylibUnloadMusicStreamNative);
DJAZAIR_FUNC(raylibStopMusicStreamNative);
DJAZAIR_FUNC(raylibPauseMusicStreamNative);
DJAZAIR_FUNC(raylibResumeMusicStreamNative);
DJAZAIR_FUNC(raylibIsMusicStreamPlayingNative);
DJAZAIR_FUNC(raylibSetMusicVolumeNative);

/* Camera2D */
DJAZAIR_FUNC(raylibBeginMode2DNative);
DJAZAIR_FUNC(raylibEndMode2DNative);
DJAZAIR_FUNC(raylibGetScreenToWorld2DNative);
DJAZAIR_FUNC(raylibGetWorldToScreen2DNative);

/* Fonts */
DJAZAIR_FUNC(raylibLoadFontNative);
DJAZAIR_FUNC(raylibUnloadFontNative);
DJAZAIR_FUNC(raylibDrawTextExNative);

/* Type Helpers */
DJAZAIR_FUNC(raylibIsColorNative);

#endif /* DJAZAIR_RAYLIB_COMMON_H */
