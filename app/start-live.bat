@echo off
title Daniel's POS - Live HTTPS Tunnel
echo ============================================================
echo   DANIEL'S BARBECUE POS - LIVE ACCESS
echo ============================================================
echo.
echo Starting XAMPP + Cloudflare HTTPS tunnel...
echo.
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0..\tools\start-live.ps1"
echo.
pause
