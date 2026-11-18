@echo off
title Natak Audio & Video Instant Player Panel
cd /d "%~dp0"

echo =========================================================
echo    NATAK AUDIO & VIDEO INSTANT PLAY SOUNDBOARD
echo =========================================================
echo Starting server and launching your control panel...
echo.

where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Node.js detected. Starting streaming server...
    node server.js
) else (
    echo [INFO] Opening panel directly in browser...
    start "" "index.html"
)
pause

