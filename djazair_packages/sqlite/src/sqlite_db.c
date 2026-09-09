#include "sqlite_common.h"
#include <stdlib.h>
#include <string.h>

DJAZAIR_FUNC(sqliteOpenNative) {
    djazair_check_args(1, argCount);
    if (!djazair_is_string(args[0])) {
        djazair_error("sqlite.open() expects a string path.");
        return djazair_null();
    }
    
    const char *path = djazair_get_str(args, 0);
    sqlite3 *db = NULL;
    int rc = sqlite3_open(path, &db);
    
    if (rc != SQLITE_OK) {
        if (db) sqlite3_close(db);
        return djazair_null();
    }
    
    return djazair_new_resource(vm, db, "SQLiteDB");
}

DJAZAIR_FUNC(sqliteCloseNative) {
    djazair_check_args(1, argCount);
    if (djazair_is_resource(args[0])) {
        sqlite3 *db = (sqlite3 *)djazair_get_resource(vm, args[0]);
        if (db) {
            sqlite3_close(db);
            AS_RESOURCE(args[0])->ptr = NULL; 
        }
    }
    return djazair_null();
}

DJAZAIR_FUNC(sqliteErrorNative) {
    djazair_check_args(1, argCount);
    if (!djazair_is_resource(args[0])) return djazair_str(vm, "Invalid SQLite handle");
    sqlite3 *db = (sqlite3 *)djazair_get_resource(vm, args[0]);
    if (!db) return djazair_str(vm, "Handle closed");
    return djazair_str(vm, sqlite3_errmsg(db));
}

DJAZAIR_FUNC(sqliteLastInsertIdNative) {
    djazair_check_args(1, argCount);
    if (!djazair_is_resource(args[0])) return djazair_int(0);
    sqlite3 *db = (sqlite3 *)djazair_get_resource(vm, args[0]);
    if (!db) return djazair_int(0);
    return djazair_int64(vm, sqlite3_last_insert_rowid(db));
}

DJAZAIR_FUNC(sqliteChangesNative) {
    djazair_check_args(1, argCount);
    if (!djazair_is_resource(args[0])) return djazair_int(0);
    sqlite3 *db = (sqlite3 *)djazair_get_resource(vm, args[0]);
    if (!db) return djazair_int(0);
    return djazair_int(sqlite3_changes(db));
}

DJAZAIR_FUNC(sqliteEscapeNative) {
    djazair_check_args(1, argCount);
    if (!djazair_is_string(args[0])) return args[0];
    const char *input = djazair_get_str(args, 0);
    char *escaped = sqlite3_mprintf("%q", input);
    if (escaped == NULL) return djazair_null();
    djazair_value result = djazair_str(vm, escaped);
    sqlite3_free(escaped);
    return result;
}

DJAZAIR_FUNC(sqliteVersionNative) {
    (void)argCount; (void)args;
    return djazair_str(vm, sqlite3_libversion());
}
