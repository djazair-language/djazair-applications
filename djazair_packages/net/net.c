#include "net_common.h"
#include "net_ssl.h"

static NativeMethod network_nativeMethods[] = {
    // Sockets
    {"socket_create",           socketCreateNative,           3},
    {"socket_connect",          socketConnectNative,          3},
    {"socket_bind",             socketBindNative,             3},
    {"socket_listen",           socketListenNative,           2},
    {"socket_accept",           socketAcceptNative,           1},
    {"socket_send",             socketSendNative,             2},
    {"socket_recv",             socketRecvNative,             2},
    {"socket_send_bytes",       socketSendBytesNative,        2},
    {"socket_recv_bytes",       socketRecvBytesNative,        2},
    {"socket_sendto",           socketSendToNative,           4},
    {"socket_recvfrom",         socketRecvFromNative,         2},
    {"socket_sendto_bytes",     socketSendBytesToNative,      4},
    {"socket_recvfrom_bytes",   socketRecvBytesFromNative,    2},
    {"socket_close",            socketCloseNative,            1},
    {"socket_shutdown",         socketShutdownNative,         2},
    {"socket_set_timeout",      socketSetTimeoutNative,       2},
    {"socket_set_blocking",     socketSetBlockingNative,      2},
    {"socket_select",           socketSelectNative,           4},

    // DNS
    {"dns_resolve",             dnsResolveNative,             2},

    // SSL
    {"ssl_connect",             sslConnectNative,             2},
    {"ssl_send",                sslSendNative,                2},
    {"ssl_recv",                sslRecvNative,                2},
    {"ssl_send_bytes",          sslSendBytesNative,           2},
    {"ssl_recv_bytes",          sslRecvBytesNative,           2},
    {"ssl_close",               sslCloseNative,               1},

    // Platform introspection for constants.dz (avoids depending on the os module)
    {"get_max_bytes",           getMaxBytesNative,            0},
    {"get_af_inet6",            getAFInet6Native,             0},

    {NULL, NULL, 0}
};

void init_net_module(djazairVM *vm) {
    ensureSocketInit();
    djazair_register_native_module(vm, "std_net_native", network_nativeMethods);
}
