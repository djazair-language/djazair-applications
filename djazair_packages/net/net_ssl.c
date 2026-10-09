/**
 * @file    net_ssl.c
 * @brief   TLS/SSL native bindings for the Djazair `net` standard library.
 *
 * Wraps OpenSSL to provide certificate-verified TLS 1.2+ client connections.
 * All socket/TLS resources are managed through Djazair's Resource type so
 * the GC can finalise them automatically if the Djazair code forgets to call
 * close().
 *
 * Shared helpers
 * ──────────────
 * readSocket() and readByteLimit() are declared as `static inline` in
 * net_common.h and compiled into this translation unit — no separate definition
 * is needed or allowed here.
 *
 * Double-shutdown guard
 * ─────────────────────
 * sslCloseNative() zeroes the ssl/ctx pointers after freeing them.
 * tls_finalizer() checks for NULL before acting, making close() + GC collect
 * fully idempotent.
 */

#include "net_ssl.h"
#include "runtime/utils.h"

#include <openssl/ssl.h>
#include <openssl/err.h>
#include <openssl/x509_vfy.h>
#include <stdatomic.h>

#ifdef _WIN32
#   include <windows.h>
#   include <wincrypt.h>
#endif

/* ── TLS Context Resource ─────────────────────────────────────────────────── */

/**
 * TLSContext — Bundles the OpenSSL context and session objects.
 *
 * Stored as the `ptr` of a Djazair Resource so the GC finalizer can clean
 * them up automatically.  Both fields are zeroed by sslCloseNative() after
 * an explicit close to make the finalizer a safe no-op.
 */
typedef struct {
    SSL_CTX *ctx;   /**< Per-connection OpenSSL context (owns cipher config). */
    SSL     *ssl;   /**< Active TLS session (owns the encrypted I/O layer).   */
} TLSContext;

/* ── One-time SSL Initialisation ─────────────────────────────────────────── */

/** Ensures SSL_library_init() is called exactly once across all threads. */
static atomic_flag s_sslInitDone = ATOMIC_FLAG_INIT;

static void ensureSSLInit(void) {
    if (atomic_flag_test_and_set(&s_sslInitDone)) return;
    SSL_library_init();
    OpenSSL_add_all_algorithms();
    SSL_load_error_strings();
}

/* ── GC Finalizer ─────────────────────────────────────────────────────────── */

/**
 * tls_finalizer — Called by the GC when a TLSContext resource is collected.
 *
 * Guards against double-free: sslCloseNative() nulls out both pointers after
 * releasing them, so this function is always safe to call regardless of
 * whether close() was called explicitly.
 *
 * @param ptr  Pointer to a heap-allocated TLSContext (may be NULL — safe).
 */
static void tls_finalizer(void *ptr) {
    if (!ptr) return;
    TLSContext *tls = (TLSContext *)ptr;

    /* NULL checks prevent double-free when sslCloseNative already ran. */
    if (tls->ssl) {
        SSL_shutdown(tls->ssl);
        SSL_free(tls->ssl);
        tls->ssl = NULL;
    }
    if (tls->ctx) {
        SSL_CTX_free(tls->ctx);
        tls->ctx = NULL;
    }

    free(tls);
}

/* ── Internal Helper — Read TLSContext Resource ───────────────────────────── */

/**
 * readTLSContext — Extract a TLSContext pointer from a Djazair Resource.
 *
 * @param  value  Djazair Value expected to wrap a "TLSContext" resource.
 * @param  out    Receives the pointer on success.
 * @return true   if `value` is a valid, non-NULL TLSContext resource.
 * @return false  otherwise.
 */
static bool readTLSContext(Value value, TLSContext **out) {
    if (!IS_RESOURCE(value)) return false;
    TLSContext *tls = (TLSContext *)AS_RESOURCE(value)->ptr;
    if (!tls) return false;
    *out = tls;
    return true;
}

/* ── Internal Helper — Copy and Validate a Djazair Byte Array ─────────────── */

/**
 * copyByteArray — Convert a Djazair integer array to a heap-allocated C buffer.
 *
 * Every element must be a Number in [0, 255].  On any validation failure the
 * buffer is freed and *length is set to -1 as an error sentinel.
 *
 * @param  array   Djazair Array Value — caller must verify IS_ARRAY() first.
 * @param  length  Output:  element count on success,
 *                          0 if the array is empty,
 *                         -1 on validation failure or allocation error.
 * @return Heap buffer on success (caller must free), NULL otherwise.
 */
static char *copyByteArray(Value array, int *length) {
    int count = AS_ARRAY(array)->items.count;

    if (count <= 0) {
        *length = 0;
        return NULL;
    }

    char *buffer = malloc((size_t)count);
    if (!buffer) {
        *length = -1;
        return NULL;
    }

    for (int i = 0; i < count; i++) {
        Value elem = AS_ARRAY(array)->items.values[i];
        if (!IS_INT(elem) || AS_INT(elem) < 0 || AS_INT(elem) > 255) {
            free(buffer);
            *length = -1;
            return NULL;
        }
        buffer[i] = (char)AS_INT(elem);
    }

    *length = count;
    return buffer;
}

/* ── Internal Helper — Peer Certificate Verification ─────────────────────── */

/**
 * configurePeerVerification — Enable certificate-chain and hostname verification.
 *
 * Steps performed:
 *   1. Require peer certificate (SSL_VERIFY_PEER).
 *   2. Load the system CA bundle via SSL_CTX_set_default_verify_paths().
 *   3. On Windows, additionally import the "ROOT" certificate store from the
 *      Windows CryptoAPI into the OpenSSL X.509 store.
 *   4. For IP-address hosts: verify the SAN IP field.
 *      For DNS hosts:        verify the SAN DNS field (RFC 2818 / RFC 6125).
 *
 * @param ctx       OpenSSL SSL_CTX for the connection.
 * @param ssl       Active SSL session (parameters retrieved via SSL_get0_param).
 * @param hostname  Remote host as supplied by the caller (IP or DNS name).
 * @return true on success, false if any step fails.
 */
static bool configurePeerVerification(SSL_CTX *ctx, SSL *ssl,
                                      const char *hostname) {
    SSL_CTX_set_verify(ctx, SSL_VERIFY_PEER, NULL);

    if (SSL_CTX_set_default_verify_paths(ctx) != 1) return false;

    X509_VERIFY_PARAM *params = SSL_get0_param(ssl);
    if (!params) return false;

#ifdef _WIN32
    /* Import Windows "ROOT" CA store into the OpenSSL trust store.
       This allows OpenSSL to validate certificates signed by CAs that are
       trusted by Windows but not bundled in the default OpenSSL CA pack. */
    HCERTSTORE hStore = CertOpenSystemStore(0, "ROOT");
    if (hStore) {
        X509_STORE   *store    = SSL_CTX_get_cert_store(ctx);
        PCCERT_CONTEXT pCert   = NULL;
        while ((pCert = CertEnumCertificatesInStore(hStore, pCert)) != NULL) {
            const unsigned char *encoded = pCert->pbCertEncoded;
            X509 *x509 = d2i_X509(NULL, &encoded, (long)pCert->cbCertEncoded);
            if (x509) {
                X509_STORE_add_cert(store, x509);
                X509_free(x509);
            }
        }
        CertCloseStore(hStore, 0);
    }
#endif

    /* Detect whether `hostname` is an IP literal or a DNS name. */
    unsigned char addrBuf[16];
    if (inet_pton(AF_INET,  hostname, addrBuf) == 1 ||
        inet_pton(AF_INET6, hostname, addrBuf) == 1) {
        /* IP literal: verify against the certificate's SubjectAltName IP field. */
        return X509_VERIFY_PARAM_set1_ip_asc(params, hostname) == 1;
    }

    /* DNS name: verify against SAN DNS / CN (common name fallback). */
    return X509_VERIFY_PARAM_set1_host(params, hostname, 0) == 1;
}

/* ── TLS Connect ──────────────────────────────────────────────────────────── */

/**
 * sslConnectNative — Upgrade a connected TCP socket to TLS.
 *
 * The TCP socket must already be connected to the target host.
 * This function:
 *   1. Creates a new SSL_CTX with TLS 1.2 as the minimum protocol version.
 *   2. Attaches the socket file descriptor.
 *   3. Configures certificate-chain + hostname verification.
 *   4. Sets the SNI hostname (for DNS hosts only — not IP literals).
 *   5. Performs the TLS handshake via SSL_connect().
 *   6. Verifies the peer certificate post-handshake.
 *
 * Djazair signature: fn ssl_connect(socket, hostname) -> Resource|Null
 *
 * @param args[0]  socket   — Connected TCP socket resource.
 * @param args[1]  hostname — DNS name or IP used to verify the certificate.
 * @return TLSContext resource on success, Null on any failure.
 */
Value sslConnectNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 2) {
        runtimeError(vm, "net.ssl.connect(): Expected 2 arguments but got %d.",
                     argCount);
        return NULL_VAL;
    }

    SOCKET s;
    if (!readSocket(args[0], &s) || !IS_STRING(args[1])) return NULL_VAL;

    const char *hostname = AS_CSTRING(args[1]);

    ensureSSLInit();

    /* 1. Create SSL context — minimum TLS 1.2, client mode. */
    SSL_CTX *ctx = SSL_CTX_new(TLS_client_method());
    if (!ctx) return NULL_VAL;

    if (SSL_CTX_set_min_proto_version(ctx, TLS1_2_VERSION) != 1) {
        SSL_CTX_free(ctx);
        return NULL_VAL;
    }

    /* 2. Create SSL session and attach the socket. */
    SSL *ssl = SSL_new(ctx);
    if (!ssl) { SSL_CTX_free(ctx); return NULL_VAL; }

    if (SSL_set_fd(ssl, (int)s) != 1) {
        SSL_free(ssl); SSL_CTX_free(ctx);
        return NULL_VAL;
    }

    /* 3. Configure certificate verification. */
    if (!configurePeerVerification(ctx, ssl, hostname)) {
        SSL_free(ssl); SSL_CTX_free(ctx);
        return NULL_VAL;
    }

    /* 4. Set SNI extension — only meaningful for DNS names, not IP literals.
          Certificate verification already covers IP address matching. */
    unsigned char addrBuf[16];
    if (inet_pton(AF_INET,  hostname, addrBuf) != 1 &&
        inet_pton(AF_INET6, hostname, addrBuf) != 1) {
        SSL_set_tlsext_host_name(ssl, hostname);
    }

    /* 5. Perform the TLS handshake. */
    if (SSL_connect(ssl) <= 0) {
        SSL_free(ssl); SSL_CTX_free(ctx);
        return NULL_VAL;
    }

    /* 6. Post-handshake certificate verification (belt-and-suspenders). */
    if (SSL_get_verify_result(ssl) != X509_V_OK) {
        SSL_free(ssl); SSL_CTX_free(ctx);
        return NULL_VAL;
    }

    /* Bundle ctx + ssl into a GC-managed resource. */
    TLSContext *tls = malloc(sizeof(TLSContext));
    if (!tls) { SSL_free(ssl); SSL_CTX_free(ctx); return NULL_VAL; }

    tls->ctx = ctx;
    tls->ssl = ssl;

    return OBJ_VAL(newResourceWithFinalizer(
        vm, tls, copyString(vm, "TLSContext", 10), tls_finalizer));
}

/* ── TLS Send / Receive — String (UTF-8) ─────────────────────────────────── */

/**
 * sslSendNative — Send a UTF-8 string over an established TLS connection.
 *
 * Uses a write-all loop to handle SSL_ERROR_WANT_READ / SSL_ERROR_WANT_WRITE
 * which can occur during renegotiation on non-blocking sockets, and to retry
 * when a partial write happens.
 *
 * Djazair signature: fn ssl_send(tlsContext, data) -> Number
 *
 * @return Bytes sent, or -1 on invalid arguments.
 */
Value sslSendNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 2) {
        runtimeError(vm, "net.ssl.send(): Expected 2 arguments but got %d.", argCount);
        return NULL_VAL;
    }

    TLSContext *tls;
    if (!readTLSContext(args[0], &tls) || !IS_STRING(args[1])) {
        return INT_VAL(-1);
    }

    const char *data = AS_CSTRING(args[1]);
    size_t      len  = (size_t)AS_STRING(args[1])->length;
    size_t      sent = 0;

    while (sent < len) {
        int n = SSL_write(tls->ssl, data + sent, (int)(len - sent));
        if (n <= 0) {
            int err = SSL_get_error(tls->ssl, n);
            /* Retry on WANT_READ / WANT_WRITE (TLS renegotiation or buffering). */
            if (err == SSL_ERROR_WANT_READ || err == SSL_ERROR_WANT_WRITE) continue;
            break;   /* fatal SSL error */
        }
        sent += (size_t)n;
    }

    return INT_VAL((int)sent);
}

/**
 * sslRecvNative — Receive up to N bytes as a UTF-8 string over TLS.
 *
 * Djazair signature: fn ssl_recv(tlsContext, maxLen) -> String|Null
 *
 * @return Received string, or Null on connection close / timeout / error.
 */
Value sslRecvNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 2) {
        runtimeError(vm, "net.ssl.receive(): Expected 2 arguments but got %d.", argCount);
        return NULL_VAL;
    }

    TLSContext *tls;
    int         maxLen;
    if (!readTLSContext(args[0], &tls) || !readByteLimit(args[1], &maxLen)) {
        return NULL_VAL;
    }

    char *buffer = malloc((size_t)maxLen + 1);
    if (!buffer) return NULL_VAL;

    int bytesRecv = SSL_read(tls->ssl, buffer, maxLen);
    if (bytesRecv <= 0) { free(buffer); return NULL_VAL; }

    buffer[bytesRecv] = '\0';
    Value result = OBJ_VAL(copyString(vm, buffer, bytesRecv));
    free(buffer);
    return result;
}

/* ── TLS Send / Receive — Raw Bytes ──────────────────────────────────────── */

/**
 * sslSendBytesNative — Send a Djazair byte array over an established TLS connection.
 *
 * Djazair signature: fn ssl_send_bytes(tlsContext, byteArray) -> Number
 *
 * @return Bytes sent, 0 for an empty array, or -1 on invalid input.
 */
Value sslSendBytesNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 2) {
        runtimeError(vm, "net.ssl.sendBytes(): Expected 2 arguments but got %d.",
                     argCount);
        return NULL_VAL;
    }

    TLSContext *tls;
    if (!readTLSContext(args[0], &tls) || !IS_ARRAY(args[1])) {
        return INT_VAL(-1);
    }

    int   len    = 0;
    char *buffer = copyByteArray(args[1], &len);

    if (len == 0)  return INT_VAL(0);   /* empty array — not an error */
    if (len  <  0) return INT_VAL(-1);  /* validation failure */

    size_t sent = 0;
    while (sent < (size_t)len) {
        int n = SSL_write(tls->ssl, buffer + sent, (int)((size_t)len - sent));
        if (n <= 0) {
            int err = SSL_get_error(tls->ssl, n);
            if (err == SSL_ERROR_WANT_READ || err == SSL_ERROR_WANT_WRITE) continue;
            break;
        }
        sent += (size_t)n;
    }

    free(buffer);
    return INT_VAL((int)sent);
}

/**
 * sslRecvBytesNative — Receive up to N bytes as a Djazair integer array over TLS.
 *
 * Djazair signature: fn ssl_recv_bytes(tlsContext, maxLen) -> Array|Null
 */
Value sslRecvBytesNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 2) {
        runtimeError(vm, "net.ssl.receiveBytes(): Expected 2 arguments but got %d.",
                     argCount);
        return NULL_VAL;
    }

    TLSContext *tls;
    int         maxLen;
    if (!readTLSContext(args[0], &tls) || !readByteLimit(args[1], &maxLen)) {
        return NULL_VAL;
    }

    char *buffer = malloc((size_t)maxLen);
    if (!buffer) return NULL_VAL;

    int bytesRecv = SSL_read(tls->ssl, buffer, maxLen);
    if (bytesRecv <= 0) { free(buffer); return NULL_VAL; }

    Value result = OBJ_VAL(newArray(vm));
    push(vm, result);   /* anchor array against GC */

    for (int i = 0; i < bytesRecv; i++) {
        writeValueArray(vm, &AS_ARRAY(result)->items,
                        INT_VAL((unsigned char)buffer[i]));
    }

    free(buffer);
    return pop(vm);
}

/* ── TLS Close ────────────────────────────────────────────────────────────── */

/**
 * sslCloseNative — Gracefully shut down and release a TLS connection.
 *
 * Sends a TLS close_notify alert to the peer, then frees both the SSL session
 * and the SSL_CTX.  Both pointers are zeroed immediately so that tls_finalizer
 * (invoked by the GC) becomes a guaranteed no-op — preventing double-free.
 *
 * Djazair signature: fn ssl_close(tlsContext) -> Bool
 */
Value sslCloseNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 1) {
        runtimeError(vm, "net.ssl.close(): Expected 1 argument but got %d.", argCount);
        return NULL_VAL;
    }

    if (IS_RESOURCE(args[0])) {
        TLSContext *tls = (TLSContext *)AS_RESOURCE(args[0])->ptr;
        if (tls) {
            /* Zero each pointer BEFORE freeing so that tls_finalizer is safe
               even if called concurrently or after this function returns. */
            if (tls->ssl) {
                SSL     *ssl = tls->ssl;
                tls->ssl     = NULL;   /* zero first — double-free guard */
                SSL_shutdown(ssl);
                SSL_free(ssl);
            }
            if (tls->ctx) {
                SSL_CTX *ctx = tls->ctx;
                tls->ctx     = NULL;   /* zero first — double-free guard */
                SSL_CTX_free(ctx);
            }
        }
    }

    return BOOL_VAL(true);
}
