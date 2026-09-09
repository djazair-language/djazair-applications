#include "sqlite_common.h"
#include <stddef.h>

static NativeMethod sqlite_module_funcs[] = {
    {"open",          sqliteOpenNative,        1},
    {"close",         sqliteCloseNative,       1},
    {"error",         sqliteErrorNative,       1},
    {"prepare",       sqlitePrepareNative,     2},
    {"step",          sqliteStepNative,        1},
    {"fetchRow",      sqliteFetchRowNative,    1},
    {"columnNames",   sqliteColumnNamesNative, 1},
    {"finalize",      sqliteFinalizeNative,    1},
    {"insertId",      sqliteLastInsertIdNative,1},
    {"changes",       sqliteChangesNative,     1},
    {"escape",        sqliteEscapeNative,      1},
    {"libversion",    sqliteVersionNative,     0},
    {NULL, NULL, 0}
};

DJAZAIR_EXTENSION(sqlite, sqlite_module_funcs)
