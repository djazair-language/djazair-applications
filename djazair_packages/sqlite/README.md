# Djazair SQLite Extension

A lightweight, local database engine for Djazair. Provides synchronous SQL operations, parameterized queries (SQL injection safe), and full transaction support. Powered by the SQLite C library.

> 📚 **Interactive Documentation & Live Studio Available:**  
> Open [`docs/index.html`](docs/index.html) in your browser, or launch the desktop documentation app via `djazair docs/run_docs.dz`.

---

## Table of Contents

0. [Interactive Documentation & Studio](#interactive-documentation--studio)
1. [Installation](#1-installation)
2. [Quick Start](#2-quick-start)
3. [Connection Methods](#3-connection-methods)
4. [ResultSet Methods](#4-resultset-methods)
5. [Constants](#5-constants)
6. [Error Handling](#6-error-handling)
7. [Transactions](#7-transactions)
8. [Complete Examples](#8-complete-examples)

---

## 0. Interactive Documentation & Studio

The extension includes a full-featured, responsive HTML/jQuery documentation suite with a built-in **Live SQLite Studio & Playground**:

- **Web Browser**: Open [`docs/index.html`](docs/index.html) in any modern web browser.
- **Desktop Window**: Run `djazair docs/run_docs.dz` (uses the `webview` extension).

Features include real-time API search filtering, code copy-to-clipboard, dark/light theme toggle, in-browser SQL simulator with multiple result formatters (Grid, Djazair Assoc Map, Indexed Array), and automatic Djazair code generation.

---

## 1. Installation

### Prerequisites

- **Djazair Language** installed (includes `dpm` package manager)
- **MinGW-w64** with `g++` supporting C++14 (for building the native module)

### Install & Build

```bash
dpm install sqlite
dpm build sqlite
```

The build step compiles `src/sqlite*.c` into `sqlite.dll`. This only needs to happen once after installation.

---

## 2. Quick Start

Open a database, create a table, insert data, and query it:

```djazair
use sqlite

let db = sqlite.connect("school.db")

if db.isConnected()
    db.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, score REAL)")

    db.safeExecute("INSERT INTO users (name, score) VALUES (?, ?)", ["Riad", 98.5])
    db.safeExecute("INSERT INTO users (name, score) VALUES (?, ?)", ["Anis", 89.0])

    let res = db.safeQuery("SELECT * FROM users WHERE score > ?", [90.0])
    if !isNull(res)
        let users = res.fetchAllAssoc()
        for user in users
            print("User: " + user["name"] + " (Score: " + str(user["score"]) + ")")
        end
        res.close()
    end

    db.close()
else
    print("Failed to connect: " + db.error())
end
```

Run it:

```bash
djazair myscript.dz
```

Output:
```
User: Riad (Score: 98.5)
```

---

## 3. Connection Methods

### sqlite.connect(path)

Opens (or creates) a SQLite database file. Returns a `Connection` instance.

```djazair
let db = sqlite.connect("data.db")
let db2 = sqlite.connect("C:/Users/me/app.db")
```

### isConnected()

Returns `True` if the connection is open and valid.

```djazair
if db.isConnected()
    print("Database ready")
end
```

### execute(sql)

Executes DDL/DML statements (CREATE, INSERT, UPDATE, DELETE). Returns `True` on success, `False` on failure.

```djazair
let ok = db.execute("CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, name TEXT)")
if !ok
    print("Create failed: " + db.error())
end

db.execute("INSERT INTO items (name) VALUES ('Apple')")
db.execute("UPDATE items SET name = 'Orange' WHERE id = 1")
db.execute("DELETE FROM items WHERE id = 2")
```

### query(sql)

Executes a SELECT query and returns a `ResultSet` object. Returns `Null` on failure.

```djazair
let res = db.query("SELECT * FROM items")
if !isNull(res)
    let rows = res.fetchAllAssoc()
    for row in rows
        print(str(row))
    end
    res.close()
end
```

### safeExecute(sql, params)

Same as `execute()` but with `?` placeholders that are automatically escaped. Prevents SQL injection.

```djazair
db.safeExecute("INSERT INTO items (name, price) VALUES (?, ?)", ["Widget", 9.99])
db.safeExecute("UPDATE items SET price = ? WHERE id = ?", [14.99, 3])
db.safeExecute("DELETE FROM items WHERE name = ?", ["Widget"])
```

### safeQuery(sql, params)

Same as `query()` but with `?` placeholders that are automatically escaped.

```djazair
let res = db.safeQuery("SELECT * FROM items WHERE price > ?", [10.0])
```

### changes()

Returns the number of rows modified by the last `execute()` or `safeExecute()` call.

```djazair
db.execute("INSERT INTO items (name) VALUES ('Test')")
print("Rows inserted: " + str(db.changes()))

db.safeExecute("UPDATE items SET price = ? WHERE price IS Null", [0.0])
print("Rows updated: " + str(db.changes()))
```

### insertId()

Returns the last auto-generated `ROWID` from an INSERT on a table with `INTEGER PRIMARY KEY`.

```djazair
db.execute("INSERT INTO items (name) VALUES ('New Item')")
print("New row ID: " + str(db.insertId()))
```

### beginTransaction()

Starts a new SQL transaction. All subsequent writes are held until `commit()` or `rollback()`.

```djazair
db.beginTransaction()
```

### commit()

Commits (saves) all changes made since `beginTransaction()`.

```djazair
db.commit()
```

### rollback()

Discards all changes made since `beginTransaction()`.

```djazair
db.rollback()
```

### escape(val)

Manually escape a string or number for safe SQL use. You normally don't need this — use `safeExecute`/`safeQuery` instead.

```djazair
let safe = db.escape("O'Brien")
```

### error()

Returns the last error message string from SQLite.

```djazair
db.execute("INVALID SQL")
print(db.error())   # "near "INVALID": syntax error"
```

### raw()

Returns the raw native C pointer of the database handle. For advanced interop scenarios.

```djazair
let ptr = db.raw()
```

### close()

Closes the database connection and frees resources. Always call this when done.

```djazair
db.close()
```

---

## 4. ResultSet Methods

### fetchRow()

Fetches the next row as an **indexed array**. Returns `Null` when no more rows exist.

```djazair
let res = db.query("SELECT id, name, price FROM items")
let row = res.fetchRow()
while !isNull(row)
    print("ID: " + str(row[0]) + ", Name: " + row[1] + ", Price: " + str(row[2]))
    row = res.fetchRow()
end
res.close()
```

### fetchAssoc()

Fetches the next row as a **map** (column name → value). Returns `Null` when no more rows exist.

```djazair
let res = db.query("SELECT * FROM items")
let row = res.fetchAssoc()
while !isNull(row)
    print("Item: " + row["name"] + " ($" + str(row["price"]) + ")")
    row = res.fetchAssoc()
end
res.close()
```

### fetchAllAssoc()

Fetches **all remaining rows** as an array of maps.

```djazair
let res = db.query("SELECT * FROM items")
let all = res.fetchAllAssoc()
print("Total rows: " + str(all.length()))
for item in all
    print(item["name"])
end
res.close()
```

### columns()

Returns an array of column names in the result set.

```djazair
let res = db.query("SELECT * FROM items")
print(str(res.columns()))   # ['id', 'name', 'price']
res.close()
```

### raw()

Returns the raw native C pointer of the prepared statement handle. For advanced interop.

```djazair
let ptr = res.raw()
```

### close()

Finalizes the statement and frees memory. Always call this when done fetching.

```djazair
res.close()
```

---

## 5. Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `sqlite.SQLITE_ROW` | `100` | Statement step found a new row ready for retrieval |
| `sqlite.SQLITE_DONE` | `101` | Statement step completed (no more rows) |

These can be used to manually step through statements if you need lower-level control:

```djazair
let stmt = _s.prepare(db.raw(), "SELECT * FROM items")
let rc = _s.step(stmt)
if rc == sqlite.SQLITE_ROW
    print("Got a row")
elif rc == sqlite.SQLITE_DONE
    print("No more rows")
end
_s.finalize(stmt)
```

---

## 6. Error Handling

Always check connection status and query results:

```djazair
let db = sqlite.connect("data.db")

if !db.isConnected()
    print("Connection failed: " + db.error())
    return
end

let ok = db.execute("CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, val TEXT)")
if !ok
    print("Execute error: " + db.error())
end

let res = db.query("SELECT * FROM nonexistent")
if isNull(res)
    print("Query failed: " + db.error())
end

let res2 = db.query("SELECT * FROM test")
if !isNull(res2)
    let rows = res2.fetchAllAssoc()
    res2.close()
end

db.close()
```

---

## 7. Transactions

Group multiple writes into an atomic operation. Either all succeed or all are rolled back.

```djazair
use sqlite

let db = sqlite.connect("bank.db")
db.execute("CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY, name TEXT, balance REAL)")

db.beginTransaction()

let ok1 = db.safeExecute("INSERT INTO accounts (name, balance) VALUES (?, ?)", ["Alice", 1000.0])
let ok2 = db.safeExecute("INSERT INTO accounts (name, balance) VALUES (?, ?)", ["Bob", 500.0])

if ok1 and ok2
    db.commit()
    print("Transaction committed successfully.")
else
    db.rollback()
    print("Transaction rolled back due to error.")
end

db.close()
```

### Rollback Example

```djazair
let db = sqlite.connect("test.db")
db.execute("CREATE TABLE IF NOT EXISTS log (id INTEGER PRIMARY KEY, msg TEXT)")

db.beginTransaction()
db.safeExecute("INSERT INTO log (msg) VALUES (?)", ["This will be rolled back"])
print("Rows in transaction: " + str(db.changes()))
db.rollback()

let res = db.query("SELECT COUNT(*) as cnt FROM log")
if !isNull(res)
    let row = res.fetchAssoc()
    print("Rows after rollback: " + str(row["cnt"]))    # 0
    res.close()
end

db.close()
```

---

## 8. Complete Examples

### Example 1: CRUD Operations

```djazair
use sqlite

let db = sqlite.connect("inventory.db")

if db.isConnected()
    db.execute("CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT, price REAL, qty INTEGER)")

    db.safeExecute("INSERT INTO products (name, price, qty) VALUES (?, ?, ?)", ["Widget", 9.99, 100])
    db.safeExecute("INSERT INTO products (name, price, qty) VALUES (?, ?, ?)", ["Gadget", 24.99, 50])
    db.safeExecute("INSERT INTO products (name, price, qty) VALUES (?, ?, ?)", ["Doohickey", 4.99, 200])

    print("Inserted " + str(db.changes()) + " products, last ID: " + str(db.insertId()))

    let res = db.query("SELECT * FROM products ORDER BY price DESC")
    if !isNull(res)
        print("--- Products (by price) ---")
        let row = res.fetchAssoc()
        while !isNull(row)
            let total = row["price"] * row["qty"]
            print(row["name"] + " x" + str(row["qty"]) + " = $" + str(total))
            row = res.fetchAssoc()
        end
        res.close()
    end

    db.safeExecute("UPDATE products SET price = ? WHERE name = ?", [7.99, "Widget"])
    print("Updated " + str(db.changes()) + " row(s)")

    db.close()
else
    print("Failed: " + db.error())
end
```

### Example 2: Safe Query with User Input

```djazair
use sqlite

let db = sqlite.connect("inventory.db")

let searchTerm = "widget"
let minPrice = 5.0

let res = db.safeQuery("SELECT * FROM products WHERE name LIKE ? AND price >= ?", ["%" + searchTerm + "%", minPrice])
if !isNull(res)
    let results = res.fetchAllAssoc()
    print("Found " + str(results.length()) + " matching product(s)")
    for p in results
        print("  - " + p["name"] + " ($" + str(p["price"]) + ")")
    end
    res.close()
end

db.close()
```

### Example 3: Fetch Modes

```djazair
use sqlite

let db = sqlite.connect("inventory.db")

let res = db.query("SELECT * FROM products ORDER BY price ASC")
if !isNull(res)
    print("Column names: " + str(res.columns()))

    print("--- fetchRow (indexed) ---")
    let row = res.fetchRow()
    while !isNull(row)
        print(str(row))
        row = res.fetchRow()
    end
    res.close()
end

let res2 = db.query("SELECT * FROM products ORDER BY price ASC")
if !isNull(res2)
    print("--- fetchAllAssoc ---")
    let all = res2.fetchAllAssoc()
    print(str(all))
    res2.close()
end

db.close()
```

---

> See the [`examples/`](examples/) directory for additional runnable demos covering all features.
