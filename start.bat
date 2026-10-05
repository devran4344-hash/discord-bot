@echo off
title 3 Bot Açılıyor
color 0A
cd /d "%~dp0"

:start
echo.
echo  ============================================
echo   NSFW , Moderasyon , Music 3 Bot Calisiyor
echo  ============================================
echo.

node start.js

echo.
echo  [HATA] Botlar kapandi veya hata olustu.
echo  [HATA] 5 saniye sonra yeniden baslatiliyor...
echo.
timeout /t 5 /nobreak >nul
goto start
