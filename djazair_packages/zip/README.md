# zip — Gzip Compression & Zip Archive Operations

A Djazair extension providing gzip/gunzip compression via zlib and zip archive creation/extraction/listing via platform commands (PowerShell on Windows, `zip`/`unzip` on Linux/macOS).

## Requirements

- **zlib**: Installed with MSYS2/MinGW (`mingw-w64-x86_64-zlib`), or via system package manager on Linux (`libz-dev`).
- **Platform commands** (for zip archive operations):
  - **Windows**: PowerShell 5.0+ (built-in on Windows 10/11, `Compress-Archive`/`Expand-Archive` cmdlets)
  - **Linux**: `zip` and `unzip` (`apt install zip unzip`)
  - **macOS**: `zip` and `unzip` (pre-installed)

## Build

```bash
./build.bat <path-to-djazair-language>  # Windows
./build.sh <path-to-djazair-language>   # Linux/macOS
```

Produces `zip.dll` (Windows), `zip.so` (Linux), or `zip.dylib` (macOS).

## API Reference

### `zip.gzip(data)`

Compresses a string using gzip format.

| Param | Type   | Description             |
|-------|--------|-------------------------|
| data  | String | Data to compress        |
| **Returns** | String | Compressed bytes (gzip format, binary-safe) |

**Example:**
```dz
let compressed = zip.gzip("Hello, Djazair!")
```

### `zip.gunzip(data)`

Decompresses gzip-format data.

| Param | Type   | Description                |
|-------|--------|----------------------------|
| data  | String | Gzip-compressed bytes      |
| **Returns** | String | Decompressed original data |

**Example:**
```dz
let original = zip.gunzip(compressed)
```

### `zip.create(zipPath, sourceDir)`

Creates a zip archive from a directory.

| Param    | Type   | Description                    |
|----------|--------|--------------------------------|
| zipPath  | String | Path to the output .zip file   |
| sourceDir| String | Directory to zip               |
| **Returns** | Bool   | True on success, False on failure |

**Example:**
```dz
let ok = zip.create("backup.zip", "./mydir")
```

### `zip.extract(zipPath, destDir)`

Extracts a zip archive to a directory.

| Param   | Type   | Description                   |
|---------|--------|-------------------------------|
| zipPath | String | Path to the .zip file         |
| destDir | String | Destination directory         |
| **Returns** | Bool   | True on success, False on failure |

**Example:**
```dz
let ok = zip.extract("backup.zip", "./restore")
```

### `zip.list(zipPath)`

Lists entries in a zip archive.

| Param   | Type   | Description                   |
|---------|--------|-------------------------------|
| zipPath | String | Path to the .zip file         |
| **Returns** | Array  | Array of entry names, or Null on error |

**Example:**
```dz
let entries = zip.list("backup.zip")
for entry in entries
    print(entry)
end
```

## Complete Example

```dz
use zip
use file
use dir

let compressed = zip.gzip("Hello, Djazair!")
print("Compressed " + str(compressed.length()) + " bytes")

let restored = zip.gunzip(compressed)
print("Original: " + restored)

dir.create("__mydir__")
file.write("__mydir__/test.txt", "File content")
zip.create("__archive.zip", "__mydir__")

for entry in zip.list("__archive.zip")
    print("Archive entry: " + entry)
end

zip.extract("__archive.zip", "__outdir__")
```

## Notes

- gzip/gunzip use the native zlib library and are portable across all platforms.
- zip archive operations shell out to system commands; ensure `Compress-Archive` (Windows), or `zip`/`unzip` (Linux/macOS) are installed.
- Binary data (e.g., gzip output) is stored in Djazair strings, which are binary-safe.
- Empty input to gzip returns empty output.
