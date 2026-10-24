@echo off
title WhatsApp Sticker Hub - 1-Click Installer
color 0A
echo ========================================================
echo       WhatsApp Sticker Hub - 1-Click Auto Setup
echo ========================================================
echo.
echo Installing WhatsApp Sticker Hub...
echo.

:: 1. Define install directory in Local AppData
set "DEST_DIR=%LOCALAPPDATA%\WhatsAppStickerHub"
if not exist "%DEST_DIR%" mkdir "%DEST_DIR%"

:: 2. Copy extension files
echo [1/3] Copying files to your PC...
xcopy /s /y /e "%~dp0*" "%DEST_DIR%\" >nul 2>&1

:: 3. Create Windows Desktop Shortcut using VBScript
echo [2/3] Creating Desktop Shortcut...
set "VBS_SCRIPT=%TEMP%\create_wsh_shortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT%"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\WhatsApp (Stickers).lnk" >> "%VBS_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT%"
echo oLink.TargetPath = "chrome.exe" >> "%VBS_SCRIPT%"
echo oLink.Arguments = "--load-extension=""" ^& "%DEST_DIR%" ^& """ https://web.whatsapp.com" >> "%VBS_SCRIPT%"
echo oLink.Description = "Open WhatsApp Web with Sticker Hub" >> "%VBS_SCRIPT%"
echo oLink.Save >> "%VBS_SCRIPT%"
cscript /nologo "%VBS_SCRIPT%"
del "%VBS_SCRIPT%" >nul 2>&1

:: 4. Done & Launch
echo [3/3] Opening WhatsApp Web...
echo.
echo ========================================================
echo   SUCCESS! Installation Complete!
echo   Desktop par "WhatsApp (Stickers)" shortcut ban gaya hai.
echo ========================================================
echo.

start "" chrome.exe --load-extension="%DEST_DIR%" "https://web.whatsapp.com"

echo WhatsApp Web is opening now. You can close this window.
timeout /t 3 >nul
exit
