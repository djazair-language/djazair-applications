#include "djazair_api.h"
#include <zlib.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <time.h>
#include <errno.h>

#define ZIP_EOCD_SIG        0x06054b50
#define ZIP_CENTRAL_DIR_SIG 0x02014b50
#define ZIP_LOCAL_HEADER_SIG 0x04034b50
#define ZIP_METHOD_STORED   0
#define ZIP_METHOD_DEFLATED 8
#define MAX_PATH_LEN        1024

static uint16_t read16(const uint8_t *p) {
    return (uint16_t)p[0] | ((uint16_t)p[1] << 8);
}
static uint32_t read32(const uint8_t *p) {
    return (uint32_t)p[0] | ((uint32_t)p[1] << 8) | ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}
static void write16(uint8_t *p, uint16_t v) {
    p[0] = v & 0xFF; p[1] = (v >> 8) & 0xFF;
}
static void write32(uint8_t *p, uint32_t v) {
    p[0] = v & 0xFF; p[1] = (v >> 8) & 0xFF; p[2] = (v >> 16) & 0xFF; p[3] = (v >> 24) & 0xFF;
}

typedef struct {
    char *name;
    uint16_t method;
    uint32_t crc32;
    uint32_t comp_size;
    uint32_t uncomp_size;
    uint32_t local_offset;
    uint16_t dos_time;
    uint16_t dos_date;
    uint32_t external_attr;
} CDEntry;

typedef struct {
    char path[MAX_PATH_LEN];
    int mode;
    int is_open;
    CDEntry *entries;
    int num_entries;
    int entries_cap;
    FILE *file;
    int finalized;
    long file_end;
} ZipHandle;

static void dos_to_tm(uint16_t d, uint16_t t, struct tm *tm) {
    tm->tm_sec  = (t & 0x1F) * 2;
    tm->tm_min  = (t >> 5) & 0x3F;
    tm->tm_hour = (t >> 11) & 0x1F;
    tm->tm_mday = d & 0x1F;
    tm->tm_mon  = ((d >> 5) & 0x0F) - 1;
    tm->tm_year = ((d >> 9) & 0x7F) + 80;
    tm->tm_isdst = -1;
}

static void tm_to_dos(const struct tm *tm, uint16_t *d, uint16_t *t) {
    *t = (uint16_t)((tm->tm_hour << 11) | (tm->tm_min << 5) | (tm->tm_sec / 2));
    *d = (uint16_t)(((tm->tm_year - 80) << 9) | ((tm->tm_mon + 1) << 5) | tm->tm_mday);
}

static void zipFinalize(void *ptr) {
    ZipHandle *zh = (ZipHandle *)ptr;
    if (!zh) return;
    if ((zh->mode == 'w' || zh->mode == 'a') && !zh->finalized && zh->file && zh->num_entries > 0) {
        fflush(zh->file);
        long cdir_offset = ftell(zh->file);
        for (int i = 0; i < zh->num_entries; i++) {
            CDEntry *e = &zh->entries[i];
            if (!e->name) continue;
            uint16_t fn_len = (uint16_t)strlen(e->name);
            uint8_t cd[46];
            memset(cd, 0, 46);
            write32(cd, ZIP_CENTRAL_DIR_SIG);
            write16(cd + 4, 20); write16(cd + 6, 20);
            write16(cd + 8, 0); write16(cd + 10, e->method);
            write16(cd + 12, e->dos_time); write16(cd + 14, e->dos_date);
            write32(cd + 16, e->crc32);
            write32(cd + 20, e->comp_size); write32(cd + 24, e->uncomp_size);
            write16(cd + 28, fn_len); write16(cd + 30, 0); write16(cd + 32, 0);
            write16(cd + 34, 0); write16(cd + 36, 0);
            write32(cd + 38, 0); write32(cd + 42, e->local_offset);
            fwrite(cd, 1, 46, zh->file);
            fwrite(e->name, 1, fn_len, zh->file);
        }
        long cdir_size = ftell(zh->file) - cdir_offset;
        uint8_t eocd[22];
        memset(eocd, 0, 22);
        write32(eocd, ZIP_EOCD_SIG);
        write16(eocd + 4, 0); write16(eocd + 6, 0);
        write16(eocd + 8, zh->num_entries); write16(eocd + 10, zh->num_entries);
        write32(eocd + 12, cdir_size); write32(eocd + 16, (uint32_t)cdir_offset);
        write16(eocd + 20, 0);
        fwrite(eocd, 1, 22, zh->file);
        zh->finalized = 1;
    }
    if (zh->file) fclose(zh->file);
    if (zh->entries) {
        for (int i = 0; i < zh->num_entries; i++) free(zh->entries[i].name);
        free(zh->entries);
    }
    free(zh);
}

static int find_entry(ZipHandle *zh, const char *name) {
    for (int i = 0; i < zh->num_entries; i++)
        if (zh->entries[i].name && strcmp(zh->entries[i].name, name) == 0)
            return i;
    return -1;
}

static void add_entry(ZipHandle *zh, CDEntry *e) {
    if (zh->num_entries >= zh->entries_cap) {
        int new_cap = zh->entries_cap ? zh->entries_cap * 2 : 16;
        CDEntry *tmp = (CDEntry *)realloc(zh->entries, new_cap * sizeof(CDEntry));
        if (!tmp) return;
        zh->entries = tmp;
        zh->entries_cap = new_cap;
    }
    zh->entries[zh->num_entries++] = *e;
}

DJAZAIR_FUNC(zipCompress)
{
    djazair_check_args(1, argCount);
    djazair_check_str(0);
    size_t src_len;
    const char *src = djazair_get_str_l(args, 0, &src_len);
    if (src_len == 0) return djazair_str_l(vm, src, 0);
    z_stream strm;
    memset(&strm, 0, sizeof(strm));
    int ret = deflateInit2(&strm, Z_DEFAULT_COMPRESSION, Z_DEFLATED, MAX_WBITS + 16, 8, Z_DEFAULT_STRATEGY);
    if (ret != Z_OK)
        djazair_error("zip.compress(): deflateInit2 failed (zlib error %d)", ret);
    uLong dest_len = deflateBound(&strm, src_len);
    char *dest = (char *)malloc(dest_len);
    if (!dest) { deflateEnd(&strm); djazair_error("zip.compress(): out of memory allocating %lu bytes", (unsigned long)dest_len); }
    strm.next_in = (Bytef *)src;
    strm.avail_in = (uInt)src_len;
    strm.next_out = (Bytef *)dest;
    strm.avail_out = (uInt)dest_len;
    ret = deflate(&strm, Z_FINISH);
    if (ret != Z_STREAM_END) {
        free(dest); deflateEnd(&strm);
        djazair_error("zip.compress(): deflate returned %d (expected Z_STREAM_END)", ret);
    }
    uLong comp_len = strm.total_out;
    deflateEnd(&strm);
    djazair_value result = djazair_str_l(vm, dest, comp_len);
    free(dest);
    return result;
}

DJAZAIR_FUNC(zipDecompress)
{
    djazair_check_args(1, argCount);
    djazair_check_str(0);
    size_t src_len;
    const char *src = djazair_get_str_l(args, 0, &src_len);
    if (src_len == 0) return djazair_str_l(vm, src, 0);
    z_stream strm;
    memset(&strm, 0, sizeof(strm));
    int ret = inflateInit2(&strm, MAX_WBITS + 16);
    if (ret != Z_OK)
        djazair_error("zip.decompress(): inflateInit2 failed (zlib error %d)", ret);
    size_t cap = src_len * 4 + 1024;
    char *dest = (char *)malloc(cap);
    if (!dest) { inflateEnd(&strm); djazair_error("zip.decompress(): out of memory"); }
    strm.next_in = (Bytef *)src;
    strm.avail_in = (uInt)src_len;
    strm.next_out = (Bytef *)dest;
    strm.avail_out = (uInt)cap;
    while ((ret = inflate(&strm, Z_NO_FLUSH)) == Z_OK) {
        size_t used = strm.total_out;
        cap *= 2;
        char *tmp = (char *)realloc(dest, cap);
        if (!tmp) { free(dest); inflateEnd(&strm); djazair_error("zip.decompress(): out of memory expanding buffer"); }
        dest = tmp;
        strm.next_out = (Bytef *)(dest + used);
        strm.avail_out = (uInt)(cap - used);
    }
    if (ret != Z_STREAM_END) {
        free(dest); inflateEnd(&strm);
        djazair_error("zip.decompress(): inflate returned %d (corrupt gzip data)", ret);
    }
    uLong decomp_len = strm.total_out;
    inflateEnd(&strm);
    djazair_value result = djazair_str_l(vm, dest, decomp_len);
    free(dest);
    return result;
}

static int read_central_dir(ZipHandle *zh) {
    FILE *f = fopen(zh->path, "rb");
    if (!f) return 0;
    fseek(f, 0, SEEK_END);
    long file_size = ftell(f);
    if (file_size < 22) { fclose(f); return 0; }
    long eocd_offset = -1;
    {
        long search = (file_size > 65536) ? 65536 : file_size;
        uint8_t *buf = (uint8_t *)malloc(search);
        if (!buf) { fclose(f); return 0; }
        fseek(f, file_size - search, SEEK_SET);
        if (fread(buf, 1, search, f) != (size_t)search) { free(buf); fclose(f); return 0; }
        for (long i = search - 22; i >= 0; i--) {
            if (read32(buf + i) == ZIP_EOCD_SIG) {
                eocd_offset = file_size - search + i;
                break;
            }
        }
        free(buf);
    }
    if (eocd_offset < 0) { fclose(f); return 0; }
    fseek(f, eocd_offset, SEEK_SET);
    uint8_t eocd[22];
    if (fread(eocd, 1, 22, f) != 22) { fclose(f); return 0; }
    int num_entries = read16(eocd + 8);
    if (num_entries > 65535 || num_entries <= 0) { fclose(f); return 0; }
    uint32_t cdir_offset = read32(eocd + 16);
    fclose(f);
    f = fopen(zh->path, "rb");
    if (!f) return 0;
    fseek(f, cdir_offset, SEEK_SET);
    int ok = 1;
    for (int i = 0; i < num_entries && ok; i++) {
        uint8_t cd[46];
        if (fread(cd, 1, 46, f) != 46) { ok = 0; break; }
        if (read32(cd) != ZIP_CENTRAL_DIR_SIG) { ok = 0; break; }
        uint16_t name_len = read16(cd + 28);
        uint16_t extra_len = read16(cd + 30);
        uint16_t comment_len = read16(cd + 32);
        CDEntry e;
        memset(&e, 0, sizeof(e));
        e.method = read16(cd + 10);
        e.dos_time = read16(cd + 12);
        e.dos_date = read16(cd + 14);
        e.crc32 = read32(cd + 16);
        e.comp_size = read32(cd + 20);
        e.uncomp_size = read32(cd + 24);
        e.local_offset = read32(cd + 42);
        e.external_attr = read32(cd + 38);
        if (name_len > 0) {
            e.name = (char *)malloc(name_len + 1);
            if (!e.name) { ok = 0; break; }
            if (fread(e.name, 1, name_len, f) != name_len) { free(e.name); ok = 0; break; }
            e.name[name_len] = '\0';
        } else {
            e.name = strdup("");
            if (!e.name) { ok = 0; break; }
        }
        if (extra_len > 0 && fseek(f, extra_len, SEEK_CUR) != 0) { free(e.name); ok = 0; break; }
        if (comment_len > 0 && fseek(f, comment_len, SEEK_CUR) != 0) { free(e.name); ok = 0; break; }
        add_entry(zh, &e);
        e.name = NULL;
    }
    fclose(f);
    zh->file_end = eocd_offset + 22;
    if (!ok) {
        for (int i = 0; i < zh->num_entries; i++) free(zh->entries[i].name);
        free(zh->entries); zh->entries = NULL;
        zh->num_entries = zh->entries_cap = 0;
        return 0;
    }
    return 1;
}

DJAZAIR_FUNC(zipOpen)
{
    djazair_check_args(2, argCount);
    djazair_check_str(0);
    djazair_check_str(1);
    const char *path = djazair_get_str(args, 0);
    const char *mode_str = djazair_get_str(args, 1);
    if (strlen(path) >= MAX_PATH_LEN)
        djazair_error("zip.open(): path too long (max %d chars)", MAX_PATH_LEN - 1);
    ZipHandle *zh = (ZipHandle *)calloc(1, sizeof(ZipHandle));
    if (!zh) djazair_error("zip.open(): out of memory");
    strcpy(zh->path, path);
    zh->is_open = 1;
    if (mode_str[0] == 'r') {
        zh->mode = 'r';
        if (!read_central_dir(zh)) {
            free(zh);
            djazair_error("zip.open(): cannot read ZIP archive '%s' — file is missing, corrupt, or not a valid ZIP", path);
        }
    } else if (mode_str[0] == 'w') {
        zh->mode = 'w';
        zh->file = fopen(path, "wb");
        if (!zh->file) {
            free(zh);
            djazair_error("zip.open(): cannot create '%s' — %s", path, strerror(errno));
        }
    } else if (mode_str[0] == 'a') {
        zh->mode = 'w';
        int rcd_ok = read_central_dir(zh);
        uint8_t *old_buf = NULL;
        if (rcd_ok && zh->file_end > 0) {
            old_buf = (uint8_t *)malloc(zh->file_end);
            if (old_buf) {
                FILE *rf = fopen(path, "rb");
                if (rf) {
                    size_t n = fread(old_buf, 1, zh->file_end, rf);
                    fclose(rf);
                    if (n != (size_t)zh->file_end) {
                        free(old_buf); old_buf = NULL;
                    }
                } else {
                    free(old_buf); old_buf = NULL;
                }
            }
        }
        zh->file = fopen(path, "wb");
        if (!zh->file) {
            free(old_buf);
            for (int i = 0; i < zh->num_entries; i++) free(zh->entries[i].name);
            free(zh->entries); free(zh);
            djazair_error("zip.open(): cannot open '%s' for append — %s", path, strerror(errno));
        }
        if (old_buf) {
            fwrite(old_buf, 1, zh->file_end, zh->file);
            free(old_buf);
        }
    } else {
        free(zh);
        djazair_error("zip.open(): invalid mode '%s' — use 'r' (read), 'w' (write), or 'a' (append)", mode_str);
    }
    return djazair_new_resource_with_finalizer(vm, zh, "ZipHandle", zipFinalize);
}

DJAZAIR_FUNC(zipClose)
{
    djazair_check_args(1, argCount);
    djazair_check_resource(0);
    ZipHandle *zh = (ZipHandle *)djazair_get_resource(vm, args[0]);
    if (!zh || !zh->is_open) return djazair_null();
    zh->is_open = 0;
    if ((zh->mode == 'w' || zh->mode == 'a') && !zh->finalized && zh->file) {
        if (zh->num_entries > 0) {
            long cdir_offset = ftell(zh->file);
            for (int i = 0; i < zh->num_entries; i++) {
                CDEntry *e = &zh->entries[i];
                if (!e->name) continue;
                uint16_t fn_len = (uint16_t)strlen(e->name);
                uint8_t cd[46];
                memset(cd, 0, 46);
                write32(cd, ZIP_CENTRAL_DIR_SIG);
                write16(cd + 4, 20); write16(cd + 6, 20);
                write16(cd + 8, 0); write16(cd + 10, e->method);
                write16(cd + 12, e->dos_time); write16(cd + 14, e->dos_date);
                write32(cd + 16, e->crc32);
                write32(cd + 20, e->comp_size); write32(cd + 24, e->uncomp_size);
                write16(cd + 28, fn_len); write16(cd + 30, 0); write16(cd + 32, 0);
                write16(cd + 34, 0); write16(cd + 36, 0);
                write32(cd + 38, 0); write32(cd + 42, e->local_offset);
                fwrite(cd, 1, 46, zh->file);
                fwrite(e->name, 1, fn_len, zh->file);
            }
            fflush(zh->file);
            long cdir_size = ftell(zh->file) - cdir_offset;
            uint8_t eocd[22];
            memset(eocd, 0, 22);
            write32(eocd, ZIP_EOCD_SIG);
            write16(eocd + 4, 0); write16(eocd + 6, 0);
            write16(eocd + 8, zh->num_entries); write16(eocd + 10, zh->num_entries);
            write32(eocd + 12, cdir_size); write32(eocd + 16, cdir_offset);
            write16(eocd + 20, 0);
            fwrite(eocd, 1, 22, zh->file);
        }
        zh->finalized = 1;
    }
    if (zh->file) { fclose(zh->file); zh->file = NULL; }
    return djazair_null();
}

DJAZAIR_FUNC(zipNamelist)
{
    djazair_check_args(1, argCount);
    djazair_check_resource(0);
    ZipHandle *zh = (ZipHandle *)djazair_get_resource(vm, args[0]);
    if (!zh || !zh->is_open) djazair_error("zip.namelist(): operation on closed ZipFile");
    djazair_value arr = djazair_new_array(vm);
    for (int i = 0; i < zh->num_entries; i++) {
        if (zh->entries[i].name) {
            size_t len = strlen(zh->entries[i].name);
            if (len > 0 && zh->entries[i].name[len - 1] == '/')
                continue;
            djazair_array_push(vm, arr, djazair_str(vm, zh->entries[i].name));
        }
    }
    return arr;
}

static djazair_value read_entry_data(djazairVM *vm, ZipHandle *zh, int idx) {
    CDEntry *e = &zh->entries[idx];
    FILE *f = fopen(zh->path, "rb");
    if (!f) djazair_error("zip.read(): cannot open archive '%s'", zh->path);
    fseek(f, e->local_offset, SEEK_SET);
    uint8_t lh[30];
    if (fread(lh, 1, 30, f) != 30 || read32(lh) != ZIP_LOCAL_HEADER_SIG) {
        fclose(f); djazair_error("zip.read(): corrupt local header for '%s'", e->name);
    }
    fseek(f, read16(lh + 26) + read16(lh + 28), SEEK_CUR);
    uint32_t comp_size = e->comp_size;
    if (e->method == ZIP_METHOD_STORED) {
        if (comp_size == 0 && e->uncomp_size > 0) {
            fclose(f); djazair_error("zip.read(): corrupted entry '%s' (compressed size is 0)", e->name);
        }
        char *buf = (char *)malloc(comp_size + 1);
        if (!buf) { fclose(f); djazair_error("zip.read(): out of memory"); }
        if (fread(buf, 1, comp_size, f) != comp_size) { free(buf); fclose(f); djazair_error("zip.read(): truncated data"); }
        buf[comp_size] = '\0';
        fclose(f);
        djazair_value result = djazair_str_l(vm, buf, comp_size);
        free(buf);
        return result;
    }
    uint8_t *comp = (uint8_t *)malloc(comp_size);
    if (!comp) { fclose(f); djazair_error("zip.read(): out of memory"); }
    if (fread(comp, 1, comp_size, f) != comp_size) { free(comp); fclose(f); djazair_error("zip.read(): truncated compressed data"); }
    fclose(f);
    uint32_t us = e->uncomp_size;
    char *decomp = (char *)malloc(us + 1);
    if (!decomp) { free(comp); djazair_error("zip.read(): out of memory"); }
    z_stream strm;
    memset(&strm, 0, sizeof(strm));
    int ret = inflateInit2(&strm, -MAX_WBITS);
    if (ret != Z_OK) { free(comp); free(decomp); djazair_error("zip.read(): inflateInit2 failed (zlib error %d)", ret); }
    strm.next_in = comp; strm.avail_in = comp_size;
    strm.next_out = (Bytef *)decomp; strm.avail_out = us;
    ret = inflate(&strm, Z_FINISH);
    if (ret != Z_STREAM_END) {
        inflateEnd(&strm); free(comp); free(decomp);
        djazair_error("zip.read(): decompression failed for '%s' — data may be corrupt", e->name);
    }
    inflateEnd(&strm); free(comp);
    decomp[us] = '\0';
    djazair_value result = djazair_str_l(vm, decomp, us);
    free(decomp);
    return result;
}

DJAZAIR_FUNC(zipRead)
{
    djazair_check_args(2, argCount);
    djazair_check_resource(0);
    ZipHandle *zh = (ZipHandle *)djazair_get_resource(vm, args[0]);
    if (!zh || !zh->is_open) djazair_error("zip.read(): operation on closed ZipFile");
    djazair_check_str(1);
    const char *name = djazair_get_str(args, 1);
    int idx = find_entry(zh, name);
    if (idx < 0)
        djazair_error("zip.read(): file '%s' not found in archive", name);
    return read_entry_data(vm, zh, idx);
}

DJAZAIR_FUNC(zipWriteStr)
{
    djazair_check_args(3, argCount);
    djazair_check_resource(0);
    ZipHandle *zh = (ZipHandle *)djazair_get_resource(vm, args[0]);
    if (!zh || !zh->is_open) djazair_error("zip.writestr(): operation on closed ZipFile");
    if (zh->mode != 'w' && zh->mode != 'a')
        djazair_error("zip.writestr(): ZipFile not opened in write or append mode");
    if (!zh->file)
        djazair_error("zip.writestr(): archive file is closed");
    djazair_check_str(1);
    djazair_check_str(2);
    const char *arcname = djazair_get_str(args, 1);
    size_t data_len;
    const char *data = djazair_get_str_l(args, 2, &data_len);
    if (data_len == 0) return djazair_bool(1);
    uint32_t crc = crc32(0, Z_NULL, 0);
    crc = crc32(crc, (const Bytef *)data, (uInt)data_len);
    uint16_t fn_len = (uint16_t)strlen(arcname);
    uint8_t lh[30];
    memset(lh, 0, 30);
    write32(lh, ZIP_LOCAL_HEADER_SIG);
    write16(lh + 4, 20);
    write16(lh + 6, 0);
    write16(lh + 8, ZIP_METHOD_STORED);
    time_t now = time(NULL);
    struct tm *tm = localtime(&now);
    uint16_t dos_t, dos_d;
    tm_to_dos(tm, &dos_d, &dos_t);
    write16(lh + 10, dos_t);
    write16(lh + 12, dos_d);
    write32(lh + 14, crc);
    write32(lh + 18, (uint32_t)data_len);
    write32(lh + 22, (uint32_t)data_len);
    write16(lh + 26, fn_len);
    write16(lh + 28, 0);
    if (fflush(zh->file) != 0)
        djazair_error("zip.writestr(): fflush failed");
    long local_offset = ftell(zh->file);
    if (local_offset < 0)
        djazair_error("zip.writestr(): ftell failed: %s", strerror(errno));
    if (fwrite(lh, 1, 30, zh->file) != 30)
        djazair_error("zip.writestr(): failed to write local header");
    if (fwrite(arcname, 1, fn_len, zh->file) != fn_len)
        djazair_error("zip.writestr(): failed to write filename");
    if (fwrite(data, 1, data_len, zh->file) != data_len)
        djazair_error("zip.writestr(): failed to write data");
    fflush(zh->file);
    CDEntry e;
    memset(&e, 0, sizeof(e));
    e.name = strdup(arcname);
    e.method = ZIP_METHOD_STORED;
    e.crc32 = crc;
    e.comp_size = (uint32_t)data_len;
    e.uncomp_size = (uint32_t)data_len;
    e.local_offset = (uint32_t)local_offset;
    e.dos_time = dos_t;
    e.dos_date = dos_d;
    e.external_attr = 0100644 << 16;
    add_entry(zh, &e);
    return djazair_bool(1);
}

DJAZAIR_FUNC(zipGetInfo)
{
    djazair_check_args(2, argCount);
    djazair_check_resource(0);
    ZipHandle *zh = (ZipHandle *)djazair_get_resource(vm, args[0]);
    if (!zh || !zh->is_open) djazair_error("zip.getinfo(): operation on closed ZipFile");
    djazair_check_str(1);
    const char *name = djazair_get_str(args, 1);
    int idx = find_entry(zh, name);
    if (idx < 0)
        djazair_error("zip.getinfo(): file '%s' not found in archive", name);
    CDEntry *e = &zh->entries[idx];
    djazair_value m = djazair_new_map(vm);
    djazair_map_set(vm, m, djazair_str(vm, "filename"), djazair_str(vm, e->name));
    djazair_map_set(vm, m, djazair_str(vm, "compress_type"), djazair_int((int32_t)e->method));
    djazair_map_set(vm, m, djazair_str(vm, "compress_size"), djazair_float((double)e->comp_size));
    djazair_map_set(vm, m, djazair_str(vm, "file_size"), djazair_float((double)e->uncomp_size));
    djazair_map_set(vm, m, djazair_str(vm, "CRC"), djazair_float((double)e->crc32));
    djazair_map_set(vm, m, djazair_str(vm, "header_offset"), djazair_float((double)e->local_offset));
    djazair_map_set(vm, m, djazair_str(vm, "external_attr"), djazair_float((double)e->external_attr));
    djazair_map_set(vm, m, djazair_str(vm, "is_dir"), djazair_bool(e->uncomp_size == 0 && e->name && strlen(e->name) > 0 && e->name[strlen(e->name)-1] == '/'));
    struct tm tm;
    dos_to_tm(e->dos_date, e->dos_time, &tm);
    char buf[64];
    strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &tm);
    djazair_map_set(vm, m, djazair_str(vm, "date_time"), djazair_str(vm, buf));
    return m;
}

DJAZAIR_FUNC(zipInfolist)
{
    djazair_check_args(1, argCount);
    djazair_check_resource(0);
    ZipHandle *zh = (ZipHandle *)djazair_get_resource(vm, args[0]);
    if (!zh || !zh->is_open) djazair_error("zip.infolist(): operation on closed ZipFile");
    djazair_value arr = djazair_new_array(vm);
    for (int i = 0; i < zh->num_entries; i++) {
        CDEntry *e = &zh->entries[i];
        if (!e->name || !e->name[0]) continue;
        djazair_value m = djazair_new_map(vm);
        djazair_map_set(vm, m, djazair_str(vm, "filename"), djazair_str(vm, e->name));
        djazair_map_set(vm, m, djazair_str(vm, "compress_type"), djazair_int((int32_t)e->method));
        djazair_map_set(vm, m, djazair_str(vm, "compress_size"), djazair_float((double)e->comp_size));
        djazair_map_set(vm, m, djazair_str(vm, "file_size"), djazair_float((double)e->uncomp_size));
        djazair_map_set(vm, m, djazair_str(vm, "CRC"), djazair_float((double)e->crc32));
        struct tm tm;
        dos_to_tm(e->dos_date, e->dos_time, &tm);
        char buf[64];
        strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &tm);
        djazair_map_set(vm, m, djazair_str(vm, "date_time"), djazair_str(vm, buf));
        djazair_array_push(vm, arr, m);
    }
    return arr;
}

DJAZAIR_FUNC(zipExtract)
{
    djazair_check_min_args(2, argCount);
    djazair_check_resource(0);
    ZipHandle *zh = (ZipHandle *)djazair_get_resource(vm, args[0]);
    if (!zh || !zh->is_open) djazair_error("zip.extract(): operation on closed ZipFile");
    djazair_check_str(1);
    const char *member = djazair_get_str(args, 1);
    const char *dest_path = NULL;
    if (argCount > 2) {
        djazair_check_str(2);
        dest_path = djazair_get_str(args, 2);
    }
    int idx = find_entry(zh, member);
    if (idx < 0)
        djazair_error("zip.extract(): file '%s' not found in archive", member);
    djazair_value content = read_entry_data(vm, zh, idx);
    if (!dest_path) {
        const char *base = strrchr(member, '/');
        dest_path = base ? base + 1 : member;
    }
    ObjString *s = AS_STRING(content);
    FILE *f = fopen(dest_path, "wb");
    if (!f)
        djazair_error("zip.extract(): cannot create '%s' — %s", dest_path, strerror(errno));
    fwrite(s->chars, 1, (size_t)s->length, f);
    fclose(f);
    return djazair_bool(1);
}

DJAZAIR_FUNC(zipTest)
{
    djazair_check_args(1, argCount);
    djazair_check_resource(0);
    ZipHandle *zh = (ZipHandle *)djazair_get_resource(vm, args[0]);
    if (!zh || !zh->is_open) djazair_error("zip.test(): operation on closed ZipFile");
    for (int i = 0; i < zh->num_entries; i++) {
        CDEntry *e = &zh->entries[i];
        if (!e->name || !e->name[0]) continue;
        djazair_value result = read_entry_data(vm, zh, i);
        if (IS_NULL(result))
            return djazair_str(vm, e->name);
    }
    return djazair_null();
}

DJAZAIR_FUNC(zipFinalizeWrite)
{
    djazair_check_args(1, argCount);
    djazair_check_resource(0);
    ZipHandle *zh = (ZipHandle *)djazair_get_resource(vm, args[0]);
    if (!zh || !zh->is_open || zh->finalized) return djazair_null();
    if ((zh->mode == 'w' || zh->mode == 'a') && zh->file && zh->num_entries > 0) {
        fflush(zh->file);
        long cdir_offset = ftell(zh->file);
        for (int i = 0; i < zh->num_entries; i++) {
            CDEntry *e = &zh->entries[i];
            if (!e->name) continue;
            uint16_t fn_len = (uint16_t)strlen(e->name);
            uint8_t cd[46];
            memset(cd, 0, 46);
            write32(cd, ZIP_CENTRAL_DIR_SIG);
            write16(cd + 4, 20); write16(cd + 6, 20);
            write16(cd + 8, 0); write16(cd + 10, e->method);
            write16(cd + 12, e->dos_time); write16(cd + 14, e->dos_date);
            write32(cd + 16, e->crc32);
            write32(cd + 20, e->comp_size); write32(cd + 24, e->uncomp_size);
            write16(cd + 28, fn_len); write16(cd + 30, 0); write16(cd + 32, 0);
            write16(cd + 34, 0); write16(cd + 36, 0);
            write32(cd + 38, 0); write32(cd + 42, e->local_offset);
            fwrite(cd, 1, 46, zh->file);
            fwrite(e->name, 1, fn_len, zh->file);
        }
        long cdir_size = ftell(zh->file) - cdir_offset;
        uint8_t eocd[22];
        memset(eocd, 0, 22);
        write32(eocd, ZIP_EOCD_SIG);
        write16(eocd + 4, 0); write16(eocd + 6, 0);
        write16(eocd + 8, zh->num_entries); write16(eocd + 10, zh->num_entries);
        write32(eocd + 12, cdir_size); write32(eocd + 16, cdir_offset);
        write16(eocd + 20, 0);
        fwrite(eocd, 1, 22, zh->file);
    }
    zh->finalized = 1;
    return djazair_null();
}

static NativeMethod zip_funcs[] = {
    {"compress",   zipCompress,   1},
    {"decompress", zipDecompress, 1},
    {"open",       zipOpen,       2},
    {"close",      zipClose,      1},
    {"namelist",   zipNamelist,   1},
    {"read",       zipRead,       2},
    {"writestr",   zipWriteStr,   3},
    {"getinfo",    zipGetInfo,    2},
    {"infolist",   zipInfolist,   1},
    {"extract",    zipExtract,    -1},
    {"test",       zipTest,       1},
    {"finalizeWrite", zipFinalizeWrite, 1},
    {NULL, NULL, 0}
};

DJAZAIR_EXTENSION(zip, zip_funcs)
