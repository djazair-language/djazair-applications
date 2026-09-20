@echo off
title Djazair Prayer Times
cd /d "%~dp0"

if exist "..\prayer_times.exe" (
    start "" "..\prayer_times.exe" %*
    exit /b 0
)

if exist "prayer_times.exe" (
    start "" "prayer_times.exe" %*
    exit /b 0
)

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
