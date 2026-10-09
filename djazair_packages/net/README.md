# `std/net` — Djazair Network Library

The `std/net` library provides comprehensive, high-performance networking capabilities for the Djazair language. It supports TCP, UDP, TLS/SSL, DNS resolution, URL parsing, and raw BSD sockets for both IPv4 and IPv6.

Powered by a highly optimized C backend with asynchronous **Poller** (I/O Multiplexing) architecture, the Djazair `net` module is designed for massive concurrency, mitigating attacks like Slow Loris out of the box, and standing on par with industry giants like Node.js.

## Table of Contents
- [Global Configuration](#global-configuration)
- [I/O Multiplexing (Poller)](#io-multiplexing-poller)
- [TCP Clients](#tcp-clients)
- [TCP Servers](#tcp-servers)
- [UDP Sockets](#udp-sockets)
- [Raw BSD Sockets](#raw-bsd-sockets)
- [DNS Resolution](#dns-resolution)
- [URL Parsing & Encoding](#url-parsing--encoding)
- [Constants & Enums](#constants--enums)

---

## Global Configuration

You can override default limits and behaviors for all sockets using `net.setClientConfig()` and `net.setServerConfig()`.

```djazair
use net

net.setClientConfig({
    "maxSend": 20 * 1024 * 1024, # 20 MB max payload
    "defaultTimeout": 15         # 15 seconds connection timeout
})

net.setServerConfig({
    "defaultPort": 8080,
    "defaultBacklog": 1024,      # Max pending connections
    "defaultTimeout": 30
})
```

---

## I/O Multiplexing (Poller)

At the heart of Djazair's high-performance servers is the `net.poller` module, allowing a single thread to monitor thousands of sockets simultaneously without blocking. On Windows, it handles up to **4096 concurrent connections** per tick (bypassing the OS default of 64).

```djazair
use net

let p = new net.poller()
p.register(mySocket, "r") # Monitor for reading
p.register(anotherSocket, "rw") # Monitor for read & write

# Blocks until a socket is ready (or 0.5s timeout)
let ready = p.poll(0.5)

if ready["read"].contains(mySocket.handle)
    let data = mySocket.receive()
    if !isNull(data)   # Null = connection closed or timeout
        print(data)
    end
end
```

---

## TCP Clients

### `net.tcpClient`

Provides a stream-oriented, connection-based client for IPv4 and IPv6 networks.

```djazair
use net
let client = new net.tcpClient()
client.connect("example.com", 80)
client.send("GET / HTTP/1.1\r\nHost: example.com\r\n\r\n")
print(client.receiveAll())
client.close()
```

### `net.tlsClient` (Secure SSL/TLS)

A high-level client that provides an encrypted TLS tunnel over TCP.

```djazair
use net
let client = new net.tlsClient()
client.connect("google.com", 443)
client.send("GET / HTTP/1.1\r\nHost: google.com\r\n\r\n")
print(client.receiveAll())
client.close()
```

---

## TCP Servers

### `net.tcpServer`

A high-performance TCP server. It utilizes the asynchronous `Poller` under the hood. 

**Architectural Note (`deferAccept`):** 
By default, standard TCP libraries pass connections to handlers immediately (`deferAccept = False`). However, if you are building an HTTP server (like `Kasbah`), you can enable `deferAccept = True` via options. This keeps connections in the non-blocking Poller until the client actually sends data, completely immunizing the server against Slow Loris and Pre-connect attacks!

```djazair
use net

let server = new net.tcpServer(fn(client, ip, port)
    print("New connection from ${ip}:${port}")
    client.send("Welcome!")
    client.close()
end, {"deferAccept": False}) # Pass True for HTTP-like protocols

server.listen(8080)
```

---

## UDP Sockets

UDP is a connectionless protocol. The `net` module provides `udpClient` and `udpServer` for datagram communication.

### `net.udpClient`

```djazair
use net
let client = new net.udpClient()
client.send("Ping", "127.0.0.1", 9000)

let response = client.receiveFrom()
if !isNull(response)   # Null = timeout or no data
    print("Received from " + response["ip"] + ": " + response["data"])
end
client.close()
```

### `net.udpServer`

A robust, non-blocking UDP server (also powered by `Poller`) that dispatches incoming datagrams to your handler callback.

```djazair
use net
let srv = new net.udpServer(fn(data, ip, port)
    print("Received: " + data)
end)
srv.listen(9000)
```

---

## Raw BSD Sockets

### `net.socket`

For ultimate protocol control, use the raw BSD socket wrapper.

```djazair
use net
let sock = new net.socket(net.AF_INET, net.SOCK_STREAM, 0)
sock.setBlocking(False) # Toggle blocking mode manually
sock.bind("0.0.0.0", 3000)
sock.listen(128)
```

---

## DNS Resolution

Resolve hostnames to IP addresses. Fully supports IPv4 and IPv6.

```djazair
use net
let ips = net.resolveDNS("example.com") # Defaults to IPv4
let ipv6 = net.resolveDNS("example.com", net.AF_INET6)
let all = net.resolveDNS("example.com", net.AF_UNSPEC)
```

---

## URL Parsing & Encoding

Djazair follows the **WHATWG URL standard** for parsing and manipulating URLs.

### `net.parseURL(urlString)`

Returns a `net.url` class instance representing the parsed URL.

```djazair
use net
let u = net.parseURL("https://example.com/search?q=djazair")

# Mutate query using urlSearchParams
u.searchParams.set("q", "programming")
u.searchParams.append("sort", "desc")

print(u.toString()) # https://example.com/search?q=programming&sort=desc
```

### URL Encoding
```djazair
print(net.urlEncode("Hello World!"))   # Hello+World%21
print(net.urlDecode("Hello+World%21")) # Hello World!
```

---

## Constants & Enums

- **Address Families:** `net.AF_INET`, `net.AF_INET6`, `net.AF_UNSPEC`
- **Socket Types:** `net.SOCK_STREAM`, `net.SOCK_DGRAM`
- **Shutdown Flags:** `net.SD_RECEIVE`, `net.SD_SEND`, `net.SD_BOTH`
