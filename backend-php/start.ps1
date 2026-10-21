# Start PHP API server
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting X-Hub Hackathon PHP Backend API on port 8000..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$phpExe = (Get-Command php -ErrorAction SilentlyContinue).Source
if (-not $phpExe) {
    $fallback = "C:\Users\VIGNESH\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe"
    if (Test-Path $fallback) {
        $phpExe = $fallback
    } else {
        Write-Error "PHP executable not found. Please ensure PHP is installed and on your PATH."
        exit 1
    }
}

Set-Location $PSScriptRoot
& $phpExe -S 127.0.0.1:8000 -t public router.php
