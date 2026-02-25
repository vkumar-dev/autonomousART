@echo off
REM Start autonomousART Loop in WSL
REM This batch file can be used to start the autonomous art generation from Windows

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR:~0,-9%
set LOG_FILE=%PROJECT_DIR%ralph-art.log

echo [INFO] Starting autonomousART Loop...
echo [INFO] Project directory: %PROJECT_DIR%
echo [INFO] Log file: %LOG_FILE%

REM Start WSL bash script
wsl bash %PROJECT_DIR%scripts/ralph-art-loop.sh >> %LOG_FILE% 2>&1

echo [INFO] autonomousART Loop process started
echo [INFO] Check log file for status: %LOG_FILE%

pause
