# Kasbah — Full-Featured Web Framework for Djazair

<p align="center">
  <strong>Enterprise-Grade, Fast, Modular, Expressive & Secure Web Framework for the Djazair Programming Language</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.2.0-blue.svg?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/language-Djazair-green.svg?style=flat-square" alt="Language">
  <img src="https://img.shields.io/badge/type-Pure%20Djazair-purple.svg?style=flat-square" alt="Pure Djazair">
  <img src="https://img.shields.io/badge/tests-235%20passed-brightgreen.svg?style=flat-square" alt="Tests">
  <img src="https://img.shields.io/badge/license-MIT-orange.svg?style=flat-square" alt="License">
</p>

---

## Overview

**Kasbah** is a production-ready, full-stack web framework designed natively for the **Djazair** programming language. Built upon Djazair's standard `http` engine, Kasbah brings the architectural elegance, expressive ergonomics, and robustness of modern global standards (Express, Fastify, Laravel, FastAPI, Spring) into the Djazair ecosystem.

Whether building high-performance RESTful microservices, secure JSON APIs, or dynamic server-rendered web applications with the `Qalam` template engine, Kasbah provides a unified, highly optimized, and cohesive developer experience.

---

## Key Highlights

- 🚀 **Zero Native Dependencies**: 100% Pure Djazair codebase — seamless portability across Windows, Linux, and macOS.
- ⚡ **High-Performance Routing**: Ultra-fast static routing, parameterized dynamic segments (`:param`), route groups, and mountable sub-routers.
- 🛡️ **Enterprise-Grade Security**: Native **CORS** middleware, **Helmet** security headers, strict cookie signing (HMAC-SHA256), CRLF protection, session fixation defense, and path traversal guards.
- 📦 **Automated Multi-Format Body Parsing**: Multi-format parsing for JSON, URL-encoded forms, and multipart file uploads without extra configuration.
- 🧩 **Modular Middleware Pipeline**: Onion-model request/response interceptors, route-level middleware, and scoped group pipelines.
- 🖋️ **Universal Qalam Template Integration**: Official View adapter enabling full MVC server-side rendering with template inheritance (`res.view()`), compatible with all Qalam versions.
- ✨ **Fluent Validation DSL**: Declarative input sanitization and validation schema with rich constraint rules (`required`, `email`, `url`, `matches`, `min`, `max`, `oneOf`, `custom`).
- 📂 **Streaming File Uploads & Downloads**: Robust file manager with automatic temp cleanup, MIME type validation, and RFC 5987 Unicode filename support.
- 🍪 **CookieJar & Session State**: Secure RFC 6265 cookie jars and server-side file-backed sessions with ID regeneration.

---

## Table of Contents

1. [Installation](#1-installation)
2. [Quick Start](#2-quick-start)
3. [Architecture & Request Lifecycle](#3-architecture--request-lifecycle)
4. [Application Configuration](#4-application-configuration)
5. [Routing & Sub-Routers](#5-routing--sub-routers)
   - [HTTP Methods](#http-methods)
   - [Dynamic Route Parameters](#dynamic-route-parameters)
   - [Route-Level Middleware](#route-level-middleware)
   - [Route Groups & Scoped Middleware](#route-groups--scoped-middleware)
   - [Standalone Routers & Mounting](#standalone-routers--mounting)
6. [Request Interface (`req`)](#6-request-interface-req)
   - [Properties](#request-properties)
   - [Input Extraction & Normalization](#input-extraction--normalization)
   - [Boolean Predicates](#boolean-predicates)
   - [Headers, Auth & Cookies](#headers-auth--cookies)
   - [Middleware State Management](#middleware-state-management)
7. [Response Interface (`res`)](#7-response-interface-res)
   - [Status & Headers](#status--headers)
   - [Content Senders](#content-senders)
   - [File Streaming & Downloads](#file-streaming--downloads)
   - [Cookie Management & Redirects](#cookie-management--redirects)
   - [Semantic Status Helpers](#semantic-status-helpers)
   - [Web Linking (RFC 5988)](#web-linking-rfc-5988)
8. [Built-in Security Middleware](#8-built-in-security-middleware)
   - [CORS Middleware (`kasbah.cors`)](#cors-middleware-kasbahcors)
   - [Helmet Security Headers (`kasbah.helmet`)](#helmet-security-headers-kasbahhelmet)
   - [Static File Serving (`kasbah.serveStatic`)](#static-file-serving-kasbahservestatic)
   - [Structured Logging (`kasbah.logger`)](#structured-logging-kasbahlogger)
   - [Body Parser (`kasbah.bodyParser`)](#body-parser-kasbahbodyparser)
9. [Session & Cookie Management](#9-session--cookie-management)
   - [Session Configuration](#session-configuration)
   - [Session Manager API](#session-manager-api)
   - [Session Fixation Defense (`regenerate`)](#session-fixation-defense-regenerate)
   - [CookieJar Interface](#cookiejar-interface)
10. [Input Validation Engine (`kasbah.validator`)](#10-input-validation-engine-kasbahvalidator)
    - [Validation Rules Reference](#validation-rules-reference)
    - [Validator API & Error Format](#validator-api--error-format)
    - [Custom Rule Closures](#custom-rule-closures)
11. [File Uploads & File Manager](#11-file-uploads--file-manager)
    - [Single File Upload via `req.file()`](#single-file-upload-via-reqfile)
    - [UploadedFile Interface](#uploadedfile-interface)
    - [Advanced Multi-File Processing (`req.uploader()`)](#advanced-multi-file-processing-requploader)
    - [FileManager API](#filemanager-api)
12. [Template Engine Integration (`Qalam`)](#12-template-engine-integration-qalam)
    - [Configuring Views](#configuring-views)
    - [Rendering Templates](#rendering-templates)
    - [In-Memory String Rendering](#in-memory-string-rendering)
13. [Centralized Error Handling](#13-centralized-error-handling)
    - [404 Not Found Handling](#404-not-found-handling)
    - [Global 500 Exception Dispatcher](#global-500-exception-dispatcher)
14. [Framework Utilities & Helpers](#14-framework-utilities--helpers)
15. [Full REST Application Example](#15-full-rest-application-example)
16. [Running Tests](#16-running-tests)
17. [License](#17-license)

---

## 1. Installation

Install via the Djazair Package Manager (`dpm`):

```bash
dpm install kasbah
```

Or clone directly into your project's extension folder:

```bash
git clone https://github.com/djazair-language/djazair-extensions.git
```

---

## 2. Quick Start

Create an entry file `server.dz`:

```djazair
use kasbah

# 1. Initialize application
let app = new kasbah.app({
    "port":   8080,
    "static": "public"
})

# 2. Basic JSON endpoint
app.get("/", fn(req, res)
    res.json({
        "framework": "Kasbah",
        "version":   "0.2.0",
        "status":    "running"
    })
end)

# 3. Dynamic route with URL parameter
app.get("/hello/:name", fn(req, res)
    res.ok({
        "greeting": "Hello, ${req.param(\"name\")}!",
        "isAjax":   req.isAjax()
    })
end)

# 4. Start web server listener
app.listen()
```

Run with the Djazair runtime:

```bash
djazair server.dz
```

---

## 3. Architecture & Request Lifecycle

Kasbah executes incoming HTTP requests through a structured, linear pipeline:

```text
[ Incoming HTTP Request ]
          │
          ▼
┌────────────────────────────────────────┐
│ 1. Request Preparation                 │
│    • Client IP Resolution              │
│    • Path Decoding & Traversal Guard   │
│    • CookieJar Initialization          │
└────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────┐
│ 2. Core Middleware Pipeline            │
│    • BodyParser (JSON / Form / Multi)  │
│    • Session State Binding             │
│    • ServeStatic Assets Interceptor    │
│    • Security Middlewares (CORS/Helmet)│
└────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────┐
│ 3. Router & Route Middlewares          │
│    • Verb & Path Matching              │
│    • Parameter Extraction (:param)     │
│    • Scoped Route-Level Middlewares    │
│    • Handler Execution                 │
└────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────┐
│ 4. Response Dispatch & Teardown        │
│    • Byte-accurate Content-Length      │
│    • Cookie Header Serialization       │
│    • Session Writeback & Persistence   │
│    • Temporary Upload Files Cleanup    │
│    • Structured Access Latency Log     │
└────────────────────────────────────────┘
          │
          ▼
[ HTTP Client Response ]
```

---

## 4. Application Configuration

Kasbah applications accept a comprehensive configuration map upon instantiation:

```djazair
let app = new kasbah.app({
    # ── Network & Server Binding ──────────────────────────────────────────────
    "port":        8080,          # TCP Port (default: 3000)
    "host":        "0.0.0.0",     # Binding Address (default: "0.0.0.0")
    "static":      "public",      # Path to static directory
    "views":       "views",       # Path to Qalam templates directory
    "maxBodySize": 10,            # Max request body size in MB (default: 10)
    "trustProxy":  False,         # Trust X-Forwarded-For reverse proxy headers
    "debug":       False,         # Detailed error outputs in response

    # ── Logging ───────────────────────────────────────────────────────────────
    "logger":      True,          # Boolean or config map: {"level": "info", "format": "dev"}

    # ── Session Security ──────────────────────────────────────────────────────
    "session": {
        "secret":   "your-cryptographic-secret-at-least-32-chars-long!", # Required (>= 32 chars)
        "name":     "kasbah.sid", # Cookie name
        "maxAge":   86400,        # Expiry in seconds (1 day)
        "secure":   False,        # HTTPS only flag
        "sameSite": "Lax",        # SameSite: "Lax", "Strict", "None"
        "dir":      ""            # Optional custom session storage directory
    },

    # ── Keep-Alive Settings (Optional) ────────────────────────────────────────
    "server": {
        "keepAlive":             False,
        "keepAliveTimeout":      30,
        "maxKeepAliveRequests":  100
    }
})
```

---

## 5. Routing & Sub-Routers

### HTTP Methods

Kasbah supports all standard HTTP verbs:

```djazair
app.get("/items", handler)
app.post("/items", handler)
app.put("/items/:id", handler)
app.delete("/items/:id", handler)
app.patch("/items/:id", handler)
app.head("/items", handler)
app.options("/items", handler)
app.all("/any-method", handler) # Matches GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
```

### Dynamic Route Parameters

Parameters prefixed with `:` are extracted into `req.params` and accessible via `req.param(name)`:

```djazair
app.get("/users/:userId/orders/:orderId", fn(req, res)
    let uid = req.param("userId")
    let oid = req.param("orderId")
    res.ok({"userId": uid, "orderId": oid})
end)
```

### Route-Level Middleware

Attach single or multiple scoped middlewares directly to specific routes:

```djazair
# Single route middleware
app.get("/dashboard", authGuard, fn(req, res)
    res.ok({"user": req.get("user")})
end)

# Array of route middlewares
app.post("/admin/settings", [authGuard, adminOnly], fn(req, res)
    res.ok({"status": "updated"})
end)
```

### Route Groups & Scoped Middleware

Organize routes sharing common prefixes and middleware pipelines:

```djazair
app.group("/api/v1", [authMiddleware], fn(g)
    g.get("/profile", fn(req, res)
        res.json({"profile": "data"})
    end)

    # Nested sub-group (/api/v1/admin/stats)
    g.group("/admin", [adminOnly], fn(adminGroup)
        adminGroup.get("/stats", fn(req, res)
            res.json({"stats": []})
        end)
    end)
end)
```

### Standalone Routers & Mounting

Modularize large codebases into standalone routers and mount them on prefixes:

```djazair
# routes/trades.dz
import "kasbah/init.dz" as kasbah

let router = new kasbah.router()

router.get("/", fn(req, res)
    res.ok({"trades": []})
end)

router.get("/:id", fn(req, res)
    res.ok({"tradeId": req.param("id")})
end)

# server.dz
import "routes/trades.dz" as tradesRoutes
app.mount("/api/trades", tradesRoutes.router)
```

---

## 6. Request Interface (`req`)

The `request` object wraps incoming client data with safe, fluent accessors:

### Request Properties
| Property | Type | Description |
|:---|:---|:---|
| `req.method` | `String` | HTTP verb (`"GET"`, `"POST"`, `"PUT"`, etc.) |
| `req.path` | `String` | URL path without query string (`"/trades/42"`) |
| `req.ip` | `String` | Client IP address (considers `trustProxy` / `X-Forwarded-For`) |
| `req.body` | `Map\|String` | Parsed request payload (JSON / Form map / raw body) |
| `req.files` | `Map` | Uploaded multipart files descriptor dictionary |
| `req.cookies` | `CookieJar` | CookieJar instance for reading and managing cookies |
| `req.session` | `SessionManager` | SessionManager instance for active session state |
| `req.rawHeaders` | `Map` | Dictionary of raw incoming HTTP headers |

### Input Extraction & Normalization
```djazair
# 1. Individual getters
let id   = req.param("id", "default_id") # Route parameter (:id)
let page = req.query("page", "1")        # Query parameter (?page=1)
let data = req.input("email")            # Lookup across params -> query -> body in order

# 2. Bulk input dictionaries
let allInputs = req.all()                # Merges params + query + body into unified dictionary
let allInputs = req.inputs()             # Direct alias for req.all()
let filtered  = req.only(["name", "age"])# Returns map with only specified keys
let omitted   = req.except(["password"]) # Returns map excluding specified keys
```

### Boolean Predicates
```djazair
req.isJson()         # True if client expects or sends JSON (Accept, Content-Type, AJAX)
req.isAjax()         # True if X-Requested-With: XMLHttpRequest
req.isSecure()       # True if connection is HTTPS or TLS termination proxy
req.secure()         # Alias for req.isSecure()
req.isMethod("GET")  # Case-insensitive HTTP verb match
req.isType("json")   # Matches Content-Type category ("json", "form", "multipart")
req.contentIs("json")# Alias for req.isType()
req.hasFile("avatar")# True if uploaded file exists and is saved on disk
req.accepts("html")  # True if client accepts requested MIME type (supports wildcards)
```

### Headers, Auth & Cookies
```djazair
let auth    = req.header("authorization") # Case-insensitive header lookup
let token   = req.token()                 # Extracts Bearer token string (or Null)
let token   = req.bearerToken()           # Alias for req.token()
let cookie  = req.cookie("theme")         # Returns cookie value by name
let ua      = req.userAgent()             # Client User-Agent header
let ref     = req.referer()               # Client Referer / Referrer URL
let host    = req.host()                  # Client Host header
let proto   = req.protocol()              # Protocol scheme ("http" or "https")
```

### Middleware State Management
```djazair
# Store custom attribute in request state
req.set("currentUser", userRecord)

# Retrieve custom attribute
let user = req.get("currentUser")
```

---

## 7. Response Interface (`res`)

The `response` object provides a fluent, chainable API for crafting HTTP responses:

### Status & Headers
```djazair
res.status(201)                                # Sets numeric HTTP status
res.header("X-Custom", "Value")                # Sets response header
let h = res.header("X-Custom")                 # Gets response header
res.removeHeader("X-Powered-By")               # Removes queued response header
res.type("json")                               # Sets Content-Type by extension or MIME type
res.sendStatus(404)                            # Sends status code with standard reason phrase
```

### Content Senders
```djazair
res.json({"status": "ok"})                     # application/json; charset=utf-8
res.html("<h1>Hello</h1>")                     # text/html; charset=utf-8
res.text("Plain text")                         # text/plain; charset=utf-8
res.xml("<root></root>")                       # application/xml; charset=utf-8
res.view("home", {"name": "Riyadh"})           # Renders Qalam template views/home.html
res.send(rawContent)                           # Sends raw string body
```

### File Streaming & Downloads
```djazair
# Streams binary or text file with accurate byte Content-Length and MIME type
res.file("assets/report.pdf")

# Triggers browser download dialog with RFC 5987 Unicode filename
res.download("assets/document.pdf", "تقرير_السنوي.pdf")
```

### Cookie Management & Redirects
```djazair
# Set cookie with RFC 6265 directives
res.cookie("theme", "dark", {
    "maxAge":   86400 * 30, # 30 days
    "httpOnly": True,
    "secure":   True,
    "sameSite": "Lax",
    "path":     "/"
})

# Delete / clear cookie on client
res.clearCookie("theme")
res.deleteCookie("theme") # Alias for clearCookie

# Redirects
res.redirect("/login", 302)
res.back("/fallback")     # Redirects to client's Referer URL with fallback
```

### Semantic Status Helpers
| Method | Status Code | Default Payload | Description |
|:---|:---:|:---|:---|
| `res.ok(data)` | `200 OK` | `""` or JSON | Successful request |
| `res.created(data)` | `201 Created` | `""` or JSON | Successful resource creation |
| `res.noContent()` | `204 No Content` | `""` | Empty success response |
| `res.badRequest(msg)` | `400 Bad Request` | `{"error": msg}` | Client input error |
| `res.unauthorized(msg)` | `401 Unauthorized` | `{"error": msg}` | Authentication required |
| `res.forbidden(msg)` | `403 Forbidden` | `{"error": msg}` | Access denied |
| `res.notFound(msg)` | `404 Not Found` | `{"error": msg}` | Resource not found |
| `res.validationError(errors)` | `422 Unprocessable` | `{"errors": errors}` | Schema validation failure |
| `res.serverError(msg)` | `500 Internal Error` | `{"error": msg}` | Server runtime exception |

### Web Linking (RFC 5988)
```djazair
res.links({
    "next": "/trades?page=3",
    "prev": "/trades?page=1",
    "last": "/trades?page=10"
})
# Emits Header: Link: <https://...>; rel="next", <https://...>; rel="prev"
```

---

## 8. Built-in Security Middleware

### CORS Middleware (`kasbah.cors`)

Enable Cross-Origin Resource Sharing with support for dynamic origins, credentials, allowed headers, and preflight `OPTIONS` resolution:

```djazair
use kasbah

let app = new kasbah.app()

# 1. Default (Wildcard all origins '*')
app.middleware(kasbah.cors())

# 2. Advanced Enterprise CORS Configuration
app.middleware(kasbah.cors({
    "origin":            ["https://app.example.com", "https://admin.example.com"],
    "methods":           ["GET", "POST", "PUT", "DELETE", "PATCH"],
    "allowedHeaders":    ["Content-Type", "Authorization", "X-Requested-With"],
    "exposedHeaders":    ["Content-Range", "X-Total-Count"],
    "credentials":       True,
    "maxAge":            86400, # Cache preflight for 24 hours
    "preflightContinue": False  # Automatically ends OPTIONS requests with 204
}))
```

> [!NOTE]
> When `credentials: True` is configured, Kasbah automatically reflects the specific request `Origin` and sets `Vary: Origin`, ensuring full compliance with W3C/RFC CORS specifications (as browsers reject wildcard `*` with credentials).

---

### Helmet Security Headers (`kasbah.helmet`)

Secure your HTTP response headers against common web vulnerabilities (Clickjacking, MIME-sniffing, XSS, and Information Disclosure):

```djazair
use kasbah

let app = new kasbah.app()

# 1. Default Security Stack
# Injects X-Frame-Options: SAMEORIGIN, X-Content-Type-Options: nosniff,
# X-XSS-Protection, HSTS (on HTTPS), Referrer-Policy, and removes X-Powered-By.
app.middleware(kasbah.helmet())

# 2. Custom Security Headers & Content Security Policy (CSP)
app.middleware(kasbah.helmet({
    "xFrameOptions":  "DENY",
    "referrerPolicy": "strict-origin-when-cross-origin",
    "hsts": {
        "maxAge":            31536000, # 1 year
        "includeSubDomains": True,
        "preload":           True
    },
    "csp": {
        "default-src": ["'self'"],
        "script-src":  ["'self'", "https://cdn.jsdelivr.net"],
        "style-src":   ["'self'", "'unsafe-inline'"],
        "img-src":     ["'self'", "data:", "https:"]
    }
}))
```

---

### Static File Serving (`kasbah.serveStatic`)

Serves assets with directory traversal protection, `Cache-Control` caching policies, and `index.html` fallback:

```djazair
app.middleware(kasbah.serveStatic("./public"))
```

---

### Structured Logging (`kasbah.logger`)

Outputs formatted request timing, status codes, and latency in milliseconds:

```djazair
app.middleware(kasbah.logger({
    "level":  "info",    # "debug" | "info" | "warn" | "error" | "none"
    "format": "combined" # "dev" | "combined"
}))
```

---

### Body Parser (`kasbah.bodyParser`)

Enabled by default in Kasbah applications, automatically parsing incoming JSON, URL-encoded forms, and multipart data:

```djazair
# Custom max body size (in MB)
app.middleware(kasbah.bodyParser(20)) # 20 MB limit
```

---

## 9. Session & Cookie Management

### Session Configuration
```djazair
let app = new kasbah.app({
    "session": {
        "secret":   "my-ultra-secure-cryptographic-key-32-chars-long!", # Required (>= 32 chars)
        "name":     "kasbah.sid",
        "maxAge":   86400,
        "sameSite": "Lax",
        "secure":   False
    }
})
```

### Session Manager API
```djazair
app.get("/visit", fn(req, res)
    let visits = req.session.get("visits", 0) + 1
    req.session.set("visits", visits)
    req.session.set("user", {"name": "Riad"})

    let hasUser = req.session.has("user") # True
    let allData = req.session.all()        # Shallow copy map of all session data

    res.json({
        "sessionId":    req.session.id(),
        "isNewSession": req.session.isNew(),
        "visits":       visits
    })
end)
```

### Session Fixation Defense (`regenerate`)
Prevent session fixation attacks upon login by regenerating the session ID and issuing a new signed cookie:
```djazair
app.post("/login", fn(req, res)
    # Authenticate user...
    let newSessionId = req.session.regenerate()
    req.session.set("userId", 42)
    res.ok({"message": "Logged in", "sid": newSessionId})
end)
```

### CookieJar Interface
Access raw cookies on `req.cookies` and `res.cookies`:
```djazair
let theme = req.cookies.get("theme", "light")
let exists = req.cookies.has("theme")
let allCookies = req.cookies.all()

req.cookies.set("theme", "dark", {"maxAge": 86400})
req.cookies.delete("theme")
req.cookies.clear() # Clears all incoming and queues deletion headers
```

---

## 10. Input Validation Engine (`kasbah.validator`)

### Validation Rules Reference
| Rule Method | Description |
|:---|:---|
| `.required()` | Field must be present and non-empty |
| `.optional()` | Skips further checks if value is missing / empty |
| `.string()` | Value must be of String type |
| `.number()` | Value must be a numeric type (Integer or Float) |
| `.boolean()` | Value must be a Boolean (`True` or `False`) |
| `.array()` | Value must be an Array |
| `.email()` | Validates standard RFC email address format |
| `.url()` | Validates `http://` or `https://` URL format |
| `.matches(regex)` | Validates string against regular expression |
| `.min(n)` | Numeric minimum bound (inclusive) |
| `.max(n)` | Numeric maximum bound (inclusive) |
| `.minLength(n)` | String or array minimum length |
| `.maxLength(n)` | String or array maximum length |
| `.oneOf(allowed)` | Value must be one of allowed array items |
| `.custom(fn)` | Custom validator closure `fn(val)` returning `True` or error message |

### Validator API & Error Format
```djazair
app.post("/api/register", fn(req, res)
    let v = req.validate()

    v.field("username").required().string().minLength(3).maxLength(30)
    v.field("email").required().email()
    v.field("age").required().number().min(18).max(120)
    v.field("role").required().oneOf(["admin", "user", "editor"])
    v.field("website").optional().url()
    v.field("customCode").optional().matches("^[A-Z]{3}-[0-9]{4}$")
    v.field("agreement").required().boolean()

    # Custom rule closure
    v.field("points").optional().custom(fn(val)
        return if val % 10 == 0 ? True else "must be a multiple of 10"
    end)

    if v.fails()
        let firstErr = v.firstError()        # "must be a valid email address"
        let emailErrs = v.errorFor("email")   # ["must be a valid email address"]
        return res.validationError(v.errors())# Emits 422 with {"errors": {...}}
    end

    let cleanData = v.validated() # Map containing only valid fields
    res.created({"status": "registered", "user": cleanData})
end)
```

---

## 11. File Uploads & File Manager

### Single File Upload via `req.file()`
```djazair
app.post("/upload/avatar", fn(req, res)
    if not req.hasFile("avatar")
        return res.badRequest("No avatar uploaded")
    end

    let file = req.file("avatar")

    # Validate image extension and size
    if not file.isImage() or not file.hasExt(["jpg", "png", "webp"])
        return res.badRequest("Avatar must be a JPG, PNG, or WebP image")
    end

    # Save to storage directory
    let savedPath = file.saveTo("./storage/avatars")
    res.ok({"path": savedPath, "size": file.getSize()})
end)
```

### UploadedFile Interface
| Method | Return Type | Description |
|:---|:---:|:---|
| `file.isValid()` | `Boolean` | True if temporary file exists on disk |
| `file.getName()` | `String` | Form field name |
| `file.getFilename()` | `String` | Original client filename |
| `file.getTempPath()` | `String` | Path to temporary file on disk |
| `file.getSize()` | `Number` | File size in bytes |
| `file.getMimeType()` | `String` | MIME media type |
| `file.getExt()` | `String` | Lowercased file extension without leading dot |
| `file.hasExt(list)` | `Boolean` | True if extension matches allowed list |
| `file.isImage()` | `Boolean` | True if MIME type or extension is an image |
| `file.saveTo(dir, newName)` | `String` | Moves temporary file to target directory |
| `file.readBytes()` | `Array` | Reads file content as raw byte array |
| `file.readText()` | `String` | Reads file content as UTF-8 string |
| `file.delete()` | `Boolean` | Deletes temporary file immediately |

### Advanced Multi-File Processing (`req.uploader()`)
```djazair
app.post("/upload/gallery", fn(req, res)
    let uploader = req.uploader({
        "dest":              "./storage/gallery",
        "maxSize":           5, # Max 5 MB per file
        "allowedTypes":      ["image/jpeg", "image/png", "image/webp"],
        "keepOriginalName":  False,
        "prefix":            "gallery_"
    })

    # Save up to 10 files from "photos" field
    let result = uploader.multiple("photos", 10)
    if not result["ok"]
        return res.badRequest(result["errors"])
    end

    res.created({"uploaded": result["files"]})
end)
```

---

## 12. Template Engine Integration (`Qalam`)

Kasbah seamlessly integrates with the **Qalam** AST template engine for server-side HTML rendering:

```djazair
let app = new kasbah.app({
    "views": "./views"
})

# Renders views/trades/index.html
app.get("/trades", fn(req, res)
    let trades = [
        {"id": 1, "symbol": "EURUSD", "profit": "+240$"},
        {"id": 2, "symbol": "BTCUSD", "profit": "+1,200$"}
    ]

    res.view("trades/index", {
        "title":  "Active Trades",
        "trades": trades
    })
end)
```

### Template Example (`views/trades/index.html`)

```html
{% extends "layouts/main" %}

{% block content %}
  <h1>{{ title }}</h1>
  <ul>
    {% for trade in trades %}
      <li><strong>{{ trade.symbol }}</strong>: {{ trade.profit }}</li>
    {% endfor %}
  </ul>
{% endblock %}
```

---

## 13. Centralized Error Handling

### 404 Not Found Handling
```djazair
app.onNotFound(fn(req, res)
    if req.isJson()
        res.notFound("The requested resource was not found on this server.")
    else
        res.status(404).html("<h1>404 — Page Not Found</h1>")
    end
end)
```

### Global 500 Exception Dispatcher
```djazair
app.onError(fn(err, req, res)
    print("[ERROR] ${req.method} ${req.path} -> ${str(err)}")
    
    if res.sentFlag return end

    res.status(500).json({
        "error":     "Internal Server Error",
        "timestamp": str(datetime.now())
    })
end)
```

---

## 14. Framework Utilities & Helpers

Kasbah exports essential utilities directly from `init.dz` or `helpers/utils.dz`:

```djazair
# 1. Cryptographically Secure ID Generator
let sid = kasbah.generateId(32) # Generates 32-character random hex string

# 2. RFC 5987 Unicode Filename Encoder
let encoded = kasbah.urlEncodeFilename("تقرير_البيانات.pdf")

# 3. Global Server and Client Configuration Defaults
kasbah.setServerConfig({"port": 8080, "trustProxy": True})
kasbah.setClientConfig({"timeout": 15})
```

---

## 15. Full REST Application Example

```djazair
use kasbah

let app = new kasbah.app({
    "port":          8080,
    "static":        "public",
    "bodyParser":    True,
    "logger":        True,
    "session":       True,
    "sessionSecret": "kasbah-production-secret-key-32-chars-long!"
})

# Security Middlewares
app.middleware(kasbah.helmet())
app.middleware(kasbah.cors({
    "origin":      "*",
    "credentials": True
}))

# In-Memory Database
let items = []

# API Routes
app.get("/api/items", fn(req, res)
    res.ok({"count": items.length(), "items": items})
end)

app.post("/api/items", fn(req, res)
    let v = req.validate()
    v.field("title").required().string().minLength(2)
    v.field("price").required().number().min(0)

    if v.fails()
        return res.validationError(v.errors())
    end

    let newItem = {
        "id":    items.length() + 1,
        "title": req.input("title"),
        "price": req.input("price")
    }
    items.append(newItem)

    res.created({"message": "Item created", "item": newItem})
end)

# Start Application Server
app.listen()
```

---

## 16. Running Tests

Kasbah contains an automated test suite covering all modules:

```bash
djazair tests/test_routing.dz
djazair tests/test_validator.dz
djazair tests/test_session.dz
djazair tests/test_body_parser.dz
djazair tests/test_cors.dz
djazair tests/test_helmet.dz
djazair tests/test_kasbah_security.dz
djazair tests/test_kasbah_config.dz
djazair tests/test_view.dz
djazair tests/test_docs_snippets.dz
djazair tests/test_extreme_stress.dz
```

---

## 17. License

Kasbah is open-source software licensed under the **MIT License**.  
Developed and maintained by **Harizi Riyadh** (<hariziriyadh@gmail.com>).
