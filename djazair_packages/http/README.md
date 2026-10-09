# `std/http` — Kasbah HTTP Framework

The `std/http` module (codenamed **Kasbah**) is a high-performance, non-blocking HTTP/1.1 client and server framework for the Djazair standard library.

Designed for raw speed and security, Kasbah leverages the Djazair `net` module's asynchronous **Poller** and `deferAccept` architecture to achieve massive concurrency. In internal load tests, it handles over **4,400 requests per second** (50 concurrent connections), outperforming Python and PHP by 2x to 4x, and standing shoulder-to-shoulder with Node.js. It is intrinsically immune to Slow Loris attacks.

Kasbah is a protocol-level library. It manages parsing, chunked transfer encoding, keep-alive pooling, and response building.

## Quick Start

```djazair
use http

# 1. High-Performance Server
let server = http.createServer(fn(req, res)
    if req.pathname == "/api"
        # Maps are automatically serialized to JSON!
        res.status(200).send({"message": "Hello World", "speed": "blazing"})
    else
        res.status(404).send("Not Found")
    end
end)

print("Kasbah Server listening on port 8080...")
server.listen(8080)

# 2. HTTP Client
let res = http.get("http://localhost:8080/api")
print(res.statusCode)    # 200
print(res.body)          # {"message":"Hello World","speed":"blazing"}
```

## API Reference

### Client Functions

All client functions accept an optional `keepAlive` parameter (default `False`) to control HTTP/1.1 persistent connections. Idle connections are safely pooled.

```djazair
use http

let res = http.get("http://example.com/api")
let res = http.post("http://example.com/api", {"key": "value"})
let res = http.put("http://example.com/api/data", {"key": "val"})
let res = http.del("http://example.com/api/data")
let res = http.patch("http://example.com/api", {"key": "val"})
let res = http.head("http://example.com/api")
let res = http.options("http://example.com/api")
let res = http.request("GET", "http://example.com/api")

# Enable keep-alive (reuse connection)
let res = http.get("http://example.com", Null, True)
```

| Function | Signature |
|----------|-----------|
| `http.get` | `get(url, headers = Null, keepAlive = False, followRedirects = True, maxRedirects = 10)` |
| `http.post` | `post(url, body = Null, headers = Null, keepAlive = False, followRedirects = True, maxRedirects = 10)` |
| `http.put` | `put(url, body = Null, headers = Null, keepAlive = False, followRedirects = True, maxRedirects = 10)` |
| `http.del` | `del(url, body = Null, headers = Null, keepAlive = False, followRedirects = True, maxRedirects = 10)` |
| `http.patch` | `patch(url, body = Null, headers = Null, keepAlive = False, followRedirects = True, maxRedirects = 10)` |
| `http.head` | `head(url, headers = Null, keepAlive = False, followRedirects = True, maxRedirects = 10)` |
| `http.options` | `options(url, headers = Null, keepAlive = False, followRedirects = True, maxRedirects = 10)` |
| `http.request` | `request(method, url, body = Null, headers = Null, keepAlive = False, followRedirects = True, maxRedirects = 10)` |
| `http.clearPool` | `clearPool()` (closes all pooled client sockets) |

All functions return a response object (or Null on connection failure). By default, clients will automatically follow `3xx` redirects up to `maxRedirects` times.

### Keep-Alive Connection Pooling

The HTTP client maintains a connection pool for HTTP/1.1 keep-alive. Reuse connections to the same `host:port` automatically.

**Global Configuration Options (`http.setClientConfig(options)`):**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `keepAlive` | Boolean | `False` | Enable persistent connections globally |
| `maxBody` | Number | `10485760` (10MB) | Max response body size in bytes |
| `recvBuffer` | Number | `8192` | TCP receive buffer size in bytes |
| `connectTimeout` | Number | `10` | Timeout in seconds for connections |
| `userAgent` | String | `"Djazair-HTTP/1.1"` | User-Agent string sent in requests |
| `maxPoolSize` | Number | `5` | Max keep-alive sockets per host:port |
| `followRedirects` | Boolean | `True` | Automatically follow `3xx` redirects |
| `maxRedirects` | Number | `10` | Maximum number of redirects to follow |

---

### Server

#### `http.createServer(handler, options = {})`

Creates a Kasbah HTTP server. The handler receives `(request, response)` for each incoming request.

```djazair
use http

let server = http.createServer(fn(req, res)
    res.status(200).send("Hello World")
end, {
    "maxBody": 4194304,
    "keepAlive": True,
    "keepAliveTimeout": 10,
    "maxRequests": 200
})

server.listen(8080)
server.close()
```

#### Server Options (`http.setServerConfig(options)`)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxBody` | Number | 10485760 | Maximum request body size in bytes |
| `keepAlive` | Boolean | False | Enable HTTP/1.1 keep-alive persistent connections |
| `keepAliveTimeout` | Number | 30 | Seconds to wait for next request before closing idle connection |
| `maxRequests` | Number | 100 | Maximum requests per keep-alive connection before forcing close |

---

### Request Object

Received by the server handler. Properties:

| Property | Type | Description |
|----------|------|-------------|
| `method` | String | HTTP method (e.g., "GET", "POST") |
| `path` | String | Full request path with query (e.g., "/api?q=search") |
| `pathname` | String | Path without query (e.g., "/api") |
| `query` | Map or Null | Parsed query parameters (e.g., {"q": "search"}) |
| `remoteAddr` | String | IP address of the connecting client (e.g., "127.0.0.1") |
| `httpVersion` | String | HTTP version |
| `headers` | Map | Request headers (lowercase keys) |
| `body` | String | Request body |

#### Methods

```djazair
req.header("Host")        # returns header value (case-insensitive)
req.isMethod("GET")       # returns True if method matches (case-insensitive)
```

---

### Response Object (Server-Side)

Used in the server handler to send responses back to the client. All methods return `self` for chaining.

```djazair
use http

let server = http.createServer(fn(req, res)
    # Chained status + body
    res.status(200).send("OK")

    # JSON response — auto-serialized
    res.status(200).send({"id": 1, "name": "test"})

    # Send raw bytes
    res.status(200).sendBytes([72, 101, 108, 108, 111])  # "Hello"

    # Redirect — set status + Location header manually
    res.status(302).setHeader("Location", "/new-location").send("")
end)
```

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `status` | `status(code, text = Null)` | Set status code. `text` defaults to standard reason phrase |
| `setHeader` | `setHeader(name, value)` | Set a response header |
| `getHeader` | `getHeader(name)` | Get a response header value |
| `removeHeader` | `removeHeader(name)` | Remove a response header |
| `send` | `send(body = "")` | Send string/body response. Maps/arrays auto-serialized to JSON |
| `sendBytes` | `sendBytes(data)` | Send raw byte array (binary-safe) |
| `writeChunk` | `writeChunk(chunk)` | Send a chunk via HTTP/1.1 chunked transfer encoding. Auto-sends headers on first call. |
| `endChunk` | `endChunk(chunk = "")` | Flush headers, send final data chunk, then terminate the stream |

**Streaming (Chunked Transfer):**
`writeChunk` and `endChunk` implement HTTP/1.1 chunked transfer encoding.

```djazair
use http
let server = http.createServer(fn(req, res)
    res.status(200)
    res.writeChunk("Hello ")
    res.writeChunk("World")
    res.endChunk("!")
end)
```

---

### Low-Level Parsing & Reading

Kasbah also exposes its internals for advanced users:
- **`http.httpResponseBuilder()`**: Builds raw HTTP/1.1 response strings without a network connection.
- **`http.httpParser()`**: Low-level parser for HTTP request/response strings.
- **`http.reader()`**: Low-level streaming reader for HTTP messages from a TCP connection (handles chunked, Content-Length, and read-until-close).
