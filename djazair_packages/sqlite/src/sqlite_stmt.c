#include "sqlite_common.h"
#include <stdlib.h>

DJAZAIR_FUNC(sqlitePrepareNative) {
    djazair_check_args(2, argCount);
    if (!djazair_is_resource(args[0]) || !djazair_is_string(args[1])) {
        return djazair_null();
    }
    
    sqlite3 *db = (sqlite3 *)djazair_get_resource(vm, args[0]);
    if (!db) return djazair_null();
    
    const char *sql = djazair_get_str(args, 1);
    sqlite3_stmt *stmt = NULL;
    
    int rc = sqlite3_prepare_v2(db, sql, -1, &stmt, NULL);
    if (rc != SQLITE_OK) return djazair_null();
    
    return djazair_new_resource(vm, stmt, "SQLiteStmt");
}

DJAZAIR_FUNC(sqliteStepNative) {
    djazair_check_args(1, argCount);
    if (!djazair_is_resource(args[0])) return djazair_int(SQLITE_ERROR);
    sqlite3_stmt *stmt = (sqlite3_stmt *)djazair_get_resource(vm, args[0]);
    if (!stmt) return djazair_int(SQLITE_ERROR);
    return djazair_int(sqlite3_step(stmt));
}

DJAZAIR_FUNC(sqliteFetchRowNative) {
    djazair_check_args(1, argCount);
    if (!djazair_is_resource(args[0])) return djazair_null();
    
    sqlite3_stmt *stmt = (sqlite3_stmt *)djazair_get_resource(vm, args[0]);
    if (!stmt) return djazair_null();
    
    int colCount = sqlite3_column_count(stmt);
    
    djazair_value arr = djazair_new_array(vm);
    djazair_push(vm, arr); // GC Protection
    
    for (int i = 0; i < colCount; i++) {
        djazair_value val;
        int type = sqlite3_column_type(stmt, i);
        switch (type) {
            case SQLITE_INTEGER:
                val = djazair_int64(vm, sqlite3_column_int64(stmt, i));
                break;
            case SQLITE_FLOAT:
                val = djazair_float(sqlite3_column_double(stmt, i));
                break;
            case SQLITE_TEXT:
                val = djazair_str(vm, (const char *)sqlite3_column_text(stmt, i));
                break;
            case SQLITE_NULL:
            default:
                val = djazair_null();
                break;
        }
        djazair_array_push(vm, arr, val);
    }
    
    return djazair_pop(vm);
}

DJAZAIR_FUNC(sqliteColumnNamesNative) {
    djazair_check_args(1, argCount);
    if (!djazair_is_resource(args[0])) return djazair_null();
    
    sqlite3_stmt *stmt = (sqlite3_stmt *)djazair_get_resource(vm, args[0]);
    if (!stmt) return djazair_null();
    
    int colCount = sqlite3_column_count(stmt);
    
    djazair_value arr = djazair_new_array(vm);
    djazair_push(vm, arr);
    
    for (int i = 0; i < colCount; i++) {
        djazair_array_push(vm, arr, djazair_str(vm, sqlite3_column_name(stmt, i)));
    }
    
    return djazair_pop(vm);
}

DJAZAIR_FUNC(sqliteFinalizeNative) {
    djazair_check_args(1, argCount);
    if (djazair_is_resource(args[0])) {
        sqlite3_stmt *stmt = (sqlite3_stmt *)djazair_get_resource(vm, args[0]);
        if (stmt) {
            sqlite3_finalize(stmt);
            AS_RESOURCE(args[0])->ptr = NULL;
        }
    }
    return djazair_null();
}
