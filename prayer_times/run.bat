@echo off
title Djazair Prayer Times
cd /d "%~dp0"

:: 1. Check for known executable names in current or parent directory
if exist "prayer_times.exe" (
    start "" "prayer_times.exe" %*
    exit /b 0
)
if exist "djazair_prayer.exe" (
    start "" "djazair_prayer.exe" %*
    exit /b 0
)
if exist "..\prayer_times.exe" (
    start "" "..\prayer_times.exe" %*
    exit /b 0
)
if exist "..\djazair_prayer.exe" (
    start "" "..\djazair_prayer.exe" %*
    exit /b 0
)

:: 2. Check for any other renamed executable in current directory (ignoring djazair.exe)
for %%F in ("%~dp0*.exe") do (
    if /i not "%%~nxF"=="djazair.exe" (
        start "" "%%F" %*
        exit /b 0
    )
)

:: 3. Check for any other renamed executable in parent directory
for %%F in ("%~dp0..\*.exe") do (
    if /i not "%%~nxF"=="djazair.exe" (
        start "" "%%F" %*
        exit /b 0
    )
)

:: 4. Fallback to source execution
if exist "__main__.dz" (
    djazair.exe __main__.dz %*
) else (
    djazair.exe main.dz %*
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] An error occurred while running Djazair Prayer Times.
    pause
)
