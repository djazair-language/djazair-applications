@echo off
echo Building dpack stubs...
gcc -O2 -Wall stub\stub.c -o stub\stub_win.exe
if %errorlevel% neq 0 (
    echo Error: Failed to compile console stub.
    exit /b %errorlevel%
)
gcc -O2 -Wall -DSTUB_GUI -mwindows stub\stub.c -o stub\stub_win_gui.exe
if %errorlevel% neq 0 (
    echo Error: Failed to compile GUI stub.
    exit /b %errorlevel%
)
echo dpack stubs built successfully.
exit /b 0
