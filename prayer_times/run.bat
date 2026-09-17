@echo off
title Djazair Prayer Times
cd /d "%~dp0"
djazair.exe main.dz
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] An error occurred while running Djazair Prayer Times.
    pause
)
