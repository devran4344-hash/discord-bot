@echo off
title KrX NSFW Guard v2
color 0A
cd /d "%~dp0"

:start
echo.
echo  ============================================
echo   KrX NSFW Guard v2 - Baslatiliyor...
echo  ============================================
echo.

node index.js

echo.
echo  [HATA] Bot kapandi veya hata olustu.
echo  [HATA] 5 saniye sonra yeniden baslatiliyor...
echo.
timeout /t 5 /nobreak >nul
goto start
