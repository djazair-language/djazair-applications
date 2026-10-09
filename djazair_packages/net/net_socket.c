/**
 * @file    net_socket.c
 * @brief   BSD socket native bindings for the Djazair `net` standard library.
 *
 * Implements all socket, DNS, and address-resolution primitives that are
 * registered in net.c and called from Djazair's socket / tcpClient /
 * udpClient / tcpServer / udpServer modules.
 *
 * Design notes
 * ────────────
 * • All public functions follow the NativeMethod signature:
 *     Value fn(djazairVM *vm, int argCount, Value *args)
 *
 * • readSocket() and readByteLimit() are defined once in net_common.h as
 *   static inline helpers and shared with net_ssl.c — do NOT redefine here.
 *
 * • The send-all loop (socketSendNative, socketSendBytesNative) retries until
 *   every byte is delivered or the socket signals an error, because TCP's
 *   send() may accept fewer bytes than requested when the kernel buffer is full.
 *
 * • GC safety: any heap allocation (newArray, newMap, copyString) must be
 *   push()-ed onto the VM stack immediately and pop()-ed after it is anchored
 *   in another live object to prevent premature collection.
 */

#include "net_common.h"
#include "runtime/utils.h"
#include <signal.h>
#include <stdatomic.h>

/* ── One-time Platform Initialisation ────────────────────────────────────── */

/** Guards WSAStartup (Windows) / SIGPIPE suppression (POSIX) — called once. */
static atomic_flag s_netInitDone = ATOMIC_FLAG_INIT;

void ensureSocketInit(void) {
    /* atomic_flag_test_and_set returns the *previous* value.
       If it was already set, another thread beat us here — do nothing. */
    if (atomic_flag_test_and_set(&s_netInitDone)) return;

#ifdef _WIN32
    /* Initialise Winsock 2.2; required before any socket API call on Windows. */
    WSADATA wsaData;
    WSAStartup(MAKEWORD(2, 2), &wsaData);
#else
    /* Prevent SIGPIPE from terminating the process when writing to a closed
       socket; we handle the error through the return value instead. */
    signal(SIGPIPE, SIG_IGN);
#endif
}

/* ── Platform Introspection ───────────────────────────────────────────────── */

/**
 * getMaxBytesNative — Expose SOCKET_MAX_BYTES to Djazair.
 *
 * Allows `constants.dz` to read the hard memory ceiling without depending on
 * the `os` module, which would introduce a circular import chain.
 * Djazair signature: fn get_max_bytes() -> Number
 */
Value getMaxBytesNative(djazairVM *vm, int argCount, Value *args) {
    (void)vm; (void)argCount; (void)args;
    return INT_VAL(SOCKET_MAX_BYTES);
}

/**
 * getAFInet6Native — Expose AF_INET6 to Djazair.
 *
 * The numeric value of AF_INET6 is platform-dependent:
 *   Linux=10, macOS/BSD=30, Windows=23.
 * Djazair's `constants.dz` calls this at module load time so the correct
 * value is used without hardcoding platform conditionals in Djazair code.
 *
 * Djazair signature: fn get_af_inet6() -> Number
 */
Value getAFInet6Native(djazairVM *vm, int argCount, Value *args) {
    (void)vm; (void)argCount; (void)args;
    return INT_VAL(AF_INET6);
}

/* ── GC Finalizer ─────────────────────────────────────────────────────────── */

/**
 * socket_finalizer — Called by the GC when a Socket resource is collected.
 *
 * Closes the OS file descriptor if it is still open, then frees the heap
 * allocation that holds the SOCKET value.  This guarantees that sockets are
 * eventually released even if the Djazair code never calls socket.close().
 *
 * @param ptr  Pointer to the heap-allocated SOCKET (may be NULL — safe to call).
 */
static void socket_finalizer(void *ptr) {
    if (!ptr) return;
    SOCKET *pSocket = (SOCKET *)ptr;
    if (*pSocket != INVALID_SOCKET) {
        CLOSE_SOCKET(*pSocket);
    }
    free(pSocket);
}

/* ── Address Resolution (IPv4 + IPv6) ────────────────────────────────────── */

/**
 * resolve_address — Resolve a host string + port into a sockaddr_storage.
 *
 * Resolution order (fastest-first, avoids unnecessary DNS lookups):
 *   1. INADDR_ANY  — empty string, "0.0.0.0"
 *   2. IN6ADDR_ANY — "::", "[::]"
 *   3. INADDR_BROADCAST — "255.255.255.255"
 *   4. Direct IPv4 literal via inet_pton()
 *   5. Direct IPv6 literal via inet_pton()
 *   6. DNS lookup via getaddrinfo() with AF_UNSPEC (IPv4 or IPv6)
 *
 * @param  host    Hostname or IP string (NULL is rejected).
 * @param  port    Port number in host byte order [0–65535].
 * @param  out     Output buffer — must be at least sizeof(sockaddr_storage).
 * @param  outLen  Receives the actual address length.
 * @return true on success, false if the address cannot be resolved.
 */
static bool resolve_address(const char *host, int port,
                            struct sockaddr_storage *out, socklen_t *outLen) {
    if (!host || !out) return false;
    memset(out, 0, sizeof(*out));

    /* ── Wildcard / any-address shortcuts ─── */
    if (strlen(host) == 0 || strcmp(host, "0.0.0.0") == 0) {
        struct sockaddr_in *a = (struct sockaddr_in *)out;
        a->sin_family      = AF_INET;
        a->sin_port        = htons((unsigned short)port);
        a->sin_addr.s_addr = INADDR_ANY;
        *outLen = sizeof(struct sockaddr_in);
        return true;
    }
    if (strcmp(host, "::") == 0 || strcmp(host, "[::]") == 0) {
        struct sockaddr_in6 *a = (struct sockaddr_in6 *)out;
        a->sin6_family = AF_INET6;
        a->sin6_port   = htons((unsigned short)port);
        a->sin6_addr   = in6addr_any;
        *outLen = sizeof(struct sockaddr_in6);
        return true;
    }

    /* ── Broadcast (IPv4 only) ─── */
    if (strcmp(host, "255.255.255.255") == 0) {
        struct sockaddr_in *a = (struct sockaddr_in *)out;
        a->sin_family      = AF_INET;
        a->sin_port        = htons((unsigned short)port);
        a->sin_addr.s_addr = INADDR_BROADCAST;
        *outLen = sizeof(struct sockaddr_in);
        return true;
    }

    /* ── Direct IPv4 literal ─── */
    struct sockaddr_in a4;
    memset(&a4, 0, sizeof(a4));
    if (inet_pton(AF_INET, host, &a4.sin_addr) == 1) {
        a4.sin_family = AF_INET;
        a4.sin_port   = htons((unsigned short)port);
        memcpy(out, &a4, sizeof(a4));
        *outLen = sizeof(struct sockaddr_in);
        return true;
    }

    /* ── Direct IPv6 literal ─── */
    struct sockaddr_in6 a6;
    memset(&a6, 0, sizeof(a6));
    if (inet_pton(AF_INET6, host, &a6.sin6_addr) == 1) {
        a6.sin6_family = AF_INET6;
        a6.sin6_port   = htons((unsigned short)port);
        memcpy(out, &a6, sizeof(a6));
        *outLen = sizeof(struct sockaddr_in6);
        return true;
    }

    /* ── DNS fallback (AF_UNSPEC accepts both IPv4 and IPv6 results) ─── */
    struct addrinfo hints, *res;
    memset(&hints, 0, sizeof(hints));
    hints.ai_family   = AF_UNSPEC;
    hints.ai_socktype = SOCK_STREAM;

    if (getaddrinfo(host, NULL, &hints, &res) != 0) return false;

    memcpy(out, res->ai_addr, res->ai_addrlen);
    *outLen = (socklen_t)res->ai_addrlen;

    /* Inject the port into whichever family was resolved. */
    if (out->ss_family == AF_INET) {
        ((struct sockaddr_in *)out)->sin_port  = htons((unsigned short)port);
    } else if (out->ss_family == AF_INET6) {
        ((struct sockaddr_in6 *)out)->sin6_port = htons((unsigned short)port);
    }

    freeaddrinfo(res);
    return true;
}

/* ── Address Formatting Helpers ───────────────────────────────────────────── */

/**
 * formatAddress — Render a sockaddr as a human-readable IP string.
 *
 * Writes the result into `buf` (NUL-terminated).  On an unknown address
 * family the buffer is set to an empty string so callers can test `buf[0]`.
 *
 * @param buf     Output character buffer.
 * @param buflen  Size of `buf` in bytes (at least 46 bytes recommended for
 *                full IPv6 notation).
 * @param addr    Source socket address — must not be NULL.
 */
static void formatAddress(char *buf, size_t buflen,
                          const struct sockaddr *addr) {
    if (addr->sa_family == AF_INET) {
        /* Manual byte formatting avoids a second inet_ntop() call on Windows
           where some older SDK versions behave differently. */
        const struct sockaddr_in  *a = (const struct sockaddr_in *)addr;
        const unsigned char       *b = (const unsigned char *)&a->sin_addr.s_addr;
        snprintf(buf, buflen, "%d.%d.%d.%d", b[0], b[1], b[2], b[3]);
    } else if (addr->sa_family == AF_INET6) {
        const struct sockaddr_in6 *a = (const struct sockaddr_in6 *)addr;
        inet_ntop(AF_INET6, &a->sin6_addr, buf, (socklen_t)buflen);
    } else {
        buf[0] = '\0';
    }
}

/**
 * extractPort — Return the port number in host byte order from a sockaddr.
 *
 * @return Port number [0–65535], or 0 for unknown address families.
 */
static int extractPort(const struct sockaddr *addr) {
    if (addr->sa_family == AF_INET)
        return ntohs(((const struct sockaddr_in  *)addr)->sin_port);
    if (addr->sa_family == AF_INET6)
        return ntohs(((const struct sockaddr_in6 *)addr)->sin6_port);
    return 0;
}

/**
 * insertIPString — Format a peer IP and insert it into a Djazair Map.
 *
 * The string Value is pushed onto the VM stack before being inserted so the
 * GC does not collect it while tableSet() may trigger an allocation.
 * The caller is responsible for having `mapKey` and `map` already anchored
 * (i.e. push()-ed) before calling this function.
 *
 * @param vm      Running VM instance.
 * @param addr    Peer socket address to format.
 * @param map     Destination Djazair Map Value.
 * @param mapKey  Pre-created key string Value for the "ip" field.
 */
static void insertIPString(djazairVM *vm, const struct sockaddr *addr,
                           Value map, Value mapKey) {
    char ipStr[64];
    formatAddress(ipStr, sizeof(ipStr), addr);

    Value ipVal = OBJ_VAL(copyString(vm, ipStr, (int)strlen(ipStr)));
    push(vm, ipVal);   /* anchor against GC before tableSet */

    if (tableSet(vm, &AS_MAP(map)->items, mapKey, ipVal)) {
        writeValueArray(vm, &AS_MAP(map)->orderedKeys, mapKey);
    }

    pop(vm);           /* balanced pop — ipVal is now held by the map */
}

/* ── Socket Creation ──────────────────────────────────────────────────────── */

/**
 * socketCreateNative — Create a new OS socket.
 *
 * Wraps the socket(2) system call and returns the descriptor as an opaque
 * Djazair Resource so the GC can close it automatically when it is collected.
 *
 * Djazair signature: fn socket_create(domain, type, protocol) -> Resource|Null
 *
 * @param args[0]  domain   — AF_INET (2), AF_INET6, etc.
 * @param args[1]  type     — SOCK_STREAM (1), SOCK_DGRAM (2), etc.
 * @param args[2]  protocol — IPPROTO_TCP (6), IPPROTO_UDP (17), or 0 (auto).
 * @return         Socket resource on success, Null on failure.
 */
Value socketCreateNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 3) {
        runtimeError(vm, "net.socket(): Expected %d argument(s) but got %d.",
                     3, argCount);
        return NULL_VAL;
    }
    if (!IS_INT(args[0]) || !IS_INT(args[1]) || !IS_INT(args[2]) ||
        AS_INT(args[0]) < 0 || AS_INT(args[1]) < 0 || AS_INT(args[2]) < 0) {
        return NULL_VAL;
    }

    ensureSocketInit();

    int domain   = AS_INT(args[0]);
    int type     = AS_INT(args[1]);
    int protocol = AS_INT(args[2]);

    SOCKET s = socket(domain, type, protocol);
    if (s == INVALID_SOCKET) return NULL_VAL;

    SOCKET *pSocket = malloc(sizeof(SOCKET));
    if (!pSocket) { CLOSE_SOCKET(s); return NULL_VAL; }
    *pSocket = s;

    return OBJ_VAL(newResourceWithFinalizer(
        vm, pSocket, copyString(vm, "Socket", 6), socket_finalizer));
}

/* ── Connect / Bind / Listen / Accept ────────────────────────────────────── */

/**
 * socketConnectNative — Connect a socket to a remote address.
 *
 * Djazair signature: fn socket_connect(socket, host, port) -> Bool
 *
 * @return True on success, False on failure (connection refused, timeout, …).
 */
Value socketConnectNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 3) {
        runtimeError(vm, "net.socket.connect(): Expected %d argument(s) but got %d.",
                     3, argCount);
        return NULL_VAL;
    }
    if (!IS_STRING(args[1]) || !IS_INT(args[2]) ||
        AS_INT(args[2]) < 0 || AS_INT(args[2]) > 65535) {
        return BOOL_VAL(false);
    }

    SOCKET s;
    if (!readSocket(args[0], &s)) return BOOL_VAL(false);

    const char *host = AS_CSTRING(args[1]);
    int         port = AS_INT(args[2]);

    struct sockaddr_storage server;
    socklen_t serverLen;
    if (!resolve_address(host, port, &server, &serverLen)) return BOOL_VAL(false);

    return BOOL_VAL(connect(s, (struct sockaddr *)&server, serverLen) == 0);
}

/**
 * socketBindNative — Bind a socket to a local address and port.
 *
 * Sets SO_REUSEADDR (and SO_REUSEPORT on supported POSIX platforms) so that
 * the port is immediately available again after a server restart without
 * waiting for the kernel's TIME_WAIT to expire.
 *
 * Djazair signature: fn socket_bind(socket, host, port) -> Bool
 */
Value socketBindNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 3) {
        runtimeError(vm, "net.socket.bind(): Expected %d argument(s) but got %d.",
                     3, argCount);
        return NULL_VAL;
    }
    if (!IS_STRING(args[1]) || !IS_INT(args[2]) ||
        AS_INT(args[2]) < 0 || AS_INT(args[2]) > 65535) {
        return BOOL_VAL(false);
    }

    SOCKET s;
    if (!readSocket(args[0], &s)) return BOOL_VAL(false);

    /* Enable port reuse so the server can restart immediately. */
    int opt = 1;
#ifdef _WIN32
    setsockopt(s, SOL_SOCKET, SO_REUSEADDR, (const char *)&opt, sizeof(opt));
#else
    setsockopt(s, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
#   ifdef SO_REUSEPORT
    setsockopt(s, SOL_SOCKET, SO_REUSEPORT, &opt, sizeof(opt));
#   endif
#endif

    const char *host = AS_CSTRING(args[1]);
    int         port = AS_INT(args[2]);

    struct sockaddr_storage addr;
    socklen_t addrLen;
    if (!resolve_address(host, port, &addr, &addrLen)) return BOOL_VAL(false);

    return BOOL_VAL(bind(s, (struct sockaddr *)&addr, addrLen) == 0);
}

/**
 * socketListenNative — Mark a bound socket as passive (server-side).
 *
 * Djazair signature: fn socket_listen(socket, backlog) -> Bool
 *
 * @param args[1]  backlog — Maximum number of pending connections in the queue.
 */
Value socketListenNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 2) {
        runtimeError(vm, "net.socket.listen(): Expected %d argument(s) but got %d.",
                     2, argCount);
        return NULL_VAL;
    }

    SOCKET s;
    if (!readSocket(args[0], &s)) return BOOL_VAL(false);
    if (!IS_INT(args[1]) || AS_INT(args[1]) < 0) {
        return BOOL_VAL(false);
    }

    int backlog = AS_INT(args[1]);
    return BOOL_VAL(listen(s, backlog) == 0);
}

/**
 * socketAcceptNative — Accept the next pending connection.
 *
 * Returns a Djazair Map with three keys:
 *   "socket" → Socket resource for the accepted connection
 *   "ip"     → Peer IP address string
 *   "port"   → Peer port number
 *
 * All three values are anchored on the VM stack while being inserted into
 * the map to prevent GC collection during allocation.
 *
 * Djazair signature: fn socket_accept(serverSocket) -> Map|Null
 */
Value socketAcceptNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 1) {
        runtimeError(vm, "net.socket.accept(): Expected %d argument(s) but got %d.",
                     1, argCount);
        return NULL_VAL;
    }

    SOCKET s;
    if (!readSocket(args[0], &s)) return NULL_VAL;

    struct sockaddr_storage peer;
    socklen_t peerLen = sizeof(peer);
    SOCKET clientFd = accept(s, (struct sockaddr *)&peer, &peerLen);
    if (clientFd == INVALID_SOCKET) return NULL_VAL;

    SOCKET *pClient = malloc(sizeof(SOCKET));
    if (!pClient) { CLOSE_SOCKET(clientFd); return NULL_VAL; }
    *pClient = clientFd;

    /* ── Build result map — push everything to keep the GC happy ─── */
    Value map = OBJ_VAL(newMap(vm));
    push(vm, map);                          /* anchor map */

    /* "socket" key */
    Value socketResource = OBJ_VAL(newResourceWithFinalizer(
        vm, pClient, copyString(vm, "Socket", 6), socket_finalizer));
    push(vm, socketResource);               /* anchor resource */

    Value socketKey = OBJ_VAL(copyString(vm, "socket", 6));
    push(vm, socketKey);                    /* anchor key string */

    if (tableSet(vm, &AS_MAP(map)->items, socketKey, socketResource)) {
        writeValueArray(vm, &AS_MAP(map)->orderedKeys, socketKey);
    }
    pop(vm);    /* socketKey */
    pop(vm);    /* socketResource — now held by map */

    /* "ip" key */
    Value ipKey = OBJ_VAL(copyString(vm, "ip", 2));
    push(vm, ipKey);
    insertIPString(vm, (struct sockaddr *)&peer, map, ipKey);
    pop(vm);    /* ipKey */

    /* "port" key */
    Value portKey = OBJ_VAL(copyString(vm, "port", 4));
    push(vm, portKey);
    if (tableSet(vm, &AS_MAP(map)->items, portKey,
                 INT_VAL(extractPort((struct sockaddr *)&peer)))) {
        writeValueArray(vm, &AS_MAP(map)->orderedKeys, portKey);
    }
    pop(vm);    /* portKey */

    return pop(vm);  /* map — returned to caller */
}

/* ── Graceful Shutdown ────────────────────────────────────────────────────── */

/**
 * socketShutdownNative — Disable one or both directions of a connection.
 *
 * Unlike close(), shutdown() does not release the file descriptor — it sends
 * a FIN to the peer so it knows the send side is done, while the descriptor
 * remains open for reading any remaining in-flight data.
 *
 * Djazair signature: fn socket_shutdown(socket, how) -> Bool
 *
 * @param args[1]  how — SD_RECEIVE (0), SD_SEND (1), or SD_BOTH (2).
 */
Value socketShutdownNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 2) {
        runtimeError(vm, "net.socket.shutdown(): Expected %d argument(s) but got %d.",
                     2, argCount);
        return NULL_VAL;
    }

    SOCKET s;
    if (!readSocket(args[0], &s)) return BOOL_VAL(false);
    if (!IS_INT(args[1]))         return BOOL_VAL(false);

    int how = AS_INT(args[1]);
    return BOOL_VAL(shutdown(s, how) == 0);
}

/* ── Send / Receive — String (UTF-8) ─────────────────────────────────────── */

/**
 * socketSendNative — Send a UTF-8 string over a connected socket.
 *
 * Uses a send-all loop because the kernel's send() may accept fewer bytes
 * than requested when the send buffer is full.  The loop retries with the
 * remaining slice until every byte is delivered or an error occurs.
 *
 * Djazair signature: fn socket_send(socket, data) -> Number
 *
 * @return Number of bytes actually sent, or -1 on an invalid argument.
 */
Value socketSendNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 2) {
        runtimeError(vm, "net.socket.send(): Expected %d argument(s) but got %d.",
                     2, argCount);
        return NULL_VAL;
    }
    if (!IS_STRING(args[1])) return INT_VAL(-1);

    SOCKET s;
    if (!readSocket(args[0], &s)) return INT_VAL(-1);

    const char *data = AS_CSTRING(args[1]);
    size_t      len  = (size_t)AS_STRING(args[1])->length;
    size_t      sent = 0;

    /* Send-all loop — keeps retrying until every byte is enqueued. */
    while (sent < len) {
        int n = send(s, data + sent, (int)(len - sent), 0);
        if (n <= 0) break;   /* peer closed or socket error */
        sent += (size_t)n;
    }

    return INT_VAL((int)sent);
}

/**
 * socketRecvNative — Receive up to N bytes as a UTF-8 string.
 *
 * A single recv() call is issued — the Djazair layer's receiveAll() handles
 * multi-chunk reads when the full response is required.
 *
 * Djazair signature: fn socket_recv(socket, maxLen) -> String|Null
 *
 * @return Received string, or Null on timeout / connection close / error.
 */
Value socketRecvNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 2) {
        runtimeError(vm, "net.socket.receive(): Expected %d argument(s) but got %d.",
                     2, argCount);
        return NULL_VAL;
    }

    SOCKET s;
    int    maxLen;
    if (!readSocket(args[0], &s) || !readByteLimit(args[1], &maxLen)) {
        return NULL_VAL;
    }

    char *buffer = malloc((size_t)maxLen + 1);
    if (!buffer) return NULL_VAL;

    int bytesRecv = recv(s, buffer, maxLen, 0);
    if (bytesRecv <= 0) { free(buffer); return NULL_VAL; }

    buffer[bytesRecv] = '\0';
    Value result = OBJ_VAL(copyString(vm, buffer, bytesRecv));
    free(buffer);
    return result;
}

/* ── Send / Receive — Raw Bytes ───────────────────────────────────────────── */

/**
 * socketSendBytesNative — Send a Djazair byte array over a connected socket.
 *
 * Validates every element is an integer in [0, 255] before copying into a
 * temporary C buffer to avoid partial sends of malformed data.
 * Uses the same send-all loop as socketSendNative.
 *
 * Djazair signature: fn socket_send_bytes(socket, byteArray) -> Number
 *
 * @return Bytes sent, 0 for an empty array, or -1 on invalid input.
 */
Value socketSendBytesNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 2) {
        runtimeError(vm, "net.socket.sendBytes(): Expected %d argument(s) but got %d.",
                     2, argCount);
        return NULL_VAL;
    }
    if (!IS_ARRAY(args[1])) return INT_VAL(-1);

    SOCKET s;
    if (!readSocket(args[0], &s)) return INT_VAL(-1);

    int len = AS_ARRAY(args[1])->items.count;
    if (len <= 0) return INT_VAL(0);

    char *buffer = malloc((size_t)len);
    if (!buffer) return INT_VAL(-1);

    /* Validate and copy each byte element. */
    for (int i = 0; i < len; i++) {
        Value elem = AS_ARRAY(args[1])->items.values[i];
        if (!IS_INT(elem) || AS_INT(elem) < 0 || AS_INT(elem) > 255) {
            free(buffer);
            return INT_VAL(-1);
        }
        buffer[i] = (char)AS_INT(elem);
    }

    /* Send-all loop. */
    size_t sent = 0;
    while (sent < (size_t)len) {
        int n = send(s, buffer + sent, (int)((size_t)len - sent), 0);
        if (n <= 0) break;
        sent += (size_t)n;
    }

    free(buffer);
    return INT_VAL((int)sent);
}

/**
 * socketRecvBytesNative — Receive up to N bytes as a Djazair integer array.
 *
 * Each element in the returned array is a Number in [0, 255] representing
 * one unsigned byte.
 *
 * Djazair signature: fn socket_recv_bytes(socket, maxLen) -> Array|Null
 */
Value socketRecvBytesNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 2) {
        runtimeError(vm, "net.socket.receiveBytes(): Expected %d argument(s) but got %d.",
                     2, argCount);
        return NULL_VAL;
    }

    SOCKET s;
    int    maxLen;
    if (!readSocket(args[0], &s) || !readByteLimit(args[1], &maxLen)) {
        return NULL_VAL;
    }

    char *buffer = malloc((size_t)maxLen);
    if (!buffer) return NULL_VAL;

    int bytesRecv = recv(s, buffer, maxLen, 0);
    if (bytesRecv <= 0) { free(buffer); return NULL_VAL; }

    Value result = OBJ_VAL(newArray(vm));
    push(vm, result);   /* anchor array against GC during element writes */

    for (int i = 0; i < bytesRecv; i++) {
        writeValueArray(vm, &AS_ARRAY(result)->items,
                        INT_VAL((unsigned char)buffer[i]));
    }

    free(buffer);
    return pop(vm);
}

/* ── UDP — Send / Receive ─────────────────────────────────────────────────── */

/**
 * socketSendToNative — Send a string datagram to an explicit destination.
 *
 * Djazair signature: fn socket_sendto(socket, data, host, port) -> Number
 *
 * @return Bytes sent (whole datagram), or -1 on error.
 */
Value socketSendToNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 4) {
        runtimeError(vm, "net.socket.sendto(): Expected %d argument(s) but got %d.",
                     4, argCount);
        return NULL_VAL;
    }
    if (!IS_STRING(args[1]) || !IS_STRING(args[2]) || !IS_INT(args[3]) ||
        AS_INT(args[3]) < 0 || AS_INT(args[3]) > 65535) {
        return INT_VAL(-1);
    }

    SOCKET s;
    if (!readSocket(args[0], &s)) return INT_VAL(-1);

    const char *data     = AS_CSTRING(args[1]);
    size_t      dataLen  = (size_t)AS_STRING(args[1])->length;
    const char *host     = AS_CSTRING(args[2]);
    int         port     = AS_INT(args[3]);

    struct sockaddr_storage dest;
    socklen_t destLen;
    if (!resolve_address(host, port, &dest, &destLen)) return INT_VAL(-1);

    int sent = sendto(s, data, (int)dataLen, 0, (struct sockaddr *)&dest, destLen);
    return INT_VAL((int)sent);
}

/**
 * socketRecvFromNative — Receive a string datagram and capture the sender.
 *
 * Returns a Djazair Map with keys:
 *   "data" → received string
 *   "ip"   → sender IP string
 *   "port" → sender port number
 *
 * Djazair signature: fn socket_recvfrom(socket, maxLen) -> Map|Null
 */
Value socketRecvFromNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 2) {
        runtimeError(vm, "net.socket.receiveFrom(): Expected %d argument(s) but got %d.",
                     2, argCount);
        return NULL_VAL;
    }

    SOCKET s;
    int    maxLen;
    if (!readSocket(args[0], &s) || !readByteLimit(args[1], &maxLen)) {
        return NULL_VAL;
    }

    char *buffer = malloc((size_t)maxLen + 1);
    if (!buffer) return NULL_VAL;

    struct sockaddr_storage sender;
    socklen_t senderLen = sizeof(sender);
    int bytesRecv = recvfrom(s, buffer, maxLen, 0,
                             (struct sockaddr *)&sender, &senderLen);
    if (bytesRecv <= 0) { free(buffer); return NULL_VAL; }
    buffer[bytesRecv] = '\0';

    /* ── Build result map ─── */
    Value map = OBJ_VAL(newMap(vm));
    push(vm, map);

    /* "data" */
    Value dataKey = OBJ_VAL(copyString(vm, "data", 4));
    push(vm, dataKey);
    Value dataVal = OBJ_VAL(copyString(vm, buffer, bytesRecv));
    push(vm, dataVal);
    if (tableSet(vm, &AS_MAP(map)->items, dataKey, dataVal)) {
        writeValueArray(vm, &AS_MAP(map)->orderedKeys, dataKey);
    }
    pop(vm);    /* dataVal */
    pop(vm);    /* dataKey */

    /* "ip" */
    Value ipKey = OBJ_VAL(copyString(vm, "ip", 2));
    push(vm, ipKey);
    insertIPString(vm, (struct sockaddr *)&sender, map, ipKey);
    pop(vm);

    /* "port" */
    Value portKey = OBJ_VAL(copyString(vm, "port", 4));
    push(vm, portKey);
    if (tableSet(vm, &AS_MAP(map)->items, portKey,
                 INT_VAL(extractPort((struct sockaddr *)&sender)))) {
        writeValueArray(vm, &AS_MAP(map)->orderedKeys, portKey);
    }
    pop(vm);

    free(buffer);
    return pop(vm);  /* map */
}

/**
 * socketSendBytesToNative — Send a byte-array datagram to an explicit destination.
 *
 * Djazair signature: fn socket_sendto_bytes(socket, byteArray, host, port) -> Number
 *
 * @return Bytes sent, or -1 on invalid input / error.
 */
Value socketSendBytesToNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 4) {
        runtimeError(vm, "net.socket.sendBytesTo(): Expected %d argument(s) but got %d.",
                     4, argCount);
        return NULL_VAL;
    }
    if (!IS_ARRAY(args[1]) || !IS_STRING(args[2]) || !IS_INT(args[3]) ||
        AS_INT(args[3]) < 0 || AS_INT(args[3]) > 65535) {
        return INT_VAL(-1);
    }

    SOCKET s;
    if (!readSocket(args[0], &s)) return INT_VAL(-1);

    int len = AS_ARRAY(args[1])->items.count;
    if (len <= 0) return INT_VAL(0);

    char *buffer = malloc((size_t)len);
    if (!buffer) return INT_VAL(-1);

    for (int i = 0; i < len; i++) {
        Value elem = AS_ARRAY(args[1])->items.values[i];
        if (!IS_INT(elem) || AS_INT(elem) < 0 || AS_INT(elem) > 255) {
            free(buffer);
            return INT_VAL(-1);
        }
        buffer[i] = (char)AS_INT(elem);
    }

    const char *host = AS_CSTRING(args[2]);
    int         port = AS_INT(args[3]);

    struct sockaddr_storage dest;
    socklen_t destLen;
    if (!resolve_address(host, port, &dest, &destLen)) {
        free(buffer);
        return INT_VAL(-1);
    }

    int sent = sendto(s, buffer, len, 0, (struct sockaddr *)&dest, destLen);
    free(buffer);
    return INT_VAL((int)sent);
}

/**
 * socketRecvBytesFromNative — Receive a byte-array datagram and capture the sender.
 *
 * Returns a Djazair Map with keys:
 *   "data" → Array of integers (0–255 per byte)
 *   "ip"   → sender IP string
 *   "port" → sender port number
 *
 * Djazair signature: fn socket_recvfrom_bytes(socket, maxLen) -> Map|Null
 */
Value socketRecvBytesFromNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 2) {
        runtimeError(vm, "net.socket.receiveBytesFrom(): Expected %d argument(s) but got %d.",
                     2, argCount);
        return NULL_VAL;
    }

    SOCKET s;
    int    maxLen;
    if (!readSocket(args[0], &s) || !readByteLimit(args[1], &maxLen)) {
        return NULL_VAL;
    }

    char *buffer = malloc((size_t)maxLen);
    if (!buffer) return NULL_VAL;

    struct sockaddr_storage sender;
    socklen_t senderLen = sizeof(sender);
    int bytesRecv = recvfrom(s, buffer, maxLen, 0,
                             (struct sockaddr *)&sender, &senderLen);
    if (bytesRecv <= 0) { free(buffer); return NULL_VAL; }

    /* Build byte array — anchored immediately. */
    Value byteArr = OBJ_VAL(newArray(vm));
    push(vm, byteArr);
    for (int i = 0; i < bytesRecv; i++) {
        writeValueArray(vm, &AS_ARRAY(byteArr)->items,
                        INT_VAL((unsigned char)buffer[i]));
    }

    /* Build result map — byteArr is still on the stack as anchor. */
    Value map = OBJ_VAL(newMap(vm));
    push(vm, map);

    /* "data" */
    Value dataKey = OBJ_VAL(copyString(vm, "data", 4));
    push(vm, dataKey);
    if (tableSet(vm, &AS_MAP(map)->items, dataKey, byteArr)) {
        writeValueArray(vm, &AS_MAP(map)->orderedKeys, dataKey);
    }
    pop(vm);    /* dataKey */

    /* "ip" */
    Value ipKey = OBJ_VAL(copyString(vm, "ip", 2));
    push(vm, ipKey);
    insertIPString(vm, (struct sockaddr *)&sender, map, ipKey);
    pop(vm);

    /* "port" */
    Value portKey = OBJ_VAL(copyString(vm, "port", 4));
    push(vm, portKey);
    if (tableSet(vm, &AS_MAP(map)->items, portKey,
                 INT_VAL(extractPort((struct sockaddr *)&sender)))) {
        writeValueArray(vm, &AS_MAP(map)->orderedKeys, portKey);
    }
    pop(vm);

    free(buffer);

    Value result = pop(vm);  /* map */
    pop(vm);                 /* byteArr — still referenced through map["data"] */
    return result;
}

/* ── Socket Lifecycle ─────────────────────────────────────────────────────── */

/**
 * socketCloseNative — Close the OS socket immediately.
 *
 * Sets the stored descriptor to INVALID_SOCKET so that subsequent calls and
 * the GC finalizer are both idempotent — closing an already-closed socket is
 * a no-op rather than an error.
 *
 * Djazair signature: fn socket_close(socket) -> Bool
 */
Value socketCloseNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 1) {
        runtimeError(vm, "net.socket.close(): Expected %d argument(s) but got %d.",
                     1, argCount);
        return NULL_VAL;
    }

    if (IS_RESOURCE(args[0])) {
        SOCKET *pSocket = (SOCKET *)AS_RESOURCE(args[0])->ptr;
        if (pSocket && *pSocket != INVALID_SOCKET) {
            CLOSE_SOCKET(*pSocket);
            *pSocket = INVALID_SOCKET;   /* idempotent guard */
        }
    }

    return BOOL_VAL(true);
}

/**
 * socketSetTimeoutNative — Set send and receive timeouts on a socket.
 *
 * A timeout of 0 means "block indefinitely" (the OS default).
 * Fractional seconds are honoured (e.g. 0.5 = 500 ms) within platform limits.
 *
 * Djazair signature: fn socket_set_timeout(socket, seconds) -> Bool
 *
 * @param args[1]  seconds — Non-negative float; 0 disables the timeout.
 */
Value socketSetTimeoutNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 2) {
        runtimeError(vm, "net.socket.setTimeout(): Expected %d argument(s) but got %d.",
                     2, argCount);
        return NULL_VAL;
    }

    SOCKET s;
    if (!readSocket(args[0], &s)) return BOOL_VAL(false);
    if (!IS_NUMBER(args[1]))      return BOOL_VAL(false);

    double seconds = AS_NUMBER(args[1]);
    if (!isfinite(seconds) || seconds < 0.0) return BOOL_VAL(false);

    int res1, res2;

#ifdef _WIN32
    /* Windows SO_RCVTIMEO / SO_SNDTIMEO are DWORD milliseconds, max ~49 days. */
    if (seconds > 4294967.0) seconds = 4294967.0;
    DWORD timeout = (DWORD)(seconds * 1000.0);
    res1 = setsockopt(s, SOL_SOCKET, SO_RCVTIMEO,
                      (const char *)&timeout, sizeof(timeout));
    res2 = setsockopt(s, SOL_SOCKET, SO_SNDTIMEO,
                      (const char *)&timeout, sizeof(timeout));
#else
    /* POSIX uses struct timeval (seconds + microseconds). */
    struct timeval tv;
    tv.tv_sec  = (long)seconds;
    tv.tv_usec = (long)((seconds - (long)seconds) * 1000000.0);
    res1 = setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
    res2 = setsockopt(s, SOL_SOCKET, SO_SNDTIMEO, &tv, sizeof(tv));
#endif

    return BOOL_VAL(res1 == 0 && res2 == 0);
}

/* ── DNS Resolution ───────────────────────────────────────────────────────── */

/**
 * dnsResolveNative — Resolve a hostname to an array of IP address strings.
 *
 * Supported address families:
 *   AF_INET  (2)  — IPv4 only  [default]
 *   AF_INET6 (platform-specific) — IPv6 only
 *   AF_UNSPEC (0) — both families, OS-preferred order
 *
 * Djazair signature: fn dns_resolve(hostname, family?) -> Array<String>|Null
 *
 * @return Array of IP strings (may be empty if none matched), or Null on
 *         resolution failure (host not found, no network, etc.).
 */
Value dnsResolveNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount < 1 || argCount > 2) {
        runtimeError(vm, "net.dns.resolve(): Expected 1–2 argument(s) but got %d.",
                     argCount);
        return NULL_VAL;
    }
    if (!IS_STRING(args[0])) {
        runtimeError(vm, "net.dns.resolve(): Argument 1 must be a string (hostname).");
        return NULL_VAL;
    }

    ensureSocketInit();

    const char *hostname = AS_CSTRING(args[0]);

    struct addrinfo hints;
    memset(&hints, 0, sizeof(hints));
    hints.ai_family   = AF_INET;   /* default: IPv4 */
    hints.ai_socktype = 0;         /* accept any socket type */

    /* Optional second argument overrides the address family. */
    if (argCount == 2 && IS_INT(args[1])) {
        int family = AS_INT(args[1]);
        if (family == AF_INET6 || family == AF_UNSPEC) {
            hints.ai_family = family;
        }
    }

    struct addrinfo *res;
    if (getaddrinfo(hostname, NULL, &hints, &res) != 0) return NULL_VAL;

    Value result = OBJ_VAL(newArray(vm));
    push(vm, result);   /* anchor array */

    for (struct addrinfo *p = res; p != NULL; p = p->ai_next) {
        char ipStr[64];
        formatAddress(ipStr, sizeof(ipStr), p->ai_addr);
        if (ipStr[0] == '\0') continue;   /* skip unknown families */

        Value ipVal = OBJ_VAL(copyString(vm, ipStr, (int)strlen(ipStr)));
        push(vm, ipVal);
        writeValueArray(vm, &AS_ARRAY(result)->items, ipVal);
        pop(vm);
    }

    freeaddrinfo(res);
    return pop(vm);   /* result array */
}

/* ── Multiplexing and Non-Blocking ────────────────────────────────────────── */

#ifndef _WIN32
#include <fcntl.h>
#endif

/**
 * socketSetBlockingNative — Set a socket to blocking or non-blocking mode.
 *
 * Djazair signature: fn socket_set_blocking(socket, blocking) -> Bool
 */
Value socketSetBlockingNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 2) {
        runtimeError(vm, "net.socket.setBlocking(): Expected 2 arguments.");
        return NULL_VAL;
    }

    SOCKET s;
    if (!readSocket(args[0], &s)) return BOOL_VAL(false);
    if (!IS_BOOL(args[1])) return BOOL_VAL(false);

    bool blocking = AS_BOOL(args[1]);
    int res = 0;

#ifdef _WIN32
    u_long mode = blocking ? 0 : 1;
    res = ioctlsocket(s, FIONBIO, &mode);
#else
    int flags = fcntl(s, F_GETFL, 0);
    if (flags == -1) return BOOL_VAL(false);
    if (blocking) {
        flags &= ~O_NONBLOCK;
    } else {
        flags |= O_NONBLOCK;
    }
    res = fcntl(s, F_SETFL, flags);
#endif

    return BOOL_VAL(res == 0);
}

/**
 * Helper to populate fd_set from a Djazair array of sockets.
 */
static int populateFdSet(Value arrayVal, fd_set *set, SOCKET *maxFd) {
    if (!IS_ARRAY(arrayVal)) return -1;
    ObjArray *array = AS_ARRAY(arrayVal);
    int count = 0;
    
    for (int i = 0; i < array->items.count; i++) {
        SOCKET s;
        if (readSocket(array->items.values[i], &s)) {
            FD_SET(s, set);
            if (s > *maxFd) {
                *maxFd = s;
            }
            count++;
        }
    }
    return count;
}

/**
 * Helper to create a Djazair array of ready sockets from fd_set.
 */
static Value extractReadySockets(djazairVM *vm, Value arrayVal, fd_set *set) {
    Value resultVal = OBJ_VAL(newArray(vm));
    push(vm, resultVal); // Anchor
    
    if (IS_ARRAY(arrayVal)) {
        ObjArray *array = AS_ARRAY(arrayVal);
        ObjArray *resultArray = AS_ARRAY(resultVal);
        for (int i = 0; i < array->items.count; i++) {
            SOCKET s;
            if (readSocket(array->items.values[i], &s)) {
                if (FD_ISSET(s, set)) {
                    writeValueArray(vm, &resultArray->items, array->items.values[i]);
                }
            }
        }
    }
    
    pop(vm); // Unanchor
    return resultVal;
}

/**
 * socketSelectNative — I/O Multiplexing using select().
 *
 * Djazair signature: fn socket_select(readSockets, writeSockets, exceptSockets, timeout) -> Map
 */
Value socketSelectNative(djazairVM *vm, int argCount, Value *args) {
    if (argCount != 4) {
        runtimeError(vm, "net.socket_select(): Expected 4 arguments.");
        return NULL_VAL;
    }

    fd_set readfds, writefds, exceptfds;
    FD_ZERO(&readfds);
    FD_ZERO(&writefds);
    FD_ZERO(&exceptfds);

    SOCKET maxFd = 0;
    int readCount = populateFdSet(args[0], &readfds, &maxFd);
    int writeCount = populateFdSet(args[1], &writefds, &maxFd);
    int exceptCount = populateFdSet(args[2], &exceptfds, &maxFd);

    struct timeval tv;
    struct timeval *tv_ptr = NULL;

    if (IS_NUMBER(args[3])) {
        double seconds = AS_NUMBER(args[3]);
        if (isfinite(seconds) && seconds >= 0.0 && seconds <= (double)LONG_MAX - 1.0) {
            tv.tv_sec = (long)seconds;
            tv.tv_usec = (long)((seconds - tv.tv_sec) * 1000000.0);
            tv_ptr = &tv;
        }
    }

    // On Windows, select fails if all three sets are empty.
    if (readCount <= 0 && writeCount <= 0 && exceptCount <= 0) {
        if (tv_ptr) {
#ifdef _WIN32
            Sleep((DWORD)(AS_NUMBER(args[3]) * 1000));
#else
            usleep((useconds_t)(AS_NUMBER(args[3]) * 1000000));
#endif
        }
        
        Value resultVal = OBJ_VAL(newMap(vm));
        push(vm, resultVal);
        
        Value emptyArray1 = OBJ_VAL(newArray(vm));
        push(vm, emptyArray1);
        Value key1 = OBJ_VAL(copyString(vm, "read", 4));
        push(vm, key1);
        if (tableSet(vm, &AS_MAP(resultVal)->items, key1, emptyArray1)) {
            writeValueArray(vm, &AS_MAP(resultVal)->orderedKeys, key1);
        }
        pop(vm);
        pop(vm);
        
        Value emptyArray2 = OBJ_VAL(newArray(vm));
        push(vm, emptyArray2);
        Value key2 = OBJ_VAL(copyString(vm, "write", 5));
        push(vm, key2);
        if (tableSet(vm, &AS_MAP(resultVal)->items, key2, emptyArray2)) {
            writeValueArray(vm, &AS_MAP(resultVal)->orderedKeys, key2);
        }
        pop(vm);
        pop(vm);
        
        Value emptyArray3 = OBJ_VAL(newArray(vm));
        push(vm, emptyArray3);
        Value key3 = OBJ_VAL(copyString(vm, "except", 6));
        push(vm, key3);
        if (tableSet(vm, &AS_MAP(resultVal)->items, key3, emptyArray3)) {
            writeValueArray(vm, &AS_MAP(resultVal)->orderedKeys, key3);
        }
        pop(vm);
        pop(vm);
        
        pop(vm);
        return resultVal;
    }

    int res = select((int)maxFd + 1, 
                     readCount > 0 ? &readfds : NULL, 
                     writeCount > 0 ? &writefds : NULL, 
                     exceptCount > 0 ? &exceptfds : NULL, 
                     tv_ptr);

    if (res < 0) {
        return NULL_VAL;
    }

    Value resultVal = OBJ_VAL(newMap(vm));
    push(vm, resultVal); // Anchor Map

    Value readyRead = extractReadySockets(vm, args[0], &readfds);
    push(vm, readyRead);
    Value keyRead = OBJ_VAL(copyString(vm, "read", 4));
    push(vm, keyRead);
    if (tableSet(vm, &AS_MAP(resultVal)->items, keyRead, readyRead)) {
        writeValueArray(vm, &AS_MAP(resultVal)->orderedKeys, keyRead);
    }
    pop(vm);
    pop(vm);

    Value readyWrite = extractReadySockets(vm, args[1], &writefds);
    push(vm, readyWrite);
    Value keyWrite = OBJ_VAL(copyString(vm, "write", 5));
    push(vm, keyWrite);
    if (tableSet(vm, &AS_MAP(resultVal)->items, keyWrite, readyWrite)) {
        writeValueArray(vm, &AS_MAP(resultVal)->orderedKeys, keyWrite);
    }
    pop(vm);
    pop(vm);

    Value readyExcept = extractReadySockets(vm, args[2], &exceptfds);
    push(vm, readyExcept);
    Value keyExcept = OBJ_VAL(copyString(vm, "except", 6));
    push(vm, keyExcept);
    if (tableSet(vm, &AS_MAP(resultVal)->items, keyExcept, readyExcept)) {
        writeValueArray(vm, &AS_MAP(resultVal)->orderedKeys, keyExcept);
    }
    pop(vm);
    pop(vm);

    pop(vm); // Unanchor Map
    return resultVal;
}

