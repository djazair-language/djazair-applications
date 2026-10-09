/**
 * @file    net_common.h
 * @brief   Shared declarations, platform abstractions, and inline helpers
 *          used by all compilation units in the `net` standard library.
 *
 * Layout
 * ──────
 *   1. Platform portability (Winsock / POSIX)
 *   2. Compile-time constants
 *   3. Inline value-extraction helpers  (readSocket, readByteLimit)
 *   4. Native function declarations     (socket, DNS, SSL)
 */

#ifndef DJAZAIR_NET_COMMON_H
#define DJAZAIR_NET_COMMON_H

/* ── VM / Runtime ─────────────────────────────────────────────────────────── */

#include "vm/vm.h"
#include "vm/registry.h"
#include "runtime/utils.h"
#include <string.h>
#include <stdlib.h>
#include <math.h>
#include <limits.h>

/* ── Platform Portability ─────────────────────────────────────────────────── */

#ifdef _WIN32
    /* Increase maximum sockets per select() call on Windows from default 64 to 4096 */
    #ifndef FD_SETSIZE
        #define FD_SETSIZE 4096
    #endif
    #include <winsock2.h>
    #include <ws2tcpip.h>
    /* socklen_t is missing on MSVC; define it as the POSIX-compatible type. */
    typedef int socklen_t;
    /* Unified close macro so call sites stay platform-agnostic. */
    #define CLOSE_SOCKET(s) closesocket(s)
#else
    #include <sys/socket.h>
    #include <netinet/in.h>
    #include <arpa/inet.h>
    #include <unistd.h>
    #include <netdb.h>
    /* Unify Winsock sentinel values for POSIX builds. */
    #define CLOSE_SOCKET(s)  close(s)
    #define INVALID_SOCKET   (-1)
    #define SOCKET_ERROR     (-1)
    typedef int SOCKET;
#endif

/* ── Compile-time Constants ───────────────────────────────────────────────── */

/**
 * Hard memory-safety ceiling for any single socket read/write.
 * Prevents runaway allocations triggered by buggy or malicious callers
 * (e.g. socket.receive(999_999_999)).
 *
 * This is NOT the operational send limit — use `config.CLIENT_CONFIG.maxSend`
 * in Djazair for that.  The constant is exposed to Djazair via
 * `getMaxBytesNative` so that `constants.dz` can reference it without
 * depending on the `os` module (which would create a circular import).
 */
#define SOCKET_MAX_BYTES (256 * 1024 * 1024)   /* 256 MiB absolute ceiling */

/* ── Inline Value-Extraction Helpers ─────────────────────────────────────── */

/**
 * readSocket — Extract the raw SOCKET descriptor from a Djazair Resource.
 *
 * @param  value  A Djazair Value expected to wrap a "Socket" resource.
 * @param  out    Receives the file descriptor on success.
 * @return true   if `value` is a valid, open socket resource.
 * @return false  if `value` is not a resource, the pointer is NULL, or the
 *                socket has already been closed (INVALID_SOCKET).
 *
 * Declared static inline so each translation unit gets its own copy without
 * linker conflicts; the compiler will inline the tiny body at each call site.
 */
static inline bool readSocket(Value value, SOCKET *out) {
    if (!IS_RESOURCE(value)) return false;
    SOCKET *pSocket = (SOCKET *)AS_RESOURCE(value)->ptr;
    if (pSocket == NULL || *pSocket == INVALID_SOCKET) return false;
    *out = *pSocket;
    return true;
}

/**
 * readByteLimit — Validate and extract a byte-count argument.
 *
 * Accepts a Djazair Number, verifies it is a positive integer, and clamps it
 * to SOCKET_MAX_BYTES so that callers never allocate more than the safety
 * ceiling regardless of what the Djazair code requested.
 *
 * @param  value  Djazair Number value representing the requested byte count.
 * @param  out    Receives the clamped integer count on success.
 * @return true   on valid input.
 * @return false  if `value` is not a Number or is outside [1, INT_MAX].
 */
static inline bool readByteLimit(Value value, int *out) {
    if (!IS_NUMBER(value)) return false;
    double requested = AS_NUMBER(value);
    if (!isIntegerInRange(requested, 1.0, (double)INT_MAX)) return false;
    /* Clamp silently — the Djazair layer is expected to enforce its own
       operational limit (maxSend) before reaching here. */
    *out = (requested > SOCKET_MAX_BYTES) ? SOCKET_MAX_BYTES : (int)requested;
    return true;
}

/* ── Native Function Declarations — Socket ────────────────────────────────── */

/** Expose SOCKET_MAX_BYTES to Djazair (used by constants.dz). */
Value getMaxBytesNative(struct djazairVM *vm, int argCount, Value *args);

/** Expose AF_INET6 numeric value to Djazair (platform-dependent). */
Value getAFInet6Native(struct djazairVM *vm, int argCount, Value *args);

/** Create a new socket with the given domain, type, and protocol. */
Value socketCreateNative(struct djazairVM *vm, int argCount, Value *args);

/** Initiate a TCP/UDP connection to a remote address. */
Value socketConnectNative(struct djazairVM *vm, int argCount, Value *args);

/** Bind a socket to a local address and port. */
Value socketBindNative(struct djazairVM *vm, int argCount, Value *args);

/** Mark a bound socket as passive (server-side listening). */
Value socketListenNative(struct djazairVM *vm, int argCount, Value *args);

/** Block until a new connection arrives; return socket + peer info. */
Value socketAcceptNative(struct djazairVM *vm, int argCount, Value *args);

/** Send a UTF-8 string over a connected socket (send-all loop). */
Value socketSendNative(struct djazairVM *vm, int argCount, Value *args);

/** Receive up to N bytes as a UTF-8 string. */
Value socketRecvNative(struct djazairVM *vm, int argCount, Value *args);

/** Send a raw byte array over a connected socket (send-all loop). */
Value socketSendBytesNative(struct djazairVM *vm, int argCount, Value *args);

/** Receive up to N bytes as a Djazair integer array (0–255 per element). */
Value socketRecvBytesNative(struct djazairVM *vm, int argCount, Value *args);

/** UDP: send a string datagram to an explicit destination address. */
Value socketSendToNative(struct djazairVM *vm, int argCount, Value *args);

/** UDP: receive a string datagram; return {data, ip, port}. */
Value socketRecvFromNative(struct djazairVM *vm, int argCount, Value *args);

/** UDP: send a byte-array datagram to an explicit destination address. */
Value socketSendBytesToNative(struct djazairVM *vm, int argCount, Value *args);

/** UDP: receive a byte-array datagram; return {data, ip, port}. */
Value socketRecvBytesFromNative(struct djazairVM *vm, int argCount, Value *args);

/** Close and release the underlying OS socket immediately. */
Value socketCloseNative(struct djazairVM *vm, int argCount, Value *args);

/** Half-close the connection in the chosen direction (SD_RECEIVE/SEND/BOTH). */
Value socketShutdownNative(struct djazairVM *vm, int argCount, Value *args);

/** Set send and receive timeouts (seconds, may be fractional). */
Value socketSetTimeoutNative(struct djazairVM *vm, int argCount, Value *args);

/** Set blocking or non-blocking mode on the socket. */
Value socketSetBlockingNative(struct djazairVM *vm, int argCount, Value *args);

/** Multiplexing: block until sockets in read/write/except arrays become ready. */
Value socketSelectNative(struct djazairVM *vm, int argCount, Value *args);

/* ── Native Function Declarations — DNS ───────────────────────────────────── */

/**
 * Resolve a hostname to an array of IP address strings.
 * Supports AF_INET, AF_INET6, and AF_UNSPEC (both families).
 */
Value dnsResolveNative(struct djazairVM *vm, int argCount, Value *args);

#endif /* DJAZAIR_NET_COMMON_H */
void ensureSocketInit(void);
