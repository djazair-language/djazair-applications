@echo off
setlocal EnableDelayedExpansion

:: ─────────────────────────────────────────────
::  build.bat  –  webview extension for Djazair
::  Usage: build.bat <ROOT>
::    ROOT = path to the djazair-language repo root
::  Requires: g++ (MinGW-w64 / MSYS2)
:: ─────────────────────────────────────────────

:: ── Locate Djazair SDK / Installation (General Use) ────────────────────────
set "DJAZAIR_DIR=%~f1"

if "%DJAZAIR_DIR%"=="" if defined DJAZAIR_HOME set "DJAZAIR_DIR=%DJAZAIR_HOME%"
if "%DJAZAIR_DIR%"=="" if defined DJAZAIR_ROOT set "DJAZAIR_DIR=%DJAZAIR_ROOT%"

if "%DJAZAIR_DIR%"=="" (
    for /f "delims=" %%I in ('where djazair.exe 2^>nul') do (
        for %%A in ("%%~dpI..\..") do (
            if exist "%%~fA\src\include\djazair_api.h" set "DJAZAIR_DIR=%%~fA"
        )
        if "!DJAZAIR_DIR!"=="" (
            for %%A in ("%%~dpI..") do (
                if exist "%%~fA\include\djazair_api.h" set "DJAZAIR_DIR=%%~fA"
            )
        )
    )
)

if "%DJAZAIR_DIR%"=="" (
    for %%P in (
        "%~dp0..\..\djazair-language"
        "%~dp0..\..\..\djazair-language"
        "%~dp0..\djazair-language"
        "%~dp0..\.."
    ) do (
        if exist "%%~fP\src\include\djazair_api.h" (
            set "DJAZAIR_DIR=%%~fP"
            goto :found_djazair
        )
    )
)

:found_djazair
if "%DJAZAIR_DIR%"=="" (
    echo [ERROR] Djazair SDK / installation not found in PATH or DJAZAIR_HOME.
    echo Please install Djazair and add it to your PATH, or set DJAZAIR_HOME:
    echo   set DJAZAIR_HOME=C:\path\to\djazair
    exit /b 1
)

:: Resolve include and library flags
set "INC_FLAGS=-I"%DJAZAIR_DIR%\include""
if exist "%DJAZAIR_DIR%\src\include" (
    set "INC_FLAGS=-I"%DJAZAIR_DIR%\src\include" -I"%DJAZAIR_DIR%\src\core" -I"%DJAZAIR_DIR%\src\libs""
)

set "LIB_DIR=%DJAZAIR_DIR%\lib"
if exist "%DJAZAIR_DIR%\build\bin\libdjazair.a" (
    set "LIB_DIR=%DJAZAIR_DIR%\build\bin"
) else if exist "%DJAZAIR_DIR%\bin\libdjazair.a" (
    set "LIB_DIR=%DJAZAIR_DIR%\bin"
)

where g++ >nul 2>&1
if errorlevel 1 (
    echo [ERROR] g++ not found in PATH.
    echo Install MinGW-w64 or MSYS2 and add it to your PATH.
    exit /b 1
)

echo [INFO] Building webview extension...
g++ -shared -O2 -std=c++14 -DUNICODE -D_UNICODE ^
    %INC_FLAGS% ^
    src\webview_native.cc ^
    -o webview.dll ^
    -L"%LIB_DIR%" -ldjazair ^
    -lole32 -lshell32 -lshlwapi -luser32 -lversion -lcomdlg32 -ladvapi32 -ldwmapi -luuid ^
    -Wl,--disable-dynamicbase

if errorlevel 1 (
    echo [ERROR] Build failed.
    exit /b 1
)

echo [OK] webview.dll built successfully.
