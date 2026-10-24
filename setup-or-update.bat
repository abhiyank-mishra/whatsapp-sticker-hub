@echo off
setlocal enabledelayedexpansion
title WhatsApp Sticker Hub - Auto Setup ^& Updater
color 0A

echo ========================================================
echo        WhatsApp Sticker Hub - Auto Setup ^& Sync
echo ========================================================
echo.

set "REPO_URL=https://github.com/abhiyank-mishra/whatsapp-sticker-hub"
set "ZIP_URL=https://github.com/abhiyank-mishra/whatsapp-sticker-hub/archive/refs/heads/main.zip"
set "INSTALL_DIR=%LOCALAPPDATA%\WhatsAppStickerHub"

:: Check if git command exists on this machine
where git >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "HAS_GIT=1"
) else (
    set "HAS_GIT=0"
)

:: -----------------------------------------------------------
:: CASE 1: ALREADY INSTALLED -> SYNC & UPDATE
:: -----------------------------------------------------------
if exist "%INSTALL_DIR%\manifest.json" (
    echo [FOUND] WhatsApp Sticker Hub is already installed!
    echo Checking for latest updates...
    echo.
    
    if exist "%INSTALL_DIR%\.git" (
        if "!HAS_GIT!"=="1" (
            echo Updating via git pull...
            cd /d "%INSTALL_DIR%"
            git pull origin main
            echo Update check finished!
            goto :LAUNCH
        )
    )

    :: Fallback update via GitHub ZIP (works even without Git installed!)
    echo Downloading latest update from GitHub...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "$ProgressPreference = 'SilentlyContinue'; " ^
        "$zip = [System.IO.Path]::Combine($env:TEMP, 'wsh_update.zip'); " ^
        "$wc = New-Object System.Net.WebClient; " ^
        "$wc.DownloadFile('%ZIP_URL%', $zip); " ^
        "Expand-Archive -Path $zip -DestinationPath $env:TEMP -Force; " ^
        "Copy-Item -Path \"$env:TEMP\whatsapp-sticker-hub-main\*\" -Destination '%INSTALL_DIR%' -Recurse -Force; " ^
        "Remove-Item -Path $zip -Force -ErrorAction SilentlyContinue; " ^
        "Remove-Item -Path \"$env:TEMP\whatsapp-sticker-hub-main\" -Recurse -Force -ErrorAction SilentlyContinue;"
    
    echo Update complete!
    goto :LAUNCH
)

:: -----------------------------------------------------------
:: CASE 2: FIRST TIME SETUP -> DOWNLOAD & INSTALL
:: -----------------------------------------------------------
echo [FIRST RUN] WhatsApp Sticker Hub is not installed yet.
echo Starting 1-Click Installation...
echo.

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

if "!HAS_GIT!"=="1" (
    echo Cloning repository via Git...
    git clone "%REPO_URL%.git" "%INSTALL_DIR%"
) else (
    echo Downloading from GitHub (No Git required)...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "$ProgressPreference = 'SilentlyContinue'; " ^
        "$zip = [System.IO.Path]::Combine($env:TEMP, 'wsh_setup.zip'); " ^
        "$wc = New-Object System.Net.WebClient; " ^
        "$wc.DownloadFile('%ZIP_URL%', $zip); " ^
        "Expand-Archive -Path $zip -DestinationPath $env:TEMP -Force; " ^
        "Copy-Item -Path \"$env:TEMP\whatsapp-sticker-hub-main\*\" -Destination '%INSTALL_DIR%' -Recurse -Force; " ^
        "Remove-Item -Path $zip -Force -ErrorAction SilentlyContinue; " ^
        "Remove-Item -Path \"$env:TEMP\whatsapp-sticker-hub-main\" -Recurse -Force -ErrorAction SilentlyContinue;"
)

:: Create Desktop Shortcut for 1-Click Launch
echo Creating Desktop Shortcut...
set "VBS_SCRIPT=%TEMP%\create_wsh_shortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT%"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\WhatsApp (Stickers).lnk" >> "%VBS_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT%"
echo oLink.TargetPath = "chrome.exe" >> "%VBS_SCRIPT%"
echo oLink.Arguments = "--load-extension=""" ^& "%INSTALL_DIR%" ^& """ https://web.whatsapp.com" >> "%VBS_SCRIPT%"
echo oLink.Description = "Open WhatsApp Web with Sticker Hub" >> "%VBS_SCRIPT%"
echo oLink.Save >> "%VBS_SCRIPT%"
cscript /nologo "%VBS_SCRIPT%"
del "%VBS_SCRIPT%" >nul 2>&1

echo.
echo ========================================================
echo   SUCCESS! Installation Complete!
echo   Desktop par "WhatsApp (Stickers)" shortcut ban gaya hai.
echo ========================================================
echo.

:LAUNCH
echo Launching WhatsApp Web with Sticker Hub...
start "" chrome.exe --load-extension="%INSTALL_DIR%" "https://web.whatsapp.com"
timeout /t 3 >nul
exit
