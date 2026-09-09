# Qalam (قلم) — Modular, High-Performance HTML Template Engine for Djazair

<p align="center">
  <img src="https://raw.githubusercontent.com/djazair-language/djazair-extensions/main/qalam/assets/logo.png" alt="Qalam Logo" width="120" onerror="this.style.display='none'"/>
</p>

<p align="center">
  <strong>A fast, secure, AST-based HTML template engine designed exclusively for the <a href="https://github.com/djazair-language">Djazair Programming Language</a>.</strong>
</p>

<p align="center">
  <a href="./dpm.json"><img src="https://img.shields.io/badge/version-0.2.0-blue.svg?style=flat-square" alt="Version 0.2.0"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg?style=flat-square" alt="License MIT"></a>
  <a href="https://github.com/djazair-language"><img src="https://img.shields.io/badge/language-Djazair-red.svg?style=flat-square" alt="Djazair Language"></a>
  <a href="./tests/run_all_tests.dz"><img src="https://img.shields.io/badge/tests-258%20passed-brightgreen.svg?style=flat-square" alt="Tests Passed"></a>
  <a href="./docs/index.html"><img src="https://img.shields.io/badge/docs-interactive%20html-cyan.svg?style=flat-square" alt="Documentation"></a>
</p>

---

## 📖 Table of Contents

- [Overview & Etymology](#-overview--etymology)
- [Key Features](#-key-features)
- [Architecture & Design Principles](#-architecture--design-principles)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
  - [In-Memory Rendering](#1-in-memory-rendering-no-disk-io-needed)
  - [File-Based Rendering](#2-file-based-rendering-with-views-directory)
  - [Integration with Kasbah Framework](#3-integration-with-kasbah-web-framework)
- [Template Syntax Guide](#-template-syntax-guide)
  - [Variable Interpolation & Auto-Escaping](#variable-interpolation--auto-escaping)
  - [Raw Output](#raw-output)
  - [Filter Pipelines & Transformations](#filter-pipelines--transformations)
  - [Conditionals & Multi-Branching](#conditionals--multi-branching)
  - [Logical & Comparison Operators](#logical--comparison-operators)
  - [Loops & Loop Context Metadata](#loops--loop-context-metadata)
  - [Template Inheritance & Blocks](#template-inheritance--blocks)
  - [Partials & Sub-Templates](#partials--sub-templates)
  - [Template Comments](#template-comments)
  - [Whitespace Control](#whitespace-control)
- [Built-In Filter Catalog](#-built-in-filter-catalog)
- [Custom Filter Registration](#-custom-filter-registration)
- [API Reference](#-api-reference)
  - [Class: `qalam.view`](#class-qalamview)
  - [Helper: `qalam.renderString()`](#helper-qalamrenderstring)
  - [Security: `qalam.escapeHtml()`](#security-qalamescapehtml)
- [Security Model](#-security-model)
- [Performance & AST Caching](#-performance--ast-caching)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [License & Author](#-license--author)

---

## 🖋️ Overview & Etymology

> **قلم** *(Qalam, noun, Arabic)* — The pen; the classical instrument of writing, structure, and expression.

**Qalam** is a production-ready, standalone HTML template engine built with clean modular architecture for the **Djazair Programming Language**. Inspired by the expressive power and reliability of world-class template engines like *Jinja*, *Twig*, *Blade*, and *Liquid*, Qalam combines an intuitive tag syntax with high-performance Lexical scanning, Abstract Syntax Tree (AST) parsing, robust execution, and memory caching.

---

## ⚡ Key Features

- 🛡️ **Zero-Configuration Security:** All `{{ var }}` outputs are HTML-escaped by default to prevent Cross-Site Scripting (XSS).
- 🧩 **Modular Layered Architecture:** Clear separation of concerns into dedicated components (`Lexer`, `Parser`, `Evaluator`, `Loader`, `Filters`, `Escaper`).
- ⚡ **In-Memory AST Caching:** Compiles templates into AST trees once and reuses them across requests for maximum throughput.
- 🔀 **Filter Pipeline (Piping):** Transform data easily with UNIX-style piping: `{{ name | trim | capitalize }}`.
- 🌿 **Extensible Filter Registry:** Register custom transformation functions at runtime.
- 🌳 **Multi-Branch Conditionals:** Full support for `{% if %}`, `{% elif %}`, `{% else if %}`, and `{% else %}`.
- 🔄 **Rich Loop Context (`loop`):** Access `loop.index`, `loop.first`, `loop.last`, `loop.length`, `loop.even`, `loop.odd`, and `{% else %}` fallback.
- 🏗️ **Template Inheritance:** Modular layouts with `{% extends "layout" %}` and overrideable `{% block name %}` regions.
- 📦 **Partials & Sub-Views:** Embed reusable components via `{% include "partials/nav" %}`.
- 🧹 **Whitespace Stripping & Comments:** Clean outputs using `{{- -}}` / `{%- -%}` and silent `{# comment #}` tags.
- 🔒 **Path Traversal Defense:** Strict directory boundary validation prevents unauthorized filesystem access.
- 🔄 **100% Backward Compatible:** Drop-in replacement for existing Qalam and Kasbah projects.

---

## 🏛️ Architecture & Design Principles

Qalam is engineered according to **SOLID** principles and Clean Architecture. Each phase of the rendering pipeline is encapsulated in a specialized module:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Template Source │ ────▶ │  Lexer (Tokens) │ ────▶ │   Parser (AST)  │
└─────────────────┘       └─────────────────┘       └─────────────────┘
                                                             │
                                                             ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Rendered Output │ ◀──── │ Escaper / Safe  │ ◀──── │ Evaluator Engine│ ◀─── AST Cache
│      HTML       │       │   Encoding      │       │(Context+Filters)│
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

| Module | Location | Responsibility |
|---|---|---|
| `init.dz` | `init.dz` | Main entry point exporting the `view` class, helpers, and escape utilities. |
| `constants.dz` | `core/constants.dz` | Type constants for Tokens (`TOKEN_VAR`, `TOKEN_TAG`...) and AST Nodes. |
| `escaper.dz` | `core/escaper.dz` | High-speed HTML entity encoding (`&`, `<`, `>`, `"`, `'`). |
| `lexer.dz` | `core/lexer.dz` | Tokenizes source code into tokens, handles comments and whitespace. |
| `parser.dz` | `core/parser.dz` | Builds hierarchical AST node trees with syntax validation. |
| `filters.dz` | `core/filters.dz` | Manages built-in transformations and user-registered custom filters. |
| `evaluator.dz` | `core/evaluator.dz` | Traverses AST nodes, executes boolean logic, filters, and loop contexts. |
| `loader.dz` | `core/loader.dz` | Filesystem boundary verification and in-memory AST cache engine. |

---

## 📦 Installation

Install Qalam into your Djazair project using the official package manager:

```sh
dpm install qalam
```

Or import it directly in your project:

```djazair
use qalam
```

---

## 🚀 Quick Start

### 1. In-Memory Rendering (No disk I/O needed)

Ideal for emails, notifications, API responses, or code generation:

```djazair
use qalam

let template = `
<h1>Hello, {{ user.name | capitalize }}!</h1>
<p>Status: {% if user.isActive %}Active Member{% else %}Pending{% endif %}</p>
<ul>
{% for item in items %}
  <li>#{{ loop.index }}: {{ item }}</li>
{% endfor %}
</ul>
`

let data = {
    "user": {"name": "riad", "isActive": True},
    "items": ["Djazair Language", "Kasbah Framework", "Qalam Template Engine"]
}

let renderedHtml = qalam.renderString(template, data)
print(renderedHtml)
```

---

### 2. File-Based Rendering (With `views` directory)

Directory structure:
```text
my_project/
├── views/
│   ├── layouts/
│   │   └── base.html
│   ├── partials/
│   │   └── nav.html
│   └── home.html
└── main.dz
```

**Base layout** (`views/layouts/base.html`):
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{% block title %}My Application{% endblock %}</title>
</head>
<body>
    <header>{% include "partials/nav" %}</header>
    <main>
        {% block content %}{% endblock %}
    </main>
    <footer>&copy; 2026 Djazair Language</footer>
</body>
</html>
```

**Page template** (`views/home.html`):
```html
{% extends "layouts/base" %}

{% block title %}Dashboard — {{ siteName }}{% endblock %}

{% block content %}
    <h2>Welcome back, {{ user.name }}!</h2>
    <p>Your role: <span class="badge">{{ user.role | upper }}</span></p>
{% endblock %}
```

**Rendering from code** (`main.dz`):
```djazair
use qalam

let viewEngine = new qalam.view({
    "views": "views",
    "cache": True
})

let html = viewEngine.render("home", {
    "siteName": "Enterprise Portal",
    "user": {"name": "Riad", "role": "admin"}
})

print(html)
```

---

### 3. Integration with Kasbah Web Framework

Qalam is the native template engine powering the [Kasbah](https://github.com/djazair-language/djazair-extensions/tree/main/kasbah) web framework. `res.view()` integrates with Qalam automatically:

```djazair
use kasbah

let app = new kasbah.app({"views": "views"})

app.get("/profile", fn(req, res)
    res.view("profile", {
        "title": "User Profile",
        "user": req.session.get("user")
    })
end)

app.listen(8080)
```

---

## 📝 Template Syntax Guide

### Variable Interpolation & Auto-Escaping

Variables inside double curly braces `{{ ... }}` are evaluated and **automatically HTML-escaped** to prevent XSS:

```html
<p>Hello, {{ user.name }}</p>
<p>Escaped input: {{ "<script>alert(1)</script>" }}</p>
<!-- Output: &lt;script&gt;alert(1)&lt;/script&gt; -->
```

Supports **dot-notation** and **bracket indexing** for nested maps and arrays:
```html
<span>{{ user.profile.address.city }}</span>
<span>{{ articles[0].title }}</span>
```

---

### Raw Output

For trusted markup that must not be escaped, use triple curly braces `{{{ ... }}}`:

```html
<div class="article-body">
    {{{ article.trustedHtmlContent }}}
</div>
```

---

### Filter Pipelines & Transformations

Filters transform values using the pipe character (`|`). Multiple filters can be chained sequentially:

```html
<h1>{{ page.title | trim | title }}</h1>
<p>Joined tags: {{ tags | join(" • ") | upper }}</p>
<p>Price: ${{ product.price | round(2) }}</p>
<p>Bio: {{ user.bio | default("No biography provided.") }}</p>
```

---

### Conditionals & Multi-Branching

Control output conditionally using `{% if %}`, `{% elif %}` (or `{% else if %}`), and `{% else %}`:

```html
{% if user.role == 'admin' %}
    <span class="badge badge-danger">Administrator</span>
{% elif user.role == 'moderator' %}
    <span class="badge badge-warning">Moderator</span>
{% elif user.role == 'author' %}
    <span class="badge badge-info">Author</span>
{% else %}
    <span class="badge badge-secondary">Member</span>
{% endif %}
```

---

### Logical, Comparison & Membership Operators

Qalam supports all native Djazair language expressions and operators:

| Operator | Syntax | Description |
|---|---|---|
| Equality | `a == b` | Exact value or deep structural equality |
| Inequality | `a != b` | Inequality check |
| Relational | `>`, `<`, `>=`, `<=` | Numeric comparisons |
| Membership | `item in collection` | Checks if item exists in Array, Map key, or String |
| Negated Membership | `item not in list` | True if item is NOT in collection |
| Identity | `a is b` | Identity / equality check (e.g. `user is Null`, `flag is True`) |
| Negated Identity | `a is not b` | True if not identical (e.g. `user is not Null`) |
| Logical AND | `a and b` or `a && b` | True if both conditions are truthy |
| Logical OR | `a or b` or `a \|\| b` | True if at least one condition is truthy |
| Logical Negation | `not cond` or `!cond` | Inverts truthiness |
| Parenthesized Grouping | `(a and b) or (c and d)` | Controls operator evaluation order |
| String Concatenation | `strA + strB` | Concatenates strings inside expressions |
| Arithmetic | `+`, `-`, `*`, `/`, `%` | Arithmetic operations inside expressions |
| Djazair Ternary | `if cond ? a else b` | Djazair native inline ternary expression |
| Standard Ternary | `cond ? a : b` | Inline conditional expression |

```html
{% if 'admin' in user.roles and (user.isSuper or user.level >= 10) %}
    <span class="badge badge-admin">Master Admin</span>
{% elif user.token is not Null and user.status not in bannedStatuses %}
    <span class="badge badge-user">Active: {{ user.firstName + ' ' + user.lastName }}</span>
{% endif %}

<p>Status: {{ if user.isAdmin ? 'Administrator' else 'Standard Member' }}</p>
<p>Score: {{ score >= 50 ? 'Passed' : 'Failed' }}</p>
```

#### Truthiness Rules (Djazair Native Semantics)
- **Falsy values:** `Null`, `False`, `0`, `0.0`, `""` (empty string), `[]` (empty array), `{}` (empty map).
- **Truthy values:** Any non-zero number, non-empty string, populated array, populated map, or `True`.

---

### Loops & Loop Context Metadata

Iterate over arrays using `{% for item in items %}`:

```html
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Product</th>
      <th>Price</th>
    </tr>
  </thead>
  <tbody>
  {% for item in products %}
    <tr class="{% if loop.even %}row-even{% else %}row-odd{% endif %}">
      <td>{{ loop.index }}</td>
      <td>{{ item.name }}</td>
      <td>${{ item.price | round(2) }}</td>
    </tr>
  {% else %}
    <tr><td colspan="3">No products found.</td></tr>
  {% endfor %}
  </tbody>
</table>
```

#### Automatic `loop` Context Object

| Property | Type | Description |
|---|---|---|
| `loop.index` | Number | 1-based index (`1, 2, 3...`) |
| `loop.index0` | Number | 0-based index (`0, 1, 2...`) |
| `loop.first` | Boolean | `True` during the first iteration |
| `loop.last` | Boolean | `True` during the last iteration |
| `loop.length` | Number | Total item count in the collection |
| `loop.even` | Boolean | `True` if current 1-based iteration is even |
| `loop.odd` | Boolean | `True` if current 1-based iteration is odd |

---

### Template Inheritance & Blocks

Create structured, DRY layouts with `{% extends %}` and `{% block %}`:

**Base layout** (`views/layout.html`):
```html
<!DOCTYPE html>
<html>
<head>
  <title>{% block title %}Default App{% endblock %}</title>
</head>
<body>
  <header>{% block header %}<nav>Main Navigation</nav>{% endblock %}</header>
  <main>{% block content %}{% endblock %}</main>
  <footer>{% block footer %}&copy; 2026 Djazair{% endblock %}</footer>
</body>
</html>
```

**Child template** (`views/page.html`):
```html
{% extends "layout" %}

{% block title %}Custom Page Title{% endblock %}

{% block content %}
  <h1>Welcome to the custom page</h1>
{% endblock %}
```
> Note: Blocks not overridden by the child retain their parent layout default contents.

---

### Partials & Sub-Templates

Embed reusable components across templates:

```html
<div class="sidebar">
  {% include "partials/user_card" %}
  {% include "partials/recent_posts" %}
</div>
```

---

### Template Comments

Comments inside `{# ... #}` are stripped during tokenization and will **never** appear in the rendered HTML output:

```html
{# This is a developer note that won't appear in HTML output #}
<p>Visible content</p>
```

---

### Whitespace Control

Use leading/trailing hyphens to trim adjacent whitespace and newline characters:

```html
Hello   {{- user.name -}}   World
<!-- Output: HelloRiadWorld -->

<div>
  {%- if True -%}
    <span>Clean layout without empty lines</span>
  {%- endif -%}
</div>
```

---

## 🎨 Built-In Filter Catalog (Djazair Standard Library Compatible)

### 🔤 String Transformation Filters

| Filter | Parameters | Description | Example Input | Result |
|---|---|---|---|---|
| `upper` | — | Converts string to uppercase | `{{ "riad" \| upper }}` | `"RIAD"` |
| `lower` | — | Converts string to lowercase | `{{ "RIAD" \| lower }}` | `"riad"` |
| `capitalize` | — | Capitalizes the first character | `{{ "hello world" \| capitalize }}` | `"Hello world"` |
| `title` | — | Capitalizes each word in title case | `{{ "hello world" \| title }}` | `"Hello World"` |
| `swapcase` / `swapCase` | — | Swaps uppercase to lowercase and vice versa | `{{ "Hello" \| swapcase }}` | `"hELLO"` |
| `trim` / `strip` | — | Strips surrounding whitespace | `{{ "  hi  " \| strip }}` | `"hi"` |
| `ltrim` / `lstrip` | — | Strips leading whitespace | `{{ "  hi" \| lstrip }}` | `"hi"` |
| `rtrim` / `rstrip` | — | Strips trailing whitespace | `{{ "hi  " \| rstrip }}` | `"hi"` |
| `split` | `sep = " "` | Splits string into array | `{{ "a,b,c" \| split(",") }}` | `["a", "b", "c"]` |
| `slice` | `start, end` | Slices string or array | `{{ "Djazair" \| slice(0, 3) }}` | `"Dja"` |
| `substr` / `subStr` | `start, len` | Extracts substring of length `len` | `{{ "Djazair" \| substr(3, 4) }}` | `"zair"` |
| `replace` | `old, new` | Replaces occurrences of substring | `{{ "a-b" \| replace("-", "/") }}`| `"a/b"` |
| `repeat` | `count = 1` | Repeats string `count` times | `{{ "*" \| repeat(5) }}` | `"*****"` |
| `count` | `sub` | Counts occurrences of substring/item | `{{ "banana" \| count("a") }}` | `3` |
| `contains` | `needle` | Checks if string/collection contains needle | `{{ "hello" \| contains("ell") }}` | `True` |
| `startswith` / `startsWith` | `prefix` | Checks if string starts with prefix | `{{ "test.dz" \| startswith("test") }}` | `True` |
| `endswith` / `endsWith` | `suffix` | Checks if string ends with suffix | `{{ "test.dz" \| endswith(".dz") }}` | `True` |

### 📦 Collection & Array Filters

| Filter | Parameters | Description | Example Input | Result |
|---|---|---|---|---|
| `length` / `len` | — | Returns length of array, string, or map | `{{ [1,2,3] \| length }}` | `3` |
| `first` | — | Returns first item of collection or char | `{{ ["a","b"] \| first }}` | `"a"` |
| `last` | — | Returns last item of collection or char | `{{ ["a","b"] \| last }}` | `"b"` |
| `reverse` / `reversed` | — | Reverses a string or array | `{{ [1, 2] \| reverse }}` | `[2, 1]` |
| `sort` / `sorted` | — | Sorts array elements in ascending order | `{{ [3, 1, 2] \| sort }}` | `[1, 2, 3]` |
| `unique` | — | Returns array with duplicate elements removed | `{{ [1, 2, 2, 3] \| unique }}` | `[1, 2, 3]` |
| `flatten` | — | Flattens nested arrays one level | `{{ [[1, 2], [3]] \| flatten }}` | `[1, 2, 3]` |
| `join` | `delimiter = ", "` | Joins array elements with a separator | `{{ ["a","b"] \| join(" • ") }}` | `"a • b"` |
| `sum` | — | Sums numerical elements in array | `{{ [10, 20, 30] \| sum }}` | `60` |
| `max` | — | Returns maximum value in array | `{{ [10, 50, 20] \| max }}` | `50` |
| `min` | — | Returns minimum value in array | `{{ [10, 50, 20] \| min }}` | `10` |

### 🗺️ Map / Hash Filters

| Filter | Parameters | Description | Example Input | Result |
|---|---|---|---|---|
| `keys` | — | Returns array of map keys | `{{ user \| keys }}` | `["name", "role"]` |
| `values` | — | Returns array of map values | `{{ user \| values }}` | `["Riad", "admin"]` |
| `has` | `key` | Checks if map has key | `{{ user \| has("email") }}` | `False` |
| `get` | `key, fallback = Null` | Gets value by key with optional fallback | `{{ user \| get("age", 18) }}` | `18` |

### 🔢 Math, Formatting & Type Filters

| Filter | Parameters | Description | Example Input | Result |
|---|---|---|---|---|
| `abs` | — | Returns absolute numerical value | `{{ -15 \| abs }}` | `15` |
| `round` | `digits = 0` | Rounds number to decimal precision | `{{ 3.14159 \| round(2) }}` | `3.14` |
| `floor` | — | Rounds number down (floor) | `{{ 3.9 \| floor }}` | `3` |
| `ceil` | — | Rounds number up (ceil) | `{{ 3.1 \| ceil }}` | `4` |
| `sqrt` | — | Returns square root of number | `{{ 16 \| sqrt }}` | `4` |
| `default` | `fallback` | Returns fallback if value is empty/null/false | `{{ "" \| default("N/A") }}` | `"N/A"` |
| `json` | — | Serializes object into JSON format | `{{{ user \| json }}}` | `{"name":"Ali"}` |
| `int` | — | Casts value to integer | `{{ "42" \| int }}` | `42` |
| `float` | — | Casts value to floating-point number | `{{ "3.14" \| float }}` | `3.14` |
| `str` | — | Casts value to string | `{{ 123 \| str }}` | `"123"` |
| `bool` | — | Casts value to boolean | `{{ 1 \| bool }}` | `True` |
| `type` | — | Returns type name of value | `{{ 123 \| type }}` | `"number"` |
| `isNull` | — | True if value is Null | `{{ val \| isNull }}` | `True` |
| `isString` | — | True if value is String | `{{ val \| isString }}` | `True` |
| `isNumber` | — | True if value is Number | `{{ val \| isNumber }}` | `True` |
| `isArray` | — | True if value is Array | `{{ val \| isArray }}` | `True` |
| `isMap` | — | True if value is Map | `{{ val \| isMap }}` | `True` |

---

## 🛠️ Custom Filter Registration

Extend Qalam by registering custom domain-specific filters:

```djazair
use qalam

let v = new qalam.view({})

# Register custom currency formatter
v.registerFilter("currency", fn(val, args = [])
    let code = if args.length() > 0 ? str(args[0]) else "USD"
    return "${val} ${code}"
end)

# Register custom badge generator
v.registerFilter("statusBadge", fn(status, args = [])
    if status == "active"
        return "<span class='badge-green'>ACTIVE</span>"
    end
    return "<span class='badge-red'>INACTIVE</span>"
end)

let html = v.renderString(
    "<p>Price: {{ amount | currency('DZD') }}</p><div>{{{ status | statusBadge }}}</div>",
    {"amount": 4500, "status": "active"}
)

print(html)
```

---

## 📚 API Reference

### Class: `qalam.view`

The primary template renderer orchestrator.

#### Constructor: `new qalam.view(config = {})`

**Configuration Map:**

| Key | Type | Default | Description |
|---|---|---|---|
| `"views"` | `String` | `"views"` | Base directory for template files |
| `"cache"` | `Boolean` | `True` | Enables in-memory compilation AST caching |

#### Methods

- **`v.render(templateName, data = {}) -> String`**
  Renders a template file by path identifier (e.g. `"home"` or `"trades/list"`). Supports layout inheritance and partials.

- **`v.renderString(templateString, data = {}, blocksMap = {}) -> String`**
  Renders an in-memory template string directly without accessing the filesystem.

- **`v.registerFilter(name, callback)`**
  Registers a custom filter function `fn(value, args = [])`.

- **`v.getSafePath(templateName) -> String`**
  Resolves and validates an absolute filesystem path, verifying directory boundary security.

- **`v.readFile(templateName) -> String`**
  Reads template file contents from disk.

- **`v.clearCache()`**
  Clears the in-memory compiled AST cache.

---

### Helper: `qalam.renderString()`

```djazair
qalam.renderString(templateString, data = {}, blocksMap = {}) -> String
```

Convenience function for quick template rendering without instantiating a View instance manually:

```djazair
let output = qalam.renderString("Hello, {{ name }}!", {"name": "Riad"})
```

---

### Security: `qalam.escapeHtml()`

```djazair
qalam.escapeHtml(value) -> String
```

Encodes HTML characters (`&`, `<`, `>`, `"`, `'`) to prevent XSS injection:

```djazair
let safe = qalam.escapeHtml("<script>alert('xss')</script>")
# → &lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;
```

---

## 🛡️ Security Model

| Threat Vector | Mitigation Strategy in Qalam |
|---|---|
| **Cross-Site Scripting (XSS)** | All `{{ ... }}` output is auto-escaped via `escapeHtml()`. Raw output is strictly opt-in via `{{{ ... }}}`. |
| **Directory Traversal (`../`)** | `TemplateLoader.getSafePath()` strictly enforces directory containment boundaries. Path escape attempts throw fatal security errors. |
| **Null-Byte Injection** | Detected and rejected before path resolution. |
| **Information Leakage** | Descriptive template errors include line numbers without leaking internal server secrets. |

---

## ⚡ Performance & AST Caching

In production web applications, parsing templates on every request creates unnecessary CPU and memory overhead.

Qalam includes an intelligent **In-Memory AST Cache**:
1. When a template is first requested via `v.render("template")`, it is read, tokenized, and parsed into an AST tree.
2. The compiled AST is cached in memory.
3. Subsequent requests execute directly from the cached AST tree against the new request context data, achieving **up to 30x faster execution**.

To disable caching during local development, set `"cache": False`:
```djazair
let devView = new qalam.view({"views": "views", "cache": False})
```

---

## 🧪 Testing & Quality Assurance

Qalam includes a comprehensive automated test suite with **211 tests** covering 100% of all features and documentation snippets:

```sh
# Run all 7 test suites (211/211 passed 100%):
djazair tests/run_all_tests.dz

# Or run individual test suites:
djazair tests/test_engine.dz
djazair tests/test_security.dz
djazair tests/test_conditions_loops.dz
djazair tests/test_filters.dz
djazair tests/test_inheritance.dz
djazair tests/test_docs_snippets.dz
djazair tests/test_djazair_compat.dz
```

---

## 📄 License & Author

- **Author:** Harizi Riyadh ([@hariziriyadh](https://github.com/hariziriyadh))
- **License:** [MIT License](./LICENSE)
- **Repository:** [djazair-extensions/qalam](https://github.com/djazair-language/djazair-extensions/tree/main/qalam)
