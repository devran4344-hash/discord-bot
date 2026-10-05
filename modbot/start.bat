@echo off
chcp 65001 >nul 2>&1
title ModBot - Discord Moderasyon Botu
color 0A

echo.
echo  ==========================================
echo   MODBOT - Discord Moderasyon Botu v2.0
echo   Baslatici
echo  ==========================================
echo.

:: Node.js kontrol
echo  [KONTROL] Node.js kontrol ediliyor...
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [HATA] Node.js bulunamadi!
    echo  Indirmek icin: https://nodejs.org
    echo  Gereken surum: v18 veya uzeri
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version 2^>nul') do set NODEVERSION=%%i
echo  [OK] Node.js %NODEVERSION% bulundu.

:: npm kontrol
echo  [KONTROL] npm kontrol ediliyor...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [HATA] npm bulunamadi!
    pause
    exit /b 1
)
echo  [OK] npm bulundu.

:: .env dosyasi kontrol
echo  [KONTROL] .env dosyasi kontrol ediliyor...
if not exist ".env" (
    color 0C
    echo.
    echo  [HATA] .env dosyasi bulunamadi!
    echo.
    echo  Asagidaki adimlar ile olusturun:
    echo    1. modbot klasorunde .env adinda dosya olusturun
    echo    2. Icerigine su satiri ekleyin:
    echo         BOT_TOKEN=discord_bot_tokeniniz
    echo         PREFIX=!
    echo         OWNER_ID=discord_id_niz
    echo.
    pause
    exit /b 1
)
echo  [OK] .env dosyasi mevcut.

:: Token ayarlanmis mi kontrol
findstr /C:"BURAYA_BOT_TOKENINI_YAZ" ".env" >nul 2>&1
if %errorlevel% equ 0 (
    color 0C
    echo.
    echo  [HATA] .env dosyasinda BOT_TOKEN henuz ayarlanmamis!
    echo.
    echo  .env dosyasini acin ve:
    echo    BOT_TOKEN=BURAYA_BOT_TOKENINI_YAZ
    echo  satirini gercek tokeninizle degistirin.
    echo.
    echo  Discord Developer Portal: https://discord.com/developers/applications
    echo.
    pause
    exit /b 1
)
echo  [OK] Bot token mevcut.

:: Config dosyasi kontrol
echo  [KONTROL] Konfigurasyon dosyalari kontrol ediliyor...
if not exist "src\config.js" (
    color 0C
    echo  [HATA] src\config.js bulunamadi!
    pause
    exit /b 1
)
echo  [OK] Konfigurasyon dosyalari tamam.

:: node_modules kontrol ve kurulum
echo  [KONTROL] Bagimliliklar kontrol ediliyor...
if not exist "node_modules" (
    color 0E
    echo.
    echo  [KURULUM] Bagimliliklar yukleniyor, lutfen bekleyin...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo  [HATA] Bagimlilik kurulumu basarisiz!
        echo  Manuel olarak calistirin: npm install
        echo.
        pause
        exit /b 1
    )
    color 0A
    echo.
    echo  [OK] Bagimliliklar yuklendi.
) else (
    echo  [OK] node_modules mevcut.
)

:: discord.js kontrol
if not exist "node_modules\discord.js" (
    color 0E
    echo  [UYARI] discord.js eksik, yukleniyor...
    call npm install discord.js
    color 0A
)

:: Klasorler olustur
if not exist "data" mkdir data
if not exist "logs" mkdir logs

:: Hazir
echo.
echo  ==========================================
echo   Tum kontroller tamamlandi!
echo   Bot baslatiliyor...
echo  ==========================================
echo.
echo  Tarih : %date%
echo  Saat  : %time%
echo.
echo  Botu kapatmak icin CTRL+C tuslayabilirsiniz.
echo.
echo  ------------------------------------------
echo.

:START
node index.js
set EXITCODE=%errorlevel%

echo.
echo  ------------------------------------------
echo  Bot durdu. Cikis kodu: %EXITCODE%
echo.

if %EXITCODE% equ 0 (
    color 0E
    echo  [BILGI] Bot normal sekilde kapatildi.
    echo.
    choice /C EN /T 10 /D N /M "Yeniden baslatmak ister misiniz? (E=Evet, N=Hayir, 10sn sonra hayir)"
    if errorlevel 2 goto EXIT
    if errorlevel 1 goto RESTART
) else (
    color 0C
    echo  [HATA] Bot beklenmedik bicimde kapandi!
    echo.
    choice /C EN /T 15 /D E /M "Otomatik yeniden baslatilsin mi? (E=Evet, N=Hayir, 15sn sonra evet)"
    if errorlevel 2 goto EXIT
    if errorlevel 1 goto RESTART
)

:RESTART
color 0A
echo.
echo  [YENIDEN BASLATIYOR] 3 saniye bekleniyor...
timeout /t 3 /nobreak >nul
echo.
goto START

:EXIT
color 07
echo.
echo  Gorusuruz!
echo.
timeout /t 2 /nobreak >nul
exit /b 0
