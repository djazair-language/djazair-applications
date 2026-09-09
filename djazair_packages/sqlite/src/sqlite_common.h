#ifndef DJAZAIR_SQLITE_COMMON_H
#define DJAZAIR_SQLITE_COMMON_H

#include "djazair_api.h"
#include <sqlite3.h>

// DB Operations
DJAZAIR_FUNC(sqliteOpenNative);
DJAZAIR_FUNC(sqliteCloseNative);
DJAZAIR_FUNC(sqliteErrorNative);
DJAZAIR_FUNC(sqliteLastInsertIdNative);
DJAZAIR_FUNC(sqliteChangesNative);
DJAZAIR_FUNC(sqliteEscapeNative);
DJAZAIR_FUNC(sqliteVersionNative);

// Statement Operations
DJAZAIR_FUNC(sqlitePrepareNative);
DJAZAIR_FUNC(sqliteStepNative);
DJAZAIR_FUNC(sqliteFetchRowNative);
DJAZAIR_FUNC(sqliteColumnNamesNative);
DJAZAIR_FUNC(sqliteFinalizeNative);

#endif // DJAZAIR_SQLITE_COMMON_H
