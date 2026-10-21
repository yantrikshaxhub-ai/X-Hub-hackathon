@echo off
setlocal
echo ========================================================
echo Starting X-Hub Hackathon PHP Backend API on port 8000...
echo ========================================================

where php >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "PHP_CMD=php"
) else if exist "%LOCALAPPDATA%\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe" (
    set "PHP_CMD=%LOCALAPPDATA%\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe"
) else (
    echo Error: PHP is not found on PATH or in WinGet packages directory.
    pause
    exit /b 1
)

cd /d "%~dp0"
set PHP_CLI_SERVER_WORKERS=4
"%PHP_CMD%" -S 127.0.0.1:8000 -t public router.php
pause
