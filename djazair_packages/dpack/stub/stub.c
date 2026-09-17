/*
 * dpack/stub/stub.c
 * Djazair Self-Extracting Executable Stub
 *
 * This is a minimal runner that is prepended to a ZIP bundle.
 * Layout of the final packed executable:
 *
 *   [ stub binary ] [ ZIP data ] [ 8-byte LE: offset of ZIP from file start ]
 *
 * On execution:
 *   1. Locates itself and reads the ZIP offset from the last 8 bytes.
 *   2. Copies the ZIP to a temp directory.
 *   3. Extracts the ZIP (contains: djazair[.exe], __main__.dz, std/, prelude/, extensions/).
 *   4. Launches: <tmp>/djazair[.exe] <tmp>/__main__.dz [user args...]
 *   5. Cleans up the temp directory.
 *   6. Exits with the same return code as the script.
 *
 * Developer: Harizi Riyadh (hariziriyadh@gmail.com)
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <errno.h>

#ifdef _WIN32
#  include <windows.h>
#  include <process.h>
#  define PATH_SEP "\\"
#  define INTERP   "djazair.exe"
#else
#  include <unistd.h>
#  include <sys/stat.h>
#  include <sys/types.h>
#  include <sys/wait.h>
#  include <dirent.h>
#  include <ftw.h>
#  define PATH_SEP "/"
#  define INTERP   "djazair"
#endif

/* ── Marker written at build time by the packer ─────────────────────────── */
#define DPACK_MAGIC 0x4B434150445A4A44ULL  /* "DJZDPACK" in LE */

/* ── Portable uint64 read (little-endian) ────────────────────────────────── */
static uint64_t read_u64_le(const unsigned char *p) {
    uint64_t v = 0;
    for (int i = 0; i < 8; i++)
        v |= ((uint64_t)p[i]) << (8 * i);
    return v;
}

/* ── Get path to this executable ─────────────────────────────────────────── */
static int get_self_path(char *buf, size_t sz) {
#ifdef _WIN32
    DWORD n = GetModuleFileNameA(NULL, buf, (DWORD)sz);
    return (n > 0 && n < sz) ? 1 : 0;
#else
    ssize_t n = readlink("/proc/self/exe", buf, sz - 1);
    if (n < 0) {
        /* fallback: use argv[0] set by caller */
        return 0;
    }
    buf[n] = '\0';
    return 1;
#endif
}

/* ── Create a unique temp directory ─────────────────────────────────────── */
static uint64_t fnv1a_combine(uint64_t hash, uint64_t val) {
    hash ^= val;
    hash *= 1099511628211ULL;
    return hash;
}

static uint64_t fnv1a_str(const char *s, uint64_t hash) {
    while (*s) {
        hash ^= (unsigned char)*s++;
        hash *= 1099511628211ULL;
    }
    return hash;
}

static void decrypt_file(const char *filepath) {
    FILE *f = fopen(filepath, "rb+");
    if (!f) return;
    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    if (sz <= 0) { fclose(f); return; }
    fseek(f, 0, SEEK_SET);

    unsigned char *buf = (unsigned char *)malloc(sz);
    if (!buf) { fclose(f); return; }
    if (fread(buf, 1, sz, f) == (size_t)sz) {
        for (long i = 0; i < sz; i++) {
            buf[i] ^= 0x5B;
        }
        fseek(f, 0, SEEK_SET);
        fwrite(buf, 1, sz, f);
    }
    free(buf);
    fclose(f);
}

#ifdef _WIN32
static void decrypt_dir_dz(const char *dirpath) {
    char search_path[2048];
    snprintf(search_path, sizeof(search_path), "%s\\*", dirpath);
    WIN32_FIND_DATAA fd;
    HANDLE hFind = FindFirstFileA(search_path, &fd);
    if (hFind == INVALID_HANDLE_VALUE) return;
    do {
        if (strcmp(fd.cFileName, ".") == 0 || strcmp(fd.cFileName, "..") == 0 || strcmp(fd.cFileName, "src") == 0) continue;
        char child_path[2048];
        snprintf(child_path, sizeof(child_path), "%s\\%s", dirpath, fd.cFileName);
        if (fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) {
            decrypt_dir_dz(child_path);
        } else {
            size_t len = strlen(fd.cFileName);
            if (len >= 3 && strcmp(fd.cFileName + len - 3, ".dz") == 0) {
                decrypt_file(child_path);
            }
        }
    } while (FindNextFileA(hFind, &fd));
    FindClose(hFind);
}
#else
static void decrypt_dir_dz(const char *dirpath) {
    DIR *d = opendir(dirpath);
    if (!d) return;
    struct dirent *entry;
    while ((entry = readdir(d)) != NULL) {
        if (strcmp(entry->d_name, ".") == 0 || strcmp(entry->d_name, "..") == 0 || strcmp(entry->d_name, "src") == 0) continue;
        char child_path[2048];
        snprintf(child_path, sizeof(child_path), "%s/%s", dirpath, entry->d_name);
        struct stat st;
        if (stat(child_path, &st) == 0) {
            if (S_ISDIR(st.st_mode)) {
                decrypt_dir_dz(child_path);
            } else {
                size_t len = strlen(entry->d_name);
                if (len >= 3 && strcmp(entry->d_name + len - 3, ".dz") == 0) {
                    decrypt_file(child_path);
                }
            }
        }
    }
    closedir(d);
}
#endif

static void get_cache_dir(const char *self_path, uint64_t file_size, uint64_t zip_offset, uint64_t zip_size, int portable, char *out, size_t sz) {
    uint64_t h = 14695981039346656037ULL;
    h = fnv1a_str(self_path, h);
    h = fnv1a_combine(h, file_size);
    h = fnv1a_combine(h, zip_offset);
    h = fnv1a_combine(h, zip_size);

    /* Include file modification timestamp (mtime) */
    uint64_t mtime = 0;
#ifdef _WIN32
    WIN32_FILE_ATTRIBUTE_DATA fileInfo;
    if (GetFileAttributesExA(self_path, GetFileExInfoStandard, &fileInfo)) {
        mtime = ((uint64_t)fileInfo.ftLastWriteTime.dwHighDateTime << 32) | fileInfo.ftLastWriteTime.dwLowDateTime;
    }
#else
    struct stat st;
    if (stat(self_path, &st) == 0) {
        mtime = (uint64_t)st.st_mtime;
    }
#endif
    h = fnv1a_combine(h, mtime);

    /* Sample first 256 bytes of embedded ZIP for content signature */
    FILE *f = fopen(self_path, "rb");
    if (f) {
        if (fseek(f, (long)zip_offset, SEEK_SET) == 0) {
            unsigned char sample[256];
            size_t n = fread(sample, 1, sizeof(sample), f);
            for (size_t i = 0; i < n; i++) {
                h = fnv1a_combine(h, sample[i]);
            }
        }
        fclose(f);
    }

    if (portable) {
        /* Portable mode: place cache in local directory next to self EXE */
        char exe_dir[4096] = {0};
        snprintf(exe_dir, sizeof(exe_dir), "%s", self_path);
        char *last_sep = strrchr(exe_dir, PATH_SEP[0]);
        if (last_sep) *last_sep = '\0';
        snprintf(out, sz, "%s%s.dpack_cache_%llx", exe_dir, PATH_SEP, (unsigned long long)h);
    } else {
#ifdef _WIN32
        char tmp[MAX_PATH];
        if (!GetTempPathA(MAX_PATH, tmp)) {
            const char *env_tmp = getenv("TEMP");
            snprintf(tmp, sizeof(tmp), "%s\\", env_tmp ? env_tmp : "C:\\Windows\\Temp");
        }
        snprintf(out, sz, "%sdpack_app_%llx", tmp, (unsigned long long)h);
#else
        const char *tmp = getenv("TMPDIR");
        if (!tmp) tmp = "/tmp";
        snprintf(out, sz, "%s/dpack_app_%llx", tmp, (unsigned long long)h);
#endif
    }
}

/* ── Copy a range of bytes from one file to another ─────────────────────── */
static int copy_range(const char *src_path, uint64_t offset, uint64_t length, const char *dst_path) {
    FILE *in = fopen(src_path, "rb");
    if (!in) return 0;
    FILE *out = fopen(dst_path, "wb");
    if (!out) { fclose(in); return 0; }

    if (fseek(in, (long)offset, SEEK_SET) != 0) {
        fclose(in); fclose(out); return 0;
    }

    char buf[65536];
    uint64_t remaining = length;
    while (remaining > 0) {
        size_t to_read = (size_t)(remaining < sizeof(buf) ? remaining : sizeof(buf));
        size_t n = fread(buf, 1, to_read, in);
        if (n == 0) break;
        fwrite(buf, 1, n, out);
        remaining -= n;
    }

    fclose(in);
    fclose(out);
    return remaining == 0 ? 1 : 0;
}

/* ── Extract ZIP to a directory ─────────────────────────────────────────── */
static int extract_zip(const char *zip_path, const char *dest_dir) {
    char cmd[4096];
#ifdef _WIN32
    /* PowerShell Expand-Archive */
    snprintf(cmd, sizeof(cmd),
        "powershell -NoProfile -Command \"Expand-Archive -Path '%s' -DestinationPath '%s' -Force\"",
        zip_path, dest_dir);
#else
    snprintf(cmd, sizeof(cmd), "unzip -q -o \"%s\" -d \"%s\"", zip_path, dest_dir);
#endif
    int ret = system(cmd);
    return ret == 0 ? 1 : 0;
}

/* ── Recursively delete a directory ─────────────────────────────────────── */
#ifdef _WIN32
static void rmdir_recursive(const char *path) {
    char cmd[2048];
    snprintf(cmd, sizeof(cmd), "rmdir /s /q \"%s\"", path);
    system(cmd);
}
#else
static int _rm_cb(const char *fpath, const struct stat *sb, int typeflag, struct FTW *ftwbuf) {
    (void)sb; (void)typeflag; (void)ftwbuf;
    return remove(fpath);
}
static void rmdir_recursive(const char *path) {
    nftw(path, _rm_cb, 64, FTW_DEPTH | FTW_PHYS);
}
#endif

/* ── Main ────────────────────────────────────────────────────────────────── */
int main(int argc, char *argv[]) {
    /* ── Step 1: locate self ── */
    char self_path[4096] = {0};
    if (!get_self_path(self_path, sizeof(self_path))) {
        /* fallback to argv[0] */
        if (argc > 0) strncpy(self_path, argv[0], sizeof(self_path) - 1);
    }

    FILE *self = fopen(self_path, "rb");
    if (!self) {
        fprintf(stderr, "[dpack] Cannot open self: %s\n", self_path);
        return 1;
    }

    /* ── Step 2: read 16-byte footer from end: [uint32_t flags][uint32_t reserved][uint64_t zip_offset] ── */
    if (fseek(self, -16, SEEK_END) != 0) {
        fprintf(stderr, "[dpack] Cannot seek in executable\n");
        fclose(self);
        return 1;
    }

    long file_size_long = 0;
    fseek(self, 0, SEEK_END);
    file_size_long = ftell(self);
    uint64_t file_size = (uint64_t)file_size_long;

    fseek(self, -16, SEEK_END);
    unsigned char footer_buf[16];
    if (fread(footer_buf, 1, 16, self) != 16) {
        fprintf(stderr, "[dpack] Cannot read footer\n");
        fclose(self);
        return 1;
    }
    fclose(self);

    uint32_t flags = (uint32_t)footer_buf[0] | ((uint32_t)footer_buf[1] << 8) | ((uint32_t)footer_buf[2] << 16) | ((uint32_t)footer_buf[3] << 24);
    uint64_t zip_offset = read_u64_le(footer_buf + 8);
    uint64_t zip_size   = file_size - zip_offset - 16;

    if (zip_offset == 0 || zip_offset >= file_size || zip_size == 0) {
        fprintf(stderr, "[dpack] Invalid bundle: no embedded data found.\n");
        fprintf(stderr, "        This executable was not packed with dpack.\n");
        return 1;
    }

    int is_portable = (flags & 0x01) ? 1 : 0;
    int is_encrypted = (flags & 0x02) ? 1 : 0;

    /* ── Step 3: Determine cache directory for this application version ── */
    char tmp_dir[2048] = {0};
    get_cache_dir(self_path, file_size, zip_offset, zip_size, is_portable, tmp_dir, sizeof(tmp_dir));

    char marker_path[2200];
    snprintf(marker_path, sizeof(marker_path), "%s%s.complete", tmp_dir, PATH_SEP);

    /* ── Step 4: Check if app is already extracted in cache ── */
    FILE *mf = fopen(marker_path, "rb");
    if (mf) {
        /* Already extracted! Fast path: skip extraction */
        fclose(mf);
    } else {
        /* Not extracted yet: create cache dir and extract */
#ifdef _WIN32
        CreateDirectoryA(tmp_dir, NULL);
#else
        mkdir(tmp_dir, 0755);
#endif

        char zip_path[2200];
        snprintf(zip_path, sizeof(zip_path), "%s%sbundle.zip", tmp_dir, PATH_SEP);
        if (!copy_range(self_path, zip_offset, zip_size, zip_path)) {
            fprintf(stderr, "[dpack] Cannot extract bundle data\n");
            rmdir_recursive(tmp_dir);
            return 1;
        }

        if (!extract_zip(zip_path, tmp_dir)) {
            fprintf(stderr, "[dpack] Cannot extract bundle\n");
            rmdir_recursive(tmp_dir);
            return 1;
        }

#ifdef _WIN32
        DeleteFileA(zip_path);
#else
        remove(zip_path);
#endif

        /* If encrypted, decrypt all .dz files in cache directory */
        if (is_encrypted) {
            decrypt_dir_dz(tmp_dir);
        }

        /* Create completion marker */
        FILE *cm = fopen(marker_path, "wb");
        if (cm) {
            fputs("complete", cm);
            fclose(cm);
        }
    }

    /* ── Step 6: set up paths ── */
    char interp_path[4096];
    char script_path[4096];
#ifdef _WIN32
    snprintf(interp_path, sizeof(interp_path), "%s\\bin\\djazair.exe", tmp_dir);
    snprintf(script_path, sizeof(script_path), "%s\\__main__.dz", tmp_dir);
#else
    snprintf(interp_path, sizeof(interp_path), "%s/bin/djazair", tmp_dir);
    snprintf(script_path, sizeof(script_path), "%s/__main__.dz", tmp_dir);
#endif

#ifndef _WIN32
    chmod(interp_path, 0755);
#endif

    /* ── Step 7: build command ── */
#ifdef _WIN32
    /* Build command line for CreateProcess */
    char cmd[8192];
    int  pos = 0;
    pos += snprintf(cmd + pos, sizeof(cmd) - pos, "\"%s\" \"%s\"", interp_path, script_path);
    for (int i = 1; i < argc && pos < (int)sizeof(cmd) - 64; i++) {
        pos += snprintf(cmd + pos, sizeof(cmd) - pos, " \"%s\"", argv[i]);
    }

    STARTUPINFOA        si;
    PROCESS_INFORMATION pi;
    ZeroMemory(&si, sizeof(si));
    ZeroMemory(&pi, sizeof(pi));
    si.cb = sizeof(si);

#ifdef STUB_GUI
    DWORD creationFlags = CREATE_NO_WINDOW;
    BOOL inheritHandles = FALSE;
#else
    DWORD creationFlags = 0;
    BOOL inheritHandles = TRUE;
    si.dwFlags = STARTF_USESTDHANDLES;
    si.hStdInput = GetStdHandle(STD_INPUT_HANDLE);
    si.hStdOutput = GetStdHandle(STD_OUTPUT_HANDLE);
    si.hStdError = GetStdHandle(STD_ERROR_HANDLE);
#endif

    int exit_code = 1;
    if (CreateProcessA(
            NULL,               /* application name (use cmd line) */
            cmd,                /* command line */
            NULL,               /* process security */
            NULL,               /* thread security */
            inheritHandles,     /* inherit handles */
            creationFlags,      /* creation flags */
            NULL,               /* environment */
            NULL,               /* working directory = inherit from caller */
            &si,
            &pi)) {
        AllowSetForegroundWindow(pi.dwProcessId);
        WaitForSingleObject(pi.hProcess, INFINITE);
        DWORD code = 1;
        GetExitCodeProcess(pi.hProcess, &code);
        exit_code = (int)code;
        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);
    }
#else
    /* On Unix, use execv for proper signal handling */
    char **new_argv = malloc(sizeof(char *) * (argc + 2));
    if (!new_argv) { rmdir_recursive(tmp_dir); return 1; }
    new_argv[0] = interp_path;
    new_argv[1] = script_path;
    for (int i = 1; i < argc; i++) new_argv[i + 1] = argv[i];
    new_argv[argc + 1] = NULL;

    pid_t pid = fork();
    int exit_code = 1;
    if (pid == 0) {
        execv(interp_path, new_argv);
        fprintf(stderr, "[dpack] execv failed: %s\n", strerror(errno));
        exit(1);
    } else if (pid > 0) {
        int status;
        waitpid(pid, &status, 0);
        exit_code = WIFEXITED(status) ? WEXITSTATUS(status) : 1;
    }
    free(new_argv);
#endif

    /* ── Step 8: finish (cached directory is preserved for fast future launches) ── */
    return exit_code;
}
