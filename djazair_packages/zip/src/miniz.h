/* miniz.h 3.1.0 - public domain deflate/inflate, zlib-subset, ZIP reading/writing/appending, PNG writing
   See "unlicense" statement at the end of this file.
   Rich Geldreich <richgel99@gmail.com>, last updated Oct. 13, 2013
*/
#pragma once
#include "miniz_export.h"
#if defined(__STRICT_ANSI__)
#define MZ_FORCEINLINE
#elif defined(_MSC_VER)
#define MZ_FORCEINLINE __forceinline
#elif defined(__GNUC__)
#define MZ_FORCEINLINE __inline__ __attribute__((__always_inline__))
#else
#define MZ_FORCEINLINE inline
#endif
#define MINIZ_NO_ZLIB_COMPATIBLE_NAMES
#define MINIZ_NO_ZLIB_APIS
#ifdef __cplusplus
extern "C" {
#endif
#include <stddef.h>
#ifndef MINIZ_NO_TIME
#include <time.h>
#endif
#if defined(_M_IX86) || defined(_M_X64) || defined(__i386__) || defined(__i386) || defined(__i486__) || defined(__i486) || defined(i386) || defined(__ia64__) || defined(__x86_64__)
#define MINIZ_X86_OR_X64_CPU 1
#else
#define MINIZ_X86_OR_X64_CPU 0
#endif
#if !defined(MINIZ_LITTLE_ENDIAN)
#if defined(__BYTE_ORDER__) && defined(__ORDER_LITTLE_ENDIAN__)
#if (__BYTE_ORDER__ == __ORDER_LITTLE_ENDIAN__)
#define MINIZ_LITTLE_ENDIAN 1
#else
#define MINIZ_LITTLE_ENDIAN 0
#endif
#else
#if MINIZ_X86_OR_X64_CPU
#define MINIZ_LITTLE_ENDIAN 1
#else
#define MINIZ_LITTLE_ENDIAN 0
#endif
#endif
#endif
#if defined(__has_feature)
#if __has_feature(undefined_behavior_sanitizer)
#define MINIZ_USE_UNALIGNED_LOADS_AND_STORES 0
#endif
#endif
#if !defined(MINIZ_USE_UNALIGNED_LOADS_AND_STORES)
#if MINIZ_X86_OR_X64_CPU
#define MINIZ_USE_UNALIGNED_LOADS_AND_STORES 0
#define MINIZ_UNALIGNED_USE_MEMCPY
#else
#define MINIZ_USE_UNALIGNED_LOADS_AND_STORES 0
#endif
#endif
#if defined(_M_X64) || defined(_WIN64) || defined(__MINGW64__) || defined(_LP64) || defined(__LP64__) || defined(__ia64__) || defined(__x86_64__)
#define MINIZ_HAS_64BIT_REGISTERS 1
#else
#define MINIZ_HAS_64BIT_REGISTERS 0
#endif
void mz_free(void *p);
mz_ulong mz_adler32(mz_ulong adler, const unsigned char *ptr, size_t buf_len);
mz_ulong mz_crc32(mz_ulong crc, const unsigned char *ptr, size_t buf_len);
enum { MZ_DEFAULT_STRATEGY = 0, MZ_FILTERED = 1, MZ_HUFFMAN_ONLY = 2, MZ_RLE = 3, MZ_FIXED = 4 };
#define MZ_DEFLATED 8
typedef void *(*mz_alloc_func)(void *opaque, size_t items, size_t size);
typedef void (*mz_free_func)(void *opaque, void *address);
typedef void *(*mz_realloc_func)(void *opaque, void *address, size_t items, size_t size);
enum {
    MZ_NO_COMPRESSION = 0, MZ_BEST_SPEED = 1, MZ_BEST_COMPRESSION = 9,
    MZ_UBER_COMPRESSION = 10, MZ_DEFAULT_LEVEL = 6, MZ_DEFAULT_COMPRESSION = -1
};
#define MZ_VERSION "11.3.1"
#define MZ_VERNUM 0xB301
#define MZ_VER_MAJOR 11
#define MZ_VER_MINOR 3
#define MZ_VER_REVISION 1
#define MZ_VER_SUBREVISION 0
#include "miniz_common.h"
#include "miniz_tdef.h"
#include "miniz_tinfl.h"
#include "miniz_zip.h"
#ifdef __cplusplus
}
#endif
