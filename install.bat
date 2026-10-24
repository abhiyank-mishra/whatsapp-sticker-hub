@echo off
setlocal enabledelayedexpansion
title WhatsApp Sticker Hub - 1-Click Setup ^& Updater
color 0A

echo ========================================================
echo        WhatsApp Sticker Hub - Auto Setup ^& Sync
echo ========================================================
echo.

set "REPO_URL=https://github.com/abhiyank-mishra/whatsapp-sticker-hub"
set "ZIP_URL=https://github.com/abhiyank-mishra/whatsapp-sticker-hub/archive/refs/heads/main.zip"
set "INSTALL_DIR=%LOCALAPPDATA%\WhatsAppStickerHub"

:: Ensure install directory exists
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

:: Check if git command exists
where git >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "HAS_GIT=1"
) else (
    set "HAS_GIT=0"
)

:: -----------------------------------------------------------
:: STEP 1: FETCH / UPDATE CODEBASE
:: -----------------------------------------------------------
:: Check if the bat file is being run from inside the extension folder itself
if exist "%~dp0manifest.json" (
    echo [LOCAL] Extension files detected in current folder.
    echo Copying files to: %INSTALL_DIR%
    xcopy /s /e /y /i "%~dp0*" "%INSTALL_DIR%\" >nul 2>&1
    goto :VERIFY_FILES
)

:: Check if git repo exists in INSTALL_DIR
if exist "%INSTALL_DIR%\.git" (
    if "!HAS_GIT!"=="1" (
        echo [GIT] Checking for updates via git pull...
        cd /d "%INSTALL_DIR%"
        git pull origin main
        goto :VERIFY_FILES
    )
)

:: Download latest code directly from GitHub
echo [DOWNLOAD] Downloading latest version from GitHub...
set "TEMP_ZIP=%TEMP%\wsh_bundle_%RANDOM%.zip"
set "TEMP_DIR=%TEMP%\wsh_extract_%RANDOM%"

if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%" >nul 2>&1
mkdir "%TEMP_DIR%"

:: Try curl first (built into Windows 10 & 11)
where curl.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    curl.exe -L -s -o "%TEMP_ZIP%" "%ZIP_URL%"
) else (
    powershell -NoProfile -Command "(New-Object Net.WebClient).DownloadFile('%ZIP_URL%', '%TEMP_ZIP%')" >nul 2>&1
)

:: Extract using tar.exe or PowerShell
where tar.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    tar.exe -xf "%TEMP_ZIP%" -C "%TEMP_DIR%" >nul 2>&1
) else (
    powershell -NoProfile -Command "Expand-Archive -Path '%TEMP_ZIP%' -DestinationPath '%TEMP_DIR%' -Force" >nul 2>&1
)

:: Copy extracted files to INSTALL_DIR
if exist "%TEMP_DIR%\whatsapp-sticker-hub-main\manifest.json" (
    xcopy /s /e /y /i "%TEMP_DIR%\whatsapp-sticker-hub-main\*" "%INSTALL_DIR%\" >nul 2>&1
)

:: Clean up temp download files
del /f /q "%TEMP_ZIP%" >nul 2>&1
rmdir /s /q "%TEMP_DIR%" >nul 2>&1

:: -----------------------------------------------------------
:: STEP 2: VERIFY INSTALLATION
:: -----------------------------------------------------------
:VERIFY_FILES
if not exist "%INSTALL_DIR%\manifest.json" (
    color 0C
    echo.
    echo [ERROR] Installation failed! manifest.json not found in %INSTALL_DIR%.
    echo Please check your internet connection and try running this script again.
    echo.
    pause
    exit /b 1
)

echo [OK] Files verified successfully in: %INSTALL_DIR%

:: Copy path to clipboard for 1-click paste
<nul set /p="%INSTALL_DIR%" | clip

:: -----------------------------------------------------------
:: STEP 3: CREATE DESKTOP SHORTCUT
:: -----------------------------------------------------------
echo [SHORTCUT] Creating Desktop Shortcut...
set "VBS_SCRIPT=%TEMP%\wsh_shortcut_%RANDOM%.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT%"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\WhatsApp (Stickers).lnk" >> "%VBS_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT%"
echo oLink.TargetPath = "chrome.exe" >> "%VBS_SCRIPT%"
echo oLink.Arguments = "--load-extension=""" ^& "%INSTALL_DIR%" ^& """ https://web.whatsapp.com" >> "%VBS_SCRIPT%"
echo oLink.Description = "Open WhatsApp Web with Sticker Hub" >> "%VBS_SCRIPT%"
echo oLink.Save >> "%VBS_SCRIPT%"
cscript /nologo "%VBS_SCRIPT%" >nul 2>&1
del "%VBS_SCRIPT%" >nul 2>&1

:: -----------------------------------------------------------
:: STEP 4: CHROME LAUNCH & ATTACH HANDLER
:: -----------------------------------------------------------
echo.
echo ========================================================
echo                 Setup Successful!
echo ========================================================
echo.

tasklist | findstr /i chrome.exe >nul
if %ERRORLEVEL% NEQ 0 (
    echo Opening WhatsApp Web in Chrome...
    start "" chrome.exe --load-extension="%INSTALL_DIR%" "https://web.whatsapp.com"
    timeout /t 3 >nul
    exit
)

:: If Chrome is running:
echo [NOTE] Google Chrome pehle se background me chal raha hai.
echo Extension load karne ke liye niche se ek option chunein:
echo.
echo  [1] Chrome Restart karein (Fastest - 2 Seconds)
echo      Chrome restart hokar seedha WhatsApp Web aur Sticker Hub open hoga.
echo.
echo  [2] Permanent Setup (Recommended - Sirf 1 baar karna hai)
echo      Chrome me permanently install ho jayega (hamesha ke liye).
echo      Folder path already aapke clipboard me copy ho gaya hai!
echo.
set /p "CHOICE=Option number enter karein (1 ya 2, default [1]): "
if "!CHOICE!"=="" set "CHOICE=1"

if "!CHOICE!"=="1" (
    echo.
    echo Chrome restart ho raha hai...
    taskkill /F /IM chrome.exe >nul 2>&1
    timeout /t 1 >nul
    start "" chrome.exe --load-extension="%INSTALL_DIR%" "https://web.whatsapp.com"
    echo WhatsApp Web opening now!
    timeout /t 3 >nul
    exit
) else (
    echo.
    echo Chrome Extensions page aur Folder open ho raha hai...
    start "" chrome.exe "chrome://extensions"
    explorer.exe "%INSTALL_DIR%"
    echo.
    echo ========================================================
    echo           AAKHRI STEP (Sirf 10 Seconds)
    echo ========================================================
    echo 1. Chrome me khule page par upar Right side me:
    echo    "Developer mode" ka switch ON karein.
    echo.
    echo 2. Top-Left me "Load unpacked" button par click karein.
    echo.
    echo 3. Window me Ctrl + V dabakar "Select Folder" par click karein!
    echo    (Ya open hue folder ko seedha Chrome par Drag ^& Drop karein)
    echo ========================================================
    echo.
    echo Ho gaya! Ab web.whatsapp.com par Stickers enjoy karein.
    echo.
    pause
    exit
)
