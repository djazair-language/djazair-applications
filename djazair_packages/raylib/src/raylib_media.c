/**
 * [ Djazair Programming Language - Raylib Extension ]
 * File: src/raylib_media.c
 * Description: Textures, Audio device, Sounds, Music streams, and Fonts management with GC finalizers.
 * Role: Bridges Raylib media resources into Djazair VM with automatic cleanup and safe resource management.
 * Author: Harizi Riyadh (hariziriyadh@gmail.com)
 */

#include "raylib_common.h"
#include <stdlib.h>

/* ============================================================
 * Finalizers for Automatic GC Cleanup
 * ============================================================ */

static void finalizeTextureResource(void *ptr) {
    if (ptr != NULL) {
        Texture2D *tex = (Texture2D *)ptr;
        if (tex->id > 0) {
            UnloadTexture(*tex);
        }
        free(tex);
    }
}

static void finalizeSoundResource(void *ptr) {
    if (ptr != NULL) {
        Sound *snd = (Sound *)ptr;
        if (snd->frameCount > 0) {
            UnloadSound(*snd);
        }
        free(snd);
    }
}

static void finalizeMusicResource(void *ptr) {
    if (ptr != NULL) {
        Music *mus = (Music *)ptr;
        if (mus->frameCount > 0) {
            UnloadMusicStream(*mus);
        }
        free(mus);
    }
}

static void finalizeFontResource(void *ptr) {
    if (ptr != NULL) {
        Font *fnt = (Font *)ptr;
        if (fnt->baseSize > 0) {
            UnloadFont(*fnt);
        }
        free(fnt);
    }
}

/* ============================================================
 * Textures Management
 * ============================================================ */

DJAZAIR_FUNC(raylibLoadTextureNative) {
    djazair_check_args(1, argCount);
    djazair_check_str(0);

    char resolved[4096];
    djazair_resolve_path(vm, djazair_as_str(args[0]), resolved, sizeof(resolved));

    Texture2D *texture = (Texture2D *)malloc(sizeof(Texture2D));
    if (!texture) return djazair_null();

    *texture = LoadTexture(resolved);
    return djazair_new_resource_with_finalizer(vm, texture, "Texture", finalizeTextureResource);
}

DJAZAIR_FUNC(raylibDrawTextureNative) {
    djazair_check_args(3, argCount);
    djazair_check_resource(0);
    djazair_check_num(1);
    djazair_check_num(2);

    Texture2D *texture = (Texture2D *)djazair_get_resource(vm, args[0]);
    if (!texture || texture->id == 0) return djazair_null();

    DrawTexture(*texture, (int)djazair_as_num(args[1]), (int)djazair_as_num(args[2]), WHITE);
    return djazair_null();
}

DJAZAIR_FUNC(raylibUnloadTextureNative) {
    djazair_check_args(1, argCount);
    if (djazair_is_resource(args[0])) {
        Texture2D *texture = (Texture2D *)djazair_get_resource(vm, args[0]);
        if (texture) {
            if (texture->id > 0) UnloadTexture(*texture);
            free(texture);
            AS_RESOURCE(args[0])->ptr = NULL;
        }
    }
    return djazair_null();
}

DJAZAIR_FUNC(raylibDrawTextureRecNative) {
    djazair_check_args(8, argCount);
    djazair_check_resource(0);

    Texture2D *texture = (Texture2D *)djazair_get_resource(vm, args[0]);
    if (!texture || texture->id == 0) return djazair_null();

    Rectangle source = {(float)djazair_as_num(args[1]), (float)djazair_as_num(args[2]),
                        (float)djazair_as_num(args[3]), (float)djazair_as_num(args[4])};
    Vector2 position = {(float)djazair_as_num(args[5]), (float)djazair_as_num(args[6])};
    Color tint = getColor(vm, args[7]);

    DrawTextureRec(*texture, source, position, tint);
    return djazair_null();
}

DJAZAIR_FUNC(raylibDrawTextureExNative) {
    djazair_check_args(6, argCount);
    djazair_check_resource(0);

    Texture2D *texture = (Texture2D *)djazair_get_resource(vm, args[0]);
    if (!texture || texture->id == 0) return djazair_null();

    Vector2 position = {(float)djazair_as_num(args[1]), (float)djazair_as_num(args[2])};
    float rotation = (float)djazair_as_num(args[3]);
    float scale = (float)djazair_as_num(args[4]);
    Color tint = getColor(vm, args[5]);

    DrawTextureEx(*texture, position, rotation, scale, tint);
    return djazair_null();
}

/* ============================================================
 * Audio Management
 * ============================================================ */

DJAZAIR_FUNC(raylibInitAudioNative) {
    (void)argCount; (void)args;
    InitAudioDevice();
    return djazair_null();
}

DJAZAIR_FUNC(raylibCloseAudioNative) {
    (void)argCount; (void)args;
    CloseAudioDevice();
    return djazair_null();
}

DJAZAIR_FUNC(raylibLoadSoundNative) {
    djazair_check_args(1, argCount);
    djazair_check_str(0);

    char resolved[4096];
    djazair_resolve_path(vm, djazair_as_str(args[0]), resolved, sizeof(resolved));

    Sound *sound = (Sound *)malloc(sizeof(Sound));
    if (!sound) return djazair_null();

    *sound = LoadSound(resolved);
    return djazair_new_resource_with_finalizer(vm, sound, "Sound", finalizeSoundResource);
}

DJAZAIR_FUNC(raylibPlaySoundNative) {
    djazair_check_args(1, argCount);
    djazair_check_resource(0);

    Sound *sound = (Sound *)djazair_get_resource(vm, args[0]);
    if (sound && sound->frameCount > 0) PlaySound(*sound);
    return djazair_null();
}

DJAZAIR_FUNC(raylibUnloadSoundNative) {
    djazair_check_args(1, argCount);
    if (djazair_is_resource(args[0])) {
        Sound *sound = (Sound *)djazair_get_resource(vm, args[0]);
        if (sound) {
            if (sound->frameCount > 0) UnloadSound(*sound);
            free(sound);
            AS_RESOURCE(args[0])->ptr = NULL;
        }
    }
    return djazair_null();
}

/* ============================================================
 * Music Streams Management
 * ============================================================ */

DJAZAIR_FUNC(raylibLoadMusicStreamNative) {
    djazair_check_args(1, argCount);
    djazair_check_str(0);

    char resolved[4096];
    djazair_resolve_path(vm, djazair_as_str(args[0]), resolved, sizeof(resolved));

    Music *music = (Music *)malloc(sizeof(Music));
    if (!music) return djazair_null();

    *music = LoadMusicStream(resolved);
    return djazair_new_resource_with_finalizer(vm, music, "Music", finalizeMusicResource);
}

DJAZAIR_FUNC(raylibPlayMusicStreamNative) {
    djazair_check_args(1, argCount);
    djazair_check_resource(0);

    Music *music = (Music *)djazair_get_resource(vm, args[0]);
    if (music && music->frameCount > 0) PlayMusicStream(*music);
    return djazair_null();
}

DJAZAIR_FUNC(raylibUpdateMusicStreamNative) {
    djazair_check_args(1, argCount);
    djazair_check_resource(0);

    Music *music = (Music *)djazair_get_resource(vm, args[0]);
    if (music && music->frameCount > 0) UpdateMusicStream(*music);
    return djazair_null();
}

DJAZAIR_FUNC(raylibUnloadMusicStreamNative) {
    djazair_check_args(1, argCount);
    if (djazair_is_resource(args[0])) {
        Music *music = (Music *)djazair_get_resource(vm, args[0]);
        if (music) {
            if (music->frameCount > 0) UnloadMusicStream(*music);
            free(music);
            AS_RESOURCE(args[0])->ptr = NULL;
        }
    }
    return djazair_null();
}

DJAZAIR_FUNC(raylibStopMusicStreamNative) {
    djazair_check_args(1, argCount);
    djazair_check_resource(0);

    Music *music = (Music *)djazair_get_resource(vm, args[0]);
    if (music && music->frameCount > 0) StopMusicStream(*music);
    return djazair_null();
}

DJAZAIR_FUNC(raylibPauseMusicStreamNative) {
    djazair_check_args(1, argCount);
    djazair_check_resource(0);

    Music *music = (Music *)djazair_get_resource(vm, args[0]);
    if (music && music->frameCount > 0) PauseMusicStream(*music);
    return djazair_null();
}

DJAZAIR_FUNC(raylibResumeMusicStreamNative) {
    djazair_check_args(1, argCount);
    djazair_check_resource(0);

    Music *music = (Music *)djazair_get_resource(vm, args[0]);
    if (music && music->frameCount > 0) ResumeMusicStream(*music);
    return djazair_null();
}

DJAZAIR_FUNC(raylibIsMusicStreamPlayingNative) {
    djazair_check_args(1, argCount);
    djazair_check_resource(0);

    Music *music = (Music *)djazair_get_resource(vm, args[0]);
    return djazair_bool(music && music->frameCount > 0 ? IsMusicStreamPlaying(*music) : false);
}

DJAZAIR_FUNC(raylibSetMusicVolumeNative) {
    djazair_check_args(2, argCount);
    djazair_check_resource(0);
    djazair_check_num(1);

    Music *music = (Music *)djazair_get_resource(vm, args[0]);
    if (music && music->frameCount > 0) SetMusicVolume(*music, (float)djazair_as_num(args[1]));
    return djazair_null();
}

/* ============================================================
 * Fonts Management
 * ============================================================ */

DJAZAIR_FUNC(raylibLoadFontNative) {
    djazair_check_args(1, argCount);
    djazair_check_str(0);

    char resolved[4096];
    djazair_resolve_path(vm, djazair_as_str(args[0]), resolved, sizeof(resolved));

    Font *font = (Font *)malloc(sizeof(Font));
    if (!font) return djazair_null();

    *font = LoadFont(resolved);
    return djazair_new_resource_with_finalizer(vm, font, "Font", finalizeFontResource);
}

DJAZAIR_FUNC(raylibUnloadFontNative) {
    djazair_check_args(1, argCount);
    if (djazair_is_resource(args[0])) {
        Font *font = (Font *)djazair_get_resource(vm, args[0]);
        if (font) {
            if (font->baseSize > 0) UnloadFont(*font);
            free(font);
            AS_RESOURCE(args[0])->ptr = NULL;
        }
    }
    return djazair_null();
}

DJAZAIR_FUNC(raylibDrawTextExNative) {
    djazair_check_args(7, argCount);
    djazair_check_resource(0);
    djazair_check_str(1);

    Font *font = (Font *)djazair_get_resource(vm, args[0]);
    if (!font || font->baseSize == 0) return djazair_null();

    Vector2 position = {(float)djazair_as_num(args[2]), (float)djazair_as_num(args[3])};
    float fontSize = (float)djazair_as_num(args[4]);
    float spacing = (float)djazair_as_num(args[5]);
    Color tint = getColor(vm, args[6]);

    DrawTextEx(*font, djazair_as_str(args[1]), position, fontSize, spacing, tint);
    return djazair_null();
}
