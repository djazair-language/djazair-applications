/**
 * @file    net_ssl.h
 * @brief   TLS/SSL function declarations for the Djazair `net` standard library.
 *
 * Exposes the OpenSSL-backed native bindings to the Djazair VM.
 * These functions upgrade an existing TCP connection to a secure TLS session,
 * and provide encrypted send/receive primitives.
 */

#ifndef DJAZAIR_NET_SSL_H
#define DJAZAIR_NET_SSL_H

#include "net_common.h"

/* ── Native Function Declarations — TLS/SSL ──────────────────────────────── */

/** 
 * Upgrade a connected TCP socket to a TLS 1.2+ session.
 * Verifies the peer's certificate chain and hostname.
 */
Value sslConnectNative(struct djazairVM *vm, int argCount, Value *args);

/** Send a UTF-8 string over the encrypted TLS connection. */
Value sslSendNative(struct djazairVM *vm, int argCount, Value *args);

/** Receive up to N bytes as a UTF-8 string over the TLS connection. */
Value sslRecvNative(struct djazairVM *vm, int argCount, Value *args);

/** Send a Djazair byte array over the encrypted TLS connection. */
Value sslSendBytesNative(struct djazairVM *vm, int argCount, Value *args);

/** Receive up to N bytes as a Djazair integer array over TLS. */
Value sslRecvBytesNative(struct djazairVM *vm, int argCount, Value *args);

/** Gracefully shut down and release the TLS session and context. */
Value sslCloseNative(struct djazairVM *vm, int argCount, Value *args);

#endif /* DJAZAIR_NET_SSL_H */
